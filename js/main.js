/* =====================================================
   LOADER
===================================================== */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  setTimeout(() => loader.classList.add('hidden'), 400);
});

document.getElementById('year').textContent = new Date().getFullYear();

/* =====================================================
   CUSTOM CURSOR
===================================================== */
const cursorDot = document.getElementById('cursorDot');
if (cursorDot) {
  window.addEventListener('mousemove', (e) => {
    cursorDot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
  });
  document.querySelectorAll('a, button, input, textarea').forEach((el) => {
    el.addEventListener('mouseenter', () => cursorDot.classList.add('is-active'));
    el.addEventListener('mouseleave', () => cursorDot.classList.remove('is-active'));
  });
}

/* =====================================================
   MOBILE NAV TOGGLE
===================================================== */
const navToggle = document.getElementById('navToggle');
const sideNav = document.getElementById('sideNav');
navToggle?.addEventListener('click', () => sideNav.classList.toggle('is-open'));
sideNav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => sideNav.classList.remove('is-open')));

/* =====================================================
   ACTIVE NAV LINK ON SCROLL
===================================================== */
const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.side-nav__links a');

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((l) => l.classList.remove('active'));
        const active = document.querySelector(`.side-nav__links a[href="#${entry.target.id}"]`);
        active?.classList.add('active');
      }
    });
  },
  { rootMargin: '-45% 0px -45% 0px' }
);
sections.forEach((s) => navObserver.observe(s));

/* =====================================================
   SCROLL REVEAL
===================================================== */
document.querySelectorAll(
  '.about__copy, .about__stack, .work-item, .craft-card, .contact__intro, .contact-form'
).forEach((el) => el.setAttribute('data-reveal', ''));

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

/* =====================================================
   THREE.JS HERO SCENE — "signature core"
   An icosahedron built from wireframe edges + point nodes,
   drifting and reacting to mouse + scroll.
===================================================== */
(function initHeroScene() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 6;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // --- Core geometry: icosahedron wireframe ---
  const coreGeo = new THREE.IcosahedronGeometry(2.1, 1);
  const coreEdges = new THREE.EdgesGeometry(coreGeo);
  const coreMat = new THREE.LineBasicMaterial({ color: 0x7c6cf6, transparent: true, opacity: 0.55 });
  const coreLines = new THREE.LineSegments(coreEdges, coreMat);
  scene.add(coreLines);

  // --- Node points at vertices ---
  const nodeMat = new THREE.PointsMaterial({ color: 0x34e4d2, size: 0.06, transparent: true, opacity: 0.9 });
  const nodePoints = new THREE.Points(coreGeo, nodeMat);
  scene.add(nodePoints);

  // --- Ambient particle field ---
  const particleCount = 220;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 14;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0xffb454, size: 0.02, transparent: true, opacity: 0.5 });
  const particleField = new THREE.Points(particleGeo, particleMat);
  scene.add(particleField);

  // --- Base vertex positions for gentle organic distortion ---
  const basePositions = coreGeo.attributes.position.array.slice();

  let mouseX = 0, mouseY = 0;
  let targetRotX = 0, targetRotY = 0;
  const coords = document.getElementById('heroCoords');

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    targetRotY = mouseX * 0.4;
    targetRotX = mouseY * 0.3;
    if (coords) coords.textContent = `x: ${mouseX.toFixed(2)} · y: ${(-mouseY).toFixed(2)}`;
  });

  let scrollFactor = 0;
  window.addEventListener('scroll', () => {
    scrollFactor = Math.min(window.scrollY / window.innerHeight, 1.2);
  });

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (!prefersReducedMotion) {
      // idle rotation + mouse parallax
      coreLines.rotation.y += 0.0018;
      coreLines.rotation.x += 0.0006;
      nodePoints.rotation.copy(coreLines.rotation);

      coreLines.rotation.y += (targetRotY - 0) * 0.02;
      coreLines.rotation.x += (targetRotX - 0) * 0.02;

      // organic vertex breathing
      const posAttr = coreGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const ix = i * 3;
        const bx = basePositions[ix], by = basePositions[ix + 1], bz = basePositions[ix + 2];
        const noise = Math.sin(t * 0.6 + i) * 0.05;
        posAttr.array[ix] = bx + bx * noise * 0.15;
        posAttr.array[ix + 1] = by + by * noise * 0.15;
        posAttr.array[ix + 2] = bz + bz * noise * 0.15;
      }
      posAttr.needsUpdate = true;

      particleField.rotation.y += 0.0004;
    }

    // scroll pushes the core back and fades it
    coreLines.position.z = -scrollFactor * 3;
    nodePoints.position.z = -scrollFactor * 3;
    coreMat.opacity = 0.55 * (1 - scrollFactor * 0.8);
    nodeMat.opacity = 0.9 * (1 - scrollFactor * 0.8);

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
