/* ============================================================
   InfoStudio Pro — editor.js
   Stage management, pointer interactions (select / move /
   resize / rotate / marquee / create tools), snapping and the
   overlay layer (guides, handles, safe areas, grid).
   ============================================================ */
(function (IS) {
  'use strict';
  const U = IS.util, S = IS.store, R = IS.render, L = IS.library;

  const E = {
    stage: null, overlay: null, holder: null, area: null,
    scale: 1, offX: 0, offY: 0, dpr: 1,
    tool: 'select',
    zoomMode: 'fit',
    drag: null,
    marquee: null,
    guides: [],
    snapPx: 7,
    drawingPath: null
  };

  const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  /* ---------------- sizing ---------------- */
  function designScale() {
    const d = S.design(), area = E.area.getBoundingClientRect();
    const pad = 28;
    const availW = Math.max(80, area.width - pad * 2), availH = Math.max(80, area.height - pad * 2);
    const fit = Math.min(availW / d.w, availH / d.h);
    if (E.zoomMode === 'fit') return fit;
    return Math.max(.05, parseFloat(E.zoomMode) || fit);
  }

  function layout() {
    const d = S.design();
    E.scale = designScale();
    const cssW = Math.round(d.w * E.scale), cssH = Math.round(d.h * E.scale);
    E.dpr = Math.min(window.devicePixelRatio || 1, 2);
    E.holder.style.width = cssW + 'px'; E.holder.style.height = cssH + 'px';
    [E.stage, E.overlay].forEach(c => { c.width = Math.round(cssW * E.dpr); c.height = Math.round(cssH * E.dpr); c.style.width = cssW + 'px'; c.style.height = cssH + 'px'; });
    redraw();
    redrawOverlay();
    const zi = document.getElementById('zoomInfo'); if (zi) zi.textContent = Math.round(E.scale * 100) + '%';
    const si = document.getElementById('sizeInfo'); if (si) si.textContent = d.w + ' × ' + d.h;
  }

  function toDesign(clientX, clientY) {
    const r = E.overlay.getBoundingClientRect();
    return { x: (clientX - r.left) / E.scale, y: (clientY - r.top) / E.scale };
  }

  /* ---------------- drawing ---------------- */
  function redraw() {
    const sc = S.scene(); if (!sc) return;
    const d = S.design();
    R.renderStage(E.stage.getContext('2d'), d.w, d.h, E.stage.width, E.stage.height, S.project, sc, S.runtime.t, { quality: 1 });
  }

  function redrawOverlay() {
    const ctx = E.overlay.getContext('2d');
    ctx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0);
    const W = E.overlay.width / E.dpr, H = E.overlay.height / E.dpr;
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.scale(E.scale, E.scale);
    const d = S.design();
    if (S.prefs.grid && !S.runtime.playing) {
      ctx.strokeStyle = 'rgba(128,128,180,.10)'; ctx.lineWidth = 1 / E.scale;
      const g = S.prefs.grid;
      for (let x = g; x < d.w; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, d.h); ctx.stroke(); }
      for (let y = g; y < d.h; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(d.w, y); ctx.stroke(); }
    }
    if (S.prefs.guides && !S.runtime.playing) {
      ctx.strokeStyle = 'rgba(0,206,201,.28)'; ctx.setLineDash([10 / E.scale, 8 / E.scale]); ctx.lineWidth = 1.4 / E.scale;
      const safe = .05;
      ctx.strokeRect(d.w * safe, d.h * safe, d.w * (1 - safe * 2), d.h * (1 - safe * 2));
      ctx.setLineDash([]);
    }
    if (!S.runtime.playing) {
      S.selected().forEach(el => drawSelection(ctx, el, el === S.selected()[S.selected().length - 1] && S.sel.ids.length === 1));
      E.guides.forEach(g => {
        ctx.strokeStyle = '#fd79a8'; ctx.lineWidth = 1.4 / E.scale;
        ctx.beginPath(); ctx.moveTo(g.x, 0); ctx.lineTo(g.x, d.h); ctx.stroke();
      });
      E.guides.filter(g => g.y != null).forEach(g => {
        ctx.strokeStyle = '#fd79a8'; ctx.lineWidth = 1.4 / E.scale;
        ctx.beginPath(); ctx.moveTo(0, g.y); ctx.lineTo(d.w, g.y); ctx.stroke();
      });
    }
    if (E.marquee) {
      ctx.strokeStyle = '#6c5ce7'; ctx.fillStyle = 'rgba(108,92,231,.15)'; ctx.lineWidth = 1.4 / E.scale;
      ctx.fillRect(E.marquee.x, E.marquee.y, E.marquee.w, E.marquee.h);
      ctx.strokeRect(E.marquee.x, E.marquee.y, E.marquee.w, E.marquee.h);
    }
    ctx.restore();
  }

  function drawSelection(ctx, el, showHandles) {
    const d = S.design();
    ctx.save();
    ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
    ctx.rotate((el.rotation || 0) * Math.PI / 180);
    ctx.strokeStyle = el.locked ? '#fdcb6e' : '#6c5ce7';
    ctx.lineWidth = 1.6 / E.scale;
    ctx.setLineDash(el.locked ? [6 / E.scale, 4 / E.scale] : []);
    ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);
    ctx.setLineDash([]);
    if (showHandles && !el.locked) {
      const hs = 9 / E.scale;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#6c5ce7'; ctx.lineWidth = 1.6 / E.scale;
      handlePoints(el).forEach(p => { ctx.beginPath(); ctx.rect(p.x - hs / 2, p.y - hs / 2, hs, hs); ctx.fill(); ctx.stroke(); });
      const rp = rotatePoint(el);
      ctx.beginPath(); ctx.moveTo(0, -el.h / 2); ctx.lineTo(rp.x, rp.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(rp.x, rp.y, hs * .62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function handlePoints(el) {
    const x = -el.w / 2, y = -el.h / 2, w = el.w, h = el.h;
    return [
      { k: 'nw', x, y }, { k: 'n', x: x + w / 2, y }, { k: 'ne', x: x + w, y },
      { k: 'e', x: x + w, y: y + h / 2 }, { k: 'se', x: x + w, y: y + h }, { k: 's', x: x + w / 2, y: y + h },
      { k: 'sw', x, y: y + h }, { k: 'w', x, y: y + h / 2 }
    ];
  }
  function rotatePoint(el) { return { x: 0, y: -el.h / 2 - 34 / E.scale }; }

  function localPoint(el, p) {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    const a = -(el.rotation || 0) * Math.PI / 180;
    const dx = p.x - cx, dy = p.y - cy;
    return { x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) };
  }

  /* ---------------- hit testing ---------------- */
  function hitElement(p) {
    const list = S.scene().elements;
    for (let i = list.length - 1; i >= 0; i--) {
      const el = list[i]; if (!el.visible) continue;
      const lp = localPoint(el, p);
      if (lp.x >= el.x && lp.x <= el.x + el.w && lp.y >= el.y && lp.y <= el.y + el.h) return el;
    }
    return null;
  }
  function hitHandle(el, p) {
    if (!el || el.locked) return null;
    const scale = E.scale, tol = 11 / scale;
    const lp = localPoint(el, p);
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    const pts = handlePoints(el).map(h => ({ k: h.k, x: cx + h.x, y: cy + h.y }));
    // rotate in place: handlePoints are in local rotated space
    for (const h of handlePoints(el)) {
      const a = (el.rotation || 0) * Math.PI / 180;
      const hx = cx + h.x * Math.cos(a) - h.y * Math.sin(a);
      const hy = cy + h.x * Math.sin(a) + h.y * Math.cos(a);
      if (Math.hypot(lp.x - hx, lp.y - hy) < tol) return h.k;
    }
    const ra = (el.rotation || 0) * Math.PI / 180;
    const rp = rotatePoint(el);
    const rx = cx + rp.x * Math.cos(ra) - rp.y * Math.sin(ra), ry = cy + rp.x * Math.sin(ra) + rp.y * Math.cos(ra);
    if (Math.hypot(lp.x - rx, lp.y - ry) < tol) return 'rot';
    return null;
  }

  /* ---------------- snapping ---------------- */
  function snapBox(box, ignoreId) {
    const d = S.design(), th = E.snapPx / E.scale;
    const targets = { v: [0, d.w / 2, d.w], h: [0, d.h / 2, d.h] };
    S.scene().elements.forEach(e => {
      if (e.id === ignoreId || !e.visible) return;
      targets.v.push(e.x, e.x + e.w / 2, e.x + e.w);
      targets.h.push(e.y, e.y + e.h / 2, e.y + e.h);
    });
    const g = [];
    let dx = 0, dy = 0;
    const cand = [[box.x, 0], [box.x + box.w / 2, 0], [box.x + box.w, 0]];
    let best = null;
    cand.forEach(([v]) => { targets.v.forEach(t => { const dd = t - v; if (Math.abs(dd) < th && (!best || Math.abs(dd) < Math.abs(best.d))) best = { d: dd, t }; }); });
    if (best) { dx = best.d; g.push({ x: best.t }); }
    best = null;
    const candH = [[box.y, 0], [box.y + box.h / 2, 0], [box.y + box.h, 0]];
    candH.forEach(([v]) => { targets.h.forEach(t => { const dd = t - v; if (Math.abs(dd) < th && (!best || Math.abs(dd) < Math.abs(best.d))) best = { d: dd, t }; }); });
    if (best) { dy = best.d; g.push({ y: best.t }); }
    return { dx, dy, guides: g };
  }

  /* ---------------- pointer handling ---------------- */
  function onPointerDown(e) {
    if (S.runtime.playing) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    E.overlay.setPointerCapture && E.overlay.setPointerCapture(e.pointerId);
    const p = toDesign(e.clientX, e.clientY);
    const shift = e.shiftKey, alt = e.altKey;

    if (E.tool === 'text') { createText(p); return; }
    if (E.tool === 'pen') { startPath(p); return; }
    if (E.tool === 'image') { insertImage(p); return; }
    if (TOOLS_CREATE[E.tool]) { startCreate(p); return; }

    // select tool
    const el = hitElement(p);
    const cur = S.selected();
    if (el) {
      if (shift) { S.select([el.id], true); }
      else if (!S.sel.ids.includes(el.id)) S.select([el.id]);
      const handle = cur.length === 1 && S.sel.ids.length === 1 ? hitHandle(S.selected()[0], p) : null;
      if (handle) {
        E.drag = { mode: handle === 'rot' ? 'rotate' : 'resize', handle, start: p, el: U.deep(S.selected()[0]), moved: false };
      } else {
        E.drag = { mode: 'move', start: p, items: S.selected().map(x => ({ id: x.id, x: x.x, y: x.y })), moved: false };
      }
    } else {
      if (!shift) S.select([]);
      E.marquee = { x: p.x, y: p.y, w: 0, h: 0, add: shift };
      E.drag = { mode: 'marquee', start: p };
    }
    redrawOverlay();
  }

  const TOOLS_CREATE = { rect: 'rect', ellipse: 'ellipse', triangle: 'triangle', star: 'star', polygon: 'polygon', line: 'line', arrow: 'arrow', icon: 'icon' };

  function startCreate(p) {
    const t = E.tool;
    const type = (t === 'line' || t === 'arrow') ? 'line' : (t === 'icon' ? 'icon' : 'shape');
    const props = {};
    if (type === 'shape') { props.kind = { rect: 'rect', ellipse: 'ellipse', triangle: 'triangle', star: 'star', polygon: 'polygon' }[t] || 'rect'; props.fill = IS.ui ? IS.ui.currentColor() : '#6c5ce7'; props.fillOn = true; props.stroke = '#ffffff'; props.strokeWidth = 0; props.radius = t === 'rect' ? 16 : 0; props.points = 6; }
    if (type === 'line') { props.color = '#ffffff'; props.thickness = 6; props.style = 'solid'; props.arrow = t === 'arrow' ? 'end' : 'none'; props.radius = 3; }
    if (type === 'icon') { props.name = 'sparkle'; props.color = '#00cec9'; props.bg = '#1c1c3c'; props.bgOn = false; props.radius = 20; }
    E.draft = S.FACTORIES[type]({ x: p.x, y: p.y, w: 1, h: 1, props });
    E.drag = { mode: 'create', start: p, type };
  }

  function createText(p) {
    const d = S.design();
    const el = S.FACTORIES.text({ x: Math.round(p.x), y: Math.round(p.y), w: Math.round(Math.min(d.w * .6, 760)), h: Math.round(d.h * .12), props: { text: 'Escribe tu texto', size: Math.round(d.h * .05), weight: 800, color: '#ffffff', align: 'left', lineHeight: 1.18, family: 'Inter, system-ui, sans-serif', letterSpacing: 0, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 } });
    S.addElement(el);
    setTool('select');
    IS.ui && IS.ui.focusTextEditor();
  }

  function insertImage(p) {
    U.pickFile('image/*').then(f => {
      if (!f) return;
      U.readAsDataURL(f).then(src => {
        const d = S.design();
        const img = new Image();
        img.onload = () => {
          let w = Math.min(d.w * .42, 700), h = w * (img.naturalHeight / img.naturalWidth);
          if (h > d.h * .6) { h = d.h * .6; w = h * (img.naturalWidth / img.naturalHeight); }
          const el = S.FACTORIES.image({ x: Math.round(p.x - w / 2), y: Math.round(p.y - h / 2), w: Math.round(w), h: Math.round(h), props: { src, fit: 'cover', radius: 18, shadow: true, frame: '#ffffff', frameWidth: 0 } });
          S.addElement(el);
        };
        img.src = src;
      });
    });
  }

  function startPath(p) {
    E.drawingPath = [{ x: p.x, y: p.y }];
    E.drag = { mode: 'path', start: p };
  }

  function onPointerMove(e) {
    const p = toDesign(e.clientX, e.clientY);
    const info = document.getElementById('coordInfo'); if (info) info.textContent = Math.round(p.x) + ', ' + Math.round(p.y);
    if (!E.drag) return;
    const d = E.drag;
    if (d.mode === 'create') {
      const box = normBox(d.start, p, e.shiftKey);
      Object.assign(E.draft, box);
      E.draft.h = d.type === 'line' ? 0 : box.h;
      if (d.type === 'line') { const len = Math.hypot(p.x - d.start.x, p.y - d.start.y); E.draft.x = d.start.x; E.draft.y = d.start.y; E.draft.w = len; E.draft.h = 0; E.draft.rotation = Math.atan2(p.y - d.start.y, p.x - d.start.x) * 180 / Math.PI; }
      E.draftPreview = true; drawDraft(); return;
    }
    if (d.mode === 'path') {
      E.drawingPath.push({ x: p.x, y: p.y });
      drawDraft(); return;
    }
    if (d.mode === 'move') {
      let dx = p.x - d.start.x, dy = p.y - d.start.y;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      const anchor = S.elementById(d.items[0].id);
      if (S.prefs.snap && anchor) {
        const first = d.items[0];
        const s = snapBox({ x: first.x + dx, y: first.y + dy, w: anchor.w, h: anchor.h }, anchor.id);
        dx += s.dx; dy += s.dy; E.guides = s.guides;
      } else E.guides = [];
      S.sel.ids.forEach(id => {
        const it = d.items.find(x => x.id === id); const el = S.elementById(id); if (!it || !el) return;
        el.x = it.x + dx; el.y = it.y + dy;
      });
      d.moved = true; S.autosave(); redraw(); redrawOverlay(); return;
    }
    if (d.mode === 'resize') {
      const el = S.elementById(S.sel.ids[0]); if (!el) return;
      const o = d.el;
      const a = (o.rotation || 0) * Math.PI / 180;
      let dx = p.x - d.start.x, dy = p.y - d.start.y;
      const cdx = dx * Math.cos(-a) - dy * Math.sin(-a), cdy = dx * Math.sin(-a) + dy * Math.cos(-a);
      let x = o.x, y = o.y, w = o.w, h = o.h;
      const hd = d.handle;
      if (hd.includes('e')) w = o.w + cdx;
      if (hd.includes('s')) h = o.h + cdy;
      if (hd.includes('w')) { w = o.w - cdx; x = o.x + cdx; }
      if (hd.includes('n')) { h = o.h - cdy; y = o.y + cdy; }
      if (e.shiftKey && hd.length === 2) { const r = o.w / o.h; if (w / h > r) w = h * r; else h = w / r; if (hd.includes('w')) x = o.x + (o.w - w); if (hd.includes('n')) y = o.y + (o.h - h); }
      w = Math.max(8, w); h = Math.max(el.type === 'line' ? 0 : 8, h);
      el.x = Math.round(x); el.y = Math.round(y); el.w = Math.round(w); el.h = Math.round(h);
      d.moved = true; S.autosave(); redraw(); redrawOverlay(); return;
    }
    if (d.mode === 'rotate') {
      const el = S.elementById(S.sel.ids[0]); if (!el) return;
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
      let ang = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
      if (e.shiftKey) ang = Math.round(ang / 15) * 15;
      el.rotation = Math.round(ang);
      d.moved = true; redraw(); redrawOverlay(); return;
    }
    if (d.mode === 'marquee') {
      const b = normBox(d.start, p, false);
      E.marquee = b;
      const ids = S.scene().elements.filter(el => el.visible && !el.locked && intersects(el, b)).map(el => el.id);
      S.sel.ids = d.add ? Array.from(new Set(d.marqueeBase || []).concat(ids)) : ids;
      redrawOverlay(); return;
    }
  }

  function onPointerUp(e) {
    const d = E.drag; E.drag = null;
    if (!d) return;
    const p = toDesign(e.clientX, e.clientY);
    if (d.mode === 'create' && E.draft) {
      const el = E.draft; E.draft = null;
      if (el.type === 'line') {
        if (el.w < 6) { el.w = 300; el.rotation = 0; }
      } else if (el.w < 12 || el.h < 12) {
        const t = { rect: [360, 220], ellipse: [300, 300], triangle: [320, 280], star: [300, 300], polygon: [300, 300], icon: [160, 160] }[d.type] || [360, 220];
        el.w = t[0]; el.h = t[1];
      }
      S.addElement(el);
      setTool('select');
      return;
    }
    if (d.mode === 'path' && E.drawingPath) {
      const pts = E.drawingPath; E.drawingPath = null;
      if (pts.length > 2) {
        const xs = pts.map(q => q.x), ys = pts.map(q => q.y);
        const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
        const w = Math.max(4, x1 - x0), h = Math.max(4, y1 - y0);
        const rel = pts.map(q => ({ x: (q.x - x0) / w, y: (q.y - y0) / h }));
        const el = S.FACTORIES.shape({ x: Math.round(x0), y: Math.round(y0), w: Math.round(w), h: Math.round(h), props: { kind: 'path', points: rel, fill: '#00cec9', fillOn: false, stroke: '#00cec9', strokeWidth: 8, radius: 0 } });
        S.addElement(el);
        setTool('select');
      }
    }
    if (d.mode === 'marquee') { E.marquee = null; redrawOverlay(); }
    if (d.mode === 'move' && !d.moved) { /* click select only */ }
    if (d.mode === 'move' && d.moved) S.pushHistory('mover');
    if (d.mode === 'resize' && d.moved) S.pushHistory('redimensionar');
    if (d.mode === 'rotate' && d.moved) S.pushHistory('rotar');
    E.guides = []; redraw(); redrawOverlay();
    IS.ui && IS.ui.refreshInspectorValues();
  }

  function drawDraft() {
    if (!E.draft && !E.drawingPath) return;
    redraw();
    const ctx = E.overlay.getContext('2d');
    ctx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0);
    ctx.clearRect(0, 0, E.overlay.width / E.dpr, E.overlay.height / E.dpr);
    ctx.save(); ctx.scale(E.scale, E.scale);
    const d = S.design();
    if (E.draft) R.drawElement(ctx, E.draft, 999999, 999999, '#6c5ce7', 1);
    if (E.drawingPath) {
      ctx.beginPath(); E.drawingPath.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y));
      ctx.strokeStyle = IS.ui ? IS.ui.currentColor() : '#00cec9'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
    ctx.restore();
  }

  function normBox(a, b, square) {
    let w = b.x - a.x, h = b.y - a.y;
    if (square) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w) * m; h = Math.sign(h) * m; }
    return { x: Math.min(a.x, a.x + w), y: Math.min(a.y, a.y + h), w: Math.abs(w), h: Math.abs(h) };
  }
  function intersects(el, b) { return !(el.x > b.x + b.w || el.x + el.w < b.x || el.y > b.y + b.h || el.y + el.h < b.y); }

  /* ---------------- tools ---------------- */
  function setTool(t) {
    E.tool = t;
    const cursors = { select: 'default', text: 'text', pen: 'crosshair', image: 'copy' };
    E.overlay.style.cursor = cursors[t] || 'crosshair';
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  }

  /* ---------------- playback ---------------- */
  let raf = null, last = 0;
  function play() {
    if (S.runtime.playing) return;
    S.runtime.playing = true;
    const dur = S.scene().durationMs || 4000;
    const settle = S.settleTime();
    // if the playhead sits at the static editing position, replay the entrance animations
    if (Math.abs(S.runtime.t - settle) < 8 || S.runtime.t >= dur - 20) S.runtime.t = 0;
    last = performance.now();
    IS.ui && IS.ui.setPlaying(true);
    const step = (now) => {
      if (!S.runtime.playing) return;
      const dt = now - last; last = now;
      S.runtime.t += dt;
      const dur = S.scene().durationMs || 4000;
      if (S.runtime.t >= dur) {
        const idx = S.project.scenes.indexOf(S.scene());
        if (S.runtime.wholeVideo) {
          if (idx < S.project.scenes.length - 1) { S.setSceneQuiet(S.project.scenes[idx + 1].id); S.runtime.t = 0; }
          else { if (S.runtime.loop) { S.setSceneQuiet(S.project.scenes[0].id); S.runtime.t = 0; } else { pause(); } }
        } else if (S.runtime.loop) { S.runtime.t = 0; }
        else { S.runtime.t = dur; pause(); }
      }
      redraw();
      IS.ui && IS.ui.updateTransport();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function pause() { S.runtime.playing = false; if (raf) cancelAnimationFrame(raf); raf = null; IS.ui && IS.ui.setPlaying(false); redrawOverlay(); }
  function toggle() { S.runtime.playing ? pause() : play(); }
  function seek(t) { S.runtime.t = U.clamp(t, 0, S.scene().durationMs || 4000); redraw(); IS.ui && IS.ui.updateTransport(); }

  function init() {
    E.stage = document.getElementById('stageCanvas');
    E.overlay = document.getElementById('overlayCanvas');
    E.holder = document.getElementById('stageHolder');
    E.area = document.getElementById('stageArea');

    E.overlay.addEventListener('pointerdown', onPointerDown);
    E.overlay.addEventListener('pointermove', onPointerMove);
    E.overlay.addEventListener('pointerup', onPointerUp);
    E.overlay.addEventListener('pointercancel', onPointerUp);
    E.overlay.addEventListener('dblclick', (e) => {
      const p = toDesign(e.clientX, e.clientY);
      const el = hitElement(p);
      if (el && (el.type === 'text' || el.type === 'badge')) { S.select([el.id]); IS.ui && IS.ui.editTextInline(el); }
    });
    E.area.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const cur = E.scale;
      const next = U.clamp(cur * (e.deltaY < 0 ? 1.1 : .9), .05, 4);
      E.zoomMode = String(next); layout(); IS.ui && IS.ui.syncZoom();
    }, { passive: false });

    const ro = new ResizeObserver(() => layout());
    ro.observe(E.area);
    layout();
  }

  IS.editor = { init, layout, redraw, redrawOverlay, setTool, play, pause, toggle, seek, toDesign, zoomMode: () => E.zoomMode, setZoom: (z) => { E.zoomMode = z; layout(); }, scale: () => E.scale, hitElement, drawSelection };
})(window.IS = window.IS || {});
