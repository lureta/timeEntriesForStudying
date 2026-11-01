import test from 'node:test';
import assert from 'node:assert/strict';
import { studyMetrics } from '../src/services/studyMetrics.ts';

test('drafts contribute to projection, only submissions contribute to actual', () => {
  const draft = { start: '09:00', end: '11:00', status: 'draft' };
  const submitted = { start: '12:00', end: '13:30', status: 'submitted' };
  assert.deepEqual(studyMetrics([draft, submitted]), { projected: 3.5, actual: 1.5, draft: 2 });
  assert.deepEqual(studyMetrics([{ ...draft, status: 'submitted' }, submitted]), { projected: 3.5, actual: 3.5, draft: 0 });
});
test('pending saves do not inflate plans or actuals', () => {
  assert.deepEqual(studyMetrics([{ start: '09:00', end: '10:00', status: 'draft', pending: true }]), { projected: 0, actual: 0, draft: 0 });
});
test('editing submitted time back into a draft reduces actual without losing planned hours', () => {
  assert.deepEqual(studyMetrics([{ start: '09:00', end: '10:00', status: 'draft' }]), { projected: 1, actual: 0, draft: 1 });
});

test('calendar minutes survive projected, actual, and formatted totals', async () => {
  const { formatDuration } = await import('../src/services/formatDuration.ts');
  const entries = [
    { start: '09:45', end: '10:52', status: 'draft' },
    { start: '12:13', end: '13:42', status: 'submitted' },
  ];
  const metrics = studyMetrics(entries);
  assert.equal(formatDuration(metrics.projected), '2h 36m');
  assert.equal(formatDuration(metrics.actual), '1h 29m');
  assert.equal(formatDuration(metrics.draft), '1h 7m');
  assert.equal(formatDuration(studyMetrics([{ start: '09:00', end: '09:01', status: 'draft' }]).projected), '1m');
});
