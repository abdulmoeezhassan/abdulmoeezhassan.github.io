(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // Footer year
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  });
  $$("a", links).forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    })
  );

  /* ---------- Split headline into words ---------- */
  const splitEl = $("[data-split]");
  if (splitEl) {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(" ");
            const w = document.createElement("span");
            w.className = "w";
            const wi = document.createElement("span");
            wi.className = "wi";
            wi.style.setProperty("--i", i++);
            wi.textContent = part;
            w.append(wi);
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          wrap(child);
        }
      });
    };
    wrap(splitEl);
    requestAnimationFrame(() => requestAnimationFrame(() => splitEl.classList.add("is-split")));
  }

  /* ---------- Count-up ---------- */
  const countUp = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reduced) return (el.textContent = target + suffix);
    const start = performance.now();
    const dur = 1600;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Scroll reveal ---------- */
  $$(".sites__list li").forEach((li, i) => li.style.setProperty("--i", i));
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          $$("[data-count]", entry.target).forEach(countUp);
          if (entry.target.matches("[data-count]")) countUp(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 70}ms`;
      io.observe(el);
    });
    // reset delay after reveal so hover effects stay snappy
    revealEls.forEach((el) => el.addEventListener("transitionend", () => (el.style.transitionDelay = ""), { once: true }));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    $$("[data-count]").forEach(countUp);
  }

  /* ---------- Scroll-driven bits: progress, nav, timeline, marquee, active link ---------- */
  const progress = $(".progress");
  const timeline = $(".timeline");
  const tItems = timeline ? $$("li", timeline) : [];
  const track = $(".marquee__track");
  const sections = $$("main section[id]");
  const navLinks = $$(".nav__links a[href^='#']");
  let lastY = window.scrollY;
  let velocity = 0;

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty("--p", max > 0 ? y / max : 0);
    nav.classList.toggle("is-scrolled", y > 20);

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const tp = clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1);
      timeline.style.setProperty("--tp", tp);
      tItems.forEach((li) => {
        const lr = li.getBoundingClientRect();
        li.classList.toggle("is-passed", lr.top + 40 < innerHeight * 0.6);
      });
    }

    let current = "";
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top < innerHeight * 0.4) current = s.id;
    });
    navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + current));

    velocity = Math.min(Math.abs(y - lastY), 80);
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // Marquee speeds up while scrolling (playbackRate avoids the jump a duration change causes)
  if (track && !reduced && track.getAnimations) {
    let rate = 1;
    const loop = () => {
      const target = 1 + velocity / 12;
      rate += (target - rate) * 0.08;
      velocity *= 0.9;
      const anim = track.getAnimations()[0];
      if (anim) anim.playbackRate = rate;
      requestAnimationFrame(loop);
    };
    loop();
  }

  if (reduced) return;

  /* ---------- Custom cursor ---------- */
  if (finePointer) {
    const cursor = $(".cursor");
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.style.setProperty("--x", mx + "px");
      cursor.style.setProperty("--y", my + "px");
      const t = e.target;
      cursor.classList.toggle("is-hover", !!t.closest("a, button, [data-tilt]"));
      cursor.classList.toggle("is-dark", !!t.closest(".marquee, .contact, .case__card, .footer, .project__visual--c"));
    });
    const follow = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      cursor.style.setProperty("--rx", rx + "px");
      cursor.style.setProperty("--ry", ry + "px");
      requestAnimationFrame(follow);
    };
    follow();
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left - r.width / 2) * 0.3).toFixed(1) + "px");
        el.style.setProperty("--my", ((e.clientY - r.top - r.height / 2) * 0.4).toFixed(1) + "px");
      });
      el.addEventListener("pointerleave", () => {
        el.style.setProperty("--mx", "0px");
        el.style.setProperty("--my", "0px");
      });
    });
  }

  /* ---------- 3D tilt ---------- */
  if (finePointer) {
    $$("[data-tilt]").forEach((el) => {
      const max = Number(el.dataset.tilt) || 6;
      const glare = $(".portrait__glare", el);
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.classList.add("is-tilting");
        el.style.setProperty("--ry", ((px - 0.5) * max * 2).toFixed(2) + "deg");
        el.style.setProperty("--rx", ((0.5 - py) * max * 2).toFixed(2) + "deg");
        if (glare) {
          glare.style.setProperty("--gx", px * 100 + "%");
          glare.style.setProperty("--gy", py * 100 + "%");
        }
      });
      el.addEventListener("pointerleave", () => {
        el.classList.remove("is-tilting");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- Hero dot field (canvas, reacts to pointer) ---------- */
  const canvas = $(".hero__canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const hero = canvas.parentElement;
    let w, h, dpr, dots = [];
    let px = -9999, py = -9999;
    let running = true;
    const GAP = 28;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.offsetWidth; h = hero.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = GAP / 2; y < h; y += GAP)
        for (let x = GAP / 2; x < w; x += GAP) dots.push({ x, y, ox: x, oy: y });
    };
    resize();
    window.addEventListener("resize", resize);
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
    });
    hero.addEventListener("pointerleave", () => { px = py = -9999; });
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) draw(); }).observe(hero);

    let t = 0;
    const R = 140;
    function draw() {
      if (!running) return;
      t += 0.012;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        const dx = d.ox - px, dy = d.oy - py;
        const dist = Math.hypot(dx, dy);
        const f = dist < R ? (1 - dist / R) : 0;
        const wave = Math.sin(d.ox * 0.012 + t) * Math.cos(d.oy * 0.014 + t * 0.8);
        const tx = d.ox + (dist ? (dx / dist) * f * 18 : 0);
        const ty = d.oy + (dist ? (dy / dist) * f * 18 : 0) + wave * 2;
        d.x += (tx - d.x) * 0.15;
        d.y += (ty - d.y) * 0.15;
        const a = 0.1 + f * 0.6 + (wave + 1) * 0.04;
        ctx.fillStyle = f > 0.02 ? `rgba(2,132,199,${a})` : `rgba(12,18,32,${a})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1 + f * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  /* ---------- Run demos only while visible ---------- */
  const whenVisible = (el, start) => {
    if (!el) return;
    let timer = null;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) timer = start();
      else if (!e.isIntersecting && timer) { timer.stop(); timer = null; }
    }, { threshold: 0.25 }).observe(el);
  };

  /* Subdesk: approval queue that keeps moving */
  const sdRows = $("#sdRows");
  const sdWait = $("#sdWait");
  const jobs = ["Ad copy · Peak Plumbing", "SMS campaign · Glow Spa", "Blog post · Nova Dental", "Landing page · Apex Roofing", "Monthly report · Bright HVAC", "Reels script · FitLab"];
  whenVisible(sdRows, () => {
    let j = 0;
    const id = setInterval(() => {
      const rows = $$("span", sdRows);
      // advance statuses: Drafting -> Review -> Approved
      rows.forEach((row) => {
        const st = $(".st", row);
        st.classList.remove("flip"); void st.offsetWidth; st.classList.add("flip");
        if (st.classList.contains("st--draft")) { st.className = "st st--wait flip"; st.textContent = "Review"; }
        else if (st.classList.contains("st--wait")) { st.className = "st st--ok flip"; st.textContent = "Approved"; }
      });
      rows[rows.length - 1].remove();
      const n = document.createElement("span");
      n.className = "enter";
      n.innerHTML = `<b class="st st--draft">Drafting</b>${jobs[j++ % jobs.length]}`;
      sdRows.prepend(n);
      sdWait.textContent = 5 + (j % 5);
      sdWait.classList.remove("bump"); void sdWait.offsetWidth; sdWait.classList.add("bump");
    }, 2400);
    return { stop: () => clearInterval(id) };
  });

  /* Callyniq: scripted live call */
  const chat = $("#chat");
  const wave = $(".wave");
  const timerEl = $("#callTimer");
  const script = [
    ["in", "Hi, my furnace stopped working. Can someone come out?"],
    ["out", "Sorry to hear that! Is it a gas or electric furnace?"],
    ["in", "Gas. Tomorrow morning if possible."],
    ["out", "I have 9am or 11am tomorrow. Which works?"],
    ["in", "9am please."],
    ["out", "Booked for 9am ✓ You'll get a text confirmation."],
  ];
  whenVisible(chat, () => {
    let step = 0, secs = 0, alive = true;
    const clock = setInterval(() => {
      secs++;
      timerEl.textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
    }, 1000);
    const next = () => {
      if (!alive) return;
      if (step === 0) chat.innerHTML = "";
      if (step >= script.length) { step = 0; secs = 0; return setTimeout(next, 2600); }
      const [who, text] = script[step];
      const typing = document.createElement("p");
      typing.className = who + " typing";
      typing.innerHTML = "<i></i><i></i><i></i>";
      chat.append(typing);
      wave.classList.toggle("is-quiet", false);
      setTimeout(() => {
        if (!alive) return;
        typing.remove();
        const p = document.createElement("p");
        p.className = who;
        p.textContent = text;
        chat.append(p);
        while (chat.children.length > 4) chat.firstElementChild.remove();
        step++;
        setTimeout(next, 900);
      }, 900 + text.length * 14);
    };
    next();
    return { stop: () => { alive = false; clearInterval(clock); wave.classList.add("is-quiet"); } };
  });

  /* Pipeline: packet travels, steps light up in turn */
  const rail = $(".rail");
  const railNodes = rail ? $$(".rail__nodes li", rail) : [];
  const steps = $$(".steps > li");
  whenVisible(rail, () => {
    let k = 0;
    const tick = () => {
      const p = k / (railNodes.length - 1);
      rail.style.setProperty("--rp", p);
      railNodes.forEach((n, i) => n.classList.toggle("is-on", i <= k));
      steps.forEach((s, i) => s.classList.toggle("is-active", i === k));
      k = (k + 1) % railNodes.length;
    };
    tick();
    const id = setInterval(tick, 1700);
    return { stop: () => clearInterval(id) };
  });
})();
