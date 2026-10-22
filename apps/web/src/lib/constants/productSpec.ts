export const DISTRIBUTION_FORMAT_OPTIONS = [
  { label: 'JSON', value: 'JSON' },
  { label: 'CSV', value: 'CSV' },
  { label: 'XML', value: 'XML' },
  { label: 'Parquet', value: 'Parquet' },
  { label: 'GeoJSON', value: 'GeoJSON' },
  { label: 'XLSX', value: 'XLSX' },
  { label: 'PDF', value: 'PDF' },
  { label: 'Avro', value: 'Avro' },
  { label: 'RDF/Turtle', value: 'RDF/Turtle' },
  { label: 'Protocol Buffers', value: 'Protocol Buffers' },
  { label: 'NDJSON', value: 'NDJSON' },
  { label: 'ORC', value: 'ORC' },
] as const;

export const DATA_STANDARD_OPTIONS = [
  { label: 'DCAT-AP 2.1', value: 'DCAT-AP 2.1' },
  { label: 'DCAT-AP 3.0', value: 'DCAT-AP 3.0' },
  { label: 'NGSI-LD', value: 'NGSI-LD' },
  { label: 'JSON-LD', value: 'JSON-LD' },
  { label: 'OpenAPI 3.0', value: 'OpenAPI 3.0' },
  { label: 'TMForum OpenAPI', value: 'TMForum OpenAPI' },
  { label: 'Dublin Core', value: 'Dublin Core' },
  { label: 'ISO 8000', value: 'ISO 8000' },
  { label: 'OWL', value: 'OWL' },
  { label: 'SKOS', value: 'SKOS' },
] as const;

export const LICENSE_OPTIONS = [
  { label: 'CC0 1.0', value: 'CC0 1.0' },
  { label: 'CC BY 4.0', value: 'CC BY 4.0' },
  { label: 'CC BY-SA 4.0', value: 'CC BY-SA 4.0' },
  { label: 'CC BY-NC 4.0', value: 'CC BY-NC 4.0' },
  { label: 'CC BY-ND 4.0', value: 'CC BY-ND 4.0' },
  { label: 'MIT', value: 'MIT' },
  { label: 'Apache 2.0', value: 'Apache 2.0' },
  { label: 'GPL v3', value: 'GPL v3' },
  { label: 'Propietaria', value: 'Propietaria' },
] as const;

export const HTTP_METHOD_OPTIONS = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
] as const;

export const AUTH_TYPE_OPTIONS = [
  { label: 'Ninguna', value: 'none' },
  { label: 'API Key', value: 'apiKey' },
  { label: 'Bearer Token', value: 'bearer' },
  { label: 'OAuth2', value: 'oauth2' },
  { label: 'Basic', value: 'basic' },
] as const;
