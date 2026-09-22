/* ============================================================
   InfoStudio Pro — library.js
   Icon set, animated scene backgrounds, infographic scene
   templates and full multi-scene video templates.
   ============================================================ */
(function (IS) {
  'use strict';
  const U = IS.util, S = IS.store;

  /* ---------------- ICONS (stroke paths, 24x24) ---------------- */
  const ICONS = {
    check:      { d: ['M4 12.5l5 5L20 6.5'], w: 2.6 },
    close:      { d: ['M6 6l12 12', 'M18 6L6 18'], w: 2.4 },
    plus:       { d: ['M12 4v16', 'M4 12h16'], w: 2.4 },
    minus:      { d: ['M4 12h16'], w: 2.4 },
    arrowRight: { d: ['M3 12h17', 'M13 5l7 7-7 7'], w: 2.2 },
    arrowLeft:  { d: ['M21 12H4', 'M11 5l-7 7 7 7'], w: 2.2 },
    arrowUp:    { d: ['M12 21V4', 'M5 11l7-7 7 7'], w: 2.2 },
    arrowDown:  { d: ['M12 3v17', 'M5 13l7 7 7-7'], w: 2.2 },
    trendingUp: { d: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'], w: 2.2 },
    trendingDown:{ d: ['M3 7l6 6 4-4 8 8', 'M21 17v-6h-6'], w: 2.2 },
    bolt:       { d: ['M13 2L4 14h6l-1 8 9-12h-6z'], w: 1.6, fill: true },
    star:       { d: ['M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18l-5.9 3 1.2-6.5L2.5 9.9 9.1 9z'], w: 1.6, fill: true },
    heart:      { d: ['M12 21s-7.2-4.7-9.4-9.2A5.4 5.4 0 0112 6a5.4 5.4 0 019.4 5.8C19.2 16.3 12 21 12 21z'], w: 1.8 },
    target:     { d: ['M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19z', 'M12 7a5 5 0 100 10 5 5 0 000-10z', 'M12 11a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z'], w: 1.9, fill: false, fillLast: true },
    clock:      { d: ['M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19z', 'M12 7v5.5l4 2.4'], w: 1.9 },
    lightbulb:  { d: ['M9.5 18h5', 'M10.5 21h3', 'M12 3a6 6 0 00-3.6 10.8c.4.3.6.8.6 1.2V16h6v-1c0-.4.2-.9.6-1.2A6 6 0 0012 3z'], w: 1.8 },
    shield:     { d: ['M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z'], w: 1.8 },
    lock:       { d: ['M6 10.5h12V21H6z', 'M8.5 10.5V8a3.5 3.5 0 017 0v2.5'], w: 1.8 },
    search:     { d: ['M11 4a7 7 0 100 14 7 7 0 000-14z', 'M16.2 16.2L21 21'], w: 2 },
    globe:      { d: ['M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19z', 'M2.5 12h19', 'M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-6-4-9.5s1.4-6.9 4-9.5z'], w: 1.7 },
    users:      { d: ['M9 4a3.5 3.5 0 100 7 3.5 3.5 0 000-7z', 'M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6', 'M17 5.5a3 3 0 010 6.5', 'M18.5 20c0-2.5-.8-4.3-2.2-5.4'], w: 1.8 },
    user:       { d: ['M12 4a3.8 3.8 0 100 7.6A3.8 3.8 0 0012 4z', 'M4.5 20.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7'], w: 1.9 },
    book:       { d: ['M4 5.5A2.5 2.5 0 016.5 3H19v14H6.5A2.5 2.5 0 004 19.5z', 'M8 7h7', 'M8 11h5'], w: 1.8 },
    doc:        { d: ['M6 2.5h8l4 4V21.5H6z', 'M14 2.5V7h4', 'M9 12h6', 'M9 16h6'], w: 1.7 },
    calendar:   { d: ['M4 6h16v15H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'], w: 1.8 },
    mail:       { d: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'], w: 1.8 },
    pin:        { d: ['M12 21.5s7-6.8 7-11.5a7 7 0 10-14 0c0 4.7 7 11.5 7 11.5z', 'M12 7.5a2.6 2.6 0 100 5.2 2.6 2.6 0 000-5.2z'], w: 1.7 },
    money:      { d: ['M3 6.5h18v11H3z', 'M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z'], w: 1.8 },
    cart:       { d: ['M3 4h2.5l2.5 11h10l2.5-8H6', 'M9.5 19.5a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8z', 'M17.5 19.5a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8z'], w: 1.8 },
    code:       { d: ['M8.5 6L3 12l5.5 6', 'M15.5 6L21 12l-5.5 6'], w: 2.1 },
    play:       { d: ['M7 4.5l13 7.5-13 7.5z'], w: 1.6, fill: true },
    video:      { d: ['M3 6h12v12H3z', 'M15 10.5l6-3.5v10l-6-3.5z'], w: 1.7 },
    warn:       { d: ['M12 3l10 18H2z', 'M12 9.5v5', 'M12 17.5h.01'], w: 1.8 },
    info:       { d: ['M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19z', 'M12 11v6', 'M12 7.4h.01'], w: 2 },
    sparkle:    { d: ['M12 3l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9z', 'M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z'], w: 1.5, fill: true },
    layers:     { d: ['M12 3l9 4.8-9 4.8-9-4.8z', 'M3 13l9 4.8 9-4.8'], w: 1.8 },
    cpu:        { d: ['M7 7h10v10H7z', 'M10 3v4', 'M14 3v4', 'M10 17v4', 'M14 17v4', 'M3 10h4', 'M3 14h4', 'M17 10h4', 'M17 14h4'], w: 1.6 },
    database:   { d: ['M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z', 'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'], w: 1.6 },
    chartBar:   { d: ['M4 20V11', 'M10 20V4', 'M16 20v-6', 'M2 20.5h20'], w: 2.2 },
    pie:        { d: ['M12 12V2.5A9.5 9.5 0 0121.5 12z', 'M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19z'], w: 1.7 },
    list:       { d: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'], w: 2 },
    eye:        { d: ['M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'], w: 1.7 },
    link:       { d: ['M9.5 14.5l5-5', 'M10.5 6.5l1.8-1.8a4 4 0 015.6 5.6l-1.8 1.8', 'M13.5 17.5l-1.8 1.8a4 4 0 01-5.6-5.6l1.8-1.8'], w: 1.9 },
    download:   { d: ['M12 3v12', 'M7 11l5 5 5-5', 'M4 20.5h16'], w: 2 },
    upload:     { d: ['M12 16V4', 'M7 8l5-5 5 5', 'M4 20.5h16'], w: 2 },
    edit:       { d: ['M4 20h4l11-11-4-4L4 16z', 'M14.5 5.5l4 4'], w: 1.8 },
    trash:      { d: ['M4 7h16', 'M9 7V4.5h6V7', 'M6 7l1 13.5h10L18 7'], w: 1.8 },
    gear:       { d: ['M12 8.7a3.3 3.3 0 100 6.6 3.3 3.3 0 000-6.6z', 'M19.4 13.5a7.7 7.7 0 000-3l2-1.5-2-3.4-2.4 1a7.6 7.6 0 00-2.6-1.5L14 2.5h-4l-.4 2.6a7.6 7.6 0 00-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.7 7.7 0 000 3l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 002.6 1.5l.4 2.6h4l.4-2.6a7.6 7.6 0 002.6-1.5l2.4 1 2-3.4z'], w: 1.5 },
    rocket:     { d: ['M14 4c3 1.5 5 4.5 5 8l-4 4-6-6 4-4c0-1 0-2 1-2z', 'M9 15l-4 4', 'M10.5 6.5L7 8l-2 4 4 1', 'M19 12l-1.5 5-4 2'], w: 1.7 },
    grid:       { d: ['M3.5 3.5h7v7h-7z', 'M13.5 3.5h7v7h-7z', 'M3.5 13.5h7v7h-7z', 'M13.5 13.5h7v7h-7z'], w: 1.7 },
    quote:      { d: ['M9 6c-3 1-4.5 3.2-4.5 6.5V18h5v-5.5H6.8c0-2 .8-3.4 2.2-4z', 'M19.5 6c-3 1-4.5 3.2-4.5 6.5V18h5v-5.5h-2.7c0-2 .8-3.4 2.2-4z'], w: 1.4, fill: true },
    flag:       { d: ['M6 21V3.5', 'M6 4.5h12l-2.5 4 2.5 4H6'], w: 1.8 },
    puzzle:     { d: ['M10 3.5h4v3h3v4h-3v3h-4v-3H7v-4h3z', 'M7 13.5H4v6h6v-3', 'M14 19.5h6v-6h-3'], w: 1.6 }
  };

  function drawIcon(ctx, name, x, y, size, color, opts) {
    const ic = ICONS[name] || ICONS.sparkle;
    const s = size / 24;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineWidth = (ic.w || 2) * ((opts && opts.strokeScale) || 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ic.d.forEach((d, i) => {
      const p = new Path2D(d);
      if (ic.fill && (!ic.fillLast || i === ic.d.length - 1)) ctx.fill(p);
      else ctx.stroke(p);
      if (ic.fillLast && i === ic.d.length - 1) ctx.stroke(p);
    });
    ctx.restore();
  }
  const iconNames = () => Object.keys(ICONS);

  /* ---------------- ANIMATED BACKGROUNDS ---------------- */
  const BG_KINDS = [
    { id: 'solid',    name: 'Color sólido' },
    { id: 'gradient', name: 'Degradado' },
    { id: 'radial',   name: 'Radial' },
    { id: 'mesh',     name: 'Manchas (mesh)' },
    { id: 'grid',     name: 'Rejilla' },
    { id: 'dots',     name: 'Puntos' },
    { id: 'waves',    name: 'Ondas' },
    { id: 'particles',name: 'Partículas' },
    { id: 'stripes',  name: 'Diagonal' },
    { id: 'bokeh',    name: 'Bokeh' }
  ];

  function drawBackground(ctx, bg, W, H, t, accent) {
    t = t || 0;
    accent = accent || '#6c5ce7';
    ctx.save();
    const g = bg || {};
    const from = g.from || '#141433', to = g.to || '#05050f';
    switch (g.kind) {
      case 'solid':
        ctx.fillStyle = g.color || '#08081a'; ctx.fillRect(0, 0, W, H); break;
      case 'radial': {
        const r = Math.max(W, H) * .75;
        const rg = ctx.createRadialGradient(W * .5, H * .42, 0, W * .5, H * .5, r);
        rg.addColorStop(0, from); rg.addColorStop(1, to);
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); break;
      }
      case 'mesh': {
        ctx.fillStyle = to; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        const blobs = [[.22, .3, .5, from], [.78, .25, .42, accent], [.6, .8, .55, g.to2 || from], [.15, .85, .38, accent]];
        blobs.forEach((b, i) => {
          const x = W * b[0] + Math.sin(t * .0003 + i * 2) * W * .07;
          const y = H * b[1] + Math.cos(t * .00026 + i * 1.7) * H * .07;
          const rr = Math.max(W, H) * b[2];
          const rg = ctx.createRadialGradient(x, y, 0, x, y, rr);
          rg.addColorStop(0, U.rgba(b[3], .55)); rg.addColorStop(1, U.rgba(b[3], 0));
          ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
        });
        ctx.globalCompositeOperation = 'source-over'; break;
      }
      case 'grid': {
        ctx.fillStyle = g.color || '#08081a'; ctx.fillRect(0, 0, W, H);
        const step = Math.max(40, W / 22), off = (t * .02) % step;
        ctx.strokeStyle = U.rgba(from, .5); ctx.lineWidth = 1;
        for (let x = -step + off; x < W + step; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = -step + off * .5; y < H + step; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        break;
      }
      case 'dots': {
        ctx.fillStyle = g.color || '#08081a'; ctx.fillRect(0, 0, W, H);
        const step = Math.max(34, W / 30);
        ctx.fillStyle = U.rgba(from, .6);
        for (let x = step / 2; x < W; x += step) for (let y = step / 2; y < H; y += step) {
          const p = 2 + Math.sin((x + y) * .01 + t * .002) * 1.2;
          ctx.beginPath(); ctx.arc(x, y, p, 0, 7); ctx.fill();
        }
        break;
      }
      case 'waves': {
        ctx.fillStyle = to; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          const amp = H * (.05 + i * .022);
          for (let x = 0; x <= W; x += 8) {
            const y = H * (.5 + i * .045) + Math.sin(x * .0022 + t * .0012 + i) * amp + Math.cos(x * .004 + t * .0008 + i) * amp * .4;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
          ctx.fillStyle = U.rgba(i % 2 ? accent : from, .10 + i * .02);
          ctx.fill();
        }
        break;
      }
      case 'particles': {
        ctx.fillStyle = to; ctx.fillRect(0, 0, W, H);
        const n = 70;
        for (let i = 0; i < n; i++) {
          const seed = i * 12.9898;
          const px = ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1;
          const py = ((Math.sin(seed * 1.7) * 12345.678) % 1 + 1) % 1;
          const speed = .006 + (i % 7) * .0018;
          const x = (px * W + t * speed * 40) % W;
          const y = (py * H - t * speed * 26 + H * 10) % H;
          const r = 1.4 + (i % 5) * .9;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
          ctx.fillStyle = U.rgba(i % 3 ? accent : from, .12 + (i % 5) * .05); ctx.fill();
        }
        break;
      }
      case 'stripes': {
        ctx.fillStyle = to; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(-W, 0); ctx.rotate(-.28);
        const w = W * .06, gap = W * .1, off = (t * .03) % (w + gap);
        for (let x = -W; x < W * 3; x += w + gap) {
          ctx.fillStyle = U.rgba(from, .5); ctx.fillRect(x + off, -H, w, H * 3);
        }
        ctx.restore(); break;
      }
      case 'bokeh': {
        ctx.fillStyle = to; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 26; i++) {
          const seed = i * 7.31;
          const px = ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1, py = ((Math.sin(seed * 2.1) * 1234.567) % 1 + 1) % 1;
          const x = px * W + Math.sin(t * .0004 + i) * W * .03;
          const y = py * H + Math.cos(t * .00035 + i) * H * .03;
          const r = Math.max(W, H) * (.02 + (i % 6) * .012);
          const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
          rg.addColorStop(0, U.rgba(i % 2 ? accent : from, .30)); rg.addColorStop(.7, U.rgba(i % 2 ? accent : from, .08)); rg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over'; break;
      }
      default: {
        const lg = ctx.createLinearGradient(0, 0, W, H);
        lg.addColorStop(0, from); lg.addColorStop(1, to);
        ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.restore();
  }

  /* ---------------- animation presets for elements ---------------- */
  const ANIM_PRESETS = [
    { id: 'none',    name: 'Sin animación' },
    { id: 'fade',    name: 'Fundido' },
    { id: 'slideUp', name: 'Entra desde abajo' },
    { id: 'slideDown', name: 'Entra desde arriba' },
    { id: 'slideLeft', name: 'Entra desde derecha' },
    { id: 'slideRight', name: 'Entra desde izquierda' },
    { id: 'pop',     name: 'Pop / rebote' },
    { id: 'zoom',    name: 'Zoom suave' },
    { id: 'wipeRight', name: 'Barrido derecha' },
    { id: 'wipeLeft',  name: 'Barrido izquierda' },
    { id: 'wipeUp',    name: 'Barrido arriba' },
    { id: 'grow',    name: 'Crecer (barras)' },
    { id: 'rise',    name: 'Subir suave' }
  ];

  /* ---------------- layouts helpers ---------------- */
  function px(d, fx) { return Math.round(d.w * fx); }
  function py(d, fy) { return Math.round(d.h * fy); }

  /* ---------------- SCENE TEMPLATES ---------------- */
  // each returns { name, tags, build(design) -> [elements] }
  const SCENE_TEMPLATES = [
    {
      id: 'tpl-title', name: 'Portada de vídeo', tags: ['Intro', 'Título'],
      build(d) {
        return [
          Object.assign(S.FACTORIES.text(), { name: 'Título', x: px(d, .08), y: py(d, .30), w: px(d, .84), h: py(d, .17), props: { text: 'Cómo hacerlo paso a paso', size: Math.round(d.h * .085), weight: 850, color: '#ffffff', align: 'left', lineHeight: 1.1, family: 'Inter, system-ui, sans-serif', letterSpacing: -1, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'slideUp', dur: 700, delay: 120, easing: 'outCubic' }, out: { preset: 'fade', dur: 400, easing: 'inOutCubic' } } }),
          Object.assign(S.FACTORIES.text(), { name: 'Subtítulo', x: px(d, .08), y: py(d, .52), w: px(d, .7), h: py(d, .1), props: { text: 'Una guía rápida en menos de 3 minutos', size: Math.round(d.h * .036), weight: 500, color: 'rgba(255,255,255,.72)', align: 'left', lineHeight: 1.3, family: 'Inter, system-ui, sans-serif', letterSpacing: 0, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'slideUp', dur: 700, delay: 320, easing: 'outCubic' }, out: { preset: 'fade', dur: 400, easing: 'inOutCubic' } } }),
          Object.assign(S.FACTORIES.line(), { name: 'Regla', x: px(d, .08), y: py(d, .66), w: px(d, .16), h: 0, props: { color: '#6c5ce7', thickness: 8, style: 'solid', arrow: 'none', radius: 4 }, anim: { in: { preset: 'wipeRight', dur: 700, delay: 500, easing: 'outQuint' }, out: { preset: 'none', dur: 300, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.badge(), { name: 'Etiqueta', x: px(d, .08), y: py(d, .19), w: px(d, .17), h: py(d, .062), props: { text: 'TUTORIAL', color: '#ffffff', bg: '#6c5ce7', radius: 40, size: Math.round(d.h * .026), weight: 800, letterSpacing: 2 }, anim: { in: { preset: 'pop', dur: 600, delay: 0, easing: 'outBack' }, out: { preset: 'fade', dur: 300, easing: 'linear' } } })
        ];
      }
    },
    {
      id: 'tpl-stats', name: 'Tres datos clave', tags: ['Datos', 'KPIs'],
      build(d) {
        const out = [Object.assign(S.FACTORIES.text(), { name: 'Título', x: px(d, .07), y: py(d, .1), w: px(d, .86), h: py(d, .12), props: { text: 'Tres datos que deberías conocer', size: Math.round(d.h * .058), weight: 800, color: '#ffffff', align: 'left', lineHeight: 1.15, family: 'Inter, system-ui, sans-serif', letterSpacing: -.5, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'slideDown', dur: 600, delay: 0, easing: 'outCubic' }, out: { preset: 'fade', dur: 350, easing: 'linear' } } })];
        const vals = [[73, '%', 'Conversión', 'Tras aplicar la mejora'], [2.5, 'x', 'Velocidad', 'Con el nuevo flujo de trabajo'], [18, 'h', 'Ahorro semanal', 'Menos tareas manuales']];
        const cw = (d.w * .86 - px(d, .04) * 2) / 3;
        vals.forEach((v, i) => {
          out.push(Object.assign(S.FACTORIES.stat(), { name: 'Dato ' + (i + 1), x: Math.round(px(d, .07) + i * (cw + px(d, .04))), y: py(d, .32), w: Math.round(cw), h: py(d, .42),
            props: { value: v[0], suffix: v[1], prefix: '', label: v[2], caption: v[3], countUp: true, decimals: v[0] % 1 ? 1 : 0, valueColor: ['#00cec9', '#fdcb6e', '#fd79a8'][i], labelColor: '#ffffff', captionColor: 'rgba(255,255,255,.58)', bg: '#141432', radius: 22, accentBar: true, align: 'left' },
            anim: { in: { preset: 'pop', dur: 700, delay: 200 + i * 160, easing: 'outBackSoft' }, out: { preset: 'fade', dur: 350, easing: 'linear' } } }));
        });
        return out;
      }
    },
    {
      id: 'tpl-steps', name: 'Paso a paso', tags: ['Proceso', 'Tutorial'],
      build(d) {
        return [
          Object.assign(S.FACTORIES.text(), { name: 'Título', x: px(d, .07), y: py(d, .09), w: px(d, .86), h: py(d, .11), props: { text: 'Cómo funciona, en 3 pasos', size: Math.round(d.h * .058), weight: 800, color: '#ffffff', align: 'left', lineHeight: 1.15, family: 'Inter, system-ui, sans-serif', letterSpacing: -.5, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'slideDown', dur: 600, delay: 0, easing: 'outCubic' }, out: { preset: 'fade', dur: 300, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.steps(), { name: 'Pasos', x: px(d, .07), y: py(d, .3), w: px(d, .86), h: py(d, .52), props: { direction: 'h', items: [{ title: 'Prepara', text: 'Reúne los datos y el objetivo del vídeo' }, { title: 'Diseña', text: 'Arrastra plantillas y ajusta textos' }, { title: 'Exporta', text: 'Genera el MP4 con audio y subtítulos' }], color: '#6c5ce7', numberColor: '#ffffff', titleColor: '#ffffff', textColor: 'rgba(255,255,255,.6)', numbered: true, connector: true }, anim: { in: { preset: 'slideUp', dur: 700, delay: 200, easing: 'outCubic' }, out: { preset: 'fade', dur: 350, easing: 'linear' } } })
        ];
      }
    },
    {
      id: 'tpl-compare', name: 'Comparativa A vs B', tags: ['Comparar'],
      build(d) {
        return [
          Object.assign(S.FACTORIES.text(), { name: 'Título', x: px(d, .07), y: py(d, .09), w: px(d, .86), h: py(d, .11), props: { text: 'Antes y después', size: Math.round(d.h * .058), weight: 800, color: '#ffffff', align: 'left', lineHeight: 1.15, family: 'Inter, system-ui, sans-serif', letterSpacing: -.5, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'slideDown', dur: 600, delay: 0, easing: 'outCubic' }, out: { preset: 'fade', dur: 300, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.compare(), { name: 'Comparativa', x: px(d, .07), y: py(d, .27), w: px(d, .86), h: py(d, .56), props: { title: '', left: { title: 'Sin el método', items: ['Trabajo manual repetitivo', 'Resultados inconsistentes', 'Horas perdidas cada semana'] }, right: { title: 'Con el método', items: ['Plantillas reutilizables', 'Resultado profesional', 'Minutos en lugar de horas'] }, leftColor: '#d63031', rightColor: '#00b894', textColor: '#ffffff', vs: true, bg: '#101028', radius: 20 }, anim: { in: { preset: 'slideUp', dur: 700, delay: 180, easing: 'outCubic' }, out: { preset: 'fade', dur: 350, easing: 'linear' } } })
        ];
      }
    },
    {
      id: 'tpl-chart', name: 'Gráfico + conclusión', tags: ['Datos', 'Chart'],
      build(d) {
        return [
          Object.assign(S.FACTORIES.text(), { name: 'Título', x: px(d, .07), y: py(d, .08), w: px(d, .86), h: py(d, .11), props: { text: 'El crecimiento del último año', size: Math.round(d.h * .055), weight: 800, color: '#ffffff', align: 'left', lineHeight: 1.15, family: 'Inter, system-ui, sans-serif', letterSpacing: -.5, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'slideDown', dur: 600, delay: 0, easing: 'outCubic' }, out: { preset: 'fade', dur: 300, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.chart(), { name: 'Gráfico', x: px(d, .07), y: py(d, .24), w: px(d, .56), h: py(d, .6), props: { kind: 'bar', data: [{ label: 'Q1', value: 38 }, { label: 'Q2', value: 52 }, { label: 'Q3', value: 71 }, { label: 'Q4', value: 94 }], colors: ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e'], title: 'Ventas por trimestre (k€)', showLabels: true, showValues: true, showGrid: true, bg: '#101028', radius: 20, animate: true, angle: 0, legend: false, valueSuffix: '' }, anim: { in: { preset: 'fade', dur: 600, delay: 150, easing: 'outCubic' }, out: { preset: 'fade', dur: 350, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.callout(), { name: 'Conclusión', x: px(d, .67), y: py(d, .3), w: px(d, .26), h: py(d, .42), props: { variant: 'success', title: 'Conclusión', text: 'El último trimestre duplica el primero: el sistema funciona.', icon: '📈', bg: '#12241f', accent: '#00b894', textColor: '#ffffff', radius: 20 }, anim: { in: { preset: 'slideLeft', dur: 650, delay: 500, easing: 'outCubic' }, out: { preset: 'fade', dur: 300, easing: 'linear' } } })
        ];
      }
    },
    {
      id: 'tpl-timeline', name: 'Línea de tiempo', tags: ['Timeline'],
      build(d) {
        return [
          Object.assign(S.FACTORIES.text(), { name: 'Título', x: px(d, .07), y: py(d, .1), w: px(d, .86), h: py(d, .11), props: { text: 'La evolución, año a año', size: Math.round(d.h * .058), weight: 800, color: '#ffffff', align: 'left', lineHeight: 1.15, family: 'Inter, system-ui, sans-serif', letterSpacing: -.5, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'slideDown', dur: 600, delay: 0, easing: 'outCubic' }, out: { preset: 'fade', dur: 300, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.timeline(), { name: 'Timeline', x: px(d, .07), y: py(d, .32), w: px(d, .86), h: py(d, .48), props: { orientation: 'h', color: '#6c5ce7', items: [{ time: '2022', label: 'Primer prototipo' }, { time: '2023', label: 'Primeros usuarios' }, { time: '2024', label: 'Crecimiento' }, { time: '2025', label: 'Versión 3.0' }], textColor: '#ffffff', lineColor: 'rgba(255,255,255,.22)' }, anim: { in: { preset: 'fade', dur: 700, delay: 200, easing: 'outCubic' }, out: { preset: 'fade', dur: 350, easing: 'linear' } } })
        ];
      }
    },
    {
      id: 'tpl-code', name: 'Código + explicación', tags: ['Tutorial técnico'],
      build(d) {
        return [
          Object.assign(S.FACTORIES.text(), { name: 'Título', x: px(d, .06), y: py(d, .08), w: px(d, .55), h: py(d, .1), props: { text: 'Implementación', size: Math.round(d.h * .05), weight: 800, color: '#ffffff', align: 'left', lineHeight: 1.15, family: 'Inter, system-ui, sans-serif', letterSpacing: -.5, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'slideDown', dur: 550, delay: 0, easing: 'outCubic' }, out: { preset: 'fade', dur: 300, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.code(), { name: 'Código', x: px(d, .06), y: py(d, .22), w: px(d, .56), h: py(d, .64), props: { title: 'main.js', code: 'function animar(el, t) {\n  el.opacity = Math.min(1, t / 0.6);\n  el.y = lerp(24, 0, ease(t));\n}\n\nrequestAnimationFrame(loop);', lang: 'js', bg: '#0d1117', color: '#e6edf3', radius: 16, fontSize: Math.round(d.h * .022) }, anim: { in: { preset: 'slideRight', dur: 700, delay: 120, easing: 'outCubic' }, out: { preset: 'fade', dur: 300, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.bullets(), { name: 'Puntos', x: px(d, .66), y: py(d, .26), w: px(d, .28), h: py(d, .56), props: { title: 'Qué ocurre aquí', items: ['Calculamos el progreso', 'Interpolamos la posición', 'Redibujamos el fotograma'], marker: 'arrow', color: '#ffffff', markerColor: '#00cec9', size: Math.round(d.h * .026), gap: Math.round(d.h * .02), lineHeight: 1.35 }, anim: { in: { preset: 'slideLeft', dur: 650, delay: 380, easing: 'outCubic' }, out: { preset: 'fade', dur: 300, easing: 'linear' } } })
        ];
      }
    },
    {
      id: 'tpl-tip', name: 'Consejo destacado', tags: ['Tip'],
      build(d) {
        return [
          Object.assign(S.FACTORIES.callout(), { name: 'Consejo', x: px(d, .12), y: py(d, .32), w: px(d, .76), h: py(d, .36), props: { variant: 'tip', title: 'Truco rápido', text: 'Usa la tecla Espacio para previsualizar la escena sin salir del editor.', icon: '💡', bg: '#12233a', accent: '#0984e3', textColor: '#ffffff', radius: 26 }, anim: { in: { preset: 'pop', dur: 700, delay: 0, easing: 'outBackSoft' }, out: { preset: 'fade', dur: 350, easing: 'linear' } } })
        ];
      }
    },
    {
      id: 'tpl-list', name: 'Lista con checks', tags: ['Lista'],
      build(d) {
        return [
          Object.assign(S.FACTORIES.text(), { name: 'Título', x: px(d, .08), y: py(d, .13), w: px(d, .8), h: py(d, .12), props: { text: 'Lo que aprenderás', size: Math.round(d.h * .06), weight: 800, color: '#ffffff', align: 'left', lineHeight: 1.15, family: 'Inter, system-ui, sans-serif', letterSpacing: -.5, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'slideDown', dur: 600, delay: 0, easing: 'outCubic' }, out: { preset: 'fade', dur: 300, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.bullets(), { name: 'Lista', x: px(d, .08), y: py(d, .32), w: px(d, .8), h: py(d, .5), props: { title: '', items: ['Crear infografías animadas desde cero', 'Añadir locución y subtítulos automáticos', 'Exportar en MP4 listo para redes'], marker: 'check', color: '#ffffff', markerColor: '#00b894', size: Math.round(d.h * .04), gap: Math.round(d.h * .03), lineHeight: 1.3 }, anim: { in: { preset: 'slideUp', dur: 700, delay: 200, easing: 'outCubic' }, out: { preset: 'fade', dur: 350, easing: 'linear' } } })
        ];
      }
    },
    {
      id: 'tpl-outro', name: 'Cierre / CTA', tags: ['Outro'],
      build(d) {
        return [
          Object.assign(S.FACTORIES.text(), { name: 'Título', x: 0, y: py(d, .38), w: d.w, h: py(d, .14), props: { text: 'Eso es todo ✨', size: Math.round(d.h * .08), weight: 850, color: '#ffffff', align: 'center', lineHeight: 1.1, family: 'Inter, system-ui, sans-serif', letterSpacing: -1, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'zoom', dur: 700, delay: 0, easing: 'outBackSoft' }, out: { preset: 'fade', dur: 400, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.text(), { name: 'CTA', x: 0, y: py(d, .54), w: d.w, h: py(d, .1), props: { text: 'Suscríbete para más tutoriales', size: Math.round(d.h * .035), weight: 600, color: 'rgba(255,255,255,.7)', align: 'center', lineHeight: 1.3, family: 'Inter, system-ui, sans-serif', letterSpacing: 0, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 }, anim: { in: { preset: 'fade', dur: 800, delay: 350, easing: 'outCubic' }, out: { preset: 'fade', dur: 400, easing: 'linear' } } }),
          Object.assign(S.FACTORIES.badge(), { name: 'Etiqueta', x: Math.round((d.w - px(d, .2)) / 2), y: py(d, .68), w: px(d, .2), h: py(d, .065), props: { text: 'NUEVO VÍDEO', color: '#ffffff', bg: '#fd79a8', radius: 40, size: Math.round(d.h * .026), weight: 800, letterSpacing: 2 }, anim: { in: { preset: 'pop', dur: 600, delay: 600, easing: 'outBack' }, out: { preset: 'none', dur: 300, easing: 'linear' } } })
        ];
      }
    }
  ];

  /* ---------------- FULL VIDEO TEMPLATES ---------------- */
  // returns { name, desc, tags, aspect, build(design) -> [scene-likes] }
  const VIDEO_TEMPLATES = [
    {
      id: 'vt-tutorial', name: 'Tutorial explicativo', desc: 'Portada + pasos + consejo + cierre. Plantilla base para cualquier tutorial.', tags: ['Tutorial', '5 escenas'], aspect: '16:9',
      build(d) {
        return [
          mkScene('Portada', buildFrom('tpl-title', d), { narration: 'En este vídeo vas a aprender a hacerlo paso a paso.', durationMs: 4000 }),
          mkScene('Promesa', buildFrom('tpl-list', d), { narration: 'Esto es todo lo que vas a conseguir al terminar.', durationMs: 5000 }),
          mkScene('Pasos', buildFrom('tpl-steps', d), { narration: 'El proceso se divide en tres pasos sencillos.', durationMs: 6000 }),
          mkScene('Consejo', buildFrom('tpl-tip', d), { narration: 'Un truco rápido que te ahorrará tiempo.', durationMs: 4000 }),
          mkScene('Cierre', buildFrom('tpl-outro', d), { narration: 'Gracias por ver. Nos vemos en el próximo vídeo.', durationMs: 4000 })
        ];
      }
    },
    {
      id: 'vt-data', name: 'Vídeo de datos', desc: 'Portada, tres KPIs, gráfico con conclusión y cierre. Ideal para informar.', tags: ['Datos', '4 escenas'], aspect: '9:16',
      build(d) {
        return [
          mkScene('Portada', buildFrom('tpl-title', d), { narration: 'Estos son los números que debes conocer hoy.', durationMs: 4000 }),
          mkScene('Datos', buildFrom('tpl-stats', d), { narration: 'Tres datos clave resumen la situación.', durationMs: 6000 }),
          mkScene('Gráfico', buildFrom('tpl-chart', d), { narration: 'Y aquí se ve claramente la tendencia.', durationMs: 6500 }),
          mkScene('Cierre', buildFrom('tpl-outro', d), { narration: 'Si te ha servido, compártelo.', durationMs: 3500 })
        ];
      }
    },
    {
      id: 'vt-tech', name: 'Tutorial técnico', desc: 'Portada, código explicado, lista de pasos y cierre.', tags: ['Técnico', '4 escenas'], aspect: '16:9',
      build(d) {
        return [
          mkScene('Portada', buildFrom('tpl-title', d), { narration: 'Vamos a implementarlo juntos, línea a línea.', durationMs: 4000 }),
          mkScene('Código', buildFrom('tpl-code', d), { narration: 'Este es el bloque principal y esto es lo que hace cada parte.', durationMs: 8000 }),
          mkScene('Pasos', buildFrom('tpl-steps', d), { narration: 'Resumiendo: tres pasos para tenerlo funcionando.', durationMs: 6000 }),
          mkScene('Cierre', buildFrom('tpl-outro', d), { narration: 'Eso es todo. Código en la descripción.', durationMs: 4000 })
        ];
      }
    }
  ];

  function buildFrom(id, d) {
    const t = SCENE_TEMPLATES.find(x => x.id === id);
    return t ? t.build(d) : [];
  }
  function mkScene(name, elements, extra) {
    const sc = S.newScene(name);
    sc.elements = elements.map(e => { const c = U.deep(e); c.id = U.uid('el'); return c; });
    return Object.assign(sc, extra || {});
  }

  const COMPONENT_GROUPS = [
    { name: 'Texto', items: [['text', 'Texto', 'T'], ['bullets', 'Lista', '☰'], ['quote', 'Cita', '❝'], ['badge', 'Etiqueta', '🏷️']] },
    { name: 'Datos', items: [['stat', 'Dato / KPI', '📊'], ['chart', 'Gráfico', '📈'], ['progress', 'Progreso', '▰'], ['compare', 'Comparativa', '⚖️']] },
    { name: 'Estructura', items: [['steps', 'Pasos', '①'], ['timeline', 'Timeline', '⏱️'], ['callout', 'Aviso', '💬'], ['code', 'Código', '⌨️']] },
    { name: 'Formas', items: [['shape', 'Forma', '◻'], ['line', 'Línea', '╱'], ['icon', 'Icono', '★'], ['image', 'Imagen', '🖼️']] }
  ];

  IS.library = { ICONS, drawIcon, iconNames, BG_KINDS, drawBackground, ANIM_PRESETS, SCENE_TEMPLATES, VIDEO_TEMPLATES, COMPONENT_GROUPS, px, py };
})(window.IS = window.IS || {});
