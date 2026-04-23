/* ─────────────────────────────────────────────────────────────
   portfolio.js — vanilla-JS port of the React interactions.
   No dependencies. Runs once on DOMContentLoaded.

   Responsibilities:
     1. Venn diagram — hover/pin state across cards, circles,
        legend pills, and intersection; draws curved ribbons
        from circle-rim anchors to each card on the active side.
     2. Publications — Selected/All toggle, topic filter chips
        rendered from the data, count display, reverse numbering.
   ───────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // Guard: only run once, only on pages that have the portfolio.
  if (!document.getElementById('portfolio-root')) return;

  function init () {
    initThemeToggle();
    initParticles();
    initVenn();
    initPublications();
    initScrollSpy();
  }

  /* ═══════════════════════════════════════════════════════════
     SCROLL SPY
     Highlights the nav link of whichever section is currently
     near the top of the viewport. Each nav href points at a
     unique section id, so the mapping is 1:1.
     ═══════════════════════════════════════════════════════════ */

  function initScrollSpy () {
    const navLinks = Array.from(document.querySelectorAll('.pf-nav__links a[href^="#"]'));
    if (!navLinks.length || !('IntersectionObserver' in window)) return;

    // Build id -> link map.
    const linkByHref = new Map();
    navLinks.forEach(a => linkByHref.set(a.getAttribute('href').slice(1), a));

    const targets = Array.from(linkByHref.keys())
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!targets.length) return;

    // Track intersection ratios; pick the section most visible
    // near the top of the viewport and mark its link active.
    const visible = new Map();
    const setActive = id => {
      navLinks.forEach(a => a.classList.remove('is-active'));
      const link = linkByHref.get(id);
      if (link) link.classList.add('is-active');
    };

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
        else visible.delete(e.target.id);
      });
      if (!visible.size) return;
      // Pick the section with the largest visible ratio.
      let best = null, bestRatio = -1;
      visible.forEach((r, id) => { if (r > bestRatio) { bestRatio = r; best = id; } });
      if (best) setActive(best);
    }, {
      // Trigger when a section crosses the upper third of the viewport.
      rootMargin: '-20% 0px -60% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    targets.forEach(el => io.observe(el));
  }

  /* ═══════════════════════════════════════════════════════════
     VENN DIAGRAM (three-circle triangular layout)
     Sides:
       - T (top-center)  : Stochastic media & energy — uses --research
       - L (bottom-left) : Experimental skills      — uses --overlap
       - R (bottom-right): Computational methods    — uses --industry
     Behaviour:
       - `pinned` side (T/L/R) — starts as 'T'.
       - `hover`  side or branch id — transient.
       - `active = hover || pinned`. 1-char = whole side; 2-char = card id.
     DOM update:
       - `is-active` / `is-highlighted` classes on cards.
       - `side-T|L|R` class on the Venn <svg> drives circle emphasis.
       - Ribbons redrawn from rim anchors to active cards.
     ═══════════════════════════════════════════════════════════ */

  function initVenn () {
    const stage      = document.getElementById('pf-venn-stage');
    const ribbonsSvg = document.getElementById('pf-venn-ribbons');
    const vennSvg    = document.getElementById('pf-venn-svg');
    const stateLbl   = document.getElementById('pf-venn-state');
    if (!stage || !ribbonsSvg || !vennSvg) return;

    // ── State ────────────────────────────────────────────────
    let pinned = 'T';
    let hover  = null;

    // ── Element collections ──────────────────────────────────
    const cards   = Array.from(stage.querySelectorAll('.pf-card'));
    const pills   = Array.from(document.querySelectorAll('.pf-pill'));
    const circles = {
      T: document.getElementById('pf-venn-T'),
      L: document.getElementById('pf-venn-L'),
      R: document.getElementById('pf-venn-R'),
    };
    const anchors = {
      T: document.getElementById('pf-anchor-T'),
      L: document.getElementById('pf-anchor-L'),
      R: document.getElementById('pf-anchor-R'),
    };

    // ── Derived view ─────────────────────────────────────────
    const SVGNS = 'http://www.w3.org/2000/svg';

    function activeValue () { return hover || pinned; }
    function activeSide () {
      const a = activeValue();
      if (!a) return null;
      return a.length === 1 ? a : a[0];
    }

    function render () {
      const side = activeSide();
      const a    = activeValue();

      // 1. Circles — toggle CSS classes
      vennSvg.classList.remove('side-T', 'side-L', 'side-R');
      if (side) vennSvg.classList.add('side-' + side);

      // 2. Cards
      cards.forEach(c => {
        const id   = c.dataset.id;
        const cs   = c.dataset.side;
        const on   = side === cs || a === id;
        const hot  = a === id;
        c.classList.toggle('is-active',      on);
        c.classList.toggle('is-highlighted', hot);
      });

      // 3. Pills
      pills.forEach(p => p.classList.toggle('is-pinned', p.dataset.side === pinned));

      // 4. Ribbons
      drawRibbons(side, a);

      // 5. State readout
      if (stateLbl) stateLbl.textContent = a || '—';
    }

    // ── Ribbon drawing ───────────────────────────────────────
    // For each active card on the active side, draw a smooth
    // cubic Bézier from the rim anchor to the card's edge.
    // T cards sit above the SVG centered on the stage, so the
    // ribbon meets their horizontal midpoint at their bottom.
    function drawRibbons (side, activeId) {
      while (ribbonsSvg.firstChild) ribbonsSvg.removeChild(ribbonsSvg.firstChild);
      if (!side) return;

      const stageRect = stage.getBoundingClientRect();

      const mk = (anchorEl, cardEl, sideKey, id) => {
        if (!anchorEl || !cardEl) return;

        const ab = anchorEl.getBoundingClientRect();
        const cb = cardEl.getBoundingClientRect();

        const fx = ab.left + ab.width  / 2 - stageRect.left;
        const fy = ab.top  + ab.height / 2 - stageRect.top;

        // Anchor the card end: inner edge for L/R, bottom-center for T.
        let tx, ty;
        if (sideKey === 'L')      { tx = cb.right - stageRect.left;              ty = cb.top + cb.height / 2 - stageRect.top; }
        else if (sideKey === 'R') { tx = cb.left  - stageRect.left;              ty = cb.top + cb.height / 2 - stageRect.top; }
        else                      { tx = cb.left  + cb.width  / 2 - stageRect.left; ty = cb.bottom - stageRect.top; }

        // Symmetric cubic Bézier — control points pull toward the midpoint.
        // For T (vertical run) we pull controls vertically; for L/R, horizontally.
        let d;
        if (sideKey === 'T') {
          const my = (fy + ty) / 2;
          d = `M ${fx} ${fy} C ${fx} ${my}, ${tx} ${my}, ${tx} ${ty}`;
        } else {
          const mx = (fx + tx) / 2;
          d = `M ${fx} ${fy} C ${mx} ${fy}, ${mx} ${ty}, ${tx} ${ty}`;
        }

        const path = document.createElementNS(SVGNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');

        const cs     = getComputedStyle(document.getElementById('portfolio-root'));
        const stroke = sideKey === 'T' ? cs.getPropertyValue('--research').trim()
                     : sideKey === 'R' ? cs.getPropertyValue('--industry').trim()
                     : cs.getPropertyValue('--overlap').trim();
        path.setAttribute('stroke', stroke);

        const isThis = activeId === id;
        path.setAttribute('stroke-width', isThis ? '1.75' : '1.1');
        path.setAttribute('opacity',      isThis ? '1'    : '0.55');

        ribbonsSvg.appendChild(path);
      };

      // Draw ribbons from the active side's anchor to every card on that side.
      const sideCards = cards.filter(c => c.dataset.side === side);
      sideCards.forEach(c => mk(anchors[side], c, side, c.dataset.id));
    }

    // Make the ribbons SVG's viewBox match the stage's pixel
    // dimensions so path coordinates (in stage-local px) render
    // 1:1 without any scaling surprises.
    function syncRibbonViewBox () {
      const { width, height } = stage.getBoundingClientRect();
      ribbonsSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      ribbonsSvg.setAttribute('preserveAspectRatio', 'none');
    }

    // ── Event wiring ─────────────────────────────────────────
    // Cards
    cards.forEach(c => {
      c.addEventListener('mouseenter', () => { hover = c.dataset.id;    render(); });
      c.addEventListener('mouseleave', () => { hover = null;            render(); });
    });
    // Circles
    ['T', 'L', 'R'].forEach(sideKey => {
      const el = circles[sideKey];
      if (!el) return;
      el.addEventListener('mouseenter', () => { hover  = sideKey; render(); });
      el.addEventListener('mouseleave', () => { hover  = null;    render(); });
      el.addEventListener('click',      () => { pinned = sideKey; render(); });
    });
    // Legend pills
    pills.forEach(p => {
      const sideKey = p.dataset.side;
      p.addEventListener('mouseenter', () => { hover  = sideKey; render(); });
      p.addEventListener('mouseleave', () => { hover  = null;    render(); });
      p.addEventListener('click',      () => { pinned = sideKey; render(); });
    });

    // Relayout on stage resize (font load, orientation change, viewport resize).
    const ro = new ResizeObserver(() => { syncRibbonViewBox(); render(); });
    ro.observe(stage);

    // Initial paint — wait one frame so fonts have measured and
    // card positions are settled.
    requestAnimationFrame(() => {
      syncRibbonViewBox();
      render();
    });
  }

  /* ═══════════════════════════════════════════════════════════
     PUBLICATIONS
     Reproduces the React version's:
       - mode toggle: 'selected' | 'all'
       - topic filter: single active topic, or 'any'
       - reverse numbering within the current filtered set
       - count label
     ═══════════════════════════════════════════════════════════ */

  // Source-of-truth data — sourced from ORBi (u236047).
  // Ordered from most recent to oldest.
  const PUBS = [
    { y: 2026,
      authors: ['A. Baret', 'A. Khan', 'S. Akin', 'L. Teulé-Gay', 'D. Bellet', 'A. Rougier', 'N. D. Nguyen'],
      title: 'Challenges and mitigation pathways in coating silver nanowire networks with metallic oxides by RF magnetron sputtering',
      venue: 'arXiv preprint', volume: '2604.09372',
      topics: ['thin films', 'nanowires'],
      doi: '10.48550/arXiv.2604.09372' },
    { y: 2025,
      authors: ['A. Baret', 'J. Baumgarten', 'F. Balty', 'F. Rabecki', 'J. Brisbois', 'B. Zheng', 'D. Bellet', 'N. D. Nguyen'],
      title: 'The refractive index of silver nanowire networks: a heuristic approach to the foundations of the optical constants, from experiment to theory',
      venue: 'Discover Nano', volume: '20, 131',
      topics: ['optics', 'nanowires'],
      doi: '10.1186/s11671-025-04312-9' },
    { y: 2025,
      authors: ['T. Ratz', 'E. Fourneau', 'N. Sliti', 'C. Malherbe', 'A. Baret', 'B. Vertruyen', 'A. Silhanek', 'N. D. Nguyen'],
      title: 'Correlation between material properties, crystalline transitions, and point defects in RF sputtered (N,Mg)-doped copper oxide thin films',
      venue: 'ACS Applied Electronic Materials', volume: '7(2)',
      topics: ['thin films', 'materials'],
      doi: '10.1021/acsaelm.4c01396' },
    { y: 2025,
      authors: ['A. Baret'],
      title: 'Reconnecting the Fractured: Nanowire Networks and the Physics of Bridge Percolation',
      venue: 'Bulletin de la Société Royale des Sciences de Liège', volume: '94(1), 80–101',
      topics: ['percolation', 'nanowires'], selected: true,
      doi: '10.25518/0037-9565.12531' },
    { y: 2025,
      authors: ['A. Baret', 'A. Khan', 'A. Rougier', 'D. Bellet', 'N. D. Nguyen'],
      title: 'Low-emissivity fine-tuning of efficient VO₂-based thermochromic stacks with silver nanowire networks',
      venue: 'RSC Applied Interfaces', volume: '2(1), 94–103',
      topics: ['low-E', 'thermochromic', 'nanowires'], selected: true,
      doi: '10.1039/d4lf00234b' },
    { y: 2024,
      authors: ['F. Balty', 'A. Baret', 'A. Silhanek', 'N. D. Nguyen'],
      title: 'Insight into the morphological instability of metallic nanowires under thermal stress',
      venue: 'Journal of Colloid and Interface Science', volume: '',
      topics: ['nanowires', 'materials'],
      doi: '10.1016/j.jcis.2024.06.074' },
    { y: 2024,
      authors: ['A. Baret', 'L. Bardet', 'D. Oser', 'D. Langley', 'F. Balty', 'D. Bellet', 'N. D. Nguyen'],
      title: 'Bridge percolation: electrical connectivity of discontinued conducting slabs by metallic nanowires',
      venue: 'Nanoscale', volume: '16, 8361–8368',
      topics: ['percolation', 'nanowires', 'transport'], selected: true,
      doi: '10.1039/d3nr05850f' },
    { y: 2022,
      authors: ['A. Baret'],
      title: 'Numerical investigation of low-density metallic nanowire networks as a cure for defective transparent conducting materials',
      venue: 'MSc Thesis — University of Liège', volume: 'summa cum laude',
      topics: ['percolation', 'nanowires', 'thesis'],
      url: 'https://matheo.uliege.be/handle/2268.2/14793' },
  ];

  const ALL_TOPICS = Array.from(new Set(PUBS.flatMap(p => p.topics))).sort();

  function initPublications () {
    const list      = document.getElementById('pf-pubs-list');
    const countEl   = document.getElementById('pf-pubs-count');
    const controls  = document.querySelector('.pf-pubs__controls');
    if (!list || !controls) return;

    let mode        = 'all';        // 'selected' | 'all'
    let activeTopic = null;         // string | null

    // Build topic buttons once, inserted after the "any" button.
    const anyBtn = controls.querySelector('.pf-topic[data-topic=""]');
    ALL_TOPICS.forEach(topic => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pf-topic';
      btn.dataset.topic = topic;
      btn.textContent = topic;
      // Insert before the count span; simplest: append to controls then
      // move count to end via appendChild.
      controls.insertBefore(btn, controls.querySelector('.pf-pubs__count'));
    });

    // ── Event wiring ─────────────────────────────────────────
    controls.querySelectorAll('.pf-toggle__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        controls.querySelectorAll('.pf-toggle__btn')
                .forEach(b => b.classList.toggle('is-active', b === btn));
        render();
      });
    });

    controls.addEventListener('click', ev => {
      const btn = ev.target.closest('.pf-topic');
      if (!btn) return;
      const t = btn.dataset.topic;
      // Empty string = "any". Clicking an active topic clears it back to "any".
      if (t === '' || t === activeTopic) activeTopic = null;
      else                               activeTopic = t;
      controls.querySelectorAll('.pf-topic').forEach(b => {
        const isAny = b.dataset.topic === '';
        const on    = isAny ? activeTopic === null
                            : b.dataset.topic === activeTopic;
        b.classList.toggle('is-active', on);
      });
      render();
    });

    // ── Render ───────────────────────────────────────────────
    function render () {
      const items = PUBS
        .filter(p => mode === 'all' ? true : p.selected)
        .filter(p => !activeTopic || p.topics.includes(activeTopic));

      list.innerHTML = '';
      items.forEach((p, i) => list.appendChild(pubLi(p, i, items.length)));

      if (countEl) countEl.textContent = String(items.length);
    }

    function pubLi (p, i, total) {
      const li = document.createElement('li');
      li.className = 'pf-pub';

      // [n]
      const n = document.createElement('div');
      n.className = 'pf-pub__n';
      n.textContent = `[${total - i}]`;
      li.appendChild(n);

      // Year
      const y = document.createElement('div');
      y.className = 'pf-pub__y pf-smallcaps';
      y.textContent = p.y;
      li.appendChild(y);

      // Body
      const body = document.createElement('div');
      body.className = 'pf-pub__body';

      const cite = document.createElement('div');
      cite.className = 'pf-pub__cite';

      p.authors.forEach((a, idx) => {
        const span = document.createElement('span');
        span.textContent = a;
        if (a.startsWith('A. Baret')) span.className = 'pf-pub__self';
        cite.appendChild(span);
        cite.appendChild(document.createTextNode(
          idx < p.authors.length - 1 ? ', ' : '. '
        ));
      });
      const t = document.createElement('span');
      t.style.fontStyle = 'italic';
      t.textContent = `"${p.title}." `;
      cite.appendChild(t);

      const v = document.createElement('span');
      v.className = 'pf-pub__venue';
      v.textContent = p.venue;
      cite.appendChild(v);

      if (p.volume) {
        const vol = document.createElement('span');
        vol.className = 'pf-pub__vol';
        vol.textContent = `, ${p.volume}`;
        cite.appendChild(vol);
      }
      cite.appendChild(document.createTextNode(` (${p.y}).`));
      body.appendChild(cite);

      // Meta row: topics + DOI + BibTeX + PDF
      const meta = document.createElement('div');
      meta.className = 'pf-pub__meta';
      p.topics.forEach(topic => {
        const tg = document.createElement('span');
        tg.className = 'tag';
        tg.textContent = '#' + topic;
        meta.appendChild(tg);
      });
      const addSep  = () => { const s = document.createElement('span'); s.className = 'sep'; s.textContent = '·'; meta.appendChild(s); };
      const addLink = (href, text) => { const a = document.createElement('a'); a.href = href; a.textContent = text; meta.appendChild(a); };

      if (p.doi) {
        addSep();
        addLink(`https://doi.org/${p.doi}`, `doi:${p.doi} ↗`);
      } else if (p.url) {
        addSep();
        addLink(p.url, 'link ↗');
      }
      addSep(); addLink('#', 'BibTeX');
      addSep(); addLink('#', 'PDF');
      body.appendChild(meta);

      li.appendChild(body);
      return li;
    }

    render();
  }

  /* ═══════════════════════════════════════════════════════════
     THEME TOGGLE
     Persists preference in localStorage; falls back to system.
     Swaps the nav icon (moon → sun and back).
     ═══════════════════════════════════════════════════════════ */

  function setIcon (isDark) {
    const icon = document.getElementById('pf-toggle-icon');
    if (!icon) return;
    icon.innerHTML = isDark
      ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
      : '<circle cx="12" cy="12" r="4"/>'
      + '<line x1="12" y1="2" x2="12" y2="4"/>'
      + '<line x1="12" y1="20" x2="12" y2="22"/>'
      + '<line x1="2" y1="12" x2="4" y2="12"/>'
      + '<line x1="20" y1="12" x2="22" y2="12"/>'
      + '<line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/>'
      + '<line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>'
      + '<line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/>'
      + '<line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>';
  }

  function initThemeToggle () {
    const root   = document.getElementById('portfolio-root');
    const btn    = document.getElementById('pf-theme-toggle');
    if (!root || !btn) return;

    const stored = localStorage.getItem('pf-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? stored === 'dark' : prefersDark !== false;

    applyTheme(isDark);

    btn.addEventListener('click', () => {
      const nowDark = root.dataset.theme !== 'light';
      applyTheme(!nowDark);
      localStorage.setItem('pf-theme', !nowDark ? 'dark' : 'light');
    });

    function applyTheme (dark) {
      root.dataset.theme = dark ? 'dark' : 'light';
      setIcon(dark);
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  /* ═══════════════════════════════════════════════════════════
     PARTICLE NETWORK
     Canvas-based: ~65 nodes that drift, connect when close,
     and repel from the cursor. Colours read from CSS variables
     so they update instantly on theme switch.
     ═══════════════════════════════════════════════════════════ */

  function initParticles () {
    const canvas = document.getElementById('pf-particles');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');

    const COUNT        = 80;
    const CONNECT_DIST = 185;
    const CURSOR_DIST  = 110;
    const BASE_SPEED   = 0.6;

    let W, H, nodes;
    const mouse = { x: -9999, y: -9999 };

    function isDarkMode () {
      return document.getElementById('portfolio-root').dataset.theme !== 'light';
    }

    function resize () {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function makeNode () {
      const angle = Math.random() * Math.PI * 2;
      const speed = BASE_SPEED * (0.4 + Math.random() * 0.8);
      return {
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r:  Math.random() * 1.2 + 0.8,
      };
    }

    function tick () {
      ctx.clearRect(0, 0, W, H);
      const dark = isDarkMode();

      const nr = dark ? 106 : 61;
      const ng = dark ? 142 : 110;
      const nb = dark ? 160 : 131;

      // Update
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        // Cursor repulsion
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < CURSOR_DIST && dd > 0.5) {
          const f = ((CURSOR_DIST - dd) / CURSOR_DIST) * 0.6;
          n.vx += (dx / dd) * f;
          n.vy += (dy / dd) * f;
        }

        // Damping + speed floor
        n.vx *= 0.985;
        n.vy *= 0.985;
        const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (spd > BASE_SPEED * 3) {
          n.vx = (n.vx / spd) * BASE_SPEED * 3;
          n.vy = (n.vy / spd) * BASE_SPEED * 3;
        }
        if (spd < 0.05) {
          const a = Math.random() * Math.PI * 2;
          n.vx += Math.cos(a) * 0.04;
          n.vy += Math.sin(a) * 0.04;
        }

        n.x += n.vx;
        n.y += n.vy;

        // Wrap edges
        if (n.x < -20) n.x = W + 20;
        else if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        else if (n.y > H + 20) n.y = -20;
      }

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const alpha = (1 - d / CONNECT_DIST) * (dark ? 0.32 : 0.22);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${nr},${ng},${nb},${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      const nodeAlpha = dark ? 0.75 : 0.5;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nr},${ng},${nb},${nodeAlpha})`;
        ctx.fill();
      }

      requestAnimationFrame(tick);
    }

    resize();
    nodes = Array.from({ length: COUNT }, makeNode);

    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    document.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

    tick();
  }

  // Entry point — placed at the bottom so all top-level `const`s
  // in the IIFE are initialized before init() runs. The script is
  // loaded with `defer`, so DOM is already parsed by this point.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})();
