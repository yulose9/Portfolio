import test from "node:test";
import assert from "node:assert/strict";
import { authProblem } from "../lib/seneca/services/authErrors.ts";

const err = (code, message = `Firebase: Error (${code}).`) => Object.assign(new Error(message), { code });

test("closing the Google window is not an error", () => {
  assert.equal(authProblem(err("auth/popup-closed-by-user")), null);
  assert.equal(authProblem(err("auth/cancelled-popup-request")), null);
});

test("a build without Firebase settings says so, in words", () => {
  const p = authProblem(err("auth/api-key-not-valid.-please-pass-a-valid-api-key."));
  assert.match(p.title, /isn't connected/);
  assert.match(p.detail, /NEXT_PUBLIC_FIREBASE_/);
  assert.equal(authProblem(err("auth/invalid-api-key")).title, p.title);
});

test("an unlisted domain names the domain and where to add it", () => {
  const p = authProblem(err("auth/unauthorized-domain"), "nazarene.dev");
  assert.match(p.detail, /nazarene\.dev/);
  assert.match(p.detail, /Authorised domains/);
});

test("the owner check and unknown errors stay plain", () => {
  assert.equal(authProblem(new Error("Access Denied: This email is not authorized.")).code, "not-owner");
  const p = authProblem(err("auth/something-new"));
  assert.equal(p.title, "Couldn't sign in");
  assert.equal(p.code, "auth/something-new");
  assert.doesNotMatch(p.detail, /Firebase: Error/);
});
