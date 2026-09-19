const COLORS = ['#ff5d73', '#ffc145', '#3ddc97', '#4d9de0', '#b07cff', '#f15bb5'];

export function confetti(canvas) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dpr = window.devicePixelRatio || 1;
  const w = (canvas.width = innerWidth * dpr);
  const h = (canvas.height = innerHeight * dpr);
  const ctx = canvas.getContext('2d');

  const parts = Array.from({ length: 160 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.2,
    y: h * 0.45,
    vx: (Math.random() - 0.5) * 22 * dpr,
    vy: (-Math.random() * 18 - 6) * dpr,
    s: (5 + Math.random() * 6) * dpr,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    c: COLORS[(Math.random() * COLORS.length) | 0],
  }));

  const t0 = performance.now();
  const frame = (now) => {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.5 * dpr;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (now - t0 < 3000) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, w, h);
  };
  requestAnimationFrame(frame);
}
