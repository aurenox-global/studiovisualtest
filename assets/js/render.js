/* ============================================================
   InfoStudio Pro — render.js
   Deterministic canvas renderer: scenes, elements, charts and
   the animation/transition engine (time-based, export-safe).
   ============================================================ */
(function (IS) {
  'use strict';
  const U = IS.util, L = IS.library, S = IS.store;
  const TAU = Math.PI * 2;

  /* ---------------- image cache ---------------- */
  const _imgCache = Object.create(null);
  function getImage(src, onLoad) {
    if (!src) return null;
    const c = _imgCache[src];
    if (c) return c.ok ? c.img : null;
    const img = new Image();
    _imgCache[src] = { img, ok: false };
    img.onload = () => { _imgCache[src].ok = true; if (onLoad) onLoad(); };
    img.onerror = () => { _imgCache[src].ok = false; };
    img.src = src;
    return null;
  }
  function preload(src) { return new Promise(res => { if (!src) return res(null); const c = _imgCache[src]; if (c && c.ok) return res(c.img); const img = new Image(); img.onload = () => { _imgCache[src] = { img, ok: true }; res(img); }; img.onerror = () => res(null); img.src = src; }); }

  /* ---------------- geometry helpers ---------------- */
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
  }
  function poly(ctx, cx, cy, r, n, rot) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + i / n * TAU;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function starPath(ctx, cx, cy, R, r, n, rot) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + i / (n * 2) * TAU, rad = i % 2 ? r : R;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  /* ---------------- animation engine ---------------- */
  function inT(id, e) {
    switch (id) {
      case 'fade': return { o: e };
      case 'slideUp': return { o: Math.min(1, e * 1.8), ty: (1 - e) * .55 };
      case 'slideDown': return { o: Math.min(1, e * 1.8), ty: -(1 - e) * .55 };
      case 'slideLeft': return { o: Math.min(1, e * 1.8), tx: (1 - e) * .55 };
      case 'slideRight': return { o: Math.min(1, e * 1.8), tx: -(1 - e) * .55 };
      case 'pop': return { o: Math.min(1, e * 1.9), s: .55 + .45 * e };
      case 'zoom': return { o: e, s: .88 + .12 * e };
      case 'rise': return { o: e, ty: (1 - e) * .12 };
      case 'wipeRight': return { clip: { dir: 'r', p: e } };
      case 'wipeLeft': return { clip: { dir: 'l', p: e } };
      case 'wipeUp': return { clip: { dir: 'u', p: e } };
      case 'grow': return { grow: e };
      default: return {};
    }
  }
  function outT(id, e) {
    switch (id) {
      case 'fade': return { o: 1 - e };
      case 'slideUp': return { o: 1 - e, ty: -e * .4 };
      case 'slideDown': return { o: 1 - e, ty: e * .4 };
      case 'slideLeft': return { o: 1 - e, tx: -e * .4 };
      case 'slideRight': return { o: 1 - e, tx: e * .4 };
      case 'pop': return { o: 1 - e, s: 1 + .18 * e };
      case 'zoom': return { o: 1 - e, s: 1 - .14 * e };
      case 'rise': return { o: 1 - e, ty: -e * .18 };
      case 'wipeRight': return { clip: { dir: 'r', p: 1 - e } };
      case 'wipeLeft': return { clip: { dir: 'l', p: 1 - e } };
      case 'wipeUp': return { clip: { dir: 'u', p: 1 - e } };
      case 'grow': return { o: 1 - e };
      default: return {};
    }
  }
  function animState(el, t, dur) {
    const a = el.anim || {};
    const inA = a.in || { preset: 'none' }, outA = a.out || { preset: 'none' };
    const st = { o: 1, tx: 0, ty: 0, s: 1, clip: null, p: 1, grow: 1 };
    if (inA.preset && inA.preset !== 'none') {
      const durIn = Math.max(1, inA.dur || 600);
      const p = U.clamp((t - (inA.delay || 0)) / durIn, 0, 1);
      const e = (U.ease[inA.easing] || U.ease.outCubic)(p);
      st.p = p;
      const r = inT(inA.preset, e);
      st.o *= r.o == null ? 1 : r.o; st.tx += r.tx || 0; st.ty += r.ty || 0; st.s *= r.s == null ? 1 : r.s;
      if (r.clip) st.clip = r.clip;
      if (r.grow != null) st.grow = r.grow;
    }
    if (t < (inA.delay || 0)) st.o = 0;
    if (outA.preset && outA.preset !== 'none' && dur > 0) {
      const durOut = Math.max(1, outA.dur || 400);
      const p = U.clamp((t - (dur - durOut)) / durOut, 0, 1);
      const e = (U.ease[outA.easing] || U.ease.inOutCubic)(p);
      const r = outT(outA.preset, e);
      st.o *= r.o == null ? 1 : r.o; st.tx += r.tx || 0; st.ty += r.ty || 0; st.s *= r.s == null ? 1 : r.s;
      if (r.clip) st.clip = r.clip;
    }
    st.o = U.clamp(st.o, 0, 1);
    return st;
  }

  /* ---------------- element drawing ---------------- */
  function drawElement(ctx, el, t, dur, accent, quality) {
    if (!el.visible) return;
    const st = animState(el, t, dur);
    if (st.o <= 0.001 && !st.clip) return;
    const g = S.effectiveGeom(el, t); // geometría animada por keyframes (o base)
    const w = g.w, h = g.h;
    ctx.save();
    ctx.globalAlpha *= st.o;
    ctx.translate(g.x + w / 2 + (st.tx || 0) * w, g.y + h / 2 + (st.ty || 0) * h);
    if (g.rotation) ctx.rotate(g.rotation * Math.PI / 180);
    if (st.s !== 1) ctx.scale(st.s, st.s);
    if (st.clip) {
      let x = -w / 2, y = -h / 2, cw = w, ch = h;
      if (st.clip.dir === 'r') cw = w * st.clip.p;
      else if (st.clip.dir === 'l') { cw = w * st.clip.p; x = w / 2 - cw; }
      else if (st.clip.dir === 'u') { ch = h * st.clip.p; y = h / 2 - ch; }
      ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.clip();
    }
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha *= (g.opacity == null ? 1 : g.opacity);
    try { DRAW[el.type] ? DRAW[el.type](ctx, el, w, h, st, accent, quality) : DRAW.text(ctx, el, w, h, st, accent, quality); }
    catch (err) { console.warn('draw error', el.type, err); }
    ctx.restore();
  }

  const DRAW = {
    text(ctx, el, w, h, st) {
      const p = el.props;
      if (p.bg && p.bg !== 'transparent') { ctx.fillStyle = p.bg; rr(ctx, 0, 0, w, h, p.radius || 0); ctx.fill(); }
      const pad = p.pad || 0;
      const maxW = Math.max(10, w - pad * 2);
      const maxH = Math.max(10, h - pad * 2);
      const lhF = p.lineHeight || 1.2;
      const fam = p.family || 'sans-serif';
      const maxSize = p.size || 40;
      // ---- auto-fit: shrink the type until the wrapped block fits the frame ----
      let size = maxSize, lines = [];
      for (let i = 0; i < 140; i++) {
        ctx.font = `${p.weight || 700} ${size}px ${fam}`;
        lines = U.wrapLines(ctx, p.text, maxW);
        const totalH = lines.length * size * lhF;
        const widest = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
        if ((totalH <= maxH && widest <= maxW) || size <= 8) break;
        size = Math.max(8, size - Math.max(1, size * .04));
      }
      ctx.font = `${p.weight || 700} ${size}px ${fam}`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = p.align === 'center' ? 'center' : p.align === 'right' ? 'right' : 'left';
      const lh = size * lhF;
      const totalH = lines.length * lh;
      let y0 = pad;
      if (p.vAlign === 'middle') y0 = pad + (maxH - totalH) / 2;
      else if (p.vAlign === 'bottom') y0 = pad + maxH - totalH;
      const ax = p.align === 'center' ? w / 2 : p.align === 'right' ? w - pad : pad;
      ctx.fillStyle = p.color || '#fff';
      lines.forEach((ln, i) => {
        const y = y0 + lh * i + (lh - size) * .5 + size * .82;
        if (p.letterSpacing) {
          ctx.save(); ctx.textAlign = 'left';
          let x = p.align === 'center' ? (w - measureSpaced(ctx, ln, p.letterSpacing)) / 2 : p.align === 'right' ? w - pad - measureSpaced(ctx, ln, p.letterSpacing) : pad;
          for (const ch of ln) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + p.letterSpacing; }
          ctx.restore();
        } else ctx.fillText(ln, ax, y);
      });
      ctx.textAlign = 'left';
    },
    shape(ctx, el, w, h) {
      const p = el.props;
      if (p.kind === 'path') {
        const pts = p.points || [];
        if (pts.length > 1) {
          ctx.beginPath();
          pts.forEach((q, i) => { const x = q.x * w, y = q.y * h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          if (p.fillOn) { ctx.fillStyle = p.fill; ctx.fill(); }
          if (p.strokeWidth > 0) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.strokeWidth; ctx.stroke(); }
        }
        return;
      }
      if (p.fillOn) { ctx.fillStyle = p.fill; rr(ctx, 0, 0, w, h, p.radius || 0); ctx.fill(); }
      if (p.strokeWidth > 0) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.strokeWidth; rr(ctx, 0, 0, w, h, p.radius || 0); ctx.stroke(); }
      if (p.kind && p.kind !== 'rect') {
        ctx.beginPath();
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2;
        if (p.kind === 'ellipse') ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU);
        else if (p.kind === 'triangle') { ctx.moveTo(cx, cy - R); ctx.lineTo(cx + R, cy + R); ctx.lineTo(cx - R, cy + R); ctx.closePath(); }
        else if (p.kind === 'diamond') { ctx.moveTo(cx, cy - R); ctx.lineTo(cx + R, cy); ctx.lineTo(cx, cy + R); ctx.lineTo(cx - R, cy); ctx.closePath(); }
        else if (p.kind === 'star') starPath(ctx, cx, cy, R, R * .45, 5, -Math.PI / 2);
        else if (p.kind === 'polygon') poly(ctx, cx, cy, R, Math.max(3, p.points || 6), -Math.PI / 2);
        if (p.fillOn) { ctx.fillStyle = p.fill; ctx.fill(); }
        if (p.strokeWidth > 0) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.strokeWidth; ctx.stroke(); }
      }
    },
    line(ctx, el, w, h) {
      const p = el.props, len = w;
      ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, p.thickness || 3); ctx.lineCap = 'round';
      if (p.style === 'dashed') ctx.setLineDash([(p.thickness || 3) * 3, (p.thickness || 3) * 2]);
      else if (p.style === 'dotted') ctx.setLineDash([1, (p.thickness || 3) * 2]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
      ctx.setLineDash([]);
      const head = Math.max(8, (p.thickness || 3) * 4);
      const arrow = (x, dir) => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - dir * head, -head * .42); ctx.lineTo(x - dir * head, head * .42); ctx.closePath(); ctx.fillStyle = p.color; ctx.fill(); };
      if (p.arrow === 'end' || p.arrow === 'both') arrow(len, 1);
      if (p.arrow === 'start' || p.arrow === 'both') arrow(0, -1);
    },
    icon(ctx, el, w, h) {
      const p = el.props, s = Math.min(w, h);
      if (p.bgOn) { ctx.fillStyle = p.bg || 'transparent'; rr(ctx, 0, 0, w, h, p.radius || 0); ctx.fill(); }
      L.drawIcon(ctx, p.name, (w - s) / 2, (h - s) / 2, s, p.color, { strokeScale: p.stroke || 2 });
    },
    image(ctx, el, w, h) {
      const p = el.props;
      if (p.shadow) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = Math.min(w, h) * .12; ctx.shadowOffsetY = Math.min(w, h) * .04; ctx.fillStyle = '#000'; rr(ctx, 0, 0, w, h, p.radius || 0); ctx.fill(); ctx.restore(); }
      ctx.save(); rr(ctx, 0, 0, w, h, p.radius || 0); ctx.clip();
      const img = getImage(p.src, () => IS.render.requestRedraw && IS.render.requestRedraw());
      if (img) {
        const iw = img.naturalWidth, ih = img.naturalHeight;
        let dw = w, dh = h;
        if (p.fit === 'cover') { const s = Math.max(w / iw, h / ih); dw = iw * s; dh = ih * s; }
        else { const s = Math.min(w / iw, h / ih); dw = iw * s; dh = ih * s; }
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      } else { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = `500 ${Math.min(w, h) * .09}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('🖼️ Imagen', w / 2, h / 2 + 6); ctx.textAlign = 'left'; }
      ctx.restore();
      if (p.frameWidth > 0) { ctx.strokeStyle = p.frame; ctx.lineWidth = p.frameWidth; rr(ctx, 0, 0, w, h, p.radius || 0); ctx.stroke(); }
    },
    stat(ctx, el, w, h, st) {
      const p = el.props;
      if (p.bg && p.bg !== 'transparent') { ctx.fillStyle = p.bg; rr(ctx, 0, 0, w, h, p.radius || 0); ctx.fill(); }
      if (p.accentBar) { ctx.fillStyle = p.valueColor; rr(ctx, 0, 0, Math.max(6, w * .022), h, (p.radius || 0)); ctx.fill(); }
      const g = st.grow == null ? 1 : st.grow;
      const v = (p.value || 0) * (p.countUp && st.p < 1 ? g : 1);
      const dec = p.decimals || 0;
      const shown = (p.prefix || '') + Number(v.toFixed(dec)).toLocaleString() + (p.suffix || '');
      const padX = w * .11, align = p.align || 'left';
      const availW = Math.max(20, w - padX * (align === 'center' ? 2 : 1.4));
      ctx.textAlign = align === 'center' ? 'center' : 'left';
      ctx.textBaseline = 'alphabetic';
      const ax = align === 'center' ? w / 2 : padX;
      const bigSize = fitOneLine(ctx, shown, availW, Math.min(h * .42, w * .30), 850, 'system-ui,sans-serif');
      ctx.fillStyle = p.valueColor;
      ctx.fillText(shown, ax, h * .52);
      const lSize = fitOneLine(ctx, p.label || '', availW, Math.min(h * .11, w * .13), 700, 'system-ui,sans-serif');
      ctx.fillStyle = p.labelColor; ctx.fillText(p.label || '', ax, h * .72);
      const cSize = fitOneLine(ctx, p.caption || '', availW, Math.min(h * .085, w * .1), 400, 'system-ui,sans-serif');
      ctx.fillStyle = p.captionColor; ctx.fillText(p.caption || '', ax, Math.min(h * .88, h - Math.max(6, h * .03)));
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    },
    chart(ctx, el, w, h, st) {
      const p = el.props;
      if (p.bg && p.bg !== 'transparent') { ctx.fillStyle = p.bg; rr(ctx, 0, 0, w, h, p.radius || 0); ctx.fill(); }
      const pad = Math.min(w, h) * .07, titleH = p.title ? h * .12 : 0;
      const prog = p.animate === false ? 1 : (st.p == null ? 1 : st.p);
      if (p.title) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = `700 ${Math.max(12, h * .075)}px system-ui,sans-serif`; ctx.fillText(p.title, pad, pad + h * .06); }
      const box = { x: pad, y: pad + titleH, w: w - pad * 2, h: h - pad * 2 - titleH };
      const data = p.data || [];
      switch (p.kind) {
        case 'bar': chartBar(ctx, box, data, p, prog); break;
        case 'hbar': chartHBar(ctx, box, data, p, prog); break;
        case 'line': chartLine(ctx, box, data, p, prog, false); break;
        case 'area': chartLine(ctx, box, data, p, prog, true); break;
        case 'pie': chartPie(ctx, box, data, p, prog, false); break;
        case 'donut': chartPie(ctx, box, data, p, prog, true); break;
        case 'radar': chartRadar(ctx, box, data, p, prog); break;
        default: chartBar(ctx, box, data, p, prog);
      }
    },
    progress(ctx, el, w, h, st) {
      const p = el.props;
      const prog = (st.grow == null ? 1 : st.grow);
      const th = Math.min(p.thickness || 24, h * .5);
      const y = h / 2 - th / 2;
      const labelH = p.label ? Math.max(12, h * .26) : 0;
      const yy = y + labelH * .3;
      ctx.font = `650 ${Math.max(11, h * .24)}px system-ui,sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,.82)';
      ctx.textAlign = 'left';
      if (p.label) ctx.fillText(p.label, 0, yy - 6);
      if (p.showValue) { ctx.textAlign = 'right'; ctx.fillStyle = p.color; ctx.fillText(Math.round((p.value || 0) * (st.grow == null ? 1 : st.grow)) + '%', w, yy - 6); ctx.textAlign = 'left'; }
      ctx.fillStyle = p.track; rr(ctx, 0, yy, w, th, (p.radius || th / 2)); ctx.fill();
      const fw = Math.max(th, w * U.clamp(prog, 0, 1));
      const grad = ctx.createLinearGradient(0, 0, fw, 0);
      grad.addColorStop(0, p.color); grad.addColorStop(1, U.shade(p.color, .35));
      ctx.fillStyle = grad; rr(ctx, 0, yy, fw, th, (p.radius || th / 2)); ctx.fill();
    },
    bullets(ctx, el, w, h) {
      const p = el.props;
      let y = 0;
      if (p.title) { ctx.font = `800 ${Math.max(14, p.size * 1.05)}px system-ui,sans-serif`; ctx.fillStyle = p.color; ctx.fillText(p.title, 0, p.size); y = p.size + (p.gap || 16) * 1.5; }
      const size = p.size || 30, gap = p.gap || 16;
      (p.items || []).forEach((it, i) => {
        const ly = y + size * .8;
        ctx.font = `500 ${size}px system-ui,sans-serif`;
        const mSize = size * .95;
        if (p.marker === 'check') L.drawIcon(ctx, 'check', 0, y + size * .12, mSize, p.markerColor, { strokeScale: 2.2 });
        else if (p.marker === 'arrow') L.drawIcon(ctx, 'arrowRight', 0, y + size * .12, mSize, p.markerColor, { strokeScale: 2.2 });
        else if (p.marker === 'number') { ctx.fillStyle = p.markerColor; ctx.font = `800 ${size * .8}px system-ui,sans-serif`; ctx.fillText((i + 1) + '.', 0, ly); }
        else if (p.marker === 'dot') { ctx.fillStyle = p.markerColor; ctx.beginPath(); ctx.arc(mSize * .35, y + size * .5, size * .16, 0, TAU); ctx.fill(); }
        ctx.fillStyle = p.color;
        fitOneLine(ctx, it, Math.max(20, w - mSize * 1.25), size, 500, 'system-ui,sans-serif');
        ctx.fillText(it, mSize * 1.25, ly);
        y += size * (p.lineHeight || 1.35) + gap;
      });
    },
    badge(ctx, el, w, h) {
      const p = el.props;
      ctx.fillStyle = p.bg; rr(ctx, 0, 0, w, h, p.radius == null ? h / 2 : p.radius); ctx.fill();
      ctx.fillStyle = p.color; ctx.font = `${p.weight || 800} ${p.size || 24}px system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let text = p.text || '';
      if (p.letterSpacing) {
        const spaced = text.split('').join(' ');
        ctx.fillText(spaced, w / 2, h / 2 + 1);
      } else ctx.fillText(text, w / 2, h / 2 + 1);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    },
    callout(ctx, el, w, h) {
      const p = el.props;
      ctx.fillStyle = p.bg; rr(ctx, 0, 0, w, h, p.radius || 16); ctx.fill();
      ctx.fillStyle = p.accent; rr(ctx, 0, 0, Math.max(5, w * .012), h, (p.radius || 16)); ctx.fill();
      const padX = Math.max(16, w * .05);
      let y = Math.max(18, h * .12);
      const tSize = Math.max(13, h * .13);
      const iconS = p.icon ? Math.min(h * .22, w * .12) : 0;
      const titleSize = tSize;
      if (p.icon) { ctx.font = `${iconS}px system-ui`; ctx.textBaseline = 'top'; ctx.fillText(p.icon, padX, y - 2); ctx.textBaseline = 'alphabetic'; }
      ctx.fillStyle = p.accent; ctx.font = `800 ${titleSize}px system-ui,sans-serif`;
      ctx.fillText(p.title || '', padX + (iconS ? iconS * 1.5 : 0), y + iconS * .72);
      y += iconS * .9 + titleSize * 1.6;
      ctx.fillStyle = p.textColor; ctx.font = `400 ${Math.max(12, h * .095)}px system-ui,sans-serif`;
      const lines = U.wrapLines(ctx, p.text, w - padX * 2);
      const lh = Math.max(12, h * .095) * 1.45;
      lines.slice(0, Math.floor((h - y) / lh)).forEach((ln, i) => ctx.fillText(ln, padX, y + lh * i));
    },
    steps(ctx, el, w, h, st) {
      const p = el.props, items = p.items || [], n = Math.max(1, items.length), prog = st.p == null ? 1 : st.p;
      const horiz = p.direction !== 'v';
      if (horiz) {
        const gap = w / n, r = Math.min(h * .12, gap * .16);
        const cy = h * .30;
        if (p.connector && n > 1) { ctx.strokeStyle = U.rgba(p.color, .35); ctx.lineWidth = Math.max(2, r * .22); ctx.beginPath(); ctx.moveTo(gap / 2, cy); ctx.lineTo(w - gap / 2, cy); ctx.stroke(); }
        items.forEach((it, i) => {
          const cx = gap * (i + .5);
          const reveal = U.clamp((prog - i / n * .5) * 2, 0, 1);
          ctx.globalAlpha *= reveal;
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
          if (p.numbered) { ctx.fillStyle = p.numberColor; ctx.font = `800 ${r * 1.05}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), cx, cy + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
          ctx.textAlign = 'center';
          ctx.fillStyle = p.titleColor; ctx.font = `750 ${Math.max(13, r * .78)}px system-ui,sans-serif`;
          ctx.fillText(it.title || '', cx, cy + r * 2.1);
          ctx.fillStyle = p.textColor; ctx.font = `400 ${Math.max(11, r * .62)}px system-ui,sans-serif`;
          U.wrapLines(ctx, it.text || '', gap * .82).slice(0, 3).forEach((ln, k) => ctx.fillText(ln, cx, cy + r * 2.1 + r * 1.1 + k * r * .8));
          ctx.textAlign = 'left';
          ctx.globalAlpha /= (reveal || 1);
        });
      } else {
        const gap = h / n, r = Math.min(gap * .22, w * .06);
        const cx = r * 1.4;
        if (p.connector && n > 1) { ctx.strokeStyle = U.rgba(p.color, .35); ctx.lineWidth = Math.max(2, r * .22); ctx.beginPath(); ctx.moveTo(cx, gap / 2); ctx.lineTo(cx, h - gap / 2); ctx.stroke(); }
        items.forEach((it, i) => {
          const cy = gap * (i + .5);
          const reveal = U.clamp((prog - i / n * .5) * 2, 0, 1);
          ctx.globalAlpha *= reveal;
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
          if (p.numbered) { ctx.fillStyle = p.numberColor; ctx.font = `800 ${r * 1.05}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), cx, cy + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
          ctx.fillStyle = p.titleColor; ctx.font = `750 ${Math.max(13, r * .8)}px system-ui,sans-serif`; ctx.fillText(it.title || '', cx + r * 2, cy + r * .2);
          ctx.fillStyle = p.textColor; ctx.font = `400 ${Math.max(11, r * .62)}px system-ui,sans-serif`; ctx.fillText(it.text || '', cx + r * 2, cy + r * 1.2);
          ctx.globalAlpha /= (reveal || 1);
        });
      }
    },
    compare(ctx, el, w, h, st) {
      const p = el.props, prog = st.p == null ? 1 : st.p;
      if (p.bg && p.bg !== 'transparent') { ctx.fillStyle = p.bg; rr(ctx, 0, 0, w, h, p.radius || 18); ctx.fill(); }
      const pad = w * .03, colW = (w - pad * 3) / 2, top = h * .06;
      [[p.left, p.leftColor, 0], [p.right, p.rightColor, 1]].forEach(([side, color, i]) => {
        const x = pad + i * (colW + pad);
        ctx.globalAlpha *= U.clamp((prog - i * .15) * 2.4, 0, 1);
        ctx.fillStyle = U.rgba(color, .14); rr(ctx, x, top, colW, h - top - pad, 14); ctx.fill();
        ctx.fillStyle = color; ctx.font = `800 ${Math.max(13, h * .075)}px system-ui,sans-serif`; ctx.fillText(side.title || '', x + colW * .07, top + h * .12);
        ctx.font = `500 ${Math.max(11, h * .062)}px system-ui,sans-serif`; ctx.fillStyle = p.textColor;
        (side.items || []).forEach((it, k) => {
          const y = top + h * .12 + Math.max(14, h * .062) * 2.05 * (k + 1);
          L.drawIcon(ctx, 'check', x + colW * .06, y - Math.max(11, h * .062) * .8, Math.max(11, h * .062) * .95, color, { strokeScale: 2.2 });
          ctx.fillText(it, x + colW * .06 + Math.max(11, h * .062) * 1.35, y);
        });
        ctx.globalAlpha /= (U.clamp((prog - i * .15) * 2.4, 0, 1) || 1);
      });
      if (p.vs) {
        const cx = w / 2, cy = h * .5, r = Math.min(w, h) * .055;
        ctx.fillStyle = U.rgba('#0b0b1c', .96); ctx.beginPath(); ctx.arc(cx, cy, r * 1.25, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = Math.max(1, r * .08); ctx.stroke();
        ctx.fillStyle = '#0b0b1c'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `800 ${r * .78}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('VS', cx, cy + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
    },
    timeline(ctx, el, w, h, st) {
      const p = el.props, items = p.items || [], n = Math.max(1, items.length), prog = st.p == null ? 1 : st.p;
      const horiz = p.orientation !== 'v';
      ctx.strokeStyle = p.lineColor; ctx.lineWidth = Math.max(2, Math.min(w, h) * .008);
      if (horiz) {
        const y = h * .42;
        ctx.beginPath(); ctx.moveTo(w * .04, y); ctx.lineTo(w * (.04 + .92 * prog), y); ctx.stroke();
        items.forEach((it, i) => {
          const x = w * (.04 + (.92 / (n - 1 || 1)) * i);
          const reveal = U.clamp((prog - i / n * .4) * 2.2, 0, 1);
          ctx.globalAlpha *= reveal;
          ctx.beginPath(); ctx.arc(x, y, Math.min(w, h) * .022, 0, TAU); ctx.fillStyle = p.color; ctx.fill();
          ctx.textAlign = 'center';
          ctx.fillStyle = p.color; ctx.font = `800 ${Math.max(12, h * .1)}px system-ui,sans-serif`; ctx.fillText(it.time || '', x, y - h * .14);
          ctx.fillStyle = p.textColor; ctx.font = `500 ${Math.max(11, h * .078)}px system-ui,sans-serif`;
          U.wrapLines(ctx, it.label || '', w * .18).slice(0, 2).forEach((ln, k) => ctx.fillText(ln, x, y + h * .18 + k * h * .1));
          ctx.textAlign = 'left';
          ctx.globalAlpha /= (reveal || 1);
        });
      } else {
        const x = w * .18;
        ctx.beginPath(); ctx.moveTo(x, h * .04); ctx.lineTo(x, h * (.04 + .92 * prog)); ctx.stroke();
        items.forEach((it, i) => {
          const y = h * (.06 + (.88 / (n - 1 || 1)) * i);
          const reveal = U.clamp((prog - i / n * .4) * 2.2, 0, 1);
          ctx.globalAlpha *= reveal;
          ctx.beginPath(); ctx.arc(x, y, Math.min(w, h) * .022, 0, TAU); ctx.fillStyle = p.color; ctx.fill();
          ctx.fillStyle = p.color; ctx.font = `800 ${Math.max(12, h * .1)}px system-ui,sans-serif`; ctx.fillText(it.time || '', x + w * .05, y + h * .03);
          ctx.fillStyle = p.textColor; ctx.font = `500 ${Math.max(11, h * .078)}px system-ui,sans-serif`; ctx.fillText(it.label || '', x + w * .2, y + h * .03);
          ctx.globalAlpha /= (reveal || 1);
        });
      }
    },
    code(ctx, el, w, h) {
      const p = el.props, size = p.fontSize || 20, pad = size * 1.1;
      ctx.fillStyle = p.bg; rr(ctx, 0, 0, w, h, p.radius || 14); ctx.fill();
      if (p.title) {
        ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(ctx, 0, 0, w, size * 2.2, p.radius || 14); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `600 ${size * .92}px ui-monospace,monospace`;
        ctx.fillText(p.title, pad * .9, size * 1.5);
        ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(w - pad * .9 - i * size * 1.1, size * 1.1, size * .32, 0, TAU); ctx.fill(); });
      }
      ctx.font = `${size}px ui-monospace,Menlo,monospace`;
      ctx.textBaseline = 'alphabetic';
      const startY = (p.title ? size * 2.2 : 0) + size * 1.4;
      const maxLines = Math.floor((h - startY) / (size * 1.5));
      String(p.code || '').split('\n').slice(0, maxLines).forEach((ln, i) => {
        let x = pad * .9;
        const y = startY + i * size * 1.5;
        const toks = ln.split(/(\s+|[(){}\[\],;.])/);
        toks.forEach(tk => {
          let color = p.color;
          if (/^\/\//.test(tk) || /^\s*#/.test(tk)) color = '#6b7a8f';
          else if (/^(function|const|let|var|return|if|else|for|while|new|class|import|from|export|await|async)$/.test(tk)) color = '#ff7b72';
          else if (/^["'`]/.test(tk)) color = '#a5d6ff';
          else if (/^\d+$/.test(tk)) color = '#79c0ff';
          else if (/^(true|false|null|undefined)$/.test(tk)) color = '#ffa657';
          ctx.fillStyle = color; ctx.fillText(tk, x, y); x += ctx.measureText(tk).width;
        });
      });
    },
    quote(ctx, el, w, h) {
      const p = el.props;
      ctx.fillStyle = U.rgba(p.accent, .9); ctx.font = `800 ${h * .34}px Georgia,serif`; ctx.fillText('“', 0, h * .34);
      ctx.fillStyle = p.color; ctx.font = `500 ${Math.max(14, h * .16)}px system-ui,sans-serif`;
      const lines = U.wrapLines(ctx, p.text, w - h * .12);
      const lh = Math.max(14, h * .16) * 1.4;
      lines.forEach((ln, i) => ctx.fillText(ln, h * .12, h * .36 + lh * i));
      ctx.fillStyle = p.authorColor; ctx.font = `700 ${Math.max(11, h * .1)}px system-ui,sans-serif`;
      ctx.fillText('— ' + (p.author || ''), h * .12, h * .36 + lh * lines.length + h * .08);
    }
  };

  function measureSpaced(ctx, text, ls) { let w = 0; for (const ch of text) w += ctx.measureText(ch).width + ls; return w - ls; }
  /** shrink a font size until the text fits on one line inside maxW (never below 8px) */
  function fitOneLine(ctx, text, maxW, size, weight, family) {
    let s = size;
    for (let i = 0; i < 120; i++) {
      ctx.font = `${weight || 700} ${s}px ${family || 'system-ui,sans-serif'}`;
      if (ctx.measureText(text).width <= maxW || s <= 8) break;
      s = Math.max(8, s - Math.max(1, s * .05));
    }
    ctx.font = `${weight || 700} ${s}px ${family || 'system-ui,sans-serif'}`;
    return s;
  }

  /* ---------------- charts ---------------- */
  function chartBar(ctx, b, data, p, prog) {
    const max = Math.max(1, ...data.map(d => +d.value || 0));
    const n = Math.max(1, data.length), gap = b.w / n, bw = gap * .58;
    const colors = p.colors && p.colors.length ? p.colors : S.PALETTE_SERIES;
    const baseY = b.y + b.h - (p.showLabels ? b.h * .12 : 0);
    if (p.showGrid) { ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; for (let i = 0; i <= 4; i++) { const y = b.y + b.h * (i / 4) - (p.showLabels ? b.h * .12 : 0); ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); } }
    const availH = baseY - b.y;
    data.forEach((d, i) => {
      const stagger = U.clamp((prog - i / n * .35) * 2, 0, 1);
      const v = (+d.value || 0) / max * stagger;
      const bh = availH * v, x = b.x + gap * i + (gap - bw) / 2, y = baseY - bh;
      const c = colors[i % colors.length];
      const grad = ctx.createLinearGradient(0, y, 0, baseY); grad.addColorStop(0, c); grad.addColorStop(1, U.shade(c, -.28));
      ctx.fillStyle = grad; rr(ctx, x, y, bw, Math.max(0, bh), Math.min(10, bw * .16)); ctx.fill();
      if (p.showValues && stagger > .85) { ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.font = `700 ${Math.max(10, b.h * .07)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillText(fmtVal(d.value) + (p.valueSuffix || ''), x + bw / 2, y - b.h * .03); ctx.textAlign = 'left'; }
      if (p.showLabels) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `500 ${Math.max(10, b.h * .065)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillText(d.label || '', x + bw / 2, baseY + b.h * .09); ctx.textAlign = 'left'; }
    });
  }
  function chartHBar(ctx, b, data, p, prog) {
    const max = Math.max(1, ...data.map(d => +d.value || 0));
    const n = Math.max(1, data.length), gap = b.h / n, bh = gap * .55;
    const colors = p.colors && p.colors.length ? p.colors : S.PALETTE_SERIES;
    const labelW = p.showLabels ? b.w * .2 : 0;
    data.forEach((d, i) => {
      const stagger = U.clamp((prog - i / n * .35) * 2, 0, 1);
      const bw = (b.w - labelW) * ((+d.value || 0) / max) * stagger;
      const y = b.y + gap * i + (gap - bh) / 2;
      const c = colors[i % colors.length];
      ctx.fillStyle = labelW ? 'rgba(255,255,255,.55)' : 'transparent';
      if (labelW) { ctx.font = `600 ${Math.max(10, b.h * .07)}px system-ui,sans-serif`; ctx.fillText(d.label || '', b.x, y + bh * .72); }
      ctx.fillStyle = c; rr(ctx, b.x + labelW, y, Math.max(0, bw), bh, Math.min(8, bh / 2)); ctx.fill();
      if (p.showValues && stagger > .85) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `700 ${Math.max(10, b.h * .07)}px system-ui,sans-serif`; ctx.fillText(fmtVal(d.value) + (p.valueSuffix || ''), b.x + labelW + bw + 8, y + bh * .72); }
    });
  }
  function chartLine(ctx, b, data, p, prog, area) {
    const max = Math.max(1, ...data.map(d => +d.value || 0)) * 1.15;
    const n = Math.max(2, data.length);
    const step = b.w / (n - 1);
    const pts = data.map((d, i) => ({ x: b.x + step * i, y: b.y + b.h - b.h * ((+d.value || 0) / max), v: +d.value || 0, l: d.label }));
    if (p.showGrid) { ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; for (let i = 0; i <= 4; i++) { const y = b.y + b.h * (i / 4); ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); } }
    const c = (p.colors && p.colors[0]) || '#6c5ce7';
    const shown = Math.max(1, Math.floor((n - 1) * prog) + 1);
    ctx.beginPath();
    pts.slice(0, shown).forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
    if (area) {
      const lastPt = pts[shown - 1];
      ctx.lineTo(lastPt.x, b.y + b.h); ctx.lineTo(pts[0].x, b.y + b.h); ctx.closePath();
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, U.rgba(c, .45)); g.addColorStop(1, U.rgba(c, 0));
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); pts.slice(0, shown).forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
    }
    ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, b.h * .012); ctx.lineJoin = 'round'; ctx.stroke();
    pts.slice(0, shown).forEach((pt, i) => {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(3, b.h * .012), 0, TAU); ctx.fillStyle = c; ctx.fill();
      ctx.strokeStyle = '#0b0b1c'; ctx.lineWidth = 2; ctx.stroke();
      if (p.showLabels) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = `500 ${Math.max(9, b.h * .06)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillText(pt.l || '', pt.x, b.y + b.h + b.h * .1); ctx.textAlign = 'left'; }
    });
  }
  function chartPie(ctx, b, data, p, prog, donut) {
    const total = data.reduce((a, d) => a + (+d.value || 0), 0) || 1;
    const colors = p.colors && p.colors.length ? p.colors : S.PALETTE_SERIES;
    const cx = b.x + b.w * (p.showLabels ? .36 : .5), cy = b.y + b.h / 2;
    const R = Math.min(b.w * (p.showLabels ? .34 : .45), b.h * .46), r0 = donut ? R * .58 : 0;
    let a0 = -Math.PI / 2;
    data.forEach((d, i) => {
      const frac = (+d.value || 0) / total;
      const sweep = frac * TAU * prog;
      const c = colors[i % colors.length];
      ctx.beginPath();
      if (donut) { ctx.arc(cx, cy, R, a0, a0 + sweep); ctx.arc(cx, cy, r0, a0 + sweep, a0, true); }
      else { ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + sweep); }
      ctx.closePath(); ctx.fillStyle = c; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = Math.max(1, R * .03); ctx.stroke();
      a0 += frac * TAU;
    });
    if (donut) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = `800 ${R * .42}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.round(prog * 100) + '%', cx, cy); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
    if (p.showLabels) {
      let ly = cy - (data.length * (b.h * .11)) / 2;
      data.forEach((d, i) => {
        const c = colors[i % colors.length];
        ctx.fillStyle = c; rr(ctx, b.x + b.w * .66, ly + b.h * .02, b.h * .045, b.h * .045, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `600 ${Math.max(10, b.h * .07)}px system-ui,sans-serif`;
        ctx.fillText(`${d.label || ''}  ${fmtVal(d.value)}`, b.x + b.w * .66 + b.h * .08, ly + b.h * .06);
        ly += b.h * .11;
      });
    }
  }
  function chartRadar(ctx, b, data, p, prog) {
    const n = Math.max(3, data.length), cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h) * .44;
    const c = (p.colors && p.colors[0]) || '#6c5ce7';
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * TAU, rr2 = R * ring / 4; const x = cx + Math.cos(a) * rr2, y = cy + Math.sin(a) * rr2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.beginPath();
    data.forEach((d, i) => { const a = -Math.PI / 2 + i / n * TAU; const rr2 = R * (U.clamp(+d.value || 0, 0, 100) / 100) * prog; const x = cx + Math.cos(a) * rr2, y = cy + Math.sin(a) * rr2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath(); ctx.fillStyle = U.rgba(c, .3); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
    if (p.showLabels) data.forEach((d, i) => { const a = -Math.PI / 2 + i / n * TAU; ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = `600 ${Math.max(10, b.h * .06)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillText(d.label || '', cx + Math.cos(a) * (R + b.h * .09), cy + Math.sin(a) * (R + b.h * .09)); ctx.textAlign = 'left'; });
  }
  const fmtVal = (v) => { v = +v || 0; return Math.abs(v) >= 1000 ? (Math.round(v / 100) / 10) + 'k' : (Math.round(v * 100) / 100); };

  /* ---------------- scene frame ---------------- */
  function frame(ctx, project, scene, tMs, opts) {
    opts = opts || {};
    const d = opts.W && opts.H ? { w: opts.W, h: opts.H } : (project ? (function () { const a = S.ASPECTS[project.settings.aspect] || S.ASPECTS['16:9']; return { w: a.w, h: a.h }; })() : { w: 1920, h: 1080 });
    const dur = scene.durationMs || 4000;
    const accent = (project && project.settings.accent) || '#6c5ce7';
    ctx.save();
    L.drawBackground(ctx, scene.background, d.w, d.h, tMs, accent);
    (scene.elements || []).forEach(e => drawElement(ctx, e, tMs, dur, accent, opts.quality));
    ctx.restore();
  }

  /** full renderer used by editor + preview: scene with transition from previous scene */
  function renderStage(ctx, W, H, pxW, pxH, project, scene, tMsRaw, opts) {
    if (!scene) return;
    const d = { w: W, h: H };
    const sc = Math.min(pxW / W, pxH / H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pxW, pxH);
    ctx.save();
    ctx.translate((pxW - W * sc) / 2, (pxH - H * sc) / 2);
    ctx.scale(sc, sc);
    const idx = project.scenes.indexOf(scene);
    const tt = project.settings.transitionMs;
    if (idx > 0 && tMsRaw < (scene.transitionMs || tt) && scene.transition !== 'none') {
      const prev = project.scenes[idx - 1];
      const p = U.clamp(tMsRaw / Math.max(1, (scene.transitionMs || tt)), 0, 1);
      const e = U.ease.inOutCubic(p);
      ctx.save(); frame(ctx, project, prev, prev.durationMs, opts); ctx.restore();
      ctx.save();
      applyTransition(ctx, scene.transition || 'fade', e, d, scene);
      frame(ctx, project, scene, tMsRaw, opts);
      ctx.restore();
    } else {
      frame(ctx, project, scene, tMsRaw, opts);
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function applyTransition(ctx, kind, e, d, scene) {
    switch (kind) {
      case 'fade': ctx.globalAlpha *= e; break;
      case 'slideLeft': ctx.globalAlpha *= Math.min(1, e * 1.6); ctx.translate((1 - e) * d.w, 0); break;
      case 'slideRight': ctx.globalAlpha *= Math.min(1, e * 1.6); ctx.translate(-(1 - e) * d.w, 0); break;
      case 'slideUp': ctx.globalAlpha *= Math.min(1, e * 1.6); ctx.translate(0, (1 - e) * d.h); break;
      case 'slideDown': ctx.globalAlpha *= Math.min(1, e * 1.6); ctx.translate(0, -(1 - e) * d.h); break;
      case 'zoom': ctx.globalAlpha *= e; const s = 1.12 - .12 * e; ctx.translate(d.w / 2, d.h / 2); ctx.scale(s, s); ctx.translate(-d.w / 2, -d.h / 2); break;
      case 'wipe': ctx.beginPath(); ctx.rect(0, 0, d.w * e, d.h); ctx.clip(); break;
      case 'wipeUp': ctx.beginPath(); ctx.rect(0, d.h - d.h * e, d.w, d.h * e); ctx.clip(); break;
      default: ctx.globalAlpha *= e;
    }
  }

  /* ---------------- thumbnails ---------------- */
  function thumb(canvas, project, scene, W, H) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(2, Math.round(W * dpr)); canvas.height = Math.max(2, Math.round(H * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = Math.min(W / project_settings_W(project), H / project_settings_H(project));
    ctx.save();
    ctx.translate((W - project_settings_W(project) * s) / 2, (H - project_settings_H(project) * s) / 2);
    ctx.scale(s, s);
    const tMid = Math.min((scene.durationMs || 4000) * .5, maxInEnd(scene));
    frame(ctx, project, scene, tMid, {});
    ctx.restore();
  }
  function project_settings_W(p) { return (S.ASPECTS[p.settings.aspect] || S.ASPECTS['16:9']).w; }
  function project_settings_H(p) { return (S.ASPECTS[p.settings.aspect] || S.ASPECTS['16:9']).h; }
  function maxInEnd(scene) {
    let m = 0; (scene.elements || []).forEach(e => { const a = e.anim && e.anim.in; if (a && a.preset !== 'none') m = Math.max(m, (a.delay || 0) + (a.dur || 600) + 40); });
    return Math.max(300, m);
  }

  let _redrawPending = false;
  function requestRedraw(fn) { _redrawPending = true; (IS.render._cb || (() => { }))(); }

  IS.render = { frame, renderStage, thumb, drawElement, drawBackground: L.drawBackground, animState, getImage, preload, requestRedraw, rr, fmtVal, effectiveGeom: (el, t) => S.effectiveGeom(el, t) };
})(window.IS = window.IS || {});
