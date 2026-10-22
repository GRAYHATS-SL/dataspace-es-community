/** User messages for the `?error=` codes redirecting to `/inicio-sesion`. */
const LOGIN_ERROR_MESSAGES: ReadonlyMap<string, string> = new Map([
  ['invalid_request', 'La respuesta del verifier no es válida. Escanea de nuevo el código QR.'],
  [
    'invalid_state',
    'La sesión de acceso no es válida o ha caducado. Escanea de nuevo el código QR.',
  ],
  [
    'token_exchange_failed',
    'No se pudo completar el acceso: el código ya se usó o caducó, o la dirección de retorno no coincide. Inténtalo de nuevo con un QR nuevo.',
  ],
  ['token_missing', 'El verifier no devolvió las credenciales de acceso. Inténtalo de nuevo.'],
  [
    'invalid_token',
    'No se pudo validar tu credencial. Inténtalo de nuevo o contacta con soporte si el problema continúa.',
  ],
  [
    'org_closed',
    'Tu organización ha sido dada de baja y ya no puede acceder al marketplace. Contacta con GrayHats si crees que es un error.',
  ],
  ['rate_limited', 'Demasiados intentos de acceso. Espera un minuto e inténtalo de nuevo.'],
  ['session_expired', 'Tu sesión ha caducado (dura 30 minutos). Inicia sesión de nuevo.'],
]);

/**
 * @param code - Value of the `?error=` parameter.
 * @returns The message for a known code, or `null`.
 */
export function getLoginErrorMessage(code: string | null | undefined): string | null {
  return (code && LOGIN_ERROR_MESSAGES.get(code)) || null;
}
