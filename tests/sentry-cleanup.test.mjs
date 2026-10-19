import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { removalPlan, applyRemoval } from '../scripts/manage-sentry.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-cleanup-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, text) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
  write('package.json', JSON.stringify({ scripts: { 'sentry:on': 'on', 'sentry:off': 'off', build: 'next build' }, dependencies: { '@sentry/nextjs': '11', next: '15' } }));
  write('next.config.js', 'const nextConfig = { images: { unoptimized: true } };\n// BEGIN OPTIONAL SENTRY\nmodule.exports = withSentryConfig(nextConfig);\n// END OPTIONAL SENTRY\n');
  write('sentry.settings.json', '{"enabled":true}');
  write('instrumentation-client.ts', 'Sentry.init({});');
  write('lib/sentry-logger.ts', 'export const sentryLogger = {};');
  write('app/global-error.tsx', 'import * as Sentry from "@sentry/nextjs";\nfunction errorPage(error) {\n Sentry.captureException(error);\n console.error(error);\n return "Try again";\n}');
  write('.env.local', 'OTHER_TOKEN=keep\nSENTRY_AUTH_TOKEN=private\nNEXT_PUBLIC_SENTRY_DSN=example\n');
  write('public/_headers', '/keep\n  X-Test: yes\n  Document-Policy: js-profiling\n');
  return { root, write, read: name => fs.readFileSync(path.join(root, name), 'utf8') };
}

test('cleanup preview is read-only; apply preserves app fallback and unrelated settings', t => {
  const { root, read } = fixture(t);
  const plan = removalPlan(root);
  assert.match(read('sentry.settings.json'), /true/);
  assert.match(read('.env.local'), /private/);
  applyRemoval(root, plan);
  assert.equal(fs.existsSync(path.join(root, 'instrumentation-client.ts')), false);
  assert.doesNotMatch(read('app/global-error.tsx'), /Sentry/);
  assert.match(read('app/global-error.tsx'), /Try again/);
  assert.match(read('next.config.js'), /module.exports = nextConfig;/);
  assert.match(read('next.config.js'), /unoptimized/);
  assert.equal(read('.env.local'), 'OTHER_TOKEN=keep\n');
  assert.match(read('public/_headers'), /X-Test: yes/);
  assert.doesNotMatch(read('public/_headers'), /js-profiling/);
  assert.equal(JSON.parse(read('package.json')).scripts.build, 'next build');
  assert.equal(removalPlan(root).size, 0, 'safe to retry after an interrupted npm uninstall');
});

test('new Sentry consumer blocks cleanup before changes are made', t => {
  const { root, write, read } = fixture(t);
  write('app/new-feature.ts', 'import * as Sentry from "@sentry/nextjs";');
  assert.throws(() => removalPlan(root), /Additional Sentry dependency/);
  assert.match(read('sentry.settings.json'), /true/);
});

test('changed build configuration requires review instead of guessing what to remove', t => {
  const { root, write } = fixture(t);
  write('next.config.js', 'module.exports = customSentrySetup();');
  assert.throws(() => removalPlan(root), /configuration changed/);
});
