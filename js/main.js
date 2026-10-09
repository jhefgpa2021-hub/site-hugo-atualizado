/* =========================================================
   MARONFIT — interações e animações
   Tudo funciona sem as bibliotecas externas; Lenis e GSAP
   apenas adicionam rolagem suave e animações.
   ========================================================= */
(function () {
  "use strict";

  const CONFIG = window.MARONFIT_CONFIG || {};
  const WA_NUMBER = CONFIG.whatsapp || "5531984239408";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const escapeHtml = (str) => String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

  /* ---------- Dados do config ---------- */
  function applyConfig() {
    // Links do WhatsApp com mensagem pronta
    if (CONFIG.mensagemWhatsapp) {
      $$("[data-wa]").forEach((a) => { a.href = waLink(CONFIG.mensagemWhatsapp); });
    }

    // CRN
    const crn = (CONFIG.crn || "").trim();
    $$("[data-crn]").forEach((el) => {
      if (crn) {
        el.textContent = crn.toUpperCase().startsWith("CRN") ? crn : `CRN: ${crn}`;
      } else {
        el.classList.add("is-placeholder");
      }
    });
    $$("[data-crn-short]").forEach((el) => {
      if (crn) el.textContent = crn.toUpperCase().startsWith("CRN") ? crn : `CRN ${crn}`;
    });
  }

  /* ---------- Prova social: faixa lateral contínua (posts escritos no index.html) ---------- */
  function initProofMarquee() {
    const root = $("[data-proof-marquee]");
    if (!root) return;
    const track = $("[data-proof-track]", root);
    const originals = $$(".proof-card", track);
    originals.forEach((card, i) => card.style.setProperty("--i", i));
    // Movimento reduzido: fica a lista lateral rolável (sem animação)
    if (reduceMotion || originals.length < 2) return;

    const PX_PER_SECOND = 45;   // velocidade da faixa
    const RESUME_DELAY = 1600;  // ms para voltar a andar depois de soltar/sair
    let groupWidth = 0;         // largura de um grupo (a faixa tem dois idênticos)
    let x = 0;
    let built = false;

    const build = () => {
      // remove cópias anteriores e recalcula para a largura atual da tela
      $$("[data-proof-clone]", track).forEach((c) => c.remove());
      const gap = parseFloat(getComputedStyle(track).columnGap) || 24;
      const setWidth = originals.reduce((w, c) => w + c.offsetWidth + gap, 0);
      const perGroup = Math.max(1, Math.ceil(window.innerWidth / setWidth));
      for (let s = 1; s < perGroup * 2; s++) {
        originals.forEach((card) => {
          const clone = card.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          clone.setAttribute("data-proof-clone", "");
          track.appendChild(clone);
        });
      }
      groupWidth = setWidth * perGroup;
      root.classList.add("is-animated");
      built = true;
    };

    const wrap = () => {
      if (!groupWidth) return;
      while (x <= -groupWidth) x += groupWidth;
      while (x > 0) x -= groupWidth;
    };
    const render = () => { track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`; };

    // estado: pausa no hover, no toque/arrasto e quando fora da tela
    let hovering = false, dragging = false, visible = true, holdUntil = 0;
    let lastCheck = 0;
    const step = (deltaMs) => {
      const now = performance.now();
      const dt = Math.max(0, Math.min(100, deltaMs)) / 1000;
      // economiza bateria: só anda quando a faixa está na tela (checado a cada 300 ms)
      if (now - lastCheck > 300) {
        lastCheck = now;
        const r = root.getBoundingClientRect();
        visible = r.bottom > 0 && r.top < window.innerHeight;
      }
      if (built && visible && !hovering && !dragging && now > holdUntil) {
        x -= PX_PER_SECOND * dt;
        wrap();
        render();
      }
    };

    // a largura dos cards vem do CSS, então dá para montar a faixa imediatamente
    build();
    render();
    if (hasGsap) {
      // usa o relógio do GSAP (o mesmo da rolagem suave e das animações)
      gsap.ticker.add((time, deltaTime) => step(deltaTime));
    } else {
      let last = performance.now();
      const loop = (now) => { step(now - last); last = now; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (built) { build(); wrap(); render(); } }, 250);
    });

    // mouse em cima pausa
    root.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovering = true; });
    root.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hovering = false; });

    // arrastar para o lado (mouse ou dedo)
    let startX = 0, startOffset = 0, moved = false;
    root.addEventListener("pointerdown", (e) => {
      dragging = true; moved = false;
      startX = e.clientX; startOffset = x;
      root.classList.add("is-dragging");
    });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      x = startOffset + dx;
      wrap();
      render();
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      holdUntil = performance.now() + RESUME_DELAY;
      root.classList.remove("is-dragging");
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    root.addEventListener("click", (e) => { if (moved) e.preventDefault(); }, true);

    // teclado: setas movem a faixa
    track.addEventListener("keydown", (e) => {
      const jump = (originals[0].offsetWidth || 280) + 24;
      if (e.key === "ArrowRight") x -= jump;
      else if (e.key === "ArrowLeft") x += jump;
      else return;
      e.preventDefault();
      holdUntil = performance.now() + RESUME_DELAY * 2;
      wrap();
      render();
    });
  }

  /* ---------- Programas (venda futura) ---------- */
  function initProgramas() {
    const list = (CONFIG.programas || []).filter((p) => p && p.nome);
    if (!list.length) return;
    const section = $("#programas");
    const grid = $("[data-programas]");
    grid.innerHTML = list.map((p) => {
      const href = p.link || waLink(`Olá, Hugo! Tenho interesse no programa "${p.nome}".`);
      const external = /^https?:/i.test(href);
      return `
      <article class="program${p.destaque ? " program--featured" : ""} a">
        ${p.destaque ? `<span class="program-tag">${escapeHtml(p.destaque)}</span>` : ""}
        <h3>${escapeHtml(p.nome)}</h3>
        ${p.descricao ? `<p>${escapeHtml(p.descricao)}</p>` : ""}
        ${(p.itens || []).length ? `<ul>${p.itens.map((it) => `<li>${escapeHtml(it)}</li>`).join("")}</ul>` : ""}
        ${p.preco ? `<span class="program-price">${escapeHtml(p.preco)}</span>` : ""}
        <a class="btn btn-primary" href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener"' : ""}>${escapeHtml(p.botao || "Quero saber mais")}</a>
      </article>`;
    }).join("");
    grid.dataset.anim = "stagger-up";
    section.hidden = false;
    $$("[data-programas-nav]").forEach((li) => { li.hidden = false; });
  }

  /* ---------- Cabeçalho + menu mobile ---------- */
  function initHeader(lenis) {
    const header = $(".site-header");
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const toggle = $(".menu-toggle");
    const menu = $("#mobile-menu");
    if (!toggle || !menu) return; // cabeçalho sem menu (só o logo)
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      menu.hidden = !open;
      document.body.classList.toggle("menu-open", open);
      if (lenis) open ? lenis.stop() : lenis.start();
      if (open && hasGsap && !reduceMotion) {
        gsap.from($$("nav a", menu), { y: 30, opacity: 0, stagger: 0.05, duration: 0.5, ease: "power3.out" });
      }
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) { setOpen(false); toggle.focus(); }
    });
    window.addEventListener("resize", () => { if (window.innerWidth > 960 && !menu.hidden) setOpen(false); });

    // Link ativo no menu
    const links = $$(".nav a");
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && map.has(en.target.id)) {
          links.forEach((l) => l.classList.remove("is-active"));
          map.get(en.target.id).classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach((s) => io.observe(s));
  }

  /* ---------- Âncoras com rolagem suave ---------- */
  function initAnchors(lenis) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target || target.hidden) return;
      e.preventDefault();
      const offset = -($(".site-header").offsetHeight - 1);
      if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: reduceMotion ? "auto" : "smooth" });
      history.replaceState(null, "", id);
    });
  }

  /* ---------- FAQ: apenas um aberto por vez ---------- */
  function initFaq() {
    const items = $$(".faq-item");
    items.forEach((d) => d.addEventListener("toggle", () => {
      if (d.open) items.forEach((o) => { if (o !== d) o.open = false; });
      if (hasGsap) ScrollTrigger.refresh();
    }));
  }

  /* ---------- Formulário → WhatsApp ---------- */
  function initForm() {
    const form = $("#contact-form");
    if (!form) return;
    const status = $(".form-status", form);
    const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    const phoneOk = (v) => v.replace(/\D/g, "").length >= 10;

    // Máscara simples de telefone
    const tel = form.elements.whatsapp;
    tel.addEventListener("input", () => {
      const d = tel.value.replace(/\D/g, "").slice(0, 11);
      let out = d;
      if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length > 7) out = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
      tel.value = out;
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = form.elements;
      const checks = [
        [f.nome, f.nome.value.trim().length >= 2],
        [f.email, emailOk(f.email.value.trim())],
        [f.whatsapp, phoneOk(f.whatsapp.value)],
        [f.mensagem, f.mensagem.value.trim().length >= 3],
      ];
      let valid = true;
      checks.forEach(([el, ok]) => {
        el.closest(".field").classList.toggle("has-error", !ok);
        el.setAttribute("aria-invalid", String(!ok));
        if (!ok) valid = false;
      });
      const consent = f.consentimento.checked;
      f.consentimento.closest(".consent").classList.toggle("has-error", !consent);

      if (!valid || !consent) {
        status.className = "form-status is-error";
        status.textContent = !valid
          ? "Confira os campos destacados e tente novamente."
          : "Para continuar, aceite a Política de Privacidade.";
        const firstBad = checks.find(([, ok]) => !ok);
        (firstBad ? firstBad[0] : f.consentimento).focus();
        return;
      }

      const text =
        `Olá, Hugo! Vim pelo site do MaronFit.\n\n` +
        `*Nome:* ${f.nome.value.trim()}\n` +
        `*E-mail:* ${f.email.value.trim()}\n` +
        `*WhatsApp:* ${f.whatsapp.value.trim()}\n\n` +
        `*Mensagem:* ${f.mensagem.value.trim()}`;
      const url = waLink(text);
      const win = window.open(url, "_blank", "noopener");
      if (!win) window.location.href = url;

      status.className = "form-status is-ok";
      status.textContent = "Tudo certo! Sua mensagem foi aberta no WhatsApp — é só confirmar o envio.";
      form.reset();
    });
  }

  /* ---------- Vídeos: carregam perto da tela, tocam só quando visíveis ---------- */
  /* ---------- VSL: capa leve; o player do YouTube só carrega no clique ---------- */
  function initVsl() {
    // botão flutuante do WhatsApp some enquanto o botão principal da VSL está visível
    const cta = $(".vsl-cta");
    const float = $(".wa-float");
    if (cta && float) {
      let queued = false;
      const check = () => {
        queued = false;
        const r = cta.getBoundingClientRect();
        float.classList.toggle("is-hidden", r.bottom > 0 && r.top < window.innerHeight);
      };
      const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      check();
    }

    $$("[data-yt]").forEach((player) => {
      player.addEventListener("click", (e) => {
        e.preventDefault();
        const id = encodeURIComponent(player.dataset.yt);
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
        iframe.title = "Vídeo de apresentação do MaronFit";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        const box = document.createElement("div");
        box.className = "vsl-player";
        box.appendChild(iframe);
        player.replaceWith(box);
      }, { once: true });
    });
  }

  /* ---------- Botão da VSL com atraso: aparece após X segundos de vídeo ---------- */
  function initVslDelay() {
    const cta = $(".vsl-cta[data-delay-seconds]");
    if (!cta) return;
    const seconds = parseFloat(cta.dataset.delaySeconds) || 300;
    const KEY = "maronfit-vsl-cta-liberado";

    const reveal = () => {
      if (!cta.hidden) return;
      cta.hidden = false;
      cta.classList.add("is-revealed");
      try { localStorage.setItem(KEY, "1"); } catch (e) { /* sem armazenamento */ }
    };

    // Quem já chegou aos 5 min antes vê o botão direto; "?botao=1" na URL mostra para testes
    try { if (localStorage.getItem(KEY) === "1") { reveal(); return; } } catch (e) { /* ignora */ }
    if (/[?&]botao=1\b/.test(location.search)) { reveal(); return; }

    // O player cria um <video> dentro do bloco da VSL; acompanha o tempo assistido
    const box = $("[data-vsl]");
    if (!box) return;
    const bound = new WeakSet();
    const bind = () => {
      $$("video", box).forEach((v) => {
        if (bound.has(v)) return;
        bound.add(v);
        const check = () => { if (v.currentTime >= seconds) reveal(); };
        v.addEventListener("timeupdate", check);
        v.addEventListener("seeked", check);
      });
    };
    bind();
    new MutationObserver(bind).observe(box, { childList: true, subtree: true });
  }

  function initVideos() {
    const videos = $$("video[data-src]");
    const saveData = navigator.connection && navigator.connection.saveData;
    // Movimento reduzido ou economia de dados: mantém apenas a imagem (poster)
    if (reduceMotion || saveData) return;

    const load = (v) => {
      if (v.dataset.loaded) return;
      v.src = v.dataset.src;
      v.dataset.loaded = "1";
      v.load();
    };
    const play = (v) => {
      const p = v.play();
      if (p && p.catch) p.catch(() => {}); // autoplay bloqueado: fica o poster
    };

    // Hero carrega imediatamente
    videos.filter((v) => "eager" in v.dataset).forEach((v) => { load(v); play(v); });

    if (!("IntersectionObserver" in window)) {
      videos.forEach((v) => { load(v); play(v); });
      return;
    }
    const preloader = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { load(en.target); preloader.unobserve(en.target); }
      });
    }, { rootMargin: "600px 0px" });
    const player = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { load(en.target); play(en.target); }
        else en.target.pause();
      });
    }, { threshold: 0.05 });
    videos.forEach((v) => { preloader.observe(v); player.observe(v); });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) videos.forEach((v) => v.pause());
    });
  }

  /* ---------- Rolagem suave (Lenis) ---------- */
  function initLenis() {
    if (reduceMotion || typeof window.Lenis === "undefined") return null;
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    if (hasGsap) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    return lenis;
  }

  /* ---------- Animações (GSAP) ---------- */
  function splitWords(el) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("span");
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    return $$(".w > span", el);
  }

  function initAnimations() {
    if (!hasGsap) return;
    document.documentElement.classList.add("has-gsap");
    gsap.registerPlugin(ScrollTrigger);

    if (reduceMotion) {
      // Sem animações: apenas garante o estado final dos contadores e da barra.
      gsap.set(".steps-progress span", { scaleY: 1 });
      return;
    }

    // Hero (VSL): pergunta-dor, headline palavra a palavra, vídeo e botão
    const heroTitle = $(".hero-title");
    const words = splitWords(heroTitle);
    const heroTl = gsap.timeline({ defaults: { ease: "power4.out" }, delay: 0.15 });
    heroTl
      .from(".hero-glow", { opacity: 0, duration: 1.2 })
      .from(words, { yPercent: 110, duration: 1.1, stagger: 0.06 }, "-=0.35")
      .from(".vsl", { y: 50, scale: 0.96, opacity: 0, duration: 1.1 }, "-=0.5")
      .from(".vsl-cta, .hero-trust", { y: 30, opacity: 0, duration: 0.8, stagger: 0.12, clearProps: "transform" }, "-=0.6");

    // Parallax suave nos vídeos de fundo das seções
    $$(".section-bg:not(.cta-media) .bg-video").forEach((v) => {
      gsap.fromTo(v, { yPercent: -5, scale: 1.2 }, {
        yPercent: 5, scale: 1.2, ease: "none",
        scrollTrigger: { trigger: v.closest("section"), start: "top bottom", end: "bottom top", scrub: true },
      });
    });

    // Marquee movido pela rolagem
    gsap.fromTo(".marquee-track", { xPercent: 0 }, {
      xPercent: -35, ease: "none",
      scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: 0.6 },
    });

    // Entradas variadas por seção
    const types = {
      "fade-up":     { from: { y: 50, opacity: 0 }, stagger: 0.12, duration: 0.9, ease: "power3.out" },
      "slide-left":  { from: { x: -80, opacity: 0 }, stagger: 0.12, duration: 0.9, ease: "power3.out" },
      "slide-right": { from: { x: 80, opacity: 0 }, stagger: 0.12, duration: 0.9, ease: "power3.out" },
      "scale-up":    { from: { scale: 0.85, opacity: 0 }, stagger: 0.1, duration: 1.0, ease: "power2.out" },
      "rotate-in":   { from: { y: 40, rotation: 3, opacity: 0 }, stagger: 0.1, duration: 0.9, ease: "power3.out" },
      "stagger-up":  { from: { y: 60, opacity: 0 }, stagger: 0.12, duration: 0.8, ease: "power3.out" },
      "clip-reveal": { from: { clipPath: "inset(100% 0 0 0)", y: 30, opacity: 0 }, stagger: 0.14, duration: 1.1, ease: "power4.out" },
    };
    $$("[data-anim]").forEach((group) => {
      const cfg = types[group.dataset.anim] || types["fade-up"];
      const children = $$(":scope .a", group).filter((el) => el.closest("[data-anim]") === group);
      const targets = children.length ? children : [group];
      gsap.from(targets, {
        ...cfg.from,
        duration: cfg.duration,
        ease: cfg.ease,
        stagger: cfg.stagger,
        clearProps: "transform,clipPath",
        scrollTrigger: { trigger: group, start: "top 82%", once: true },
      });
    });

    // Contadores (anos)
    $$(".counter").forEach((el) => {
      const to = parseFloat(el.dataset.value);
      const from = parseFloat(el.dataset.from || "0");
      const obj = { v: from };
      el.textContent = from;
      gsap.to(obj, {
        v: to, duration: 2, ease: "power2.out",
        onUpdate: () => { el.textContent = Math.round(obj.v); },
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    // Linha de progresso do "Como funciona" (só se a seção existir)
    if ($(".steps-wrap")) {
      gsap.to(".steps-progress span", {
        scaleY: 1, ease: "none",
        scrollTrigger: { trigger: ".steps-wrap", start: "top 65%", end: "bottom 65%", scrub: true },
      });
    }

    // Brilho do CTA
    gsap.fromTo(".cta-glow", { scale: 0.6, opacity: 0.4 }, {
      scale: 1.15, opacity: 1, ease: "none",
      scrollTrigger: { trigger: ".cta", start: "top bottom", end: "bottom top", scrub: true },
    });

    // Recalcula posições quando fontes/imagens terminam de carregar
    window.addEventListener("load", () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ---------- Início ---------- */
  applyConfig();
  initProofMarquee();
  initProgramas();
  const lenis = initLenis();
  initHeader(lenis);
  initAnchors(lenis);
  initFaq();
  initForm();
  initVsl();
  initVslDelay();
  initVideos();
  initAnimations();
})();
