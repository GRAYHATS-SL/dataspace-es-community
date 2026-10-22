import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { load } from 'js-yaml';
import type { JsonObject } from 'swagger-ui-express';

const OPENAPI_PATH = fileURLToPath(new URL('../../../openapi.yaml', import.meta.url));

/** OpenAPI 3.0 document of `reviews-api`. */
export const openapiDocument = load(readFileSync(OPENAPI_PATH, 'utf8')) as JsonObject;
