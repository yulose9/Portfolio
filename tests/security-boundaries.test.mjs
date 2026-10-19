import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(code, { exports, Request, Response, Headers, URL, Uint8Array, TextDecoder,
    crypto, console, process: { env: {} }, require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    }, ...globals });
  return exports;
}

test('analytics forwards payload but never first-party credentials or referrers', async () => {
  let outgoing;
  const proxy = load('functions/ingest/[[path]].js', {}, { fetch: async (url, init) => {
    outgoing = { url, ...init }; return new Response('ok');
  } });
  const response = await proxy.onRequest({ request: new Request('https://site.test/ingest/e/', {
    method: 'POST', body: 'hello', headers: {
      'Content-Type': 'text/plain', Cookie: 'private', Authorization: 'Bearer secret',
      'Cf-Access-Jwt-Assertion': 'secret', 'Cf-Access-Client-Secret': 'secret',
      Referer: 'https://site.test/admin?entry=private', 'X-Future-Secret': 'private',
    },
  }) });
  assert.equal(response.status, 200);
  for (const key of ['cookie', 'authorization', 'cf-access-jwt-assertion', 'cf-access-client-secret', 'referer', 'x-future-secret']) {
    assert.equal(outgoing.headers.has(key), false, key);
  }
  assert.equal(new TextDecoder().decode(outgoing.body), 'hello');
  assert.equal(outgoing.redirect, 'error');
  assert.equal(outgoing.url, 'https://us.i.posthog.com/e/');
});

test('analytics refuses chunked oversized bodies and asset mutations before forwarding', async () => {
  const proxy = load('functions/ingest/[[path]].js', {}, { fetch: () => { throw new Error('must not forward'); } });
  const large = await proxy.onRequest({ request: new Request('https://site.test/ingest/e/', {
    method: 'POST', body: new Uint8Array(2 * 1024 * 1024 + 1), headers: { 'Content-Length': '1' },
  }) });
  assert.equal(large.status, 413);
  assert.equal((await proxy.onRequest({ request: new Request('https://site.test/ingest/static/x', { method: 'POST' }) })).status, 405);
});

test('public GitHub embeds never use publisher credentials or old privileged caches', async () => {
  const calls = [];
  const api = load('functions/api/github.ts', { '../../cms/embeds': { parseEmbed: () => null } }, {
    caches: { default: { match: async req => { assert.equal(new URL(req.url).searchParams.get('__public_cache'), '2'); }, put: async () => {} } },
    fetch: async (url, init) => {
      calls.push({ url, init });
      assert.equal(new Headers(init.headers).has('Authorization'), false);
      return new Response('{}', { status: 404 });
    },
  });
  const env = { GITHUB_TOKEN: 'privileged-fixture-token' };
  for (const query of ['owner=owner&repo=private', 'owner=owner&repo=private&format=issue&number=1']) {
    assert.equal((await api.onRequestGet({ env, request: new Request(`https://site.test/api/github?${query}`) })).status, 200);
  }
  assert.equal(calls.length, 2);
  assert.equal((await api.onRequestGet({ env, request: new Request('https://site.test/api/github?owner=..&repo=private') })).status, 400);
});

test('production static admin endpoint cannot manufacture an identity', async () => {
  const { GET } = load('app/api/admin/me/route.ts', { 'next/server': { NextResponse: Response } }, { process: { env: { NODE_ENV: 'production' } } });
  const response = await GET();
  assert.equal(response.status, 401);
  assert.equal((await response.json()).email, undefined);
});

test('private telemetry is dropped and public errors omit payloads and URL tokens', () => {
  const { privateSafeError, privateTelemetryCollection: collection } = load('lib/telemetryPrivacy.ts');
  assert.equal(collection.userInfo, false);
  assert.equal(collection.httpHeaders, false);
  assert.equal(collection.httpBodies.length, 0);
  assert.equal(collection.genAI.inputs, false);
  assert.equal(collection.genAI.outputs, false);
  assert.equal(collection.stackFrameVariables, false);
  for (const path of ['/admin/seneca', '/api/admin/me', '/seneca', '/%61dmin']) {
    assert.equal(privateSafeError({ request: { url: `https://site.test${path}` } }), null);
  }
  const result = privateSafeError({
    user: { email: 'secret' }, extra: { journal: 'secret' }, message: 'secret',
    breadcrumbs: [{ message: 'secret' }], request: { url: 'https://site.test/?token=secret', headers: { Cookie: 'secret' } },
    exception: { values: [{ type: 'Error', value: 'secret', stacktrace: { frames: [{ filename: 'https://site.test/app.js?token=secret', lineno: 10, vars: { secret: true } }] } }] },
  });
  assert.doesNotMatch(JSON.stringify(result), /secret/);
  assert.equal(result.exception.values[0].stacktrace.frames[0].lineno, 10);
});

