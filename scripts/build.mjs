import { build } from 'esbuild';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
const version = process.env.RELEASE_VERSION?.replace(/^v/, '') || '1.0.0';
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) || version.split('.').some(part => Number(part) > 65535) || version.split('.').every(part => Number(part) === 0)) throw new Error('RELEASE_VERSION must contain three integers from 0 to 65535, without leading zeros, and cannot be all zero.');
for (const browser of ['chrome', 'firefox']) {
  const outdir = `dist/${browser}`; await mkdir(outdir, { recursive: true });
  await build({ entryPoints: ['src/background.ts', 'src/content.ts'], outdir, bundle: true, minify: true, format: 'iife', target: ['chrome120', 'firefox140'], legalComments: 'none' });
  const manifest = { manifest_version: 3, name: 'NJITxRMP', version, description: 'Rate My Professors ratings beside instructors in NJIT Course Schedule and Plan Ahead.', permissions: ['storage'], host_permissions: ['https://www.ratemyprofessors.com/*'], background: browser === 'chrome' ? { service_worker: 'background.js' } : { scripts: ['background.js'] }, content_scripts: [{ matches: ['https://generalssb-prod.ec.njit.edu/BannerExtensibility/customPage/page/stuRegCrseSched*', 'https://reg-prod.ec.njit.edu/StudentRegistrationSsb/ssb/plan/*'], js: ['content.js'], run_at: 'document_idle' }] };
  if (browser === 'firefox') manifest.browser_specific_settings = { gecko: { id: 'njitxrmp@extensions.local', strict_min_version: '140.0', data_collection_permissions: { required: ['websiteContent', 'searchTerms'] } } };
  await writeFile(`${outdir}/manifest.json`, JSON.stringify(manifest, null, 2));
  for (const name of ['LICENSE', 'NOTICE']) await copyFile(name, `${outdir}/${name}`);
}
