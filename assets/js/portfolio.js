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

  // Prefer DOMContentLoaded — with `defer` this fires correctly.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init () {
    initVenn();
    initPublications();
  }

  /* ═══════════════════════════════════════════════════════════
     VENN DIAGRAM
     Behaviour (lifted from Venn.jsx):
       - `pinned`  side (L/R/C) — starts as 'L'.
       - `hover`   side or branch id — transient.
       - `active = hover || pinned`. A 1-char value ('L'|'R'|'C')
         means "the whole side is active"; a 2-char value
         (e.g. 'L2', 'C1') means "that specific branch is
         highlighted within its side".
     DOM update strategy:
       - Add `is-active` to cards whose side matches, plus
         `is-highlighted` to the one matching the exact id.
       - Add `side-L|R|C` class on the Venn <svg> to drive
         circle scale/opacity/lens via CSS.
       - Rebuild ribbon <path>s from anchor centers to each
         active card's inner edge, using a symmetric Bézier.
     ═══════════════════════════════════════════════════════════ */

  function initVenn () {
    const stage      = document.getElementById('pf-venn-stage');
    const ribbonsSvg = document.getElementById('pf-venn-ribbons');
    const vennSvg    = document.getElementById('pf-venn-svg');
    const stateLbl   = document.getElementById('pf-venn-state');
    if (!stage || !ribbonsSvg || !vennSvg) return;

    // ── State ────────────────────────────────────────────────
    let pinned = 'L';
    let hover  = null;

    // ── Element collections ──────────────────────────────────
    const cards   = Array.from(stage.querySelectorAll('.pf-card'));
    const pills   = Array.from(document.querySelectorAll('.pf-pill'));
    const circles = {
      L: document.getElementById('pf-venn-L'),
      R: document.getElementById('pf-venn-R'),
      // Intersection hit-area ellipse (no id, selected by side):
      C: vennSvg.querySelector('ellipse[data-side="C"]'),
    };
    const anchors = {
      L:  document.getElementById('pf-anchor-L'),
      R:  document.getElementById('pf-anchor-R'),
      CT: document.getElementById('pf-anchor-CT'),
      CB: document.getElementById('pf-anchor-CB'),
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

      // 1. Circles / lens — toggle CSS classes
      vennSvg.classList.remove('side-L', 'side-R', 'side-C');
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
    // cubic Bézier from the matching rim anchor to the card's
    // inner edge. Center cards (C1 above, C2 below) use the top
    // and bottom anchors respectively.
    function drawRibbons (side, activeId) {
      // Clear previous paths
      while (ribbonsSvg.firstChild) ribbonsSvg.removeChild(ribbonsSvg.firstChild);
      if (!side) return;

      const stageRect = stage.getBoundingClientRect();

      const mk = (anchorEl, cardEl, sideKey, id) => {
        if (!anchorEl || !cardEl) return;

        const ab = anchorEl.getBoundingClientRect();
        const cb = cardEl.getBoundingClientRect();

        const fx = ab.left + ab.width  / 2 - stageRect.left;
        const fy = ab.top  + ab.height / 2 - stageRect.top;

        // Anchor the card end on the inner edge, vertical midline.
        let tx;
        if (sideKey === 'L')      tx = cb.right - stageRect.left;
        else if (sideKey === 'R') tx = cb.left  - stageRect.left;
        else                      tx = cb.left  + cb.width / 2 - stageRect.left;
        const ty = cb.top + cb.height / 2 - stageRect.top;

        // Symmetric cubic Bézier — control points pull toward
        // the midpoint so the ribbon arcs smoothly without loops.
        const mx = (fx + tx) / 2;
        const d  = `M ${fx} ${fy} C ${mx} ${fy}, ${mx} ${ty}, ${tx} ${ty}`;

        const path = document.createElementNS(SVGNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');

        const stroke = sideKey === 'L' ? '#6a8ea0'
                     : sideKey === 'R' ? '#9a6450'
                     : '#a89a87';
        path.setAttribute('stroke', stroke);

        const isThis = activeId === id;
        path.setAttribute('stroke-width', isThis ? '1.75' : '1.1');
        path.setAttribute('opacity',      isThis ? '1'    : '0.55');

        ribbonsSvg.appendChild(path);
      };

      // Only draw ribbons for the active side.
      if (side === 'L') {
        cards.filter(c => c.dataset.side === 'L')
             .forEach(c => mk(anchors.L, c, 'L', c.dataset.id));
      } else if (side === 'R') {
        cards.filter(c => c.dataset.side === 'R')
             .forEach(c => mk(anchors.R, c, 'R', c.dataset.id));
      } else if (side === 'C') {
        const c1 = cards.find(c => c.dataset.id === 'C1');
        const c2 = cards.find(c => c.dataset.id === 'C2');
        mk(anchors.CT, c1, 'C', 'C1');
        mk(anchors.CB, c2, 'C', 'C2');
      }
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
    // Circles + intersection ellipse
    ['L', 'R', 'C'].forEach(sideKey => {
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

  // Source-of-truth data — matches Publications.jsx exactly.
  const PUBS = [
    { y: 2026, authors: ['A. Baret', 'M. Chen', 'E. Laurent'],
      title: 'Anomalous transport in 1D stochastic conduits',
      venue: 'arXiv preprint', volume: '2603.09821',
      topics: ['transport', 'percolation'], selected: true,
      doi: '10.48550/arXiv.2603.09821' },
    { y: 2025, authors: ['A. Baret', 'J.-Y. Dauphin'],
      title: 'Non-equilibrium conduction in random 1D conduits near the percolation threshold',
      venue: 'Physical Review B', volume: '112, 054101',
      topics: ['transport', 'percolation', 'simulation'], selected: true,
      doi: '10.1103/PhysRevB.112.054101' },
    { y: 2025, authors: ['A. Baret', 'S. Okafor'],
      title: 'Mie-scattering cross-sections of sparse metallic nanowire networks via Monte Carlo',
      venue: 'Optics Express', volume: '33, 14 210',
      topics: ['optics', 'Mie', 'simulation'],
      doi: '10.1364/OE.504412' },
    { y: 2024, authors: ['A. Baret', 'et al.'],
      title: 'Spectrally selective low-emissivity coatings from disordered 1D assemblies',
      venue: 'ACS Applied Materials & Interfaces', volume: '16, 32451',
      topics: ['low-E', 'materials'], selected: true,
      doi: '10.1021/acsami.4c05122' },
    { y: 2024, authors: ['L. Hart', 'A. Baret'],
      title: 'A reproducible pipeline for FDTD on percolating networks',
      venue: 'Computer Physics Communications', volume: '298, 109103',
      topics: ['HPC', 'reproducibility'],
      doi: '10.1016/j.cpc.2024.109103' },
    { y: 2023, authors: ['A. Baret', 'M. Chen'],
      title: 'Thermochromic VO₂ stacks for autonomous radiative cooling',
      venue: 'Solar Energy Materials & Solar Cells', volume: '255, 112281',
      topics: ['radiative cooling', 'materials'],
      doi: '10.1016/j.solmat.2023.112281' },
    { y: 2022, authors: ['A. Baret'],
      title: "Percolation thresholds on random 1D conduit graphs (Master's thesis, with distinction)",
      venue: 'University of Liège', volume: 'Thesis',
      topics: ['percolation', 'thesis'] },
  ];

  const ALL_TOPICS = Array.from(new Set(PUBS.flatMap(p => p.topics))).sort();

  function initPublications () {
    const list      = document.getElementById('pf-pubs-list');
    const countEl   = document.getElementById('pf-pubs-count');
    const controls  = document.querySelector('.pf-pubs__controls');
    if (!list || !controls) return;

    let mode        = 'selected';   // 'selected' | 'all'
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
      }
      addSep(); addLink('#', 'BibTeX');
      addSep(); addLink('#', 'PDF');
      body.appendChild(meta);

      li.appendChild(body);
      return li;
    }

    render();
  }
})();
