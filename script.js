// ============================================================
//  norpiz.github.io — script.js
// ============================================================
document.addEventListener("DOMContentLoaded", () => {

  // ── Video sources ─────────────────────────────────────────
  const SOURCES = {
    idle:  [
      { src: "video/idle.webm",  type: "video/webm" },
      { src: "video/idle.mp4",   type: "video/mp4"  }
    ],
    jump1: [
      { src: "video/jump1.webm", type: "video/webm" },
      { src: "video/jump1.mp4",  type: "video/mp4"  }
    ],
    jump2: [
      { src: "video/jump2.webm", type: "video/webm" },
      { src: "video/jump2.mp4",  type: "video/mp4"  }
    ]
  };

  // ── Native anchor scroll ──────────────────────────────────
  function goToHash(sel) {
    if (!sel || !sel.startsWith("#")) return;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";
    if (location.hash === sel) history.replaceState(null, "", location.pathname + location.search);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      location.hash = sel;
      root.style.scrollBehavior = prev || "";
    }));
  }

  // ── 1. Hero — A/B crossfade ───────────────────────────────
  function initHeroVideo() {
    const vA = document.getElementById("bgVideoA");
    const vB = document.getElementById("bgVideoB");
    if (!vA || !vB) return;

    let active   = vA;
    let inactive = vB;

    function setSrc(v, sources) {
      v.pause();
      while (v.firstChild) v.removeChild(v.firstChild);
      sources.forEach(({ src, type }) => {
        const s = document.createElement("source");
        s.src = src; s.type = type;
        v.appendChild(s);
      });
      v.load();
    }

    function crossfadeTo(sources, { loop = false, onEnd = null } = {}) {
      inactive.loop        = loop;
      inactive.muted       = true;
      inactive.playsInline = true;
      setSrc(inactive, sources);
      inactive.addEventListener("canplay", function handler() {
        inactive.removeEventListener("canplay", handler);
        inactive.play().catch(() => {});
        active.classList.remove("active");
        inactive.classList.add("active");
        [active, inactive] = [inactive, active];
        if (!loop && onEnd) active.addEventListener("ended", onEnd, { once: true });
      });
    }

    function backToIdle() {
      crossfadeTo(SOURCES.idle, { loop: true });
    }

    document.querySelectorAll(".button-cta").forEach(btn => {
      const sel = btn.dataset.target || btn.getAttribute("href");
      if (!sel || !sel.startsWith("#")) return;
      let which = btn.dataset.jump;
      if (!which) {
        if (btn.id === "btnVideoDemos") which = "jump2";
        if (btn.id === "btnOptions")    which = "jump1";
      }
      btn.addEventListener("click", e => {
        e.preventDefault();
        if (which && SOURCES[which]) {
          crossfadeTo(SOURCES[which], {
            loop: false,
            onEnd: () => { backToIdle(); goToHash(sel); }
          });
        } else {
          goToHash(sel);
        }
      });
    });
  }

  // ── 2. Hero parallax (mouse) ─────────────────────────────
  function initHeroParallax() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer:fine)").matches) return;

    const vA = document.getElementById("bgVideoA");
    const vB = document.getElementById("bgVideoB");
    if (!vA) return;

    let mx = 0.5, my = 0.5, cx = 0.5, cy = 0.5;

    document.addEventListener("mousemove", e => {
      mx = e.clientX / window.innerWidth;
      my = e.clientY / window.innerHeight;
    }, { passive: true });

    function lerp(a, b, t) { return a + (b - a) * t; }

    (function tick() {
      cx = lerp(cx, mx, 0.04);
      cy = lerp(cy, my, 0.04);
      const dx = (cx - 0.5) * 14;
      const dy = (cy - 0.5) * 10;
      const tf = `scale(1.04) translate(${-dx}px,${-dy}px)`;
      if (vA) vA.style.transform = tf;
      if (vB) vB.style.transform = tf;
      requestAnimationFrame(tick);
    })();
  }

  // ── 3. Scroll reveal ─────────────────────────────────────
  function initScrollReveal() {
    const els = document.querySelectorAll(".reveal-target");
    if (!els.length) return;
    if (!("IntersectionObserver" in window) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach(el => el.classList.add("revealed")); return;
    }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        target.classList.add("revealed");
        obs.unobserve(target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    els.forEach(el => obs.observe(el));
  }

  // ── 4. Lazy demo videos ───────────────────────────────────
  function initLazyDemos() {
    const demos = document.querySelectorAll("video.lazy-demo");
    if (!demos.length) return;

    demos.forEach(v => {
      if (!v.hasAttribute("width"))  v.setAttribute("width",  "480");
      if (!v.hasAttribute("height")) v.setAttribute("height", "270");
      v.preload = "metadata";
    });

    function addSources(v) {
      if (v.dataset.loaded) return;
      const webm    = v.dataset.srcWebm || v.dataset.srcWebM || v.getAttribute("data-src-webm");
      const mp4     = v.dataset.srcMp4  || v.dataset.srcMP4  || v.getAttribute("data-src-mp4");
      const canWebm = !!v.canPlayType && v.canPlayType("video/webm; codecs=vp9,vorbis").replace("no", "");
      const add = (src, type) => {
        if (!src) return;
        const s = document.createElement("source");
        s.src = src; s.type = type;
        v.appendChild(s);
      };
      if (canWebm) { add(webm, "video/webm"); add(mp4, "video/mp4"); }
      else          { add(mp4,  "video/mp4");  add(webm, "video/webm"); }
      v.load();
      v.dataset.loaded = "1";
    }

    function playWhenReady(v) {
      const fn = () => {
        v.muted = true; v.playsInline = true; v.loop = true;
        v.play().catch(() => {});
        v.removeEventListener("canplay", fn);
      };
      v.addEventListener("canplay", fn);
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        const v = entry.target;
        if (!entry.isIntersecting) { v.pause(); return; }
        addSources(v);
        playWhenReady(v);
        if (v.dataset.loaded) obs.unobserve(v);
      });
    }, { rootMargin: "200px 0px", threshold: 0.1 });

    demos.forEach(v => io.observe(v));
  }

  // ── 5. Glow cursor ───────────────────────────────────────
  function initCursor() {
    if (!window.matchMedia("(pointer:fine)").matches) return;
    const dot = document.getElementById("cursor-dot");
    if (!dot) return;
    document.body.classList.add("custom-cursor");

    let mx = -100, my = -100, cx = -100, cy = -100;
    document.addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener("mouseleave", () => { dot.style.opacity = "0"; });
    document.addEventListener("mouseenter", () => { dot.style.opacity = "1"; });

    function lerp(a, b, t) { return a + (b - a) * t; }
    (function animate() {
      cx = lerp(cx, mx, 0.22);
      cy = lerp(cy, my, 0.22);
      dot.style.transform = `translate(${Math.round(cx) - 4}px,${Math.round(cy) - 4}px)`;
      requestAnimationFrame(animate);
    })();
  }

  // ── 6. Nav scroll-spy ─────────────────────────────────────
  function initScrollSpy() {
    const links = document.querySelectorAll("nav a[data-section]");
    if (!links.length || !("IntersectionObserver" in window)) return;
    const map = new Map();
    links.forEach(a => {
      const sec = document.getElementById(a.dataset.section);
      if (sec) map.set(sec, a);
    });
    const obs = new IntersectionObserver(entries => {
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        const a = map.get(target);
        if (!a) return;
        links.forEach(l => { l.classList.remove("active"); l.removeAttribute("aria-current"); });
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
      });
    }, { threshold: 0.35 });
    map.forEach((_, sec) => obs.observe(sec));
  }

  // ── 7. 3D card tilt ──────────────────────────────────────
  function initCardTilt() {
    if (window.matchMedia("(pointer:coarse)").matches) return;
    const MAX = 7;
    document.querySelectorAll(".card, .game-card").forEach(card => {
      card.addEventListener("mousemove", e => {
        const r  = card.getBoundingClientRect();
        const dx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
        const dy = ((e.clientY - r.top)  / r.height - 0.5) * 2;
        card.style.transform  = `perspective(700px) rotateX(${-dy * MAX}deg) rotateY(${dx * MAX}deg) scale(1.025)`;
        card.style.transition = "transform 0.05s ease";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform  = "";
        card.style.transition = "transform 0.4s ease";
      });
    });
  }

  // ── Bootstrap ─────────────────────────────────────────────
  initHeroVideo();
  initHeroParallax();
  initScrollReveal();
  initLazyDemos();
  initCursor();
  initScrollSpy();
  initCardTilt();
});
