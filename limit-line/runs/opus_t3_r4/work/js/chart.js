// Bar chart of expenses per category on a <canvas>.

export function drawChart(canvas, totals) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Scale for high-DPI screens while keeping the CSS size.
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = canvas.clientHeight || 260;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const styles = getComputedStyle(canvas);
  const textColor = styles.getPropertyValue('--chart-text').trim() || '#333';
  const barColor = styles.getPropertyValue('--chart-bar').trim() || '#d9534f';
  const gridColor = styles.getPropertyValue('--chart-grid').trim() || '#ddd';

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = textColor;

  if (entries.length === 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No expenses yet', cssWidth / 2, cssHeight / 2);
    return;
  }

  const pad = { top: 24, right: 16, bottom: 36, left: 16 };
  const plotW = cssWidth - pad.left - pad.right;
  const plotH = cssHeight - pad.top - pad.bottom;
  const max = Math.max(...entries.map(([, v]) => v)) || 1;
  const slot = plotW / entries.length;
  const barW = Math.min(64, slot * 0.7);
  const baseY = pad.top + plotH;

  // Baseline.
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, baseY + 0.5);
  ctx.lineTo(pad.left + plotW, baseY + 0.5);
  ctx.stroke();

  entries.forEach(([category, value], i) => {
    const h = (value / max) * plotH;
    const cx = pad.left + slot * i + slot / 2;
    const x = cx - barW / 2;

    ctx.fillStyle = barColor;
    ctx.fillRect(x, baseY - h, barW, h);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(value.toFixed(2), cx, baseY - h - 4);

    ctx.textBaseline = 'top';
    ctx.fillText(truncate(ctx, category || '(none)', slot - 4), cx, baseY + 6);
  });
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1);
  return s + '…';
}
