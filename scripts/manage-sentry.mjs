import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const owned = [
  'sentry.settings.json', 'instrumentation-client.ts', 'instrumentation.ts',
  'sentry.server.config.ts', 'sentry.edge.config.ts', 'sentry.client.config.ts',
  'app/components/SentryInitializer.tsx', 'app/(site)/sentry-example-page/page.tsx',
  'lib/sentry-logger.ts', 'tests/sentry.test.mjs', 'tests/browser/sentry.spec.ts',
];

export function removalPlan(directory) {
  const changes = new Map();
  const read = name => fs.readFileSync(path.join(directory, name), 'utf8');
  const exists = name => fs.existsSync(path.join(directory, name));
  for (const name of owned) if (exists(name)) changes.set(name, null);
  const config = read('next.config.js');
  const block = /\/\/ BEGIN OPTIONAL SENTRY[\s\S]*?\/\/ END OPTIONAL SENTRY/;
  if (block.test(config)) changes.set('next.config.js', config.replace(block, 'module.exports = nextConfig;').replace(/\{\s*key: "Document-Policy",\s*value: "js-profiling",\s*\},?/, ''));
  else if (/sentry/i.test(config)) throw new Error('Sentry build configuration changed. Review next.config.js before removal.');
  if (exists('app/global-error.tsx')) {
    const before = read('app/global-error.tsx');
    const after = before.replace(/^import \* as Sentry from "@sentry\/nextjs";\r?\n/m, '')
      .replace(/^\s*Sentry\.captureException\(error\);\r?\n/m, '\n');
    if (after !== before) changes.set('app/global-error.tsx', after);
  }
  for (const name of fs.readdirSync(directory).filter(name => /^\.env(?:\.|$)/.test(name))) {
    if (!fs.statSync(path.join(directory, name)).isFile()) continue;
    const before = read(name);
    const after = before.split(/\r?\n/).filter(line => !/^\s*(?:export\s+)?(?:NEXT_PUBLIC_)?SENTRY_[A-Z_]+\s*=/.test(line) && !/^\s*#.*sentry/i.test(line)).join('\n');
    if (after !== before) changes.set(name, after);
  }
  if (exists('public/_headers')) {
    const before = read('public/_headers');
    const after = before.replace(/^\s*Document-Policy: js-profiling\r?\n/gm, '');
    if (after !== before) changes.set('public/_headers', after);
  }
  // Refuse to leave newly added SDK/helper imports broken by the uninstall.
  function check(folder) {
    if (!exists(folder)) return;
    for (const entry of fs.readdirSync(path.join(directory, folder), { withFileTypes: true })) {
      const name = `${folder}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Review linked source before removal: ${name}`);
      if (entry.isDirectory()) check(name);
      else if (/\.[cm]?[jt]sx?$/.test(name) && !owned.includes(name) && name !== 'tests/sentry-cleanup.test.mjs') {
        const source = changes.get(name) ?? read(name);
        if (/(?:from\s*|import\s*\(|require\s*\(|import\s*)['"][^'"\n]*(?:@sentry\/|sentry-logger|sentry\.settings|sentry\.client|SentryInitializer)/.test(source)) {
          throw new Error(`Additional Sentry dependency in ${name}. Migrate it before removal.`);
        }
      }
    }
  }
  for (const folder of ['app', 'lib', 'components', 'functions', 'tests']) check(folder);
  const pkg = JSON.parse(read('package.json'));
  if (pkg.scripts?.['sentry:on'] || pkg.scripts?.['sentry:off']) {
    delete pkg.scripts['sentry:on'];
    delete pkg.scripts['sentry:off'];
    changes.set('package.json', JSON.stringify(pkg, null, 2) + '\n');
  }
  return changes;
}

export function applyRemoval(directory, plan) {
  for (const [name, contents] of plan) {
    const target = path.resolve(directory, name);
    if (!target.startsWith(path.resolve(directory) + path.sep)) throw new Error('Cleanup target outside project');
    if (contents === null) fs.rmSync(target, { force: true }); // Exact files only, never recursive.
    else fs.writeFileSync(target, contents);
  }
}

function main() {
  const [action, ...flags] = process.argv.slice(2);
  if (!['on', 'off', 'remove'].includes(action) || flags.some(flag => flag !== '--apply')) throw new Error('Use on, off, or remove [--apply].');
  if (action !== 'remove') {
    const settingsPath = path.join(root, 'sentry.settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    fs.writeFileSync(settingsPath, JSON.stringify({ ...settings, enabled: action === 'on' }, null, 2) + '\n');
    console.log(`Sentry ${action}. Restart development or rebuild/redeploy production, then reload open tabs.`);
    return;
  }
  const plan = removalPlan(root);
  for (const [name, contents] of plan) console.log(`${contents === null ? 'Remove' : 'Update'} ${name}`);
  console.log('Uninstall @sentry/nextjs and @sentry/profiling-node; npm updates the lockfile and removes unused dependencies.');
  if (!flags.includes('--apply')) { console.log('Preview only. Apply with: npm run sentry:remove -- --apply'); return; }
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error('Run through npm: npm run sentry:remove -- --apply');
  applyRemoval(root, plan);
  const result = spawnSync(process.execPath, [npm, 'uninstall', '@sentry/nextjs', '@sentry/profiling-node', '--save', '--ignore-scripts'], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('Source cleanup finished; package uninstall failed. Retry npm run sentry:remove -- --apply.');
  console.log('Sentry removed. Run npm run typecheck and npm run build, then deploy. Remove SENTRY_* secrets from your hosting dashboard separately.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
