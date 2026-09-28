const NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('plan');
const chipsEl = document.querySelector('.chips');
const panel = document.querySelector('.panel');
const body = panel.querySelector('.panel__body');
const peek = document.querySelector('.peek');
const dockWa = document.querySelector('.dock__btn--wa');
const motionOK = !matchMedia('(prefers-reduced-motion: reduce)').matches && window.gsap;
const phone = matchMedia('(max-width: 899px)');

const WA = 'https://wa.me/972522791267?text=';
const waText = id => encodeURIComponent(id
  ? `שלום, אשמח לשמוע פרטים על דירה ${id} בבית דקסה, א-סומאק 2`
  : 'שלום, אשמח לשמוע פרטים על הדירות להשכרה בבית דקסה, א-סומאק 2');
const TITLE = document.title;
const LIVING_TYPES = ['living', 'parents', 'kids']; // Israeli room count: living room + bedrooms

/* ---------- geometry (paths are M/H/V/Z only) ---------- */
const polys = d => d.match(/M[^M]+/g).map(sub => {
  const pts = []; let x = 0, y = 0;
  for (const [, c, a, b] of sub.matchAll(/([MHVZ])\s*(-?\d+)?\s*(-?\d+)?/g)) {
    if (c === 'M') { x = +a; y = +b; } else if (c === 'H') x = +a; else if (c === 'V') y = +a; else continue;
    pts.push([x, y]);
  }
  return pts;
});
const shoelace = pts => Math.abs(pts.reduce((s, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return s + x * y2 - x2 * y; }, 0)) / 2;
const toM2 = px2 => px2 / PLAN.PX_PER_CM ** 2 / 10000;
const bbox = ptsList => {
  const xs = ptsList.flat().map(p => p[0]), ys = ptsList.flat().map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent?.append(n);
  return n;
};

/* ---------- build the drawing ---------- */
svg.setAttribute('viewBox', PLAN.viewBox.join(' '));
svg.innerHTML = `<defs><pattern id="hatch" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="26" height="26" fill="#EFEBE4"/><line x1="0" y1="0" x2="0" y2="26" stroke="#D5CCBE" stroke-width="7"/></pattern></defs>`;

const sharedG = el('g', { class: 'shared' }, svg);
for (const s of PLAN.shared) {
  el('path', { d: s.d, pathLength: 1 }, sharedG);
  const b = bbox(polys(s.d));
  el('text', { x: b.x + b.w / 2, y: b.y + b.h / 2 }, sharedG).textContent = s.name;
}

const roomEls = [];
for (const apt of PLAN.apartments) {
  const g = el('g', { class: `apt ${apt.status}`, 'data-apt': apt.id }, svg);
  const labels = el('g', {}, null);
  apt.area = 0;
  for (const room of apt.rooms) {
    const ps = polys(room.d);
    room.box = bbox(ps);
    room.area = Math.round(toM2(ps.reduce((s, p) => s + shoelace(p), 0)));
    apt.area += room.area;
    const p = el('path', { d: room.d, pathLength: 1, class: `room ${room.type === 'hall' ? 'hall' : ''}`, 'data-room': room.id }, g);
    p.room = room; p.apt = apt; room.el = p;
    if (room.type === 'hall') continue;
    roomEls.push(p);
    if (apt.status === 'available') {
      p.setAttribute('role', 'button');
      p.setAttribute('aria-label', `${room.name}, כ-${room.area} מטר רבוע`);
    }
    // label shrinks to fit narrow rooms
    const fs = Math.min(30, (room.box.w - 24) / (room.name.length * 0.55));
    const t = el('text', { class: 'room-label', x: room.box.x + room.box.w / 2, y: room.box.y + room.box.h / 2, 'font-size': fs }, labels);
    el('tspan', { x: room.box.x + room.box.w / 2 }, t).textContent = room.name;
    el('tspan', { x: room.box.x + room.box.w / 2, dy: fs * 1.25, 'font-size': fs * 0.8 }, t).textContent = `כ-${room.area} מ״ר`;
  }
  g.append(labels);
  apt.box = bbox(apt.rooms.flatMap(r => polys(r.d)));
  apt.count = apt.rooms.filter(r => LIVING_TYPES.includes(r.type)).length;
  apt.g = g;
  if (apt.status === 'available') {
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `דירה ${apt.id}, ${apt.count} חדרים`);
  }

  // floating glass chip over the building view
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = `chip glass${apt.status === 'rented' ? ' chip--rented' : ''}`;
  chip.innerHTML = `<b><i>דירה </i>${apt.id}</b><span>${apt.status === 'rented' ? 'מושכרת' : `${apt.count} חדרים`}</span>`;
  chip.setAttribute('aria-label', `דירה ${apt.id}, ${apt.status === 'rented' ? 'מושכרת' : `${apt.count} חדרים`}`);
  if (apt.status === 'rented') chip.disabled = true;
  else chip.addEventListener('click', () => go(`apt-${apt.id}`));
  chipsEl.append(chip);
  apt.chip = chip;
}
const available = PLAN.apartments.filter(a => a.status === 'available');

