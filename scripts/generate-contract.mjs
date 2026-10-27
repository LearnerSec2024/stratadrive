import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export function generatedSchemas(document) {
  const definitions = structuredClone(document.components.schemas);
  function rewrite(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.$ref === 'string') value.$ref = value.$ref.replace('#/components/schemas/', '#/$defs/');
    for (const child of Object.values(value)) rewrite(child);
  }
  rewrite(definitions);
  return JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', $defs: definitions }, null, 2) + '\n';
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const document = parse(readFileSync(join(root, 'contracts/openapi.yaml'), 'utf8'));
  const output = generatedSchemas(document);
  const target = join(root, 'src/server/enquiries/schema.generated.json');
  if (process.argv[2] === '--check') {
    if (readFileSync(target, 'utf8') !== output) { console.error('Generated enquiry schema is stale; run npm run contracts:generate.'); process.exitCode = 1; }
    else console.log('Generated enquiry schemas match canonical OpenAPI.');
  } else if (process.argv.length === 2) { writeFileSync(target, output); console.log('Generated enquiry schemas.'); }
  else { console.error('Usage: generate-contract.mjs [--check]'); process.exitCode = 1; }
}
