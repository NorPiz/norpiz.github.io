// =============== HERO VIDEO SWITCH + NATIVE ANCHOR SCROLL =================
document.addEventListener("DOMContentLoaded", () => {
  const bgVideo = document.getElementById("bgVideo");

  // ---- Video sources
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

  function setSources(videoEl, sources) {
    if (!videoEl) return;
    videoEl.pause();
    while (videoEl.firstChild) videoEl.removeChild(videoEl.firstChild);
    sources.forEach(({src, type}) => {
      const s = document.createElement("source");
      s.src = src; s.type = type;
      videoEl.appendChild(s);
    });
    videoEl.load();
  }

  function playSequence(seqSources, onEnd) {
    if (!bgVideo) { onEnd && onEnd(); return; }
    bgVideo.muted = true;
    bgVideo.playsInline = true;
    bgVideo.loop = false;
    setSources(bgVideo, seqSources);
    bgVideo.play().catch(()=>{});
    bgVideo.onended = () => { onEnd && onEnd(); };
  }

  function backToIdle() {
    if (!bgVideo) return;
    setSources(bgVideo, SOURCES.idle);
    bgVideo.loop = true;
    bgVideo.play().catch(()=>{});
  }

  // === Scroll d’ancre natif, déclenché après stabilisation du layout
  function goToHash(targetSel){
    if (!targetSel || !targetSel.startsWith("#")) return;

    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";

    // Si le même hash est déjà là, on le reset pour forcer le re-scroll
    if (location.hash === targetSel) {
      history.replaceState(null, "", location.pathname + location.search);
    }

    // Double rAF : laisse le temps au navigateur d'appliquer tailles/ratio
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        location.hash = targetSel;
        root.style.scrollBehavior = prev || "";
      });
    });
  }

  // Bind CTA
  document.querySelectorAll(".button-cta").forEach(btn => {
    const targetSel = btn.dataset.target || btn.getAttribute("href");
    if (!targetSel || !targetSel.startsWith("#")) return;

    let which = btn.dataset.jump || null;
    if (!which) {
      if (btn.id === "btnVideoDemos") which = "jump2";
      if (btn.id === "btnOptions")    which = "jump1";
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (which && SOURCES[which]) {
        playSequence(SOURCES[which], () => { backToIdle(); goToHash(targetSel); });
      } else {
        goToHash(targetSel);
      }
    });
  });

  // ================== LAZY LOAD FOR DEMO VIDEOS ============================
  (function lazyLoadDemos(){
    const demos = document.querySelectorAll("video.lazy-demo");
    if (!demos.length) return;

    // IMPORTANT: fixe une taille intrinsic pour éviter tout shift si CSS est désactivé
    demos.forEach(v => {
      if (!v.hasAttribute("width"))  v.setAttribute("width",  "480");
      if (!v.hasAttribute("height")) v.setAttribute("height", "270"); // 16:9 par défaut
      v.preload = "metadata";
    });

    function addSources(v){
      if (v.dataset.loaded) return;

      const webm = v.dataset.srcWebm || v.dataset.srcWebM || v.getAttribute("data-src-webm");
      const mp4  = v.dataset.srcMp4  || v.dataset.srcMP4  || v.getAttribute("data-src-mp4");

      const canWebm = !!v.canPlayType && v.canPlayType("video/webm; codecs=vp9,vorbis").replace("no","");

      const add = (src,type)=>{
        if (!src) return;
        const s = document.createElement("source");
        s.src = src; s.type = type;
        v.appendChild(s);
      };

      if (canWebm){ add(webm, "video/webm"); add(mp4, "video/mp4"); }
      else         { add(mp4,  "video/mp4"); add(webm,"video/webm"); }

      v.load();
      v.dataset.loaded = "1";
    }

    function playWhenReady(v){
      const onReady = () => {
        v.muted = true;
        v.playsInline = true;
        v.loop = true;
        v.play().catch(()=>{});
        v.removeEventListener("canplay", onReady);
      };
      v.addEventListener("canplay", onReady);
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
  })();
});
