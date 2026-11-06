// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* snpIfc.js — THE SNP BLOCK'S .IFC TWIN (ROAD-3583). Standalone, Save & Return writes the native SNP block
   (SnpModel.toJSON) AND this IFC4X3_ADD2 file through APKSoftapp.saveModel; Open Block reads either back to
   the same block. Written with the contracts STEP codec (vendor/apk-contracts/apk-ifc.js, scripts/vendor-ifc.mjs),
   no IfcOpenShell in the page. Byte-deterministic: the same block writes the same file.

     IfcProject ─ IfcSite ─ IfcBuilding ─ IfcBuildingStorey 'Equipment'                       units: mm
     the unit     IfcCommunicationsAppliance NETWORKAPPLIANCE (Name = unitName, Tag = the block id), typed by the
                  BIM part picked (bimId: GlobalId part/<id>, APK_Part.PartId; e.g. imagine-communications/
                  snp-platform-4a) else an IfcCommunicationsApplianceType NETWORKAPPLIANCE 'SNP'.
                  APK_SnpUnit {DeviceId (MAC / serial, never an IP), ManagementIp (a design value), Personalities};
                  APK_Identity.MacAddress too when the bound id is a MAC
     its legs     two IfcDistributionPort DATA CABLE SOURCEANDSINK nested on it: 'Media A (red)' and
                  'Media B (blue)', Pset_DistributionPortTypeCable.Protocols SMPTE ST 2110 / ST 2022-7
     the networks two IfcDistributionSystem DATA serving the building: 'Red' (ObjectType ST 2022-7 PRIMARY) and
                  'Blue' (ST 2022-7 SECONDARY) — the two isolated paths of ST 2022-7
     a stream     per leg one IfcDistributionCircuit AUDIOVISUAL aggregated under its network, as the BIM
                  network plan writes a planned stream (DATABASE.server.BIM bim/network.py): Name = TX name,
                  LongName = nickname, ObjectType = the ST 2110 essence; APK_MediaStream {MulticastGroup,
                  UdpPort, Channels, Redundancy 'Hitless ST 2022-7', Transport},
                  Pset_DistributionSystemCommon.Reference 'stream/<group>:<port>'; the SNP's leg port is its
                  sender (IfcRelAssignsToGroup 'Senders'); APK_SnpStream {StreamId, Leg, Enabled, SignalType}
   Everything here is ISO 16739 or an APK_ set declared in DATABASE.server.BIM SRC/tools/ifc (apk_psets.py +
   apk_psets_editors.py). */

import { entitiesByType, enumv, getPsets, ifcGuid, isRef, parseStep, real, ref, typed, unwrap, writeStep } from '../vendor/apk-contracts/apk-ifc.js';

export const SNP_IFC_SCHEMA = 'IFC4X3_ADD2';
const STAMP = '1970-01-01T00:00:00';   // fixed: the file is a function of the block, never of the clock
const REDUNDANCY = 'Hitless ST 2022-7';
/** The ST 2110 essence each stored signal type is (config/vocabulary.json formats.aliases). */
export const ESSENCE = { VIDEO: 'ST2110-20', AUDIO: 'ST2110-30', ANC: 'ST2110-40' };
const LEGS = [
  { leg: 'primary', net: 'Red', port: 'Media A (red)', kind: 'ST 2022-7 PRIMARY', group: 'primaryMulticast', udp: 'primaryDestPort' },
  { leg: 'secondary', net: 'Blue', port: 'Media B (blue)', kind: 'ST 2022-7 SECONDARY', group: 'secondaryMulticast', udp: 'secondaryDestPort' },
];
const MAC = /^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i;

const str = (v) => (v == null ? '' : String(v));
const label = (s) => typed('IFCLABEL', String(s));
const ident = (s) => typed('IFCIDENTIFIER', String(s));
const int = (n) => typed('IFCINTEGER', Math.trunc(n));
const bool = (b) => typed('IFCBOOLEAN', enumv(b ? 'T' : 'F'));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const stemOf = (name) => String(name || 'snp').replace(/\.(ifc|json)$/i, '');

class Writer {
  constructor() { this.entities = []; }
  add(type, ...args) {
    const id = this.entities.length + 1;
    this.entities.push({ id, type, args });
    return ref(id);
  }
}

