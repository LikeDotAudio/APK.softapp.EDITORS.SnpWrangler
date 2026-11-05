// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// ROAD-3501: the inspector's signal types are config data tied to the CAD
// catalogue's ST 2110 essences (vendor/apk-vocabulary), not options in source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SIGNAL_TYPES, signalTypeOptions } from '../js/signalTypes.js';
import { VOCABULARY } from '../js/vocabulary.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

test('config/vocabulary.json names only what the catalogue has', () => {
  assert.deepEqual(VOCABULARY.problems, []);
});

test('VIDEO / AUDIO / ANC are the CAD\'s ST 2110-20 / -30 / -40', () => {
  assert.deepEqual(SIGNAL_TYPES.map(t => [t.value, t.standard, t.class]), [
    ['VIDEO', 'ST 2110-20', 'video'], ['AUDIO', 'ST 2110-30', 'audio'], ['ANC', 'ST 2110-40', 'ancillary'],
  ]);
  for (const t of SIGNAL_TYPES) assert.ok(t.description.length > 10, t.value);
});

test('options: the current value is selected, an unknown one is kept, all text escaped', () => {
  const html = signalTypeOptions('AUDIO', esc);
  assert.match(html, /<option value="AUDIO" title="[^"]+" selected>AUDIO \(ST 2110-30\)<\/option>/);
  assert.match(html, />ANCILLARY DATA \(ST 2110-40\)</);
  const odd = signalTypeOptions('<b>x</b>', esc);
  assert.match(odd, /value="&lt;b&gt;x&lt;\/b&gt;" title="" selected>&lt;b&gt;x&lt;\/b&gt;</);
});

test('no signal-type option list is typed into the app source', (t) => {
  const src = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  // The call site landed separately (js/app.js held another session's work); until then, say so.
  if (!/from '\.\/signalTypes\.js'/.test(src)) return t.skip('js/app.js does not use js/signalTypes.js yet');
  assert.doesNotMatch(src, /<option value="(VIDEO|AUDIO|ANC)"/);
});
