// Draw one bar per category, sized by that category's total expenses.
export function drawChart(canvas, items) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const totals = {};
  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (amount < 0) totals[item.category] = (totals[item.category] || 0) - amount;
  }
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';

  if (entries.length === 0) {
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No expenses yet', width / 2, height / 2);
    return;
  }

  const pad = { top: 24, bottom: 36, left: 16, right: 16 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const max = Math.max(...entries.map(e => e[1]));
  const slot = chartW / entries.length;
  const barW = Math.min(80, slot * 0.7);

  ctx.strokeStyle = '#ccc';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + chartH + 0.5);
  ctx.lineTo(width - pad.right, pad.top + chartH + 0.5);
  ctx.stroke();

  entries.forEach(([category, total], i) => {
    const barH = max > 0 ? (total / max) * chartH : 0;
    const x = pad.left + i * slot + (slot - barW) / 2;
    const y = pad.top + chartH - barH;

    ctx.fillStyle = '#2f6fed';
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(total.toFixed(2), x + barW / 2, y - 4);

    ctx.textBaseline = 'top';
    ctx.fillText(truncate(ctx, category || '(none)', slot - 4), x + barW / 2, pad.top + chartH + 6);
  });
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}
