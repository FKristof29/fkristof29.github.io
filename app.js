const root = document.documentElement;
const toggle = document.querySelector('.effects-toggle');
const state = toggle.querySelector('.effects-state');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const sections = [...document.querySelectorAll('main > section')];
const navLinks = [...document.querySelectorAll('.nav-links a')];
const progressBar = document.querySelector('.scroll-progress span');
let saved;
try { saved = localStorage.getItem('fk-effects'); } catch {}
let enabled = !reduceMotion.matches && saved !== 'off';
let scene, loading, failed = false;

function syncControls() {
  root.classList.toggle('effects-off', !enabled);
  document.body.classList.toggle('effects-off', !enabled);
  toggle.setAttribute('aria-pressed', String(enabled));
  state.textContent = enabled ? 'BE' : 'KI';
  toggle.title = failed ? 'A 3D megjelenítés nem érhető el ezen az eszközön.' : 'Animációk és 3D effektek be- és kikapcsolása';
  scene?.setEnabled(enabled && !document.hidden);
}

async function startScene() {
  if (scene || loading || failed || !enabled) return;
  loading = true;
  try {
    const { createScene } = await import('./scene.js');
    scene = createScene(document.querySelector('#scene'), () => {
      failed = true;
      enabled = false;
      toggle.disabled = true;
      root.classList.remove('scene-ready');
      syncControls();
    });
    scene.setEnabled(enabled && !document.hidden);
    root.classList.add('scene-ready');
  } catch (error) {
    failed = true;
    enabled = false;
    toggle.disabled = true;
    console.warn('A 3D jelenet helyett a statikus nézet jelenik meg.', error);
    syncControls();
  } finally { loading = false; }
}

toggle.addEventListener('click', () => {
  enabled = !enabled;
  saved = enabled ? 'on' : 'off';
  try { localStorage.setItem('fk-effects', saved); } catch {}
  syncControls();
  startScene();
});
reduceMotion.addEventListener('change', () => {
  enabled = !failed && !reduceMotion.matches && saved !== 'off';
  syncControls();
  startScene();
});
document.addEventListener('visibilitychange', () => scene?.setEnabled(enabled && !document.hidden));

let scrollQueued = false;
function updateScroll() {
  scrollQueued = false;
  const max = root.scrollHeight - innerHeight;
  progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  const active = sections.findLast(section => section.getBoundingClientRect().top <= innerHeight * .4) || sections[0];
  navLinks.forEach(link => {
    if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
addEventListener('scroll', () => {
  if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
}, { passive: true });
addEventListener('resize', updateScroll);
document.fonts.ready.then(updateScroll);
updateScroll();

document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('pointermove', event => {
    if (!enabled || reduceMotion.matches || !finePointer.matches) return;
    const box = card.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    card.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`);
    card.style.setProperty('--tilt-y', `${(x - 0.5) * 4}deg`);
    card.style.setProperty('--mouse-x', `${x * 100}%`);
    card.style.setProperty('--mouse-y', `${y * 100}%`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
  });
});
syncControls();
startScene();
