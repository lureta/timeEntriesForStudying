import test from 'node:test';
import assert from 'node:assert/strict';
import { changedSettings, mergeWorkspace } from '../src/services/workspaceData.ts';

test('cloud settings take precedence without dropping local fields not yet uploaded', () => {
  const defaults = { goal: 20, tasks: { tasks: [] }, wallpaper: '', themes: [] };
  const legacy = { goal: 12, tasks: { tasks: [{ id: 'local' }] }, wallpaper: 'data:image/png;base64,example' };
  const remote = { goal: 30, themes: [{ id: 'saved-theme' }] };
  const merged = mergeWorkspace(defaults, legacy, remote);
  assert.equal(merged.goal, 30);
  assert.equal(merged.tasks.tasks[0].id, 'local');
  assert.equal(merged.wallpaper, legacy.wallpaper);
  assert.equal(merged.themes[0].id, 'saved-theme');
  assert.deepEqual(changedSettings(merged, remote).sort(), ['tasks', 'wallpaper']);
});

test('saving a note does not overwrite another device’s settings', () => {
  const baseline = { note: 'old', goal: 20, colors: ['#ffd1dc'] };
  const local = { ...baseline, note: 'new' };
  const changed = changedSettings(local, baseline);
  assert.deepEqual(changed, ['note']);
  const server = { ...baseline, goal: 40 };
  for (const key of changed) server[key] = local[key];
  assert.equal(server.goal, 40);
  assert.equal(server.note, 'new');
});

test('empty task lists, cleared notes, and theme deletions sync as values', () => {
  const previous = { tasks: [{ id: 'task' }], note: 'hello', themes: [{ id: 'theme' }] };
  const cleared = { tasks: [], note: '', themes: [] };
  assert.deepEqual(changedSettings(cleared, previous), ['tasks', 'note', 'themes']);
  assert.deepEqual(mergeWorkspace(cleared, previous, cleared), cleared);
});

test('unknown or invalid top-level remote settings cannot replace defaults', () => {
  assert.deepEqual(mergeWorkspace({ goal: 20, colors: [], note: '' }, {}, { goal: null, colors: 'bad', note: '', unknown: true }), { goal: 20, colors: [], note: '' });
});
