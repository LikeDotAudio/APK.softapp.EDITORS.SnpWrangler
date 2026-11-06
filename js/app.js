// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import { SnpModel } from './snpModel.js';
import { renderSnpFlowSvg } from './snpSvg.js';
import { connectSnpHost, blockMeta } from './snpHost.js';
import { signalTypeOptions } from './signalTypes.js';
import { snpToIfc, snpFromIfc, schemaOf } from './snpIfc.js';

const S = window.APKSoftapp;
const esc = S ? S.esc : (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = { model: new SnpModel() };
let model = state.model;

const host = S ? connectSnpHost(S, state, {
  onLoaded: (m, meta) => {
    model = m;
    const tag = document.getElementById('block-tag');
    if (tag && (meta.title || meta.blockName)) tag.textContent = meta.title || meta.blockName;
    renderAll();
  },
}) : null;

/** Save & Return: into the drawing inside the CAD. Standalone: the block .json and its .ifc twin, both or
    neither (APKSoftapp.saveModel, js/snpIfc.js). */
async function saveBlock() {
  if (!host) return;
  const meta = blockMeta(model);
  let how;
  if (host.embedded || typeof S.saveModel !== 'function') {
    how = host.save(model.toJSON(), meta);
  } else {
    const r = await S.saveModel(model.toJSON(), { name: meta.filename, toIfc: (b) => snpToIfc(b, { name: meta.filename }) });
    if (!r.ok && !r.cancelled) S.showProblem(r.problem || 'save_failed', { onRetry: () => saveBlock() });
    how = r.ok ? 'model' : '';
  }
  const tag = document.getElementById('block-tag');
  if (tag && how) tag.textContent = how === 'host' ? 'SAVED TO THE CAD' : how === 'model' ? 'SAVED .JSON + .IFC' : 'DOWNLOADED .JSON';
}

/** Replace the model from a local file (not from the CAD). */
function loadLocal(next) {
  model = state.model = next;
  if (host) host.changed(model.toJSON());
  renderAll();
}

function changed() {
  if (host) host.changed(model.toJSON());
}

function renderInspector() {
  const container = document.getElementById('inspector-content');
  if (!container) return;

  if (model.selectedRowId) {
    const row = model.rows.find((r) => r.id === model.selectedRowId);
    if (!row) {
      model.selectedRowId = null;
      renderInspector();
      return;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid var(--osc-border-default); padding-bottom: 8px;">
        <span style="font-weight: 700; color: var(--osc-text-primary); font-size: 13px;">${esc(row.txName)}</span>
        <button class="btn btn-secondary btn-sm" id="btn-delete-row" style="color: var(--osc-status-danger);">🗑️ Delete</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="chk-enabled" ${row.enabled ? 'checked' : ''}>
          <label for="chk-enabled" style="font-size: 11px; font-weight: 600; color: var(--osc-text-primary);">TX STREAM ENABLED</label>
        </div>

        <div>
          <label style="display: block; font-size: 10px; color: var(--osc-text-muted); margin-bottom: 3px;">SIGNAL TYPE</label>
          <select class="input" id="inp-signal">
            ${signalTypeOptions(row.signalType, esc)}
          </select>
        </div>

        <div>
          <label style="display: block; font-size: 10px; color: var(--osc-text-muted); margin-bottom: 3px;">TX NAME (IDENTIFIER)</label>
          <input type="text" class="input" id="inp-tx-name" value="${esc(row.txName)}">
        </div>

        <div>
          <label style="display: block; font-size: 10px; color: var(--osc-text-muted); margin-bottom: 3px;">NICKNAME / DESCRIPTION</label>
          <input type="text" class="input" id="inp-nickname" value="${esc(row.nickname)}">
        </div>

        <!-- Primary Red Leg -->
        <div style="padding: 8px; border: 1px solid #EF4444; border-radius: 4px; background: rgba(239, 68, 68, 0.05);">
          <div style="font-size: 10px; font-weight: 700; color: #EF4444; margin-bottom: 6px;">🔴 PRIMARY (RED LEG)</div>
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 6px;">
            <div>
              <label style="display: block; font-size: 9px; color: var(--osc-text-muted); margin-bottom: 2px;">MULTICAST IP</label>
              <input type="text" class="input" id="inp-p-ip" value="${esc(row.primaryMulticast)}">
            </div>
            <div>
              <label style="display: block; font-size: 9px; color: var(--osc-text-muted); margin-bottom: 2px;">PORT</label>
              <input type="number" class="input" id="inp-p-port" value="${esc(row.primaryDestPort)}">
            </div>
          </div>
        </div>

        <!-- Secondary Blue Leg -->
        <div style="padding: 8px; border: 1px solid #3B82F6; border-radius: 4px; background: rgba(59, 130, 246, 0.05);">
          <div style="font-size: 10px; font-weight: 700; color: #3B82F6; margin-bottom: 6px;">🔵 SECONDARY (BLUE LEG ST 2022-7)</div>
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 6px;">
            <div>
              <label style="display: block; font-size: 9px; color: var(--osc-text-muted); margin-bottom: 2px;">MULTICAST IP</label>
              <input type="text" class="input" id="inp-s-ip" value="${esc(row.secondaryMulticast)}">
            </div>
            <div>
              <label style="display: block; font-size: 9px; color: var(--osc-text-muted); margin-bottom: 2px;">PORT</label>
              <input type="number" class="input" id="inp-s-port" value="${esc(row.secondaryDestPort)}">
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-delete-row')?.addEventListener('click', () => {
      model.deleteRow(row.id);
      changed();
      renderAll();
    });

    document.getElementById('chk-enabled')?.addEventListener('change', (e) => {
      row.enabled = e.target.checked;
      changed();
      renderSvg();
      renderAudit();
    });

    const bind = (id, prop, isNum = false) => {
      document.getElementById(id)?.addEventListener('input', (e) => {
        row[prop] = isNum ? parseInt(e.target.value, 10) || 0 : e.target.value;
        changed();
        renderSvg();
        renderAudit();
      });
    };

    bind('inp-signal', 'signalType');
    bind('inp-tx-name', 'txName');
    bind('inp-nickname', 'nickname');
    bind('inp-p-ip', 'primaryMulticast');
    bind('inp-p-port', 'primaryDestPort', true);
    bind('inp-s-ip', 'secondaryMulticast');
    bind('inp-s-port', 'secondaryDestPort', true);

  } else {
    container.innerHTML = `
      <div style="padding: 20px 10px; text-align: center; color: var(--osc-text-muted);">
        <div style="font-size: 28px; margin-bottom: 8px; opacity: 0.5;">📡</div>
        <div>Select a stream row from the network pipeline to inspect Red/Blue leg sockets.</div>
      </div>
    `;
  }
}

