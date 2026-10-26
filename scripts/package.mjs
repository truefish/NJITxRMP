import { zipSync } from 'fflate';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
await mkdir('releases', { recursive: true });
for (const browser of ['chrome', 'firefox']) {
  const files = {};
  for (const name of await readdir(`dist/${browser}`)) files[name] = new Uint8Array(await readFile(`dist/${browser}/${name}`));
  await writeFile(`releases/NJITxRMP-${browser}.zip`, zipSync(files));
}
const source = {};
async function collect(dir = '') {
  for (const entry of await readdir(dir || '.', { withFileTypes: true })) {
    if (['node_modules', 'dist', 'releases', '.git'].includes(entry.name)) continue;
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await collect(path);
    else source[path] = new Uint8Array(await readFile(path));
  }
}
await collect();
await writeFile('releases/NJITxRMP-source.zip', zipSync(source));