/**
 * The SNP block (SnpModel.toJSON) as IFC4X3_ADD2 STEP text. `name` is the file stem; the project GlobalId is
 * uuid5 of snp/<id>, so the same block saved again keeps every GlobalId.
 */
export function snpToIfc(block, { name } = {}) {
  const b = block || {};
  const rows = Array.isArray(b.rows) ? b.rows : [];
  const stem = stemOf(name || b.unitName);
  const blockId = str(b.id) || stem;
  const W = new Writer();
  const P = ifcGuid('snp', blockId);
  const rel = (...roles) => ifcGuid('rel', ...roles);

  // ---- owner, units (mm), context, the spine
  const person = W.add('IFCPERSON', null, 'APK.audio', null, null, null, null, null, null);
  const org = W.add('IFCORGANIZATION', null, 'APK.audio', 'SNP Stream Wrangler', null, null);
  const po = W.add('IFCPERSONANDORGANIZATION', person, org, null);
  const app = W.add('IFCAPPLICATION', org, '1', 'APK.audio SNP Stream Wrangler', 'EDITORS.SnpWrangler');
  const oh = W.add('IFCOWNERHISTORY', po, app, null, null, null, null, null, 0);
  const mm = W.add('IFCSIUNIT', { kind: 'derived' }, enumv('LENGTHUNIT'), enumv('MILLI'), enumv('METRE'));
  const units = W.add('IFCUNITASSIGNMENT', [mm]);
  const origin = W.add('IFCAXIS2PLACEMENT3D', W.add('IFCCARTESIANPOINT', [real(0), real(0), real(0)]), null, null);
  const ctx = W.add('IFCGEOMETRICREPRESENTATIONCONTEXT', null, 'Model', 3, real(1e-5), origin, null);
  const project = W.add('IFCPROJECT', P, oh, str(b.unitName) || stem, 'SNP Stream Wrangler: one SNP unit and its ST 2110 / ST 2022-7 senders', null, null, null, [ctx], units);
  const sitePl = W.add('IFCLOCALPLACEMENT', null, origin);
  const buildingPl = W.add('IFCLOCALPLACEMENT', sitePl, origin);
  const storeyPl = W.add('IFCLOCALPLACEMENT', buildingPl, origin);
  const siteGid = ifcGuid('site', P, 'site');
  const buildingGid = ifcGuid('site', P, 'building');
  const storeyGid = ifcGuid('site', P, 'storey');
  const site = W.add('IFCSITE', siteGid, oh, 'Site', null, null, sitePl, null, null, enumv('ELEMENT'), null, null, null, null, null);
  const building = W.add('IFCBUILDING', buildingGid, oh, 'Building', null, null, buildingPl, null, null, enumv('ELEMENT'), null, null, null);
  const storey = W.add('IFCBUILDINGSTOREY', storeyGid, oh, 'Equipment', null, null, storeyPl, null, null, enumv('ELEMENT'), real(0));
  W.add('IFCRELAGGREGATES', rel('aggregates', P), oh, null, null, project, [site]);
  W.add('IFCRELAGGREGATES', rel('aggregates', siteGid), oh, null, null, site, [building]);
  W.add('IFCRELAGGREGATES', rel('aggregates', buildingGid), oh, null, null, building, [storey]);

  const rels = [];
  const prop = (n, v) => (v == null || v === '' ? null : W.add('IFCPROPERTYSINGLEVALUE', n, null, v, null));
  const listProp = (n, vs) => (vs.length ? W.add('IFCPROPERTYLISTVALUE', n, null, vs, null) : null);
  const pset = (setName, ownerGid, props, owners) => {
    const list = props.filter(Boolean);
    if (!list.length) return null;
    const ps = W.add('IFCPROPERTYSET', ifcGuid('rel', 'pset', ownerGid, setName), oh, setName, null, list);
    if (owners) rels.push({ ps, owners, gid: ifcGuid('rel', 'props', ownerGid, setName) });
    return ps;
  };

  // ---- the type: the picked BIM part, else the editor's own
  const partId = str(b.bimId);
  const typeGid = partId ? ifcGuid('part', partId) : ifcGuid('decl', P, 'type');
  const typeSets = partId ? [pset('APK_Part', typeGid, [prop('PartId', ident(partId))])] : null;
  const type = W.add('IFCCOMMUNICATIONSAPPLIANCETYPE', typeGid, oh, str(b.hardwareName) || partId || 'SNP', null, null,
    typeSets, null, partId || null, null, enumv('NETWORKAPPLIANCE'));
  W.add('IFCRELDECLARES', rel('declares', P), oh, null, null, project, [type]);

  // ---- the unit
  const unitGid = ifcGuid('decl', P, 'unit');
  const unit = W.add('IFCCOMMUNICATIONSAPPLIANCE', unitGid, oh, str(b.unitName) || stem, null, null,
    W.add('IFCLOCALPLACEMENT', storeyPl, origin), null, blockId, enumv('NETWORKAPPLIANCE'));
  W.add('IFCRELDEFINESBYTYPE', rel('type', unitGid), oh, null, null, [unit], type);
  W.add('IFCRELCONTAINEDINSPATIALSTRUCTURE', rel('contains', storeyGid), oh, null, null, [unit], storey);
  const deviceId = str(b.deviceId);
  const personalities = Array.isArray(b.personalities) ? b.personalities.map(str) : [];
  pset('APK_SnpUnit', unitGid, [
    prop('DeviceId', deviceId ? ident(deviceId) : null),
    prop('ManagementIp', b.mgmtIp ? label(b.mgmtIp) : null),
    listProp('Personalities', personalities.map(label)),
  ], [unit]);
  if (MAC.test(deviceId)) pset('APK_Identity', unitGid, [prop('MacAddress', ident(deviceId.toLowerCase()))], [unit]);

  // ---- its two media legs, and the two networks they are on
  const legs = LEGS.map((L) => {
    const gid = ifcGuid('decl', P, 'leg', L.leg);
    const port = W.add('IFCDISTRIBUTIONPORT', gid, oh, L.port, `${L.net} leg (${L.leg})`, null, null, null,
      enumv('SOURCEANDSINK'), enumv('CABLE'), enumv('DATA'));
    pset('Pset_DistributionPortTypeCable', gid, [listProp('Protocols', ['SMPTE ST 2110', 'SMPTE ST 2022-7'].map(ident))], [port]);
    const netGid = ifcGuid('decl', P, 'network', L.leg);
    const net = W.add('IFCDISTRIBUTIONSYSTEM', netGid, oh, L.net, `The ${L.leg} (${L.net.toLowerCase()}) ST 2022-7 media network`, L.kind, null, enumv('DATA'));
    W.add('IFCRELSERVICESBUILDINGS', rel('serves', netGid), oh, null, null, net, [building]);
    return { ...L, port, net, netGid, circuits: [] };
  });
  W.add('IFCRELNESTS', rel('nests', unitGid), oh, null, null, unit, legs.map((l) => l.port));

  // ---- the streams: one circuit per leg
  rows.forEach((r, i) => {
    const rowId = str(r.id) || `tx_${i + 1}`;
    const signal = str(r.signalType);
    const essence = ESSENCE[signal] || signal || null;
    const channels = num(r.audioChannels);
    for (const L of legs) {
      const gid = ifcGuid('decl', P, 'stream', rowId, L.leg);
      const group = str(r[L.group]);
      const udp = num(r[L.udp]);
      const c = W.add('IFCDISTRIBUTIONCIRCUIT', gid, oh, str(r.txName) || rowId, `${L.net} leg (${L.leg})`, essence,
        r.nickname ? str(r.nickname) : null, enumv('AUDIOVISUAL'));
      L.circuits.push(c);
      pset('Pset_DistributionSystemCommon', gid, [prop('Reference', ident(`stream/${group}:${udp ?? ''}`))], [c]);
      pset('APK_MediaStream', gid, [
        prop('MulticastGroup', group ? label(group) : null),
        prop('UdpPort', udp != null ? int(udp) : null),
        prop('Channels', channels != null && channels > 0 ? int(channels) : null),
        prop('Redundancy', label(REDUNDANCY)),
        prop('Transport', essence ? label(essence) : null),
      ], [c]);
      pset('APK_SnpStream', gid, [
        prop('StreamId', ident(rowId)),
        prop('Leg', label(L.leg)),
        prop('Enabled', bool(r.enabled !== false)),
        prop('SignalType', signal ? label(signal) : null),
      ], [c]);
      W.add('IFCRELASSIGNSTOGROUP', rel('senders', gid), oh, 'Senders', null, [L.port], null, c);
    }
  });
  for (const L of legs) if (L.circuits.length) W.add('IFCRELAGGREGATES', rel('aggregates', L.netGid), oh, null, null, L.net, L.circuits);
  for (const { ps, owners, gid } of rels) W.add('IFCRELDEFINESBYPROPERTIES', gid, oh, null, null, owners, ps);

  return writeStep({
    header: [
      { type: 'FILE_DESCRIPTION', args: [['ViewDefinition [ReferenceView]'], '2;1'] },
      { type: 'FILE_NAME', args: [`${stem}.ifc`, STAMP, ['APK.audio'], ['APK.audio'], 'APK.audio SNP Stream Wrangler', 'EDITORS.SnpWrangler', ''] },
      { type: 'FILE_SCHEMA', args: [[SNP_IFC_SCHEMA]] },
    ],
    entities: W.entities,
  });
}

