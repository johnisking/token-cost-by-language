export function drawChart(canvas, items) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const totals = {};
  for (const t of items) {
    if (t.amount < 0) totals[t.category] = (totals[t.category] || 0) - t.amount;
  }
  const entries = Object.entries(totals);
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  if (!entries.length) {
    ctx.fillStyle = '#888';
    ctx.fillText('No expenses to chart', w / 2, h / 2);
    return;
  }

  const pad = { top: 24, bottom: 30, left: 10, right: 10 };
  const max = Math.max(...entries.map(e => e[1]));
  const slot = (w - pad.left - pad.right) / entries.length;
  const barW = Math.min(60, slot * 0.7);
  const plotH = h - pad.top - pad.bottom;

  entries.forEach(([cat, val], i) => {
    const bh = (val / max) * plotH;
    const x = pad.left + slot * i + (slot - barW) / 2;
    const y = h - pad.bottom - bh;
    ctx.fillStyle = '#d9534f';
    ctx.fillRect(x, y, barW, bh);
    ctx.fillStyle = '#222';
    ctx.fillText(val.toFixed(2), x + barW / 2, y - 6);
    ctx.fillText(cat || '(none)', x + barW / 2, h - pad.bottom + 16, slot);
  });
}
