// Draws one bar per {label, value} entry on the canvas.
export function drawBarChart(canvas, bars) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  if (bars.length === 0) {
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.fillText('No expenses this month', 16, 24);
    return;
  }

  const pad = { top: 24, right: 16, bottom: 48, left: 56 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const max = Math.max(...bars.map(b => b.value), 1);
  const slot = plotWidth / bars.length;
  const barWidth = Math.min(60, slot * 0.6);

  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotHeight);
  ctx.lineTo(pad.left + plotWidth, pad.top + plotHeight);
  ctx.stroke();

  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  bars.forEach((bar, i) => {
    const barHeight = (bar.value / max) * plotHeight;
    const x = pad.left + i * slot + (slot - barWidth) / 2;
    const y = pad.top + plotHeight - barHeight;

    ctx.fillStyle = '#3b7dd8';
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#222';
    ctx.fillText(bar.value.toFixed(2), x + barWidth / 2, y - 6);
    ctx.fillText(bar.label, x + barWidth / 2, pad.top + plotHeight + 16);
  });
}
