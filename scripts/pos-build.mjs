/**
 * Pós-build: GitHub Pages não tem servidor para reescrever rota. Um deep link como
 * /usuarios responde 404, e o Pages serve `404.html` nesse caso — que é a mesma SPA.
 * `basename` resolve o prefixo dentro da aplicação; isto resolve a ausência de servidor (R-04).
 */
import { copyFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const origem = join(dist, 'index.html');
const destino = join(dist, '404.html');

await access(origem);
await copyFile(origem, destino);

console.log('pos-build: dist/index.html copiado para dist/404.html');
