const COLORS = ['#3b6fd8', '#e0703a', '#2fa37a', '#c94f8a', '#8a6fd8', '#c9a227', '#4fb3c9', '#8c8c8c'];

// Draw one bar per category in `data` ({category: positiveAmount}).
export function drawChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || canvas.width;
  const cssHeight = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#666';

  if (entries.length === 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No expenses yet', cssWidth / 2, cssHeight / 2);
    return;
  }

  const pad = { top: 22, right: 12, bottom: 30, left: 12 };
  const plotW = cssWidth - pad.left - pad.right;
  const plotH = cssHeight - pad.top - pad.bottom;
  const max = Math.max(...entries.map(([, v]) => v)) || 1;
  const slot = plotW / entries.length;
  const barW = Math.min(60, slot * 0.7);

  // Baseline
  ctx.strokeStyle = '#ccc';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + plotH + 0.5);
  ctx.lineTo(pad.left + plotW, pad.top + plotH + 0.5);
  ctx.stroke();

  ctx.textAlign = 'center';
  entries.forEach(([cat, value], i) => {
    const h = (value / max) * plotH;
    const x = pad.left + slot * i + (slot - barW) / 2;
    const y = pad.top + plotH - h;
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fillRect(x, y, barW, h);

    const cx = x + barW / 2;
    ctx.fillStyle = '#333';
    ctx.textBaseline = 'bottom';
    ctx.fillText(value.toFixed(2), cx, y - 3);
    ctx.textBaseline = 'top';
    ctx.fillText(truncate(ctx, cat || '(none)', slot - 4), cx, pad.top + plotH + 6);
  });
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}
