const root = document.documentElement;
root.classList.add('js');
const motionOK = !matchMedia('(prefers-reduced-motion: reduce)').matches && window.gsap;

/* ---------- smooth scroll + scroll journey ---------- */
let lenis;
if (motionOK) {
  root.classList.add('motion');
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true }); // iOS address bar show/hide shouldn't re-layout the pins

  lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); lenis.scrollTo(a.getAttribute('href'), { duration: 1.6 }); })
  );

  // the one load moment: the arch opens, the headline rises
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from('.hero__arch', { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 26px 26px)', duration: 1.8 })
    .from('.hero__arch img', { scale: 1.35, duration: 2.6 }, 0)
    .from('.hero .line, .hero .lead, .hero .cta-row', { y: 40, autoAlpha: 0, duration: 1.2, stagger: 0.1 }, 0.35)
    .from('.hero__chip', { y: 20, autoAlpha: 0, duration: 1 }, 1);

  // arrival: the building grows out of an arch to fill the screen
  gsap.timeline({ scrollTrigger: { trigger: '.arrival', start: 'top top', end: '+=120%', scrub: true, pin: true, anticipatePin: 1 } })
    .fromTo('.arrival__img',
      { clipPath: 'inset(14% 20% 14% 20% round 999px 999px 26px 26px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none' })
    .from('.arrival__img img', { scale: 1.3, ease: 'none' }, 0)
    .from('.arrival__card', { y: 80, autoAlpha: 0, duration: 0.35 }, 0.6);

  // journey: vertical scroll walks sideways through the rooms (RTL → track moves right)
  const track = document.querySelector('.journey__track');
  const viewport = document.querySelector('.journey__viewport');
  const dist = () => track.scrollWidth - viewport.clientWidth;
  gsap.timeline({
    scrollTrigger: { trigger: '.journey', start: 'top top', end: () => '+=' + dist(), scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true }
  })
    .to(track, { x: dist, ease: 'none' })
    .to('.journey__progress span', { scaleX: 1, ease: 'none' }, 0);

  // features panel floats up over the photo
  gsap.from('.features__panel', { y: 120, ease: 'none', scrollTrigger: { trigger: '.features', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.fromTo('.features__img img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.features', start: 'top bottom', end: 'bottom top', scrub: true } });
}

/* ---------- contact dock: shown whenever the hero's own buttons aren't on screen ---------- */
const dock = document.querySelector('.dock');
new IntersectionObserver(([e]) => dock.classList.toggle('is-shown', !e.isIntersecting))
  .observe(document.querySelector('.hero .cta-row'));

/* ---------- video: autoplay muted in view, tap for sound ---------- */
const video = document.getElementById('tour');
const sound = document.querySelector('.sound');
new IntersectionObserver(([e]) => {
  if (e.isIntersecting) video.play().catch(() => {});
  else video.pause();
}, { threshold: 0.5 }).observe(video);
sound.addEventListener('click', () => {
  video.muted = !video.muted;
  if (!video.muted) { video.currentTime = video.currentTime || 0; video.play().catch(() => {}); }
  sound.setAttribute('aria-pressed', String(!video.muted));
  sound.querySelector('use').setAttribute('href', video.muted ? '#i-mute' : '#i-sound');
  sound.querySelector('span').textContent = video.muted ? 'הפעלת קול' : 'השתקה';
});
video.addEventListener('click', () => (video.paused ? video.play() : video.pause()));

// ambient loops (lobby) only run while visible
const loopIO = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())));
document.querySelectorAll('.room video').forEach(v => loopIO.observe(v));

// tour picker: swap the clip in the phone, keep the sound setting
document.querySelectorAll('.tours__btn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tours__btn').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  video.poster = btn.dataset.poster;
  video.src = btn.dataset.src;
  video.play().catch(() => {});
}));

/* ---------- gallery lightbox ---------- */
const dlg = document.querySelector('.lightbox');
const dlgImg = dlg.querySelector('img');
const items = [...document.querySelectorAll('.gallery__grid button')];
let cur = 0;
const show = n => {
  cur = (n + items.length) % items.length;
  dlgImg.src = items[cur].dataset.full;
  dlgImg.alt = items[cur].querySelector('img').alt;
};
items.forEach((b, n) => b.addEventListener('click', () => { show(n); dlg.showModal(); lenis?.stop(); }));
dlg.addEventListener('close', () => lenis?.start());
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
dlg.querySelector('.lb-close').addEventListener('click', () => dlg.close());
dlg.querySelector('.lb-next').addEventListener('click', () => show(cur + 1));
dlg.querySelector('.lb-prev').addEventListener('click', () => show(cur - 1));
dlg.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') show(cur + 1);   // RTL: left is forward
  if (e.key === 'ArrowRight') show(cur - 1);
});
let x0 = null;
dlg.addEventListener('pointerdown', e => (x0 = e.clientX));
dlg.addEventListener('pointerup', e => {
  if (x0 === null) return;
  const dx = e.clientX - x0; x0 = null;
  if (Math.abs(dx) > 50) show(cur + (dx > 0 ? 1 : -1));
});
