import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ownership = readFileSync('shared/ownership.js', 'utf8');
const html = readFileSync('app/index.html', 'utf8').replace('/* OWNERSHIP_HELPERS */', ownership);
const auth = readFileSync('server/access.js', 'utf8');
const worker = readFileSync('server/worker.js', 'utf8');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/worker.mjs', 'const dashboard = ' + JSON.stringify(html) + ';\n' + auth + '\n' + ownership + '\n' + worker);

