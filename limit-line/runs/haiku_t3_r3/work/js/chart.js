// Draws one bar per expense category onto a canvas using the 2D context.

const PADDING = { top: 24, right: 16, bottom: 56, left: 56 };
const BAR_COLOR = '#e4572e';

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function drawExpenseChart(canvas, items) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // Expenses are negative amounts; the bar height is the expense total.
  const totals = new Map();
  for (const { amount, category } of items) {
    if (amount < 0) totals.set(category, (totals.get(category) || 0) - amount);
  }
  const entries = [...totals].sort((a, b) => b[1] - a[1]);

  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';

  if (entries.length === 0) {
    ctx.fillStyle = '#666';
    ctx.fillText('No expenses yet', width / 2, height / 2);
    return;
  }

  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;
  const max = entries[0][1];
  const slot = plotW / entries.length;
  const barW = Math.min(80, slot * 0.6);

  // Axes
  ctx.strokeStyle = '#888';
  ctx.beginPath();
  ctx.moveTo(PADDING.left, PADDING.top);
  ctx.lineTo(PADDING.left, PADDING.top + plotH);
  ctx.lineTo(PADDING.left + plotW, PADDING.top + plotH);
  ctx.stroke();

  entries.forEach(([category, total], i) => {
    const h = (total / max) * plotH;
    const x = PADDING.left + i * slot + (slot - barW) / 2;
    const y = PADDING.top + plotH - h;

    ctx.fillStyle = BAR_COLOR;
    ctx.fillRect(x, y, barW, h);

    ctx.fillStyle = '#333';
    ctx.fillText(total.toFixed(2), x + barW / 2, y - 6);
    ctx.fillText(truncate(category, 12), x + barW / 2, PADDING.top + plotH + 18);
  });
}
