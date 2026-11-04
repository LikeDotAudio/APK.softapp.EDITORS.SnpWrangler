// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// The SNP block round trip over cad.like.audio/host@1 (ROAD-3491), with the
// app's vendored APKSoftapp client in a stub window.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { SnpModel } from '../js/snpModel.js';
import { renderSnpFlowSvg } from '../js/snpSvg.js';
import { connectSnpHost, EDITOR, BLOCK_TYPE } from '../js/snpHost.js';

const require = createRequire(import.meta.url);
const { world, hostContract } = require('./host-world.cjs');

test('load → edit → request: the CAD gets the edited block back, at our origin, on host@1', async () => {
  const w = world();
  const state = { model: new SnpModel() };
  const loaded = [];
  const host = connectSnpHost(w.S, state, { onLoaded: (m, meta) => loaded.push([m, meta]), notice: false });
  assert.ok(host.embedded);
  assert.deepEqual(w.toParent[0], { m: { protocol: 'cad.like.audio/host@1', type: 'editorReady', editor: EDITOR, blockType: BLOCK_TYPE }, o: w.ORIGIN });

  const block = new SnpModel({ unitName: 'SNP-B', rows: [{ id: 'tx_9', signalType: 'AUDIO', txName: 'A', enabled: true, primaryMulticast: '239.1.1.1', primaryDestPort: 5004, secondaryMulticast: '239.2.1.1', secondaryDestPort: 5004, audioChannels: 8, nickname: 'n' }] }).toJSON();
  w.fire({ protocol: w.S.PROTOCOL, type: 'load', block, meta: { blockName: 'SNP_1' } });
  assert.equal(loaded.length, 1);
  assert.equal(state.model.unitName, 'SNP-B');

  state.model.addRow({ txName: 'ADDED' });
  state.model.bindDevice({ mac: '00:07:f5:42:06:a2', name: 'SNP-B', ips: ['10.1.1.1'] });
  w.fire({ protocol: w.S.PROTOCOL, type: 'request' });
  const save = w.toParent.at(-1);
  assert.equal(save.o, w.ORIGIN, 'never "*"');
  assert.equal(save.m.type, 'blockSave');
  assert.equal(save.m.blockType, BLOCK_TYPE);
  assert.equal(save.m.meta.blockName, 'SNP_1', 'the CAD block name goes back');
  assert.deepEqual(save.m.block.rows.map((r) => r.txName), ['A', 'ADDED']);
  assert.equal(save.m.block.deviceId, '00:07:f5:42:06:a2', 'bound by MAC, not IP');
  assert.deepEqual(new SnpModel(save.m.block).toJSON(), save.m.block, 'the block survives a reload');

  const c = await hostContract();
  if (c) for (const { m } of w.toParent) assert.deepEqual(c.validateMessage(c.schema, 'toCad', m), [], m.type);
});

test('a message from another origin, or one of the old private block names, is dropped', () => {
  const w = world();
  const state = { model: new SnpModel() };
  connectSnpHost(w.S, state, { notice: false });
  w.fire({ protocol: w.S.PROTOCOL, type: 'load', block: { unitName: 'EVIL' } }, { origin: 'http://evil.example' });
  w.fire({ type: 'APK_' + 'LOAD_BLOCK', block: { unitName: 'OLD' } });
  assert.equal(state.model.unitName, 'SNP-CORE-01');
});

test('standalone, save downloads one .json and says so', () => {
  const w = world({ framed: false });
  const state = { model: new SnpModel() };
  const host = connectSnpHost(w.S, state, { notice: false });
  assert.equal(host.embedded, false);
  assert.equal(host.save(state.model.toJSON(), { filename: 'snp-core-01' }), 'download');
  assert.deepEqual(w.downloads.map((d) => d.name), ['snp-core-01.json']);
});

test('the SVG escapes what it draws', () => {
  const m = new SnpModel();
  m.rows[0].txName = '<img src=x onerror=alert(1)>';
  const svg = renderSnpFlowSvg(m);
  assert.ok(!svg.includes('<img'));
  assert.ok(svg.includes('&lt;img'));
});
