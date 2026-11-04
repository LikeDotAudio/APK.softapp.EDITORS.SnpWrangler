// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

export class SnpModel {
  constructor(initialData = null) {
    this.id = initialData?.id || `snp_${Date.now()}`;
    this.unitName = initialData?.unitName || 'SNP-CORE-01';
    this.mgmtIp = initialData?.mgmtIp || '10.200.1.51';
    // The discovered unit this block describes: its MAC or serial (never its IP), '' when unbound.
    this.deviceId = initialData?.deviceId || '';
    this.personalities = initialData?.personalities || ['ST2110-20 HD/UHD', 'ST2110-30 Audio Mux', 'Color Corrector', 'Multiviewer Head'];

    this.rows = initialData?.rows || [
      {
        id: 'tx_1',
        signalType: 'VIDEO',
        txName: 'CAM1_MAIN_1080P',
        enabled: true,
        primaryMulticast: '239.100.1.11',
        primaryDestPort: 50000,
        secondaryMulticast: '239.200.1.11',
        secondaryDestPort: 50000,
        audioChannels: 0,
        nickname: 'Studio A Center Cam',
      },
      {
        id: 'tx_2',
        signalType: 'AUDIO',
        txName: 'CAM1_EMBED_AUDIO',
        enabled: true,
        primaryMulticast: '239.100.2.11',
        primaryDestPort: 50002,
        secondaryMulticast: '239.200.2.11',
        secondaryDestPort: 50002,
        audioChannels: 16,
        nickname: 'Studio A Cam Audio',
      },
      {
        id: 'tx_3',
        signalType: 'ANC',
        txName: 'CAM1_TIMECODE_ANC',
        enabled: true,
        primaryMulticast: '239.100.3.11',
        primaryDestPort: 50004,
        secondaryMulticast: '239.200.3.11',
        secondaryDestPort: 50004,
        audioChannels: 0,
        nickname: 'Studio A SMPTE-12M TC',
      },
      {
        id: 'tx_4',
        signalType: 'VIDEO',
        txName: 'PGM_SWITCHER_OUT',
        enabled: true,
        primaryMulticast: '239.100.1.50',
        primaryDestPort: 50000,
        secondaryMulticast: '239.200.1.50',
        secondaryDestPort: 50000,
        audioChannels: 0,
        nickname: 'Main Control Room Program',
      },
      {
        id: 'tx_5',
        signalType: 'AUDIO',
        txName: 'PGM_AUDIO_ST2110',
        enabled: true,
        primaryMulticast: '239.100.2.50',
        primaryDestPort: 50002,
        secondaryMulticast: '239.200.2.50',
        secondaryDestPort: 50002,
        audioChannels: 64,
        nickname: 'MADI/Dante 64ch PGM Master',
      },
    ];

    this.selectedRowId = null;
    this._txCounter = this.rows.length + 1;
  }

  addRow(row) {
    const id = row.id || `tx_${this._txCounter++}`;
    const newRow = {
      id,
      signalType: row.signalType || 'VIDEO',
      txName: row.txName || `STREAM_${this._txCounter}`,
      enabled: row.enabled !== undefined ? row.enabled : true,
      primaryMulticast: row.primaryMulticast || `239.100.1.${this._txCounter + 10}`,
      primaryDestPort: row.primaryDestPort || 50000,
      secondaryMulticast: row.secondaryMulticast || `239.200.1.${this._txCounter + 10}`,
      secondaryDestPort: row.secondaryDestPort || 50000,
      audioChannels: row.audioChannels || (row.signalType === 'AUDIO' ? 16 : 0),
      nickname: row.nickname || 'New SMPTE Stream',
    };
    this.rows.push(newRow);
    return newRow;
  }

  updateRow(id, updates) {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, updates);
    return row;
  }

  deleteRow(id) {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.rows.splice(idx, 1);
      if (this.selectedRowId === id) this.selectedRowId = null;
      return true;
    }
    return false;
  }

  validateRedundancy() {
    const issues = [];
    const usedPrimary = new Set();
    const usedSecondary = new Set();

    for (const r of this.rows) {
      if (!r.enabled) continue;

      // 1. Check if Red Leg and Blue Leg share same multicast IP
      if (r.primaryMulticast === r.secondaryMulticast) {
        issues.push({
          rowId: r.id,
          txName: r.txName,
          severity: 'error',
          message: `Red and Blue legs share identical multicast IP (${r.primaryMulticast}). Violates ST 2022-7 path isolation.`,
        });
      }

      // 2. Check collision on primary network
      const pKey = `${r.primaryMulticast}:${r.primaryDestPort}`;
      if (usedPrimary.has(pKey)) {
        issues.push({
          rowId: r.id,
          txName: r.txName,
          severity: 'error',
          message: `Primary socket collision: ${pKey} is used by multiple senders.`,
        });
      }
      usedPrimary.add(pKey);

      // 3. Check collision on secondary network
      const sKey = `${r.secondaryMulticast}:${r.secondaryDestPort}`;
      if (usedSecondary.has(sKey)) {
        issues.push({
          rowId: r.id,
          txName: r.txName,
          severity: 'error',
          message: `Secondary socket collision: ${sKey} is used by multiple senders.`,
        });
      }
      usedSecondary.add(sKey);
    }

    return issues;
  }

  toCsv() {
    const headers = [
      'Signal Type',
      'TX NAME',
      'TX Enable',
      'TX Primary Multicast',
      'TX Primary Dest Port',
      'TX Secondary Multicast',
      'TX Secondary Dest Port',
      'Audio Num Channels',
      'NickName',
    ];
    const lines = [headers.join(',')];

    for (const r of this.rows) {
      lines.push([
        r.signalType,
        r.txName,
        r.enabled ? '1' : '0',
        r.primaryMulticast,
        r.primaryDestPort,
        r.secondaryMulticast,
        r.secondaryDestPort,
        r.audioChannels,
        `"${r.nickname.replace(/"/g, '""')}"`,
      ].join(','));
    }

    return lines.join('\n');
  }

  /** Bind this block to a discovered unit (APKSoftapp thing): identity is its MAC / serial. */
  bindDevice(thing) {
    const id = thing && (thing.mac || thing.serial || thing.agent);
    if (!id) return false;
    this.deviceId = id;
    if (thing.name) this.unitName = thing.name;
    if (thing.ips && thing.ips[0]) this.mgmtIp = thing.ips[0];
    return true;
  }

  toJSON() {
    return {
      type: 'snpwrangler',
      id: this.id,
      unitName: this.unitName,
      mgmtIp: this.mgmtIp,
      deviceId: this.deviceId,
      personalities: this.personalities,
      rows: this.rows,
    };
  }
}
