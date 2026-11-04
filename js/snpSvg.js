// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderSnpFlowSvg(model, options = {}) {
  const { selectedRowId = null } = options;

  const rowHeight = 44;
  const startY = 60;
  const svgWidth = 840;
  const svgHeight = Math.max(340, startY + model.rows.length * rowHeight + 40);

  const primaryX = 240;
  const secondaryX = 580;

  const rowsSvg = model.rows.map((row, idx) => {
    const isSelected = row.id === selectedRowId;
    const y = startY + idx * rowHeight;
    const isEnabled = row.enabled;

    return `
      <g class="snp-stream-row" data-row-id="${esc(row.id)}" style="cursor: pointer;">
        <!-- Card Row Background -->
        <rect x="20" y="${y}" width="${svgWidth - 40}" height="${rowHeight - 6}" rx="4"
          fill="${isSelected ? '#2c2c2c' : '#18181b'}"
          stroke="${isSelected ? '#F4902C' : '#2c2c2c'}"
          stroke-width="${isSelected ? 2 : 1}"
          opacity="${isEnabled ? 1.0 : 0.5}"
        />
        
        <!-- Signal Type Pill -->
        <rect x="30" y="${y + 7}" width="50" height="22" rx="3"
          fill="${row.signalType === 'VIDEO' ? 'rgba(74, 158, 255, 0.2)' : row.signalType === 'AUDIO' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(245, 158, 11, 0.2)'}"
        />
        <text x="55" y="${y + 22}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="700"
          fill="${row.signalType === 'VIDEO' ? '#4A9EFF' : row.signalType === 'AUDIO' ? '#A855F7' : '#F59E0B'}">
          ${esc(row.signalType)}
        </text>

        <!-- TX Name & Nickname -->
        <text x="90" y="${y + 18}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#f4f4f5">${esc(row.txName)}</text>
        <text x="90" y="${y + 30}" font-family="-apple-system, sans-serif" font-size="9" fill="#888888">${esc(row.nickname)}</text>

        <!-- Red Leg (Primary ST 2110) -->
        <g transform="translate(${primaryX}, ${y + 6})">
          <rect width="180" height="24" rx="3" fill="#1C1417" stroke="#EF4444" stroke-width="1"/>
          <circle cx="10" cy="12" r="4" fill="#EF4444"/>
          <text x="20" y="16" font-family="'JetBrains Mono', monospace" font-size="10" fill="#f4f4f5">${esc(row.primaryMulticast)}:${esc(row.primaryDestPort)}</text>
        </g>

        <!-- Blue Leg (Secondary ST 2022-7) -->
        <g transform="translate(${secondaryX}, ${y + 6})">
          <rect width="180" height="24" rx="3" fill="#10192B" stroke="#3B82F6" stroke-width="1"/>
          <circle cx="10" cy="12" r="4" fill="#3B82F6"/>
          <text x="20" y="16" font-family="'JetBrains Mono', monospace" font-size="10" fill="#f4f4f5">${esc(row.secondaryMulticast)}:${esc(row.secondaryDestPort)}</text>
        </g>

        <!-- Enable Switch -->
        <circle cx="${svgWidth - 45}" cy="${y + 18}" r="7" fill="${isEnabled ? '#10B981' : '#52525b'}"/>
      </g>
    `;
  }).join('');

  return `
    <svg id="snp-canvas-svg" width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#121212"/>

      <!-- Network Headers -->
      <text x="40" y="35" font-family="-apple-system, sans-serif" font-size="12" font-weight="700" fill="#f4f4f5">SELENIO STREAMS (${esc(model.unitName)})</text>
      <text x="${primaryX}" y="35" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#EF4444">🔴 RED LEG (PRIMARY ST 2110)</text>
      <text x="${secondaryX}" y="35" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#3B82F6">🔵 BLUE LEG (SECONDAY 2022-7)</text>

      ${rowsSvg}
    </svg>
  `;
}
