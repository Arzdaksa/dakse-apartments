/* ---------- liquid glass refraction (Chromium only; others keep the frosted fallback) ----------
   Each .glass gets an SVG displacement map shaped to its own rounded rect, so the
   backdrop bends near the edges like a thick lens. */
// desktop only: per-element SVG filters are too heavy for phone GPUs
if (navigator.userAgentData?.brands?.some(b => b.brand === 'Chromium') && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const NS = 'http://www.w3.org/2000/svg';
  const defs = document.createElementNS(NS, 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  document.body.append(defs);

  const lensMap = (w, h, r) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const band = Math.min(24, w / 2, h / 2); // refraction happens within this rim
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x + 0.5 - w / 2, py = y + 0.5 - h / 2;
      const qx = Math.abs(px) - (w / 2 - r), qy = Math.abs(py) - (h / 2 - r);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0), ol = Math.hypot(ox, oy);
      const inside = -(ol + Math.min(Math.max(qx, qy), 0) - r); // distance to edge
      let vx = 0, vy = 0;
      if (inside < band) {
        const s = (1 - inside / band) ** 2;
        let nx, ny;
        if (ol > 0) { nx = ox / ol; ny = oy / ol; } else if (qx > qy) { nx = 1; ny = 0; } else { nx = 0; ny = 1; }
        vx = -Math.sign(px) * nx * s; vy = -Math.sign(py) * ny * s;
      }
      const i = (y * w + x) * 4;
      img.data[i] = 128 + vx * 127; img.data[i + 1] = 128 + vy * 127; img.data[i + 2] = 128; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  };

  let id = 0;
  const fit = el => {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h || (el._w === w && el._h === h)) return;
    el._w = w; el._h = h;
    const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
    if (!el._f) {
      el._f = document.createElementNS(NS, 'filter');
      el._f.id = 'lg' + id++;
      el._f.setAttribute('color-interpolation-filters', 'sRGB');
      el._f.setAttribute('filterUnits', 'userSpaceOnUse');
      el._f.innerHTML = '<feImage result="m" preserveAspectRatio="none"/><feDisplacementMap in="SourceGraphic" in2="m" scale="36" xChannelSelector="R" yChannelSelector="G"/>';
      defs.append(el._f);
      el.style.backdropFilter = `url(#${el._f.id}) blur(12px) saturate(175%)`;
    }
    const f = el._f;
    ['x', 'y'].forEach(a => f.setAttribute(a, 0));
    f.setAttribute('width', w); f.setAttribute('height', h);
    const im = f.firstChild;
    im.setAttribute('href', lensMap(w, h, r));
    im.setAttribute('width', w); im.setAttribute('height', h);
  };
  const ro = new ResizeObserver(entries => entries.forEach(e => fit(e.target)));
  window.liquidGlass = el => ro.observe(el);
  document.querySelectorAll('.glass').forEach(window.liquidGlass);
}
window.liquidGlass ||= () => {}; // no-op where the effect is off
