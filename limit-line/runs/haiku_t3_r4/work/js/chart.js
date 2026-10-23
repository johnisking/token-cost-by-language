const COLORS = ['#e76f51', '#2a9d8f', '#e9c46a', '#264653', '#8ab17d', '#9b5de5', '#f4a261', '#4d908e'];

// Draw one bar per expense category (the total of its negative amounts).
export function drawExpenseChart(canvas, items) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 600;
  const height = canvas.clientHeight || 300;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#333';

  const totals = new Map();
  for (const item of items) {
    if (item.amount < 0) {
      totals.set(item.category, (totals.get(item.category) ?? 0) - item.amount);
    }
  }
  const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillText('No expenses yet', width / 2, height / 2);
    return;
  }

  const left = 48;
  const right = 16;
  const top = 24;
  const bottom = 40;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(...entries.map(([, total]) => total));
  const slot = plotWidth / entries.length;
  const barWidth = Math.min(80, slot * 0.6);

  // Baseline
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(left, top + plotHeight);
  ctx.lineTo(width - right, top + plotHeight);
  ctx.stroke();

  entries.forEach(([category, total], index) => {
    const barHeight = (total / max) * plotHeight;
    const x = left + index * slot + (slot - barWidth) / 2;
    const y = top + plotHeight - barHeight;

    ctx.fillStyle = COLORS[index % COLORS.length];
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(total.toFixed(2), x + barWidth / 2, y - 6);
    const label = category.length > 14 ? `${category.slice(0, 13)}…` : category;
    ctx.fillText(label, x + barWidth / 2, top + plotHeight + 16);
  });
}
