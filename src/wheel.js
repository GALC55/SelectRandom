const PALETTE = [
  '#ff5d73', '#ffc145', '#3ddc97', '#4d9de0', '#b07cff', '#ff8c42',
  '#2ec4b6', '#f15bb5', '#9bdb4d', '#5e60ce', '#fee440', '#00bbf9',
];
const TAU = Math.PI * 2;

export function colorFor(i, n) {
  // evita que el último segmento quede del mismo color que el primero
  if (n > 1 && i === n - 1 && i % PALETTE.length === 0) return PALETTE[5];
  return PALETTE[i % PALETTE.length];
}

function textColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#1a1a1a' : '#ffffff';
}

/** Entero aleatorio uniforme en [0, max) usando crypto. */
export function randomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % max;
}

export class Wheel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.names = [];
    this.rotation = 0;
    this.spinning = false;
    this.highlight = null; // índice resaltado (modo ganador)
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const size = this.canvas.clientWidth;
    if (!size) return;
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.draw();
  }

  setHighlight(index) {
    this.highlight = index;
    this.draw();
  }

  setNames(names) {
    this.names = names;
    this.draw();
  }

  draw() {
    const { ctx, canvas, names } = this;
    const size = canvas.width;
    const r = size / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(r, r);

    if (!names.length) {
      ctx.fillStyle = '#2a2640';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#a9a3c7';
      ctx.font = `600 ${Math.round(size * 0.045)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Agrega nombres', 0, -r * 0.42);
      ctx.restore();
      return;
    }

    const n = names.length;
    const seg = TAU / n;
    // segmento i empieza en rotation + i*seg, medido desde arriba (-90°)
    ctx.rotate(this.rotation - Math.PI / 2);

    const fontSize = Math.min(r * 0.085, r * seg * 0.55);
    const showText = fontSize >= 7 * (window.devicePixelRatio || 1) * 0.8;
    const maxTextW = r * 0.68;

    for (let i = 0; i < n; i++) {
      const color = colorFor(i, n);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, i * seg, (i + 1) * seg);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      if (this.highlight != null && i !== this.highlight) {
        ctx.fillStyle = 'rgba(20,18,31,0.62)';
        ctx.fill();
      }
      if (n > 1) {
        ctx.strokeStyle = 'rgba(20,18,31,0.35)';
        ctx.lineWidth = Math.max(1, size / 400);
        ctx.stroke();
      }

      if (showText) {
        ctx.save();
        ctx.rotate(i * seg + seg / 2);
        ctx.fillStyle = textColor(color);
        if (this.highlight != null && i !== this.highlight) ctx.globalAlpha = 0.4;
        ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(fit(ctx, names[i], maxTextW), r * 0.92, 0);
        ctx.restore();
      }
    }
    if (this.highlight != null && this.highlight < n) {
      const i = this.highlight;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r - size / 200, i * seg, (i + 1) * seg);
      ctx.closePath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = size / 110;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Gira y resuelve con el índice ganador. */
  spin() {
    if (this.spinning || !this.names.length) return Promise.resolve(null);
    this.spinning = true;
    this.highlight = null;

    const n = this.names.length;
    const seg = TAU / n;
    const winner = randomInt(n);
    const offset = seg * (0.15 + 0.7 * (randomInt(1000) / 1000));
    // la aguja (arriba) queda dentro del segmento ganador cuando -rotation ≡ winner*seg + offset
    const target = -(winner * seg + offset);
    const start = this.rotation;
    const delta = mod(target - start, TAU) + TAU * (6 + randomInt(3));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 600 : 5200 + randomInt(1200);
    const t0 = performance.now();

    return new Promise((resolve) => {
      const frame = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        this.rotation = start + delta * easeOutQuart(t);
        this.draw();
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          this.rotation = mod(this.rotation, TAU);
          this.spinning = false;
          resolve(winner);
        }
      };
      requestAnimationFrame(frame);
    });
  }
}

const mod = (a, m) => ((a % m) + m) % m;
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}
