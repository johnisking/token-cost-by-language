export function drawExpenseChart(canvas, items, byCategory = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width || 600;
  const height = canvas.height || 300;
  ctx.clearRect(0, 0, width, height);

  // Aggregate expenses per category (negative transactions or negative category totals)
  const expenseMap = {};
  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      const amt = Number(item.amount) || 0;
      const cat = item.category || 'Uncategorized';
      if (amt < 0) {
        expenseMap[cat] = (expenseMap[cat] || 0) + Math.abs(amt);
      }
    }
  }

  // Fallback to byCategory if expenseMap is empty
  if (Object.keys(expenseMap).length === 0 && byCategory) {
    for (const [cat, total] of Object.entries(byCategory)) {
      if (total < 0) {
        expenseMap[cat] = Math.abs(total);
      } else if (total > 0) {
        expenseMap[cat] = total;
      }
    }
  }

  const entries = Object.entries(expenseMap);
  if (entries.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No expense data to display', width / 2, height / 2);
    return;
  }

  const padding = { top: 30, right: 24, bottom: 50, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  // Axes
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  const slotWidth = chartWidth / entries.length;
  const barWidth = Math.min(64, Math.max(16, slotWidth * 0.6));
  const palette = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6'];

  entries.forEach(([category, value], idx) => {
    const barHeight = (value / maxVal) * chartHeight;
    const x = padding.left + idx * slotWidth + (slotWidth - barWidth) / 2;
    const y = padding.top + chartHeight - barHeight;

    ctx.fillStyle = palette[idx % palette.length];
    ctx.fillRect(x, y, barWidth, barHeight);

    // Value label above bar
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(2), x + barWidth / 2, y - 8);

    // Category label below axis
    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(category, x + barWidth / 2, padding.top + chartHeight + 20);
  });
}
