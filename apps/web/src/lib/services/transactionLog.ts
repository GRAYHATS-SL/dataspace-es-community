/** Client for the immutable transaction log (`POST /transactions`). Server-only. */
const REQUEST_TIMEOUT_MS = 10 * 1000;
const MAX_BODY_CHARS = 64 * 1024;

export interface TransactionLogInput {
  readonly id_product_order: string;
  readonly id_product_offer: string;
  readonly id_buyer: string;
}

export interface TransactionLogBlockchain {
  readonly status: string;
  readonly network?: string;
  readonly contract_address?: string;
  readonly tx_hash?: string;
  readonly block_number?: number;
  readonly block_timestamp?: string;
  readonly error?: string | null;
}

export interface TransactionLogReceipt extends TransactionLogInput {
  readonly hash: string;
  readonly salt?: string;
  readonly hash_scheme?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly blockchain: TransactionLogBlockchain;
}

function resolveBaseUrl(): string {
  let base = process.env.TRANSACTION_LOG_BASE_URL?.trim() ?? '';
  while (base.endsWith('/')) base = base.slice(0, -1);
  if (!base) throw new Error('TransactionLog: falta TRANSACTION_LOG_BASE_URL');
  return base;
}

/** Basic Auth header, only with user and password over https. */
function buildAuthHeaders(baseUrl: string): Record<string, string> {
  const user = process.env.TRANSACTION_LOG_USER;
  const password = process.env.TRANSACTION_LOG_PASSWORD;
  if (!user || !password) return {};
  if (!baseUrl.startsWith('https://')) {
    throw new Error(
      'TransactionLog: las credenciales Basic requieren TRANSACTION_LOG_BASE_URL https',
    );
  }
  const credentials = Buffer.from(`${user}:${password}`).toString('base64');
  return { Authorization: `Basic ${credentials}` };
}

async function readReceipt(res: Response): Promise<TransactionLogReceipt> {
  if (res.status !== 201) throw new Error(`TransactionLog (transactions): HTTP ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_BODY_CHARS) {
    throw new Error('TransactionLog (transactions): respuesta demasiado grande');
  }
  let body: Partial<TransactionLogReceipt> | null;
  try {
    body = JSON.parse(text) as Partial<TransactionLogReceipt> | null;
  } catch {
    throw new Error('TransactionLog (transactions): respuesta no es JSON');
  }
  if (typeof body?.hash !== 'string' || typeof body.blockchain?.status !== 'string') {
    throw new Error('TransactionLog (transactions): respuesta sin hash o blockchain.status');
  }
  return body as TransactionLogReceipt;
}

/**
 * @summary Records a completed purchase in the immutable ledger.
 *
 * @param {TransactionLogInput}  input - Order, offering and buyer of the purchase.
 * @returns {Promise<TransactionLogReceipt>} Receipt with the hash and blockchain status.
 */
export async function registerTransaction(
  input: TransactionLogInput,
): Promise<TransactionLogReceipt> {
  const baseUrl = resolveBaseUrl();
  const res = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...buildAuthHeaders(baseUrl),
    },
    body: JSON.stringify({
      id_product_order: input.id_product_order,
      id_product_offer: input.id_product_offer,
      id_buyer: input.id_buyer,
    }),
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return readReceipt(res);
}