/* ───────────────────────── reading it back ───────────────────────── */

const flat = (v) => {
  if (v == null || typeof v !== 'object') return v;   // getPsets gives plain values (a boolean is true / false)
  const u = unwrap(v);
  if (Array.isArray(u)) return u.map(flat);
  return u && typeof u === 'object' && 'value' in u ? flat(u.value) : u;
};

/** The schema an .ifc text declares (FILE_SCHEMA), '' when none. */
export function schemaOf(text) {
  const m = /FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i.exec(String(text || ''));
  return m ? m[1] : '';
}

/**
 * An IFC model → the SNP block. The unit is the first IfcCommunicationsAppliance carrying APK_SnpUnit (else the
 * first one); its streams are the circuits with APK_SnpStream, a row per StreamId. Throws a sentence when the
 * file holds no communications appliance.
 */
export function snpFromIfc(text) {
  const file = parseStep(String(text));
  const byId = file.byId;
  const get = (v) => (isRef(v) ? byId.get(v.id) : undefined);
  const units = entitiesByType(file, 'IFCCOMMUNICATIONSAPPLIANCE');
  const unit = units.find((e) => getPsets(file, e).APK_SnpUnit) || units[0];
  if (!unit) throw new TypeError('no SNP unit in this IFC: it has no IfcCommunicationsAppliance');
  const u = getPsets(file, unit).APK_SnpUnit || {};
  let type = null;
  for (const r of entitiesByType(file, 'IFCRELDEFINESBYTYPE')) {
    if ((r.args[4] || []).some((x) => isRef(x) && x.id === unit.id)) type = get(r.args[5]);
  }
  const partId = type ? str(flat(getPsets(file, type).APK_Part?.PartId)) : '';
  const rows = new Map();
  for (const c of entitiesByType(file, 'IFCDISTRIBUTIONCIRCUIT')) {
    const ps = getPsets(file, c);
    const s = ps.APK_SnpStream;
    if (!s) continue;
    const id = str(flat(s.StreamId));
    const m = ps.APK_MediaStream || {};
    let row = rows.get(id);
    if (!row) {
      row = {
        id,
        signalType: str(flat(s.SignalType)),
        txName: str(c.args[2]),
        enabled: flat(s.Enabled) !== false,
        primaryMulticast: '',
        primaryDestPort: 0,
        secondaryMulticast: '',
        secondaryDestPort: 0,
        audioChannels: num(flat(m.Channels)) ?? 0,
        nickname: str(c.args[5]),
      };
      rows.set(id, row);
    }
    const L = LEGS.find((x) => x.leg === flat(s.Leg)) || LEGS[0];
    row[L.group] = str(flat(m.MulticastGroup));
    row[L.udp] = num(flat(m.UdpPort)) ?? 0;
  }
  const block = {
    type: 'snpwrangler',
    id: str(unit.args[7]),
    unitName: str(unit.args[2]),
    mgmtIp: str(flat(u.ManagementIp)),
    deviceId: str(flat(u.DeviceId)),
    personalities: (flat(u.Personalities) || []).map(str),
    rows: [...rows.values()],
  };
  if (partId) { block.bimId = partId; block.hardwareName = type ? str(type.args[2]) : ''; }
  return block;
}