function renderAudit() {
  const container = document.getElementById('redundancy-audit');
  if (!container) return;

  const issues = model.validateRedundancy();
  if (issues.length === 0) {
    container.innerHTML = `
      <div style="padding: 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--osc-status-success); border-radius: 4px; font-size: 10px; color: var(--osc-status-success);">
        ✓ ST 2022-7 Hitless Redundancy: All active senders correctly isolated with zero collisions.
      </div>
    `;
  } else {
    container.innerHTML = issues.map((i) => `
      <div style="padding: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--osc-status-danger); border-radius: 4px; font-size: 10px; color: var(--osc-status-danger); margin-bottom: 6px;">
        ⚠️ <strong>${esc(i.txName)}:</strong> ${esc(i.message)}
      </div>
    `).join('');
  }
}

function renderSvg() {
  const container = document.getElementById('canvas-wrapper');
  if (!container) return;

  container.innerHTML = renderSnpFlowSvg(model, {
    selectedRowId: model.selectedRowId,
  });

  const svg = container.querySelector('#snp-canvas-svg');
  if (!svg) return;

  svg.querySelectorAll('.snp-stream-row').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-row-id');
      model.selectedRowId = id;
      renderAll();
    });
  });

  svg.addEventListener('click', () => {
    model.selectedRowId = null;
    renderAll();
  });
}

function renderAll() {
  renderSvg();
  renderInspector();
  renderAudit();
}

