export function drawChart(canvas, items) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const totals = {};
  for (const it of items) {
    if (it.amount < 0) totals[it.category] = (totals[it.category] || 0) - it.amount;
  }
  const entries = Object.entries(totals);
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  if (!entries.length) {
    ctx.fillStyle = '#666';
    ctx.fillText('No expenses to chart', w / 2, h / 2);
    return;
  }

  const pad = { top: 20, bottom: 30, left: 10, right: 10 };
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
    ctx.fillText(val.toFixed(2), x + barW / 2, y - 4);
    ctx.fillText(cat || '(none)', x + barW / 2, h - 12);
  });
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(pad.left, h - pad.bottom);
  ctx.lineTo(w - pad.right, h - pad.bottom);
  ctx.stroke();
}
