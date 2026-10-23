export function drawChart(canvas, items) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const totals = {};
  for (const it of items) {
    if (it.amount < 0) totals[it.category] = (totals[it.category] || 0) - it.amount;
  }
  const entries = Object.entries(totals);

  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  if (entries.length === 0) {
    ctx.fillStyle = '#888';
    ctx.fillText('No expenses to chart', width / 2, height / 2);
    return;
  }

  const pad = { top: 24, bottom: 36, left: 12, right: 12 };
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...entries.map(e => e[1]));
  const slot = (width - pad.left - pad.right) / entries.length;
  const barW = Math.min(slot * 0.6, 80);

  entries.forEach(([cat, total], i) => {
    const h = (total / max) * plotH;
    const x = pad.left + slot * i + (slot - barW) / 2;
    const y = pad.top + plotH - h;
    ctx.fillStyle = '#d9534f';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#222';
    ctx.fillText(total.toFixed(2), x + barW / 2, y - 6);
    ctx.fillText(cat, x + barW / 2, height - pad.bottom + 16, slot - 4);
  });

  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + plotH + 0.5);
  ctx.lineTo(width - pad.right, pad.top + plotH + 0.5);
  ctx.stroke();
}
