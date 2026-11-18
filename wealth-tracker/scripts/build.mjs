import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('app/index.html', 'utf8');
const auth = readFileSync('server/access.js', 'utf8');
const worker = readFileSync('server/worker.js', 'utf8');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/worker.mjs', 'const dashboard = ' + JSON.stringify(html) + ';\n' + auth + '\n' + worker);
