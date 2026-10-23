// Draws one bar per entry of `data` (label -> value) on the given canvas.
export function drawBarChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const entries = Object.entries(data);

  ctx.clearRect(0, 0, width, height);
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';

  if (entries.length === 0) {
    ctx.fillStyle = '#666';
    ctx.fillText('No expenses yet', width / 2, height / 2);
    return;
  }

  const pad = { top: 30, right: 20, bottom: 50, left: 20 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const max = Math.max(...entries.map(([, value]) => value));
  const slot = plotWidth / entries.length;
  const barWidth = Math.min(60, slot * 0.6);

  // baseline
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + plotHeight);
  ctx.lineTo(width - pad.right, pad.top + plotHeight);
  ctx.stroke();

  entries.forEach(([label, value], i) => {
    const barHeight = max > 0 ? (value / max) * plotHeight : 0;
    const x = pad.left + i * slot + (slot - barWidth) / 2;
    const y = pad.top + plotHeight - barHeight;

    ctx.fillStyle = '#e4572e';
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#222';
    ctx.fillText(value.toFixed(2), x + barWidth / 2, y - 6);
    ctx.fillText(label, x + barWidth / 2, height - pad.bottom + 20, slot - 4);
  });
}
