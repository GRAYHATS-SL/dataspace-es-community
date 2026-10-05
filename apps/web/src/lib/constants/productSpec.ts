/** Option of a form select. */
export interface SelectOption {
  label: string;
  value: string;
}

/** Response formats of a service endpoint. */
export const RESPONSE_FORMAT_OPTIONS: SelectOption[] = [
  { label: 'JSON', value: 'JSON' },
  { label: 'XML', value: 'XML' },
  { label: 'CSV', value: 'CSV' },
];

/** HTTP methods of a service endpoint. */
export const HTTP_METHOD_OPTIONS: SelectOption[] = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
];

/** Authentication types of a service endpoint. */
export const AUTH_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Ninguna', value: 'none' },
  { label: 'API Key', value: 'apiKey' },
  { label: 'Bearer Token', value: 'bearer' },
  { label: 'OAuth2', value: 'oauth2' },
  { label: 'Basic', value: 'basic' },
];

/** Supply modes of access tokens. */
export const TOKEN_SUPPLY_MODE_OPTIONS: SelectOption[] = [
  { label: 'Limitado (cantidad fija)', value: 'limited' },
  { label: 'Ilimitado', value: 'unlimited' },
];

/** Price types of a product offering price. */
export const PRICE_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Recurrente', value: 'recurring' },
  { label: 'Único', value: 'one time' },
  { label: 'Por uso', value: 'usage' },
];
