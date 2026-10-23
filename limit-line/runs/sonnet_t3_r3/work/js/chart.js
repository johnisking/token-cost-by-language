export function drawChart(canvas, byCategory) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const entries = Object.entries(byCategory)
    .filter(([, v]) => v < 0)
    .map(([k, v]) => [k || '(none)', -v]);

  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  if (entries.length === 0) {
    ctx.fillStyle = '#666';
    ctx.fillText('No expenses yet', width / 2, height / 2);
    return;
  }

  const pad = { top: 24, right: 16, bottom: 36, left: 16 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...entries.map(([, v]) => v));
  const slot = plotW / entries.length;
  const barW = Math.min(slot * 0.6, 80);

  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + plotH + 0.5);
  ctx.lineTo(width - pad.right, pad.top + plotH + 0.5);
  ctx.stroke();

  entries.forEach(([name, value], i) => {
    const h = (value / max) * plotH;
    const x = pad.left + slot * i + (slot - barW) / 2;
    const y = pad.top + plotH - h;
    ctx.fillStyle = '#d9534f';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#222';
    ctx.fillText(value.toFixed(2), x + barW / 2, y - 6);
    ctx.fillText(name, x + barW / 2, pad.top + plotH + 18, slot - 4);
  });
}
