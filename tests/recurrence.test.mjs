import test from 'node:test';
import assert from 'node:assert/strict';
import { repeatDates, recurringCategoryGoals } from '../src/services/recurrence.ts';

test('daily and weekly repeats include the end date', () => {
  assert.deepEqual(repeatDates('2026-11-02', '2026-11-04', 'daily', []), ['2026-11-02', '2026-11-03', '2026-11-04']);
  assert.deepEqual(repeatDates('2026-11-02', '2026-11-16', 'weekly', []), ['2026-11-02', '2026-11-09', '2026-11-16']);
});
test('custom weekdays support MWF and Monday/Friday', () => {
  assert.deepEqual(repeatDates('2026-11-02', '2026-11-08', 'custom', [1,3,5]), ['2026-11-02', '2026-11-04', '2026-11-06']);
  assert.deepEqual(repeatDates('2026-11-02', '2026-11-08', 'custom', [1,5]), ['2026-11-02', '2026-11-06']);
});
test('daily recurrence crosses daylight saving without skipping dates', () => {
  assert.deepEqual(repeatDates('2026-10-31', '2026-11-02', 'daily', []), ['2026-10-31', '2026-11-01', '2026-11-02']);
});
test('invalid and unbounded session repeats are rejected', () => {
  for (const args of [['2026-11-02','','daily',[]], ['2026-11-02','2026-11-01','daily',[]], ['2026-11-02','2028-11-02','daily',[]], ['2026-11-02','2026-11-08','custom',[]]]) assert.throws(() => repeatDates(...args));
});
test('category rules honor scope, weekdays, date limits and later changes', () => {
  const rule = {id:'1',category:'Reading',hours:1,scope:'day',start:'2026-11-02',until:'2026-11-09',days:[1,5]};
  assert.deepEqual(recurringCategoryGoals([rule], 'day', '2026-11-06'), {Reading:1});
  assert.deepEqual(recurringCategoryGoals([rule], 'day', '2026-11-07'), {});
  assert.deepEqual(recurringCategoryGoals([rule], 'day', '2026-11-13'), {});
  assert.deepEqual(recurringCategoryGoals([rule], 'week', '2026-11-02'), {});
  assert.deepEqual(recurringCategoryGoals([rule, {...rule,id:'2',hours:2,start:'2026-11-06'}], 'day', '2026-11-06'), {Reading:2});
});
