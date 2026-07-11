// ============================================================
//  SUNNY ORBIT — nourzouine.com
//  Soft 3D pastel sky + mouse-following avatar (ES module)
// ============================================================

const COLORS = {
  bg: 0xfdf4e7,
  ink: 0x2d2a32,
  coral: 0xff7a5c,
  yellow: 0xffc93c,
  sky: 0x6cc4ff,
  mint: 0x7edcb4,
  lilac: 0xb892f0,
  cream: 0xfffdf7,
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const isSmall = window.matchMedia("(max-width: 768px)").matches;

// shared mouse state (used by the sky and the avatar)
const pointer = { x: 0, y: 0, px: 0, py: 0 }; // normalized -1..1 + raw pixels
window.addEventListener("mousemove", (e) => {
  pointer.px = e.clientX;
  pointer.py = e.clientY;
  pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ------------------------------------------------------------
//  DOM interactions (always run, even if WebGL fails)
// ------------------------------------------------------------
function initDom() {
  const header = document.getElementById("siteHeader");
  const scrollBar = document.getElementById("scrollBar");

  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 30);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollBar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // reveal on scroll
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (reducedMotion) {
    revealEls.forEach((el) => el.classList.add("in"));
  } else {
    const revealObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revealObs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => revealObs.observe(el));
  }

  // nav scroll-spy
  const navLinks = [...document.querySelectorAll(".site-header nav a[data-section]")];
  const spyObs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        navLinks.forEach((a) =>
          a.classList.toggle("active", a.dataset.section === e.target.id)
        );
      }
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  ["about", "projects", "music", "games", "contact"].forEach((id) => {
    const s = document.getElementById(id);
    if (s) spyObs.observe(s);
  });

  // lazy demo videos
  const videoObs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target;
        if (e.isIntersecting) {
          if (!v.dataset.loaded) {
            const webm = document.createElement("source");
            webm.src = v.dataset.srcWebm;
            webm.type = "video/webm";
            const mp4 = document.createElement("source");
            mp4.src = v.dataset.srcMp4;
            mp4.type = "video/mp4";
            v.append(webm, mp4);
            v.load();
            v.dataset.loaded = "1";
          }
          v.play().catch(() => {});
        } else if (v.dataset.loaded) {
          v.pause();
        }
      }
    },
    { rootMargin: "200px 0px" }
  );
  document.querySelectorAll("video.lazy-demo").forEach((v) => videoObs.observe(v));

  if (!finePointer || reducedMotion) return;

  // 3D tilt on cards
  document.querySelectorAll(".tilt").forEach((el) => {
    let raf = null;
    el.addEventListener("mousemove", (ev) => {
      const r = el.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width - 0.5;
      const y = (ev.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 7}deg)`;
      });
    });
    el.addEventListener("mouseleave", () => {
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = "";
      el.style.transition = "transform .5s cubic-bezier(.22,1,.36,1)";
      setTimeout(() => (el.style.transition = ""), 500);
    });
  });

  // magnetic buttons
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (ev) => {
      const r = el.getBoundingClientRect();
      const x = ev.clientX - r.left - r.width / 2;
      const y = ev.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.15}px, ${y * 0.25}px)`;
    });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  });

  // custom cursor
  const dot = document.getElementById("cursor-dot");
  const ring = document.getElementById("cursor-ring");
  let rx = -100, ry = -100;
  window.addEventListener("mousemove", () => document.body.classList.add("cursor-on"));
  document.querySelectorAll("a, button, .tilt, .avatar-card").forEach((el) => {
    el.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover"));
    el.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover"));
  });
  (function cursorLoop() {
    rx += (pointer.px - rx) * 0.16;
    ry += (pointer.py - ry) * 0.16;
    dot.style.transform = `translate(${pointer.px - 4}px, ${pointer.py - 4}px)`;
    const half = ring.offsetWidth / 2;
    ring.style.transform = `translate(${rx - half}px, ${ry - half}px)`;
    requestAnimationFrame(cursorLoop);
  })();
}

