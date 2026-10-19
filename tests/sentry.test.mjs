import test from 'node:test';
import assert from 'node:assert/strict';

test('Sentry off switch prevents initialization, integration construction and hooks in every runtime', async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const { default: ts } = await import('typescript');
  for (const enabled of [false, true]) {
    for (const file of ['instrumentation-client.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts', 'instrumentation.ts']) {
      const calls = [];
      const sdk = new Proxy({}, { get: (_, name) => (...args) => { calls.push(String(name)); return args; } });
      const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      const exports = {};
      runInNewContext(output, { exports, process: { env: {} }, require: name => name.endsWith('sentry.settings.json') ? { enabled } : sdk });
      exports.onRouterTransitionStart?.('/test', 'push');
      exports.onRequestError?.(new Error('fixture'), {}, {});
      if (exports.register) await exports.register();
      if (!enabled) assert.deepEqual(calls, [], `${file} must do nothing when disabled`);
      else assert.ok(calls.length > 0, `${file} remains active when enabled`);
    }
  }
  assert.match(readFileSync('next.config.js', 'utf8'), /module\.exports = sentryEnabled \?/);
});

test('Sentry configuration files exist and export properly', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  assert.ok(!fs.existsSync(path.resolve('sentry.client.config.ts')), 'legacy client initialization must not coexist with instrumentation-client.ts');
  assert.ok(fs.existsSync(path.resolve('sentry.server.config.ts')), 'sentry.server.config.ts should exist');
  assert.ok(fs.existsSync(path.resolve('sentry.edge.config.ts')), 'sentry.edge.config.ts should exist');
  assert.ok(fs.existsSync(path.resolve('instrumentation.ts')), 'instrumentation.ts should exist');
  assert.ok(fs.existsSync(path.resolve('instrumentation-client.ts')), 'instrumentation-client.ts should exist');
  assert.ok(!fs.existsSync(path.resolve('app/(site)/sentry-example-page')), 'the public verification page must not ship');
  assert.ok(fs.existsSync(path.resolve('lib/sentry-logger.ts')), 'sentry-logger.ts should exist');
});

test('browser Sentry has one initialization owner, never a page or layout import', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const client = readFileSync('instrumentation-client.ts', 'utf8');
  assert.equal((client.match(/Sentry\.init\(/g) || []).length, 1);
  assert.equal((client.match(/Sentry\.replayIntegration\(/g) || []).length, 0, 'private content must not install replay');
  assert.match(client, /export const onRouterTransitionStart = enabled && !privatePage \? Sentry\.captureRouterTransitionStart/);
  assert.match(client, /if \(enabled && !privatePage\) Sentry\.init\(/, 'the SDK must not load on private pages');
  function check(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) check(file);
      else if (/\.[jt]sx?$/.test(file)) {
        const source = readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /(?:sentry\.client\.config|SentryInitializer|["'][^"']*instrumentation-client["']|Sentry\.init\(|Sentry\.replayIntegration\()/, file);
      }
    }
  }
  check('app');
});

test('lib/sentry-logger module exports all observability methods', async () => {
  const { sentryLogger } = await import('../lib/sentry-logger');
  assert.equal(typeof sentryLogger.info, 'function');
  assert.equal(typeof sentryLogger.warn, 'function');
  assert.equal(typeof sentryLogger.error, 'function');
  assert.equal(typeof sentryLogger.traceOperation, 'function');
  assert.equal(typeof sentryLogger.traceAgentRun, 'function');
  assert.equal(typeof sentryLogger.recordConversationTurn, 'function');
});
