const BAR_COLOR = '#2563eb';
const TEXT_COLOR = '#334155';
const GRID_COLOR = '#e2e8f0';

// Draws one bar per expense category (the absolute total of its negative amounts).
export function drawExpenseChart(canvas, items) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 600;
  const height = canvas.clientHeight || 260;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';

  const totals = {};
  for (const { amount, category } of items) {
    if (amount < 0) totals[category] = (totals[category] || 0) - amount;
  }
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.fillText('No expenses yet', width / 2, height / 2);
    return;
  }

  const pad = { top: 16, right: 16, bottom: 48, left: 56 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...entries.map(([, value]) => value));

  // Horizontal gridlines with value labels
  ctx.strokeStyle = GRID_COLOR;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + plotH - (plotH * i) / 4;
    const value = (max * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(value.toFixed(0), pad.left - 6, y);
  }

  // Bars and category labels
  const slot = plotW / entries.length;
  const barW = Math.min(60, slot * 0.6);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  entries.forEach(([category, value], i) => {
    const x = pad.left + slot * i + (slot - barW) / 2;
    const barH = (value / max) * plotH;
    const y = pad.top + plotH - barH;

    ctx.fillStyle = BAR_COLOR;
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle = TEXT_COLOR;
    ctx.textBaseline = 'bottom';
    ctx.fillText(value.toFixed(2), x + barW / 2, y - 4);

    ctx.textBaseline = 'top';
    ctx.fillText(category, pad.left + slot * i + slot / 2, pad.top + plotH + 6, slot - 8);
  });
}
