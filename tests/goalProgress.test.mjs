import test from 'node:test';
import assert from 'node:assert/strict';
import { goalProgress } from '../src/services/goalProgress.ts';

test('actual above goal fills the ring even with more projected hours', () => {
  assert.deepEqual(goalProgress(2.25, 7.25, 1), { actual: 1, projected: 1 });
});
test('actual and projected measure independently against the goal', () => {
  assert.deepEqual(goalProgress(1, 6, 10), { actual: .1, projected: .6 });
  assert.deepEqual(goalProgress(1, 20, 10), { actual: .1, projected: 1 });
});
test('equal goal, sub-hour goals, and empty data render correctly', () => {
  assert.equal(goalProgress(1, 5, 1).actual, 1);
  assert.deepEqual(goalProgress(.125, .25, .5), { actual: .25, projected: .5 });
  assert.deepEqual(goalProgress(0, 0, 0), { actual: 0, projected: 0 });
});
test('without a goal, the projection provides the scale', () => {
  assert.deepEqual(goalProgress(.25, .5, 0), { actual: .5, projected: 1 });
});
