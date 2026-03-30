'use strict';

// ─── Custom Tabulator sorter: round to 3dp before comparing ─────────────────
Tabulator.extendModule('sort', 'sorters', {
  num3dp: (a, b) => {
    const ra = (a === null || a === undefined) ? -Infinity : Math.round(a * 1000) / 1000;
    const rb = (b === null || b === undefined) ? -Infinity : Math.round(b * 1000) / 1000;
    return ra - rb;
  },
});

// ─── Constants ───────────────────────────────────────────────────────────────
const SET_LABELS = {
  internal: 'Internal (Set-1)',
  set2:     'External Set-2',
  set3:     'External Set-3',
};

const BAR_COLORS = {
  ba:  ['rgba(26,58,92,0.85)',  'rgba(26,138,154,0.85)', 'rgba(26,138,154,0.5)'],
  auc: ['rgba(193,87,42,0.8)', 'rgba(193,87,42,0.6)',   'rgba(193,87,42,0.35)'],
  f1:  ['rgba(56,148,86,0.8)', 'rgba(56,148,86,0.6)',   'rgba(56,148,86,0.35)'],
};

const OMICS_CLASS = { multi: 'multi', rna: 'rna', methyl: 'methyl', mirnas: 'mirna' };

const OMICS_BADGE = {
  multi:  { bg: '#d4edda', border: '#9ec9a7', text: '#1a5c2e' },
  rna:    { bg: '#fff3cd', border: '#d4a800', text: '#6b4800' },
  methyl: { bg: '#e8d5f5', border: '#b07dd4', text: '#4a1a6e' },
  mirnas: { bg: '#fce4ec', border: '#e88fa8', text: '#7a1030' },
};

// ─── Utilities ───────────────────────────────────────────────────────────────
const show = id => (document.getElementById(id).style.display = '');
const hide = id => (document.getElementById(id).style.display = 'none');

function fmt(v, dp = 3) {
  if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) return '—';
  return Number(v).toFixed(dp);
}

function fmtCell(v) {
  if (v === null || v === undefined) return '<span style="color:#aaa">—</span>';
  return Number(v).toFixed(3);
}

function safeGet(row, setKey, metric) {
  return row.sets?.[setKey]?.[metric] ?? null;
}

function avg2(a, b) {
  const vals = [a, b].filter(v => v !== null);
  return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
}

function fmtAvgExt(avg, s2, s3) {
  if (avg === null || avg === undefined) return '<span style="color:#aaa">—</span>';
  const tip = [
    s2 !== null ? `Set-2: ${Number(s2).toFixed(3)}` : null,
    s3 !== null ? `Set-3: ${Number(s3).toFixed(3)}` : null,
  ].filter(Boolean).join('   |   ');
  return `<span title="${tip}" style="cursor:help;border-bottom:1px dotted #8aaabb">`
       + `<strong style="color:var(--navy)">${Number(avg).toFixed(3)}</strong>`
       + `<sup style="font-size:0.65rem;color:#8aaabb;margin-left:2px">ⓘ</sup>`
       + `</span>`;
}

function omicsBadge(omicsType, omicsLabel) {
  const s = OMICS_BADGE[omicsType] || { bg: '#e9ecef', border: '#adb5bd', text: '#495057' };
  const lbl = omicsLabel || omicsType || '—';
  return `<span style="display:inline-block;padding:1px 7px;border-radius:10px;font-size:0.75rem;
    background:${s.bg};border:1px solid ${s.border};color:${s.text};white-space:nowrap">${lbl}</span>`;
}

