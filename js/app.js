// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import { SnpModel } from './snpModel.js';
import { renderSnpFlowSvg } from './snpSvg.js';
import { connectSnpHost, blockMeta } from './snpHost.js';
import { showDiscovered, loadDiscoveredConfig } from './discoveredPanel.js';

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
            <option value="VIDEO" ${row.signalType === 'VIDEO' ? 'selected' : ''}>VIDEO (ST 2110-20)</option>
            <option value="AUDIO" ${row.signalType === 'AUDIO' ? 'selected' : ''}>AUDIO (ST 2110-30)</option>
            <option value="ANC" ${row.signalType === 'ANC' ? 'selected' : ''}>ANCILLARY DATA (ST 2110-40)</option>
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

  document.getElementById('btn-open-block')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          loadLocal(new SnpModel(parsed));
        } catch (err) {
          alert('Failed to parse SNP stream json: ' + err.message);
        }
      };
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
    const cfg = await loadDiscoveredConfig();
    await showDiscovered(document.getElementById('discovered-table'), {
      S, T: window.APKTable,
      statusEl: document.getElementById('discovered-status'),
      kinds: Array.isArray(cfg.kinds) ? cfg.kinds : [],
      tableId: 'snp-discovered',
      pickLabel: 'Bind',
      onPick: (thing) => {
        if (model.bindDevice(thing)) { changed(); renderAll(); }
      },
    });
  });

  document.getElementById('btn-save-block')?.addEventListener('click', () => {
    const how = host ? host.save(model.toJSON(), blockMeta(model)) : '';
    const tag = document.getElementById('block-tag');
    if (tag && how) tag.textContent = how === 'host' ? 'SAVED TO THE CAD' : 'DOWNLOADED .JSON';
  });

  document.getElementById('btn-close')?.addEventListener('click', () => {
    if (host) host.close();
  });
});
