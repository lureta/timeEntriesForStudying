import test from 'node:test';
import assert from 'node:assert/strict';
import { youtubeVideoId } from '../src/services/youtube.ts';
test('accepts YouTube video and live links, rejects other hosts and invalid IDs', () => {
 for (const url of ['https://www.youtube.com/watch?v=jfKfPfyJRdk', 'https://youtu.be/jfKfPfyJRdk?t=30', 'https://www.youtube.com/live/jfKfPfyJRdk']) assert.equal(youtubeVideoId(url), 'jfKfPfyJRdk');
 for (const url of ['https://youtube.com.evil.test/watch?v=jfKfPfyJRdk', 'javascript:alert(1)', 'https://youtube.com/watch?v=bad']) assert.equal(youtubeVideoId(url), null);
});