// ------------------------------------------------------------
//  helpers
// ------------------------------------------------------------
let THREE = null;

function toon(color) {
  return new THREE.MeshToonMaterial({ color });
}

function addSoftLights(scene) {
  scene.add(new THREE.HemisphereLight(0xfff7e6, 0xcfe3ff, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(4, 7, 6);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xbfe6ff, 0.5);
  rim.position.set(-5, 2, -4);
  scene.add(rim);
}

function starGeometry(R = 0.55, r = 0.24, points = 5, depth = 0.22) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2,
  });
}

function makeCloud(scale = 1) {
  const g = new THREE.Group();
  const m = toon(COLORS.cream);
  const puffs = [
    [0, 0, 0, 0.55], [0.55, 0.12, 0.05, 0.42], [-0.55, 0.1, 0.05, 0.4],
    [0.2, 0.32, -0.05, 0.36], [-0.25, 0.3, 0, 0.34],
  ];
  for (const [x, y, z, r] of puffs) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), m);
    p.position.set(x, y, z);
    g.add(p);
  }
  g.scale.setScalar(scale);
  return g;
}

// a cylinder stretched between two points (glasses temples, etc.)
function tubeBetween(p1, p2, radius, material) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), material);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

// ------------------------------------------------------------
//  the pastel sky behind the whole page
// ------------------------------------------------------------
async function initSky() {
  const canvas = document.getElementById("webgl");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor(COLORS.bg, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COLORS.bg, 0.024);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0, 9);

  addSoftLights(scene);

  // ---------- peaceful sun (hero centerpiece) ----------
  const hero = new THREE.Group();
  hero.position.set(0, 0.5, -3);
  scene.add(hero);

  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(1.55, 48, 32), toon(COLORS.yellow));
  hero.add(sunBall);

  const face = new THREE.Group();
  const inkMat = toon(COLORS.ink);
  // closed, peaceful eyes ( ︶ ︶ )
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 10, 24, Math.PI * 0.85), inkMat);
    eye.position.set(side * 0.52, 0.22, 1.45);
    eye.rotation.z = Math.PI + (Math.PI - Math.PI * 0.85) / 2; // arc opens upward
    eye.rotation.y = side * 0.35;
    face.add(eye);
  }
  // soft smile
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 10, 28, Math.PI * 0.8), inkMat);
  smile.position.set(0, -0.32, 1.5);
  smile.rotation.z = Math.PI + (Math.PI - Math.PI * 0.8) / 2;
  face.add(smile);
  // blush
  for (const side of [-1, 1]) {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), toon(0xffa588));
    blush.position.set(side * 0.85, -0.18, 1.28);
    blush.scale.set(1, 0.62, 0.35);
    blush.rotation.y = side * 0.55;
    face.add(blush);
  }
  hero.add(face);

  // orbiting pastel beads
  const beadRing = new THREE.Group();
  beadRing.rotation.x = 0.4;
  const beadColors = [COLORS.coral, COLORS.sky, COLORS.mint, COLORS.lilac];
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), toon(beadColors[i % 4]));
    const a = (i / 8) * Math.PI * 2;
    b.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0);
    beadRing.add(b);
  }
  hero.add(beadRing);

  // clouds hugging the sun
  const cloudL = makeCloud(1.1);
  cloudL.position.set(-3.6, -0.7, -1);
  hero.add(cloudL);
  const cloudR = makeCloud(0.85);
  cloudR.position.set(3.4, 0.9, -1.4);
  hero.add(cloudR);

  // ---------- drifting soft shapes along the scroll ----------
  const drifters = [];
  const makers = [
    () => new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), toon(COLORS.coral)),
    () => new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.2, 16, 32), toon(COLORS.sky)),
    () => new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 8, 16), toon(COLORS.mint)),
    () => new THREE.Mesh(starGeometry(), toon(COLORS.yellow)),
    () => new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 18), toon(COLORS.lilac)),
    () => makeCloud(0.8),
  ];
  const DRIFTER_COUNT = isSmall ? 9 : 16;
  for (let i = 0; i < DRIFTER_COUNT; i++) {
    const obj = makers[i % makers.length]();
    const side = i % 2 === 0 ? 1 : -1;
    obj.position.set(
      side * (6.5 + Math.random() * 6),
      -4 - (i / DRIFTER_COUNT) * 30 + Math.random() * 2,
      -5 - Math.random() * 7
    );
    obj.userData = {
      rx: (Math.random() - 0.5) * 0.35,
      ry: (Math.random() - 0.5) * 0.45,
      phase: Math.random() * Math.PI * 2,
      baseY: obj.position.y,
    };
    scene.add(obj);
    drifters.push(obj);
  }

  // ---------- confetti dust ----------
  const DUST = isSmall ? 90 : 200;
  const dustGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DUST * 3);
  const dCol = new Float32Array(DUST * 3);
  const dScale = new Float32Array(DUST);
  const dPhase = new Float32Array(DUST);
  const dustColors = [COLORS.coral, COLORS.sky, COLORS.mint, COLORS.lilac, COLORS.yellow].map(
    (c) => new THREE.Color(c)
  );
  for (let i = 0; i < DUST; i++) {
    dPos[i * 3 + 0] = (Math.random() - 0.5) * 55;
    dPos[i * 3 + 1] = 12 - Math.random() * 55;
    dPos[i * 3 + 2] = -3 - Math.random() * 25;
    const c = dustColors[i % dustColors.length];
    dCol[i * 3 + 0] = c.r; dCol[i * 3 + 1] = c.g; dCol[i * 3 + 2] = c.b;
    dScale[i] = 0.7 + Math.random() * 1.6;
    dPhase[i] = Math.random() * Math.PI * 2;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute("aColor", new THREE.BufferAttribute(dCol, 3));
  dustGeo.setAttribute("aScale", new THREE.BufferAttribute(dScale, 1));
  dustGeo.setAttribute("aPhase", new THREE.BufferAttribute(dPhase, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aScale;
      attribute float aPhase;
      uniform float uTime;
      varying vec3 vColor;
      varying float vA;
      void main() {
        vColor = aColor;
        vA = 0.35 + 0.3 * sin(uTime * 0.9 + aPhase);
        vec3 p = position;
        p.y += sin(uTime * 0.25 + aPhase) * 0.6;
        p.x += cos(uTime * 0.18 + aPhase * 1.7) * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aScale * (34.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.32, d) * vA;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // ---------- motion ----------
  let scrollTarget = 0, scrollCurrent = 0, parX = 0, parY = 0;
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollTarget = max > 0 ? window.scrollY / max : 0;
  };
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();

  function renderFrame() {
    const t = clock.getElapsedTime();

    scrollCurrent += (scrollTarget - scrollCurrent) * 0.06;
    parX += (pointer.x - parX) * 0.04;
    parY += (pointer.y - parY) * 0.04;

    camera.position.y = -scrollCurrent * 26 + parY * -0.5;
    camera.position.x = parX * 0.8;
    camera.lookAt(parX * 0.35, camera.position.y + parY * -0.25, 0);

    dustMat.uniforms.uTime.value = t;

    // sun bobs, breathes, drifts away on scroll
    hero.position.y = 0.5 + Math.sin(t * 0.6) * 0.12;
    hero.rotation.z = Math.sin(t * 0.3) * 0.04;
    const breathe = 1 + Math.sin(t * 1.1) * 0.015;
    const fade = Math.max(0, 1 - scrollCurrent * 4.2);
    hero.scale.setScalar((0.55 + fade * 0.45) * breathe);
    hero.position.z = -3 - (1 - fade) * 5;
    beadRing.rotation.z = t * 0.25;
    beadRing.children.forEach((b, i) => { b.position.z = Math.sin(t + i) * 0.18; });
    cloudL.position.x = -3.6 + Math.sin(t * 0.35) * 0.25;
    cloudR.position.x = 3.4 + Math.cos(t * 0.3) * 0.25;

    for (const d of drifters) {
      d.rotation.x += d.userData.rx * 0.012;
      d.rotation.y += d.userData.ry * 0.012;
      d.position.y = d.userData.baseY + Math.sin(t * 0.55 + d.userData.phase) * 0.45;
    }

    renderer.render(scene, camera);
  }

  if (reducedMotion) {
    renderFrame();
    window.addEventListener("resize", renderFrame);
    window.addEventListener("scroll", () => { scrollCurrent = scrollTarget; renderFrame(); }, { passive: true });
    return;
  }
  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    renderFrame();
  })();
}