test('uploads fail closed on decoding errors and session changes', async () => {
  const auth = { currentUser: { uid: 'owner-a' } };
  let mode = 'fail'; let writes = 0;
  const jpeg = new Blob([new Uint8Array([255, 216, 255, 0])], { type: 'image/jpeg' });
  const service = load('lib/seneca/services/storageService.ts', {
    'browser-image-compression': { default: async () => {
      if (mode === 'fail') throw new Error('decode failed');
      if (mode === 'switch') auth.currentUser = { uid: 'owner-b' };
      return jpeg;
    } }, './firebase': { auth, storage: {} },
    'firebase/storage': {
      ref: (_, path) => { assert.match(path, /^users\/owner-a\/uploads\/[\w-]+\.jpg$/); return path; },
      uploadBytes: async (ref, _, metadata) => { writes++; assert.equal(metadata.cacheControl, 'private, no-store'); return { ref }; },
      getDownloadURL: async () => 'https://storage.test/result',
    },
  }).storageService;
  const file = { type: 'image/jpeg', size: 100, name: 'private-person.jpg' };
  await assert.rejects(service.uploadImage(file), /decode failed/);
  mode = 'switch';
  await assert.rejects(service.uploadImage(file), /session changed/);
  assert.equal(writes, 0);
  auth.currentUser = { uid: 'owner-a' }; mode = 'success';
  assert.equal(await service.uploadImage(file), 'https://storage.test/result');
  assert.equal(writes, 1);
});

test('public polls reject null, arrays and oversized bodies without storage access', async () => {
  const http = load('cms/server/http.ts');
  const api = load('functions/api/polls/[id].ts', {
    '../../../cms/blocks': { POLL_ID: /^test$/ }, '../../../cms/server/http': http,
    '../../../cms/server/poll-store': {},
  });
  for (const [body, status] of [['null', 400], ['[]', 400], ['x'.repeat(1025), 413]]) {
    const response = await api.onRequestPost({ env: { POLLS: {} }, params: { id: 'test' }, request: new Request('https://site.test/api/polls/test', { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }) });
    assert.equal(response.status, status);
  }
});

test('admin boundary fails closed and verifies audience, identity and write origin', async () => {
  const http = load('cms/server/http.ts');
  let called = 0;
  let email = 'owner@example.test';
  const middleware = load('functions/api/admin/_middleware.ts', {
    '../../../cms/server/http': http,
    '../../../cms/server/github': { GitHubError: class extends Error {} },
    '../../../cms/server/publish': { PublishError: class extends Error {} },
    jose: {
      createRemoteJWKSet: url => { assert.equal(url.href, 'https://team.cloudflareaccess.com/cdn-cgi/access/certs'); return {}; },
      jwtVerify: async (_, __, options) => {
        assert.equal(options.issuer, 'https://team.cloudflareaccess.com');
        assert.equal(options.audience, 'expected-audience');
        assert.deepEqual(Array.from(options.algorithms), ['RS256']);
        assert.ok(options.requiredClaims.includes('exp'));
        return { payload: { type: 'app', sub: 'fixture', email, exp: 2000000000 } };
      },
    },
  });
  const env = { ACCESS_TEAM_DOMAIN: 'https://team.cloudflareaccess.com', ACCESS_AUD: 'expected-audience', ADMIN_EMAIL: email, ADMIN_DEV_BYPASS: '1' };
  const invoke = (headers = {}, method = 'GET', settings = env) => middleware.onRequest({
    env: settings, data: {}, request: new Request('https://site.test/api/admin/posts', { method, headers }),
    next: async () => { called++; return new Response('{}'); },
  });
  assert.equal((await invoke({}, 'GET', {})).status, 503);
  assert.equal((await invoke()).status, 401, 'production cannot use local bypass');
  const signed = { 'Cf-Access-Jwt-Assertion': 'fixture' };
  email = 'other@example.test';
  assert.equal((await invoke(signed)).status, 403);
  email = 'owner@example.test';
  assert.equal((await invoke(signed, 'POST')).status, 403);
  const response = await invoke({ ...signed, Origin: 'https://site.test', 'X-Admin-Request': '1' }, 'POST');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(called, 1);
});
