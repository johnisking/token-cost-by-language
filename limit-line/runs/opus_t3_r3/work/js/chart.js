// Draws one bar per category, sized by that category's total expenses.
export function drawExpenseChart(canvas, items) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const totals = {};
  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (amount < 0) totals[item.category] = (totals[item.category] || 0) - amount;
  }
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';

  if (entries.length === 0) {
    ctx.fillStyle = '#888';
    ctx.textBaseline = 'middle';
    ctx.fillText('No expenses yet', width / 2, height / 2);
    return;
  }

  const pad = { top: 22, bottom: 28, left: 12, right: 12 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...entries.map(([, v]) => v));
  const slot = plotW / entries.length;
  const barW = Math.min(60, slot * 0.7);

  // Baseline
  ctx.strokeStyle = '#ccc';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + plotH + 0.5);
  ctx.lineTo(pad.left + plotW, pad.top + plotH + 0.5);
  ctx.stroke();

  entries.forEach(([cat, value], i) => {
    const h = max > 0 ? (value / max) * plotH : 0;
    const x = pad.left + slot * i + (slot - barW) / 2;
    const y = pad.top + plotH - h;

    ctx.fillStyle = '#d9534f';
    ctx.fillRect(x, y, barW, h);

    ctx.fillStyle = '#333';
    ctx.textBaseline = 'bottom';
    ctx.fillText(value.toFixed(2), x + barW / 2, y - 3);

    ctx.textBaseline = 'top';
    const label = cat || '(none)';
    ctx.fillText(label.length > 12 ? label.slice(0, 11) + '…' : label, x + barW / 2, pad.top + plotH + 6);
  });
}