// ─── Shared bar chart ────────────────────────────────────────────────────────
// Returns a Chart.js instance. Caller must destroy it before re-calling.
function drawBarChart(canvasId, baV, aucV, f1V) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [SET_LABELS.internal, SET_LABELS.set2, SET_LABELS.set3],
      datasets: [
        { label: 'Balanced Accuracy', data: baV,  backgroundColor: BAR_COLORS.ba,  borderRadius: 4 },
        { label: 'Macro AUC',         data: aucV, backgroundColor: BAR_COLORS.auc, borderRadius: 4 },
        { label: 'Macro F1',          data: f1V,  backgroundColor: BAR_COLORS.f1,  borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: c => c.raw === null
              ? `${c.dataset.label}: —`
              : `${c.dataset.label}: ${Number(c.raw).toFixed(3)}`,
          },
        },
      },
      scales: {
        y: {
          min: 0, max: 1,
          title: { display: true, text: 'Score', font: { size: 11 } },
          ticks: { font: { size: 10 }, stepSize: 0.1 },
          grid: { color: 'rgba(0,0,0,0.06)' },
        },
        x: { ticks: { font: { size: 10 } }, grid: { display: false } },
      },
    },
  });
}

// ─── Shared confusion matrix ─────────────────────────────────────────────────
// cmData = the confusion_matrix object ({ true_labels, pred_labels, matrix })
function drawCM(canvasId, noteId, cmData, setKey) {
  const canvas = document.getElementById(canvasId);
  const note   = document.getElementById(noteId);

  if (!cmData || !cmData.matrix || !cmData.matrix.length) {
    note.textContent = 'No confusion matrix data available for this set.';
    const ctx = canvas.getContext('2d');
    const W   = canvas.clientWidth || 300;
    canvas.width = W; canvas.height = 60;
    ctx.clearRect(0, 0, W, 60);
    ctx.fillStyle = '#aaa'; ctx.font = '13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('No data', W / 2, 30);
    return;
  }
  note.textContent = '';

  const labels = cmData.true_labels || cmData.pred_labels || [];
  const matrix = cmData.matrix;
  const n      = labels.length;

  const containerW = canvas.parentElement.clientWidth || 380;
  const size       = Math.min(containerW, 420);
  const PAD = { top: 30, right: 16, bottom: n > 2 ? 80 : 55, left: n > 2 ? 88 : 70 };

  const cellW  = Math.floor((size - PAD.left - PAD.right)  / n);
  const cellH  = Math.floor((size - PAD.top  - PAD.bottom) / n);
  const totalW = PAD.left + cellW * n + PAD.right;
  const totalH = PAD.top  + cellH * n + PAD.bottom;

  canvas.width  = totalW;  canvas.height = totalH;
  canvas.style.width  = totalW + 'px';
  canvas.style.height = totalH + 'px';

  const ctx    = canvas.getContext('2d');
  const maxVal = Math.max(...matrix.flat(), 1);
  ctx.clearRect(0, 0, totalW, totalH);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const val       = matrix[i][j] ?? 0;
      const intensity = val / maxVal;
      const r = Math.round(240 - intensity * 214);
      const g = Math.round(248 - intensity * 190);
      const b = Math.round(255 - intensity * 163);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(PAD.left + j * cellW, PAD.top + i * cellH, cellW - 1, cellH - 1);

      const fs = Math.max(9, Math.min(13, Math.floor(cellH * 0.35)));
      ctx.font = `${fs}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = intensity > 0.45 ? '#fff' : '#2a3a50';
      ctx.fillText(val, PAD.left + j * cellW + cellW / 2, PAD.top + i * cellH + cellH / 2);
    }
  }

  const lfs = Math.max(8, Math.min(11, Math.floor(cellH * 0.3)));
  ctx.fillStyle = '#333'; ctx.font = `${lfs}px system-ui`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  labels.forEach((lbl, i) => ctx.fillText(lbl, PAD.left - 5, PAD.top + i * cellH + cellH / 2));

  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  labels.forEach((lbl, j) => {
    ctx.save();
    ctx.translate(PAD.left + j * cellW + cellW / 2, PAD.top + n * cellH + 8);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(lbl, 0, 0);
    ctx.restore();
  });

  ctx.fillStyle = '#555'; ctx.font = '11px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Predicted label', PAD.left + (cellW * n) / 2, totalH - 6);
  ctx.save();
  ctx.translate(10, PAD.top + (cellH * n) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('True label', 0, 0);
  ctx.restore();

  ctx.fillStyle = '#777'; ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText(SET_LABELS[setKey] || setKey, totalW - PAD.right, 2);
}
