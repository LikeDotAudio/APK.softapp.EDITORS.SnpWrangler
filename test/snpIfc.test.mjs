// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// ROAD-3583: the SNP block's .ifc twin (js/snpIfc.js) — written byte-deterministically, read back to the same
// block, and saved with its .json through the vendored APKSoftapp.saveModel. IFC_OUT=<dir> npm test also writes
// the files there, for IfcOpenShell validate + the BIM oracle (DATABASE.server.BIM tools/ifc/editors_census.py).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { SnpModel } from '../js/snpModel.js';
import { snpToIfc, snpFromIfc, schemaOf } from '../js/snpIfc.js';

const require = createRequire(import.meta.url);
const { world } = require('./host-world.cjs');

function out(name, text) {
  if (!process.env.IFC_OUT) return;
  mkdirSync(process.env.IFC_OUT, { recursive: true });
  writeFileSync(join(process.env.IFC_OUT, name), text);
}

const BOUND = new SnpModel({
  id: 'snp_studio_a', unitName: 'SNP-CORE-01', mgmtIp: '10.200.1.51', deviceId: '00:07:F5:42:06:A2',
  bimId: 'imagine-communications/snp-platform-4a', hardwareName: 'Imagine Communications SNP-PLATFORM-4A',
}).toJSON();
BOUND.rows[2].enabled = false;

test('the default unit, bound to a part: the same block writes the same bytes, and reads back to the same block', () => {
  const a = snpToIfc(BOUND, { name: 'snp-core-01' });
  assert.equal(a, snpToIfc(JSON.parse(JSON.stringify(BOUND)), { name: 'snp-core-01' }));
  assert.match(a, /^ISO-10303-21;/);
  assert.equal(schemaOf(a), 'IFC4X3_ADD2');
  assert.match(a, /IFCCOMMUNICATIONSAPPLIANCE\('[^']+',#\d+,'SNP-CORE-01',\$,\$,#\d+,\$,'snp_studio_a',\.NETWORKAPPLIANCE\.\)/);
  assert.match(a, /IFCCOMMUNICATIONSAPPLIANCETYPE\('[^']+',#\d+,'Imagine Communications SNP-PLATFORM-4A'/);
  assert.equal((a.match(/IFCDISTRIBUTIONCIRCUIT\(/g) || []).length, BOUND.rows.length * 2, 'one circuit per leg');
  assert.equal((a.match(/IFCRELASSIGNSTOGROUP\(/g) || []).length, BOUND.rows.length * 2);
  assert.match(a, /'MacAddress',\$,IFCIDENTIFIER\('00:07:f5:42:06:a2'\)/);
  assert.match(a, /'MulticastGroup',\$,IFCLABEL\('239\.200\.2\.50'\)/);
  assert.match(a, /'Enabled',\$,IFCBOOLEAN\(\.F\.\)/);
  out('snp-bound.ifc', a);
  const b = snpFromIfc(a);
  assert.deepEqual(b, BOUND);
  assert.deepEqual(new SnpModel(b).toJSON(), BOUND, 'the model takes it as it is');
  assert.equal(snpToIfc(b, { name: 'snp-core-01' }), a, 'read and written again: the same file');
});

test('unbound, no part: the editor\'s own type; no MAC, no APK_Identity; a stream with no channels reads 0', () => {
  const m = new SnpModel({ id: 'snp_b', unitName: 'SNP-B', mgmtIp: '10.1.1.9', deviceId: 'SN-4401', rows: [
    { id: 'tx_9', signalType: 'ANC', txName: 'TC', enabled: true, primaryMulticast: '239.1.3.1', primaryDestPort: 5004,
      secondaryMulticast: '239.2.3.1', secondaryDestPort: 5006, audioChannels: 0, nickname: '' },
  ] }).toJSON();
  const a = snpToIfc(m, { name: 'snp-b' });
  out('snp-unbound.ifc', a);
  assert.match(a, /IFCCOMMUNICATIONSAPPLIANCETYPE\('[^']+',#\d+,'SNP',/);
  assert.doesNotMatch(a, /APK_Identity|APK_Part/);
  assert.match(a, /'ST2110-40'/);
  assert.deepEqual(snpFromIfc(a), m);
});

test('not an SNP: a sentence, never a half-read block', () => {
  const a = snpToIfc(BOUND, { name: 'x' }).replace(/IFCCOMMUNICATIONSAPPLIANCE\(/, 'IFCFURNITURE(');
  assert.throws(() => snpFromIfc(a), /no SNP unit in this IFC/);
});

test('Save Model standalone: the block .json and its .ifc twin, both', async () => {
  const w = world({ framed: false });
  const r = await w.S.saveModel(BOUND, { name: 'snp-core-01', toIfc: (b) => snpToIfc(b, { name: 'snp-core-01' }) });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(w.downloads.map((d) => d.name).sort(), ['snp-core-01.ifc', 'snp-core-01.json']);
});
