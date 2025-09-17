import { Router } from 'express';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import { parse as parseYaml } from 'yaml';

const router = Router();
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const specPath = path.resolve(dirname, '..', '..', 'openapi', 'spec.yaml');
const raw = readFileSync(specPath, 'utf8');
const spec = parseYaml(raw);

// Optional: tweak servers dynamically based on env
const baseUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://api.cozycup.example.com'
    : 'http://localhost:3000';

spec.servers = [{ url: baseUrl }];

router.get('/swagger.json', (_req, res) => {
  res.json(spec);
});

router.use('/', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));

export default router;
