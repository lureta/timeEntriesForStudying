import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = (path) => ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const moduleUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');

test('workspace sync hydrates before writing, isolates accounts, refreshes, and retries failed saves', async () => {
  let slots = [], cursor = 0, effects = [], rerender = true, timers = new Map(), timerId = 0;
  const listeners = new Map();
  const local = new Map();
  globalThis.localStorage = { getItem: (key) => local.get(key) ?? null, setItem: (key, value) => local.set(key, value) };
  globalThis.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  globalThis.window = {
    setTimeout: (fn) => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id), setInterval: () => ++timerId, clearInterval() {},
    addEventListener: (name, fn) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener: (name, fn) => listeners.get(name)?.delete(fn),
  };
  globalThis.__syncReact = {
    useRef: (value) => { const i = cursor++; return slots[i] ??= { current: value }; },
    useState: (initial) => {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, (value) => { const next = typeof value === 'function' ? value(slots[i].value) : value; if (!Object.is(next, slots[i].value)) { slots[i].value = next; rerender = true; } }];
    },
    useEffect: (callback, deps) => {
      const i = cursor++, old = slots[i];
      if (!old || deps.some((value, index) => !Object.is(value, old.deps[index]))) {
        effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: callback() }; });
      }
    },
  };
  const server = new Map([['a', { goal: 40, note: 'cloud' }], ['b', { goal: 60, note: 'other account' }]]);
  let writes = [], failWrite = false;
  globalThis.__syncClient = { from: () => ({
    select: () => ({ eq: async (_column, user) => ({ data: Object.entries(server.get(user) || {}).map(([key, value]) => ({ key, value })), error: null }) }),
    upsert: async (rows) => {
      if (failWrite) return { error: { message: 'offline' } };
      writes.push(rows);
      for (const row of rows) server.set(row.user_id, { ...server.get(row.user_id), [row.key]: row.value });
      return { error: null };
    },
  }) };
  let source = compile('src/hooks/useWorkspaceSync.ts')
    .replace(/import .* from "react";/, 'const { useEffect, useRef, useState } = globalThis.__syncReact;')
    .replace(/import .* from "..\/services\/supabase";/, 'const supabase = globalThis.__syncClient;')
    .replace('"../services/workspaceData"', JSON.stringify(moduleUrl(compile('src/services/workspaceData.ts'))));
  const { useWorkspaceSync } = await import(moduleUrl(source));
  let user = 'a', snapshot = { goal: 10, note: 'local' }, result;
  const defaults = { goal: 20, note: '' };
  const render = () => {
    rerender = false; cursor = 0; effects = [];
    result = useWorkspaceSync(user, snapshot, defaults, (next) => { snapshot = next; rerender = true; }, async () => ({}));
    for (const effect of effects) effect();
  };
  const settle = async () => { for (let i = 0; i < 12; i++) { if (rerender) render(); await new Promise((resolve) => setImmediate(resolve)); } };
  const flushSave = async () => { const pending = [...timers.values()]; timers.clear(); for (const fn of pending) await fn(); await settle(); };
  await settle();
  assert.equal(snapshot.note, 'cloud'); assert.equal(result.ready, true);
  await flushSave(); assert.equal(writes.length, 0, 'initial local state must not overwrite cloud data');
  snapshot = { ...snapshot, note: 'edited' }; rerender = true; await settle();
  assert.equal(result.pending, true);
  server.set('a', { ...server.get('a'), goal: 50 });
  await flushSave();
  assert.equal(server.get('a').note, 'edited'); assert.equal(server.get('a').goal, 50);
  assert.deepEqual(writes.at(-1).map((row) => row.key), ['note']);
  for (const fn of listeners.get('focus') || []) await fn(); await settle();
  assert.equal(snapshot.goal, 50, 'remote changes should refresh');
  failWrite = true; snapshot = { ...snapshot, note: 'retry me' }; rerender = true; await settle(); await flushSave();
  assert.match(result.error, /not synced/); assert.equal(snapshot.note, 'retry me');
  failWrite = false; result.retry(); await settle(); await flushSave();
  assert.equal(server.get('a').note, 'retry me'); assert.equal(result.error, '');
  user = 'b'; rerender = true; await settle(); await flushSave();
  assert.equal(snapshot.note, 'other account'); assert.equal(snapshot.goal, 60);
  assert.equal(server.get('a').note, 'retry me', 'switching accounts must not write the previous account into the next');
  for (const slot of slots) slot?.cleanup?.();
});
