// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import test from 'node:test';
import assert from 'node:assert/strict';
import { SnpModel } from '../js/snpModel.js';
import { renderSnpFlowSvg } from '../js/snpSvg.js';

test('SnpModel initializes with unit info and ST 2110 default streams', () => {
  const model = new SnpModel();
  assert.equal(model.unitName, 'SNP-CORE-01');
  assert.ok(model.rows.length >= 5);
  const vStream = model.rows.find((r) => r.signalType === 'VIDEO');
  assert.ok(vStream);
  assert.equal(vStream.enabled, true);
});

test('SnpModel validates redundancy and identifies path breaches and collisions', () => {
  const model = new SnpModel();
  // Initially isolated: Red Leg (239.100.x) vs Blue Leg (239.200.x)
  const cleanAudit = model.validateRedundancy();
  assert.equal(cleanAudit.length, 0);

  // Introduce a breach: primary and secondary on same IP
  model.rows[0].secondaryMulticast = model.rows[0].primaryMulticast;
  const audit = model.validateRedundancy();
  assert.ok(audit.length >= 1);
  assert.ok(audit[0].message.includes('Violates ST 2022-7 path isolation'));
});

test('SnpModel exports to standard 9-column CSV format', () => {
  const model = new SnpModel();
  const csv = model.toCsv();
  assert.ok(csv.startsWith('Signal Type,TX NAME,TX Enable'));
  assert.ok(csv.includes('CAM1_MAIN_1080P'));
  assert.ok(csv.includes('239.100.1.11'));
});

test('renderSnpFlowSvg generates SVG markup with Red and Blue network streams', () => {
  const model = new SnpModel();
  const svg = renderSnpFlowSvg(model);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('RED LEG'));
  assert.ok(svg.includes('BLUE LEG'));
  assert.ok(svg.includes('CAM1_MAIN_1080P'));
});