// ------------------------------------------------------------
//  the avatar — Nour's head, following your cursor
// ------------------------------------------------------------
async function initAvatar() {
  const canvas = document.getElementById("avatar3d");
  if (!canvas) return;
  const card = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0.1, 5);

  addSoftLights(scene);

  const SKIN = 0xe3ab84, SKIN_DARK = 0xd6976c, HAIR = 0x2a211c, BEARD = 0x33281f,
        GOLD = 0xd9a54f, TEE = 0x34323e;

  const avatar = new THREE.Group();
  avatar.position.y = -0.25;
  scene.add(avatar);

  // ----- head (this group turns toward the cursor) -----
  const head = new THREE.Group();
  head.position.y = 0.55;
  avatar.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.92, 48, 32), toon(SKIN));
  skull.scale.set(0.98, 1.08, 0.94);
  head.add(skull);

  // short dark hair
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.97, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.34),
    toon(HAIR)
  );
  hair.position.y = 0.06;
  hair.scale.set(0.99, 1.05, 0.96);
  hair.rotation.x = -0.12;
  head.add(hair);

  // ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), toon(SKIN));
    ear.position.set(side * 0.9, 0.02, 0.02);
    ear.scale.set(0.6, 1, 0.7);
    head.add(ear);
  }

  // beard — lower band of the head
  const beard = new THREE.Mesh(
    new THREE.SphereGeometry(0.94, 48, 24, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45),
    toon(BEARD)
  );
  beard.scale.set(0.97, 1.05, 0.93);
  beard.position.y = -0.03;
  head.add(beard);

  // brows
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.2, 6, 10), toon(HAIR));
    brow.position.set(side * 0.35, 0.38, 0.78);
    brow.rotation.z = Math.PI / 2 + side * 0.12;
    head.add(brow);
  }

  // eyes (white + pupil, pupils get a little parallax)
  const pupils = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.34, 0.14, 0.72);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.145, 20, 14), toon(0xffffff));
    white.scale.z = 0.55;
    eye.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10), toon(COLORS.ink));
    pupil.position.z = 0.09;
    eye.add(pupil);
    pupils.push(pupil);
    eye.userData.white = white;
    head.add(eye);
    (side === -1 ? (head.userData.eyeL = eye) : (head.userData.eyeR = eye));
  }

  // nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), toon(SKIN_DARK));
  nose.position.set(0, -0.04, 0.92);
  nose.scale.set(0.85, 1.15, 0.9);
  head.add(nose);

  // smile inside the beard
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.032, 10, 24, Math.PI * 0.85), toon(0xf0bfa4));
  smile.position.set(0, -0.32, 0.83);
  smile.rotation.z = Math.PI + (Math.PI - Math.PI * 0.85) / 2;
  head.add(smile);

  // round gold glasses
  const goldMat = toon(GOLD);
  for (const side of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.026, 12, 36), goldMat);
    lens.position.set(side * 0.35, 0.13, 0.86);
    head.add(lens);
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.255, 24),
      new THREE.MeshToonMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.22 })
    );
    glass.position.set(side * 0.35, 0.13, 0.86);
    head.add(glass);
    // temple arm to the ear
    head.add(tubeBetween(
      new THREE.Vector3(side * 0.6, 0.14, 0.8),
      new THREE.Vector3(side * 0.88, 0.12, 0.06),
      0.018, goldMat
    ));
  }
  // bridge
  head.add(tubeBetween(
    new THREE.Vector3(-0.12, 0.16, 0.9),
    new THREE.Vector3(0.12, 0.16, 0.9),
    0.02, goldMat
  ));

  // ----- neck & tee (stay still) -----
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.5, 20), toon(SKIN));
  neck.position.y = -0.42;
  avatar.add(neck);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.15, 8, 20), toon(TEE));
  torso.rotation.z = Math.PI / 2;
  torso.position.y = -1.16;
  torso.scale.set(1, 1, 0.72);
  avatar.add(torso);
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.7, 20), toon(TEE));
  chest.position.y = -1.35;
  chest.scale.z = 0.72;
  avatar.add(chest);

  // little floating friends
  const friendStar = new THREE.Mesh(starGeometry(0.16, 0.07, 5, 0.07), toon(COLORS.yellow));
  friendStar.position.set(-1.05, 1.35, -0.4);
  scene.add(friendStar);
  const friendBall = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), toon(COLORS.coral));
  friendBall.position.set(1.2, -0.5, -0.3);
  scene.add(friendBall);

  // ----- sizing -----
  function resize() {
    const w = card.clientWidth, h = card.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(card);
  resize();

  // ----- look at the cursor -----
  let yaw = 0, pitch = 0, blink = 1, nextBlink = 2.5, t = 0;
  const clock = new THREE.Clock();

  function renderFrame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;

    let targetYaw, targetPitch;
    if (finePointer) {
      const r = canvas.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.42;
      targetYaw = clamp((pointer.px - cx) / (window.innerWidth * 0.5), -1, 1) * 0.62;
      targetPitch = clamp((pointer.py - cy) / (window.innerHeight * 0.5), -1, 1) * 0.42;
    } else {
      targetYaw = Math.sin(t * 0.5) * 0.3;   // gentle idle sway on touch devices
      targetPitch = Math.sin(t * 0.35) * 0.1;
    }
    yaw += (targetYaw - yaw) * 0.09;
    pitch += (targetPitch - pitch) * 0.09;
    head.rotation.y = yaw;
    head.rotation.x = pitch;
    head.rotation.z = yaw * 0.08;

    // pupils lead the look a touch
    for (const p of pupils) {
      p.position.x = yaw * 0.05;
      p.position.y = -pitch * 0.04;
    }

    // blink
    nextBlink -= dt;
    if (nextBlink <= 0) { blink = 0; nextBlink = 2.2 + Math.random() * 3.5; }
    blink += (1 - blink) * 0.25;
    const eyeScale = 0.12 + blink * 0.88;
    head.userData.eyeL.scale.y = eyeScale;
    head.userData.eyeR.scale.y = eyeScale;

    // idle life
    avatar.position.y = -0.25 + Math.sin(t * 1.1) * 0.03;
    avatar.rotation.z = Math.sin(t * 0.5) * 0.015;
    friendStar.position.y = 1.35 + Math.sin(t * 1.3) * 0.08;
    friendStar.rotation.z = t * 0.6;
    friendBall.position.y = -0.5 + Math.cos(t * 1.6) * 0.1;

    renderer.render(scene, camera);
  }

  if (reducedMotion) {
    renderFrame();
    new ResizeObserver(() => { resize(); renderFrame(); }).observe(card);
    return;
  }
  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    renderFrame();
  })();
}

// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initDom();
  (async () => {
    THREE = await import("three");
    await initSky();
    await initAvatar();
  })().catch((err) => {
    console.warn("WebGL unavailable, falling back to CSS sky.", err);
    document.body.classList.add("no-webgl");
    // fall back to the photo if the 3D avatar can't render
    const canvas = document.getElementById("avatar3d");
    if (canvas) {
      const img = document.createElement("img");
      img.src = "LatestPhotoColor.jpg";
      img.alt = "Portrait of Nour Zouine";
      img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
      canvas.replaceWith(img);
    }
  });
});
