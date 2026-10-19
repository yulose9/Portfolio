import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPortfolio, selectStudy, finishStudy, studyKey } from '../lib/seneca/utils/studyPortfolio.ts';

const first = { id: 'one', name: 'First subject' };
const second = { id: 'two', name: 'Second subject' };
test('migration preserves legacy history without mutating the source', () => {
  const history = { '2026-10-11': true };
  const p = initialPortfolio(first, history);
  assert.deepEqual(p.subjects.one.history, history);
  p.subjects.one.history['2026-10-12'] = true;
  assert.equal(history['2026-10-12'], undefined);
});
test('one subject by default, independent histories survive switching', () => {
  const original = initialPortfolio(first, { '2026-10-11': true });
  const next = selectStudy(original, second);
  assert.equal(next.subjects.one.active, false);
  assert.deepEqual(next.subjects.two.history, {});
  const back = selectStudy(next, first);
  assert.equal(back.subjects.one.history['2026-10-11'], true);
  assert.equal(back.subjects.two.active, false);
  assert.equal(original.subjects.one.active, true);
});
test('parallel study and completion preserve history and advance focus', () => {
  const p = selectStudy({ ...initialPortfolio(first, { '2026-10-11': true }), multiple: true }, second);
  assert.equal(p.subjects.one.active, true);
  const done = finishStudy(p, '2026-10-12');
  assert.equal(done.subjects.two.passedAt, '2026-10-12');
  assert.equal(done.subjects.two.goal.status, 'done');
  assert.equal(done.focusedId, studyKey(first));
  assert.deepEqual(done.subjects.one.history, { '2026-10-11': true });
  assert.equal(finishStudy(done, '2026-10-12').focusedId, null);
});
test('external subject IDs cannot change the subjects object prototype', () => {
  const p = selectStudy(initialPortfolio(null), { id: '__proto__', name: 'Imported subject' });
  assert.equal(Object.getPrototypeOf(p.subjects), Object.prototype);
  assert.equal(Object.prototype.hasOwnProperty.call(p.subjects, '__proto__'), true);
  assert.equal(p.subjects.__proto__.goal.name, 'Imported subject');
});