/* ---------- camera: tween the viewBox ---------- */
const [vx, vy, vw, vh] = PLAN.viewBox;
const vb = { x: vx, y: vy, w: vw, h: vh };
const pad = b => { const m = Math.max(b.w, b.h) * 0.08; return { x: b.x - m, y: b.y - m, w: b.w + m * 2, h: b.h + m * 2 }; };
const applyVB = () => { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); placeChips(); };
const zoomTo = (t, animate) => {
  if (animate && motionOK) gsap.to(vb, { ...t, duration: 1.05, ease: 'expo.inOut', overwrite: true, onUpdate: applyVB });
  else { Object.assign(vb, t); applyVB(); }
};
function placeChips() {
  const m = svg.getScreenCTM(), s = chipsEl.getBoundingClientRect();
  if (!m) return;
  for (const apt of PLAN.apartments) {
    const p = new DOMPoint(apt.box.x + apt.box.w / 2, apt.box.y + apt.box.h / 2).matrixTransform(m);
    apt.chip.style.left = `${p.x - s.left}px`;
    apt.chip.style.top = `${p.y - s.top}px`;
  }
}

/* ---------- routing: #apt-2 / #apt-2/kitchen ---------- */
const parse = () => {
  const m = location.hash.match(/^#apt-(\d+)(?:\/(\w+))?$/);
  const apt = m && available.find(a => a.id === +m[1]);
  const room = apt && apt.rooms.find(r => r.id === m[2] && r.type !== 'hall');
  return { apt, room };
};
const go = h => {
  if (h) location.hash = h;
  else { history.pushState(null, '', location.pathname + location.search); render(); }
};
addEventListener('popstate', render);

let cur = {};
function render(first) {
  const { apt, room } = parse();
  const aptChanged = apt !== cur.apt || first;
  cur = { apt, room };

  svg.classList.toggle('is-apt', !!apt);
  document.body.classList.toggle('is-apt-view', !!apt);
  document.body.classList.toggle('is-room', !!room);
  for (const a of PLAN.apartments) {
    a.g.classList.toggle('on', a === apt);
    a.g.setAttribute('tabindex', !apt && a.status === 'available' ? 0 : -1);
  }
  for (const p of roomEls) {
    p.classList.toggle('sel', p.room === room);
    p.setAttribute('tabindex', apt && p.apt === apt ? 0 : -1);
  }
  if (aptChanged) zoomTo(apt ? pad(apt.box) : vbFull(), !first);

  body.innerHTML = apt ? (room ? roomView(apt, room) : aptView(apt)) : buildingView();
  body.scrollTop = 0;
  dockWa.href = WA + waText(apt?.id);
  document.title = apt ? `${room ? room.name + ', ' : ''}דירה ${apt.id} | בית דקסה` : TITLE;
  peek.classList.remove('on');
  highlight();
}
const vbFull = () => ({ x: vx, y: vy, w: vw, h: vh });

/* ---------- panel views ---------- */
const thumb = src => src.replace(/\.webp$/, '-sm.webp');
const cta = id => `<div class="cta-row">
  <a class="btn btn--solid" href="tel:+972522791267"><svg><use href="#i-phone"/></svg>התקשרו</a>
  <a class="btn btn--glass" href="${WA + waText(id)}" target="_blank" rel="noopener"><svg class="wa"><use href="#i-wa"/></svg>וואטסאפ</a>
</div>`;
const roomList = (apt, active) => `<ul class="list">${apt.rooms.filter(r => r.type !== 'hall').map(r => `
  <li><button type="button" data-go="apt-${apt.id}/${r.id}" data-room="${r.id}" class="${r === active ? 'hl' : ''}" ${r === active ? 'aria-current="true"' : ''}>
    ${r.photos[0] ? `<img src="${thumb(r.photos[0])}" alt="" loading="lazy">` : '<span class="ph"></span>'}
    <span><strong>${r.name}</strong><small>כ-${r.area} מ״ר</small></span><span class="go" aria-hidden="true">‹</span>
  </button></li>`).join('')}</ul>`;

const buildingView = () => `
  <h1 class="display">בית דקסה</h1>
  <p class="muted">תוכנית קומת הכניסה, א-סומאק 2 בדלית אל-כרמל. בחרו דירה כדי להיכנס אליה.</p>
  <ul class="list">${PLAN.apartments.map(a => `
    <li><button type="button" data-go="apt-${a.id}" ${a.status === 'rented' ? 'disabled' : ''}>
      <span class="num">${a.id}</span>
      <span><strong>דירה ${a.id}</strong><small>${a.status === 'rented' ? 'מושכרת' : `${a.count} חדרים, כ-${a.area} מ״ר`}</small></span>
      <span class="go" aria-hidden="true">${a.status === 'rented' ? '' : '‹'}</span>
    </button></li>`).join('')}</ul>
  ${cta()}
  <a class="link" href="../">לסיור המלא באתר</a>`;

const aptView = apt => `
  <button type="button" class="back" data-go="">כל הבניין</button>
  <h1 class="display">דירה ${apt.id}</h1>
  <div class="facts"><span>${apt.count} חדרים</span><span>כ-${apt.area} מ״ר</span><span>מזגן בכל חדר</span><span>חניה פרטית</span><span>דוד גז</span></div>
  <p class="muted">בחרו חדר בתוכנית או ברשימה.</p>
  ${roomList(apt)}
  ${apt.video ? '<button type="button" class="btn btn--solid video-btn" data-video>סיור וידאו בדירה</button>' : ''}
  ${cta(apt.id)}`;

const roomView = (apt, room) => `
  <button type="button" class="back" data-go="apt-${apt.id}">דירה ${apt.id}</button>
  <h1 class="display">${room.name}</h1>
  <p class="muted">כ-${room.area} מ״ר</p>
  ${room.photos.length
    ? `<div class="strip">${room.photos.map((p, i) => `<button type="button" data-photo="${i}" aria-label="הגדלת תמונה ${i + 1} מתוך ${room.photos.length}"><img src="${p}" alt="${room.name}" loading="lazy"></button>`).join('')}</div>`
    : '<div class="empty">עוד אין לנו תמונה של החדר הזה. רוצים לראות אותו? נשמח לתאם ביקור.</div>'}
  ${roomList(apt, room)}
  ${cta(apt.id)}`;

/* ---------- interaction ---------- */
panel.addEventListener('click', e => {
  const t = e.target.closest('[data-go], [data-photo], [data-video]');
  if (!t) return;
  if ('go' in t.dataset) go(t.dataset.go);
  else if ('photo' in t.dataset) openPhotos(cur.room.photos, +t.dataset.photo);
  else openVideo(cur.apt.video);
});
// list hover lights up the room on the plan (mouse only; on touch a tap navigates anyway)
const highlight = id => { for (const p of roomEls) p.classList.toggle('hl', !!id && p.apt === cur.apt && p.room.id === id); };
panel.addEventListener('pointerover', e => { if (e.pointerType === 'mouse') highlight(e.target.closest('[data-room]')?.dataset.room); });
panel.addEventListener('pointerleave', () => highlight());

svg.addEventListener('click', e => {
  const g = e.target.closest('.apt');
  if (!cur.apt) { if (g?.classList.contains('available')) go(`apt-${g.dataset.apt}`); return; }
  const p = e.target.closest('.room');
  if (p && p.apt === cur.apt && p.room.type !== 'hall') go(`apt-${cur.apt.id}/${p.room.id}`);
});
svg.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
addEventListener('keydown', e => {
  if (e.key !== 'Escape' || dlg.open || !cur.apt) return;
  go(cur.room ? `apt-${cur.apt.id}` : '');
});

// mouse: hover preview card (checked per event, so touch laptops work both ways)
{
  svg.addEventListener('pointermove', e => {
    const p = e.pointerType === 'mouse' && cur.apt && e.target.closest('.room');
    if (!p || p.apt !== cur.apt || p.room.type === 'hall') { peek.classList.remove('on'); return; }
    const room = p.room;
    if (peek.room !== room) {
      peek.room = room;
      const img = peek.querySelector('img');
      img.hidden = !room.photos[0];
      if (room.photos[0]) img.src = thumb(room.photos[0]);
      peek.querySelector('b').textContent = room.name;
      peek.querySelector('span').textContent = `כ-${room.area} מ״ר`;
    }
    const w = peek.offsetWidth, h = peek.offsetHeight;
    const x = Math.max(12, Math.min(innerWidth - w - 12, e.clientX - w - 20));
    const y = Math.max(12, Math.min(innerHeight - h - 12, e.clientY - h / 2));
    peek.style.transform = `translate(${x}px, ${y}px)`;
    peek.classList.add('on');
  });
  svg.addEventListener('pointerleave', () => peek.classList.remove('on'));
}

/* ---------- phone bottom sheet: drag or tap the handle ---------- */
const grab = panel.querySelector('.panel__grab');
let open = false, startY = null, startH = 0;
const setSheet = v => {
  open = v;
  panel.style.removeProperty('--sheet-h');
  if (v) panel.style.setProperty('--sheet-h', '88svh');
  grab.setAttribute('aria-label', v ? 'כיווץ החלונית' : 'הרחבת החלונית');
};
grab.addEventListener('pointerdown', e => {
  startY = e.clientY; startH = panel.offsetHeight;
  panel.classList.add('dragging');
  grab.setPointerCapture(e.pointerId);
});
grab.addEventListener('pointermove', e => {
  if (startY === null) return;
  const h = Math.min(innerHeight * 0.88, Math.max(innerHeight * 0.3, startH + startY - e.clientY));
  panel.style.setProperty('--sheet-h', `${h}px`);
});
const endDrag = e => {
  if (startY === null) return;
  const moved = Math.abs(e.clientY - startY) > 6;
  const mid = innerHeight * 0.62;
  panel.classList.remove('dragging');
  startY = null;
  setSheet(moved ? panel.offsetHeight > mid : !open);
};
grab.addEventListener('pointerup', endDrag);
grab.addEventListener('pointercancel', endDrag);

/* ---------- lightbox (same markup/styles as the main site) ---------- */
const dlg = document.querySelector('.lightbox');
const dImg = dlg.querySelector('img'), dVid = dlg.querySelector('video');
let lb = [], li = 0;
const lbShow = i => { li = (i + lb.length) % lb.length; dImg.src = lb[li]; };
const setArrows = on => dlg.querySelectorAll('.lb-prev, .lb-next').forEach(b => (b.hidden = !on));
function openPhotos(list, i) {
  lb = list; dVid.hidden = true; dImg.hidden = false;
  lbShow(i); setArrows(list.length > 1); dlg.showModal();
}
function openVideo(src) {
  lb = []; dImg.hidden = true; dVid.hidden = false; setArrows(false);
  dVid.src = src; dlg.showModal(); dVid.play().catch(() => {});
}
dlg.addEventListener('close', () => dVid.pause());
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
dlg.querySelector('.lb-close').addEventListener('click', () => dlg.close());
dlg.querySelector('.lb-next').addEventListener('click', () => lbShow(li + 1));
dlg.querySelector('.lb-prev').addEventListener('click', () => lbShow(li - 1));
dlg.addEventListener('keydown', e => {
  if (!lb.length) return;
  if (e.key === 'ArrowLeft') lbShow(li + 1); // RTL: left is forward
  if (e.key === 'ArrowRight') lbShow(li - 1);
});
let x0 = null;
dlg.addEventListener('pointerdown', e => (x0 = e.clientX));
dlg.addEventListener('pointerup', e => {
  if (x0 === null || lb.length < 2) return;
  const dx = e.clientX - x0; x0 = null;
  if (Math.abs(dx) > 50) lbShow(li + (dx > 0 ? 1 : -1));
});

/* ---------- start ---------- */
addEventListener('resize', placeChips);
new ResizeObserver(placeChips).observe(svg);
render(true);
if (motionOK) {
  svg.classList.add('draw');
  setTimeout(() => svg.classList.remove('draw'), 2400);
}
