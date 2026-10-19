import test from 'node:test';
import assert from 'node:assert/strict';
import { planDay, clockLabel, phMinute, validBlock, adjustBlock, blockMinutes } from '../lib/seneca/utils/horizon.ts';
const block = (start, end) => ({ id: `${start}`, title: 'Focus', start, end, category: 'personal', taskKey: '', tone: 'sage' });
test('overlapping blocks use separate lanes and count occupied time once', () => {
  const p = planDay([block(480, 600), block(540, 660), block(660, 720)]);
  assert.equal(p.covered, 240); assert.equal(p.overlap, 60); assert.equal(p.lanes, 2);
  assert.equal(p.placed[2].lane, 0);
});
test('overnight sleep splits at midnight without losing duration', () => {
  const p = planDay([block(1380, 420)]);
  assert.equal(p.covered, 480); assert.equal(p.placed.length, 2); assert.equal(p.lanes, 1);
});
test('reject zero duration and invalid times', () => {
  for (const b of [block(60,60),block(-1,60),block(0,1441),block(NaN,60)]) assert.equal(validBlock(b),false);
});
test('12 hour labels and Philippine midnight are independent of host timezone', () => {
  assert.equal(clockLabel(0),'12 AM'); assert.equal(clockLabel(1440),'12 AM'); assert.equal(clockLabel(780),'1 PM');
  assert.equal(phMinute(new Date('2026-10-05T16:00:00Z')),0);
});

test('moving and resizing preserve valid overnight intervals and five-minute snaps', () => {
  const b = block(1380, 420);
  const moved = adjustBlock(b, 'move', 63);
  assert.equal(moved.start, 5); assert.equal(blockMinutes(moved),480);
  assert.equal(blockMinutes(adjustBlock(b,'end',-1000)),5);
  assert.equal(blockMinutes(adjustBlock(b,'start',-2000)),1435);
  assert.equal(adjustBlock(block(480,540),'end',30).end,570);
  assert.equal(adjustBlock(block(480,540),'start',-30).start,450);
});
