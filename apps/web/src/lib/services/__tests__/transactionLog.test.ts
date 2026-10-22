// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerTransaction } from '@/lib/services/transactionLog';

const BASE = 'https://transactionlog.test';
const INPUT = {
  id_product_order: 'ORD-DEMO-001',
  id_product_offer: 'OFF-500',
  id_buyer: 'BUY-777',
};
const RECEIPT = {
  ...INPUT,
  hash: '0x4e54',
  salt: '0x3bbd',
  hash_scheme: 'sha256-jcs-salt32-v1',
  blockchain: { status: 'confirmed', network: 'real (chainId 11073)', error: null },
};

const res = (data: unknown, status = 201) => ({
  status,
  ok: status >= 200 && status < 300,
  text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
});

function installFetch(response: ReturnType<typeof res> | Error) {
  const mock = vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) throw response;
    return response as unknown as Response;
  });
  global.fetch = mock;
  return mock;
}

function headersOf(mock: ReturnType<typeof installFetch>): Record<string, string> {
  return mock.mock.calls[0][1]?.headers as Record<string, string>;
}

beforeEach(() => {
  vi.stubEnv('TRANSACTION_LOG_BASE_URL', BASE);
  vi.stubEnv('TRANSACTION_LOG_USER', '');
  vi.stubEnv('TRANSACTION_LOG_PASSWORD', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('registerTransaction', () => {
  it('hace POST a /transactions con el body exacto y devuelve el recibo en 201', async () => {
    const fetchMock = installFetch(res(RECEIPT));
    const receipt = await registerTransaction(INPUT);

    expect(receipt).toEqual(RECEIPT);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/transactions`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(INPUT);
    expect(headersOf(fetchMock)).toMatchObject({
      accept: 'application/json',
      'Content-Type': 'application/json',
    });
    expect(init?.redirect).toBe('manual');
    expect(init?.cache).toBe('no-store');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('normaliza la barra final de la base URL', async () => {
    vi.stubEnv('TRANSACTION_LOG_BASE_URL', `${BASE}//`);
    const fetchMock = installFetch(res(RECEIPT));
    await registerTransaction(INPUT);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/transactions`);
  });

  it('sin credenciales no envía Authorization', async () => {
    const fetchMock = installFetch(res(RECEIPT));
    await registerTransaction(INPUT);
    expect(headersOf(fetchMock)).not.toHaveProperty('Authorization');
  });

  it('con usuario y contraseña envía Basic Auth', async () => {
    vi.stubEnv('TRANSACTION_LOG_USER', 'svc');
    vi.stubEnv('TRANSACTION_LOG_PASSWORD', 's3cret');
    const fetchMock = installFetch(res(RECEIPT));
    await registerTransaction(INPUT);
    expect(headersOf(fetchMock).Authorization).toBe(
      `Basic ${Buffer.from('svc:s3cret').toString('base64')}`,
    );
  });

  it.each([
    ['solo usuario', 'svc', ''],
    ['solo contraseña', '', 's3cret'],
  ])('con %s no envía Authorization', async (_label, user, password) => {
    vi.stubEnv('TRANSACTION_LOG_USER', user);
    vi.stubEnv('TRANSACTION_LOG_PASSWORD', password);
    const fetchMock = installFetch(res(RECEIPT));
    await registerTransaction(INPUT);
    expect(headersOf(fetchMock)).not.toHaveProperty('Authorization');
  });

  it('rechaza enviar credenciales Basic por http y no llama a la red', async () => {
    vi.stubEnv('TRANSACTION_LOG_BASE_URL', 'http://transactionlog.test');
    vi.stubEnv('TRANSACTION_LOG_USER', 'svc');
    vi.stubEnv('TRANSACTION_LOG_PASSWORD', 's3cret');
    const fetchMock = installFetch(res(RECEIPT));
    await expect(registerTransaction(INPUT)).rejects.toThrow(/https/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('permite http cuando no hay credenciales', async () => {
    vi.stubEnv('TRANSACTION_LOG_BASE_URL', 'http://transactionlog.test');
    installFetch(res(RECEIPT));
    await expect(registerTransaction(INPUT)).resolves.toMatchObject({ hash: '0x4e54' });
  });

  it('falla si falta TRANSACTION_LOG_BASE_URL', async () => {
    vi.stubEnv('TRANSACTION_LOG_BASE_URL', '');
    const fetchMock = installFetch(res(RECEIPT));
    await expect(registerTransaction(INPUT)).rejects.toThrow('TRANSACTION_LOG_BASE_URL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 401, 500, 503, 302, 200])(
    'status %i: error solo con el status, sin el cuerpo',
    async (status) => {
      installFetch(res('cuerpo-sensible', status));
      const error = await registerTransaction(INPUT).catch((e: Error) => e);
      expect((error as Error).message).toBe(`TransactionLog (transactions): HTTP ${status}`);
    },
  );

  it('falla si la respuesta no es JSON', async () => {
    installFetch(res('<html>', 201));
    await expect(registerTransaction(INPUT)).rejects.toThrow('no es JSON');
  });

  it('falla si la respuesta es JSON null', async () => {
    installFetch(res('null', 201));
    await expect(registerTransaction(INPUT)).rejects.toThrow('sin hash');
  });

  it('falla si falta el hash', async () => {
    installFetch(res({ ...RECEIPT, hash: undefined }));
    await expect(registerTransaction(INPUT)).rejects.toThrow('sin hash');
  });

  it('falla si falta blockchain.status', async () => {
    installFetch(res({ ...RECEIPT, blockchain: {} }));
    await expect(registerTransaction(INPUT)).rejects.toThrow('sin hash');
  });

  it('falla si la respuesta supera 64 KB', async () => {
    installFetch(res({ ...RECEIPT, salt: 'x'.repeat(65 * 1024) }));
    await expect(registerTransaction(INPUT)).rejects.toThrow('demasiado grande');
  });

  it('devuelve el recibo aunque blockchain.status no sea confirmed', async () => {
    installFetch(res({ ...RECEIPT, blockchain: { status: 'pending', error: null } }));
    const receipt = await registerTransaction(INPUT);
    expect(receipt.blockchain.status).toBe('pending');
  });

  it('propaga el error de red / timeout', async () => {
    installFetch(new DOMException('The operation timed out.', 'TimeoutError'));
    await expect(registerTransaction(INPUT)).rejects.toThrow('timed out');
  });

  it('no reintenta: una sola llamada ante un 5xx', async () => {
    const fetchMock = installFetch(res('x', 500));
    await expect(registerTransaction(INPUT)).rejects.toThrow('HTTP 500');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