document.addEventListener('DOMContentLoaded', () => {
  if (S) S.describe({
    name: 'SNP Stream Wrangler',
    does: 'Lays out the ST 2110 senders of one SNP unit with their primary (red) and secondary (blue, ST 2022-7) multicast legs, and audits the legs for collisions.',
    inputs: [
      { name: 'SNP block', from: 'the CAD drawing (snpwrangler block) when opened from the CAD', kind: 'cad' },
      { name: 'Block file', from: 'a .json or its .ifc twin saved by this editor, picked with Open Block', kind: 'file' },
      { name: 'Discovered', from: 'what the bus has discovered; which kinds show is config/discovered.json', kind: 'bus' },
    ],
    outputs: [
      { name: 'SNP block', to: 'the CAD drawing on Save & Return; standalone, the block .json and its IFC4X3 .ifc twin (Save Model)', kind: 'file' },
      { name: 'Stream CSV', to: '<unit>_streams.csv download (Export CSV)', kind: 'file' },
    ],
    controls: [
      { name: 'Add stream leg', how: '➕ Add Stream Leg' },
      { name: 'Select a stream', how: 'Click its row in the pipeline drawing; click empty canvas to deselect' },
      { name: 'Edit a stream', how: 'Inspector: enabled, signal type, TX name, nickname, red/blue multicast IP and port' },
      { name: 'Delete a stream', how: '🗑️ Delete in the inspector' },
      { name: 'Bind to a discovered unit', how: '⚡ Discovered, then Bind on its row' },
      { name: 'Export CSV / Save & Return / Close', how: 'Top-bar buttons' },
    ],
    problems: ['file_unreadable', 'bad_json', 'bad_input', 'bus_missing', 'save_failed'],
  });
  renderAll();

  document.getElementById('btn-add-stream')?.addEventListener('click', () => {
    const newRow = model.addRow({});
    model.selectedRowId = newRow.id;
    changed();
    renderAll();
  });

  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const csv = model.toCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.unitName.toLowerCase()}_streams.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-open-block')?.addEventListener('click', async () => {
    if (S && typeof S.openModel === 'function') {
      const r = await S.openModel({ fromJson: (data) => data });
      if (!r.ok) { if (!r.cancelled) S.showProblem(r.problem); return; }
      if (r.kind === 'ifc') {
        let block;
        try { block = snpFromIfc(r.text); } catch (err) {
          S.showProblem('bad_input', { subject: r.name, detail: err.message, fix: ['Open an .ifc saved by this editor, or one with an IfcCommunicationsAppliance and its APK_SnpStream circuits.'] });
          return;
        }
        loadLocal(new SnpModel(block));
        const tag = document.getElementById('block-tag');
        if (tag) tag.textContent = `${r.name} · ${schemaOf(r.text)}`;
        return;
      }
      if (!r.model || typeof r.model !== 'object' || !Array.isArray(r.model.rows)) {
        S.showProblem('bad_input', { subject: r.name, detail: 'This is not an SNP stream block: it has no "rows" list of streams.',
          fix: ['Open a .json or .ifc saved by this editor (Save & Return when standalone saves both).'] });
        return;
      }
      loadLocal(new SnpModel(r.model));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      const again = () => input.click();
      reader.onload = (event) => {
        let parsed;
        try {
          parsed = JSON.parse(event.target.result);
        } catch (err) {
          const fix = /\.csv$/i.test(file.name)
            ? ['Open takes a .json SNP block. A .csv is what Export CSV writes; it cannot be opened back — open the .json saved with Save & Return instead.']
            : [];
          if (S) S.showProblem('bad_json', { subject: file.name, detail: err.message, fix, onRetry: again });
          return;
        }
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.rows)) {
          if (S) S.showProblem('bad_input', {
            subject: file.name,
            detail: 'This is not an SNP stream block: it has no "rows" list of streams.',
            fix: ['Open a .json saved by this editor (Save & Return when standalone downloads one).'],
            onRetry: again,
          });
          return;
        }
        loadLocal(new SnpModel(parsed));
      };
      reader.onerror = () => S && S.showProblem('file_unreadable', { subject: file.name, detail: reader.error && reader.error.message, onRetry: again });
      reader.readAsText(file);
    };
    input.click();
  });

  document.getElementById('btn-discovered')?.addEventListener('click', async () => {
    const panel = document.getElementById('discovered-panel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (panel.hidden || panel.dataset.started) return;
    panel.dataset.started = '1';
    // the Discovered panel is the shared client's (ROAD-3502): kinds in config/discovered.json
    if (!window.APKSoftapp) return;
    await window.APKSoftapp.discoveredPanel(document.getElementById('discovered-table'), {
      status: document.getElementById('discovered-status'),
      configUrl: './config/discovered.json',
      id: 'snp-discovered',
      pickLabel: 'Bind',
      onPick: (thing) => {
        if (model.bindDevice(thing)) { changed(); renderAll(); }
      },
    });
  });

  document.getElementById('btn-save-block')?.addEventListener('click', () => saveBlock());

  document.getElementById('btn-close')?.addEventListener('click', () => {
    if (host) host.close();
  });
});
