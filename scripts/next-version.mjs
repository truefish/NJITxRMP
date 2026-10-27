import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const parse = tag => /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag) ? tag.slice(1).split('.').map(Number) : null;
const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const tags = args => execFileSync('git', ['tag', '--list', ...args], { encoding: 'utf8' }).trim().split(/\r?\n/).map(parse).filter(version => version && version.every(part => part <= 65535)).sort(compare);
const existing = process.env.GITHUB_SHA ? tags(['--points-at', process.env.GITHUB_SHA]).at(-1) : null;
let version = existing ?? [1, 0, 0];
if (!existing) {
  const latest = tags([]).at(-1);
  if (latest && compare(latest, version) >= 0) {
    version = [...latest];
    for (let i = 2; i >= 0; i--) {
      if (version[i] < 65535) { version[i]++; break; }
      if (i === 0) throw new Error('No higher browser-compatible version is available.');
      version[i] = 0;
    }
  }
}
const value = version.join('.');
if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `RELEASE_VERSION=${value}\nRELEASE_TAG=v${value}\n`);
console.log(`v${value}`);
