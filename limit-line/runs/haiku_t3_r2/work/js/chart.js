// Draws one bar per [label, value] entry on the canvas.
export function drawBarChart(canvas, entries) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const pad = { top: 24, right: 20, bottom: 40, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#333';

  if (entries.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillText('No expenses yet', width / 2, height / 2);
    return;
  }

  const max = Math.max(...entries.map(([, value]) => value));

  // Axes
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillText(max.toFixed(2), pad.left - 6, pad.top + 10);
  ctx.fillText('0.00', pad.left - 6, pad.top + plotH);

  const slot = plotW / entries.length;
  const barW = Math.min(60, slot * 0.6);

  entries.forEach(([label, value], i) => {
    const barH = (value / max) * plotH;
    const x = pad.left + i * slot + (slot - barW) / 2;
    const y = pad.top + plotH - barH;

    ctx.fillStyle = '#e4572e';
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(2), x + barW / 2, y - 6);
    ctx.fillText(label.slice(0, 12), x + barW / 2, pad.top + plotH + 16);
  });
}
