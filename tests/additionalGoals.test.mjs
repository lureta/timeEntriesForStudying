import test from 'node:test';
import assert from 'node:assert/strict';
import { goalApplies, entriesForGoal } from '../src/services/additionalGoals.ts';
const goal = {id:'g', name:'Prep', hours:2, categories:null, scope:'day', date:'2026-11-02', repeat:'none', days:[1,3,5], until:''};
test('one-off goals belong only to their day and scope', () => {
 assert.equal(goalApplies(goal,'day','2026-11-02'),true);
 assert.equal(goalApplies(goal,'day','2026-11-03'),false);
 assert.equal(goalApplies(goal,'week','2026-11-02'),false);
});
test('recurring goals respect weekdays and their date boundaries', () => {
 const recurring = {...goal, repeat:'custom', until:'2026-11-06'};
 assert.equal(goalApplies(recurring,'day','2026-11-04'),true);
 assert.equal(goalApplies(recurring,'day','2026-11-03'),false);
 assert.equal(goalApplies(recurring,'day','2026-11-09'),false);
 assert.equal(goalApplies({...goal,repeat:'weekly'},'day','2026-11-09'),true);
 assert.equal(goalApplies({...goal,scope:'week',repeat:'weekly'},'week','2026-11-16'),true);
});

test('selected goal limits the breakdown to its categories without duplicating sessions', () => {
 const entries = [{course:'Projects'}, {course:'Leetcode'}, {course:'Jobs'}, {course:'Reading'}];
 assert.deepEqual(entriesForGoal(entries, {categories:['Projects','Leetcode','Jobs']}), entries.slice(0,3));
 assert.deepEqual(entriesForGoal(entries, {categories:null}), entries);
 assert.deepEqual(entriesForGoal(entries), entries);
 assert.deepEqual(entriesForGoal(entries, {categories:['Projects','Projects']}), [entries[0]]);
});
