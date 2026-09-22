/* ============================================================
   InfoStudio Pro — store.js
   Single source of truth: project model, selection, history,
   persistence (localStorage) and import/export of projects.
   ============================================================ */
(function (IS) {
  'use strict';
  const U = IS.util;

  const PROJECT_VERSION = 3;
  const LS_KEY = 'infostudio.project.v3';
  const PREFS_KEY = 'infostudio.prefs.v1';

  const ASPECTS = {
    '16:9': { w: 1920, h: 1080, label: '16:9 Horizontal' },
    '9:16': { w: 1080, h: 1920, label: '9:16 Vertical / Reels' },
    '1:1':  { w: 1080, h: 1080, label: '1:1 Cuadrado' },
    '4:5':  { w: 1080, h: 1350, label: '4:5 Feed' },
    '4:3':  { w: 1440, h: 1080, label: '4:3 Presentación' }
  };

  const PALETTE = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#00b894', '#0984e3', '#d63031', '#a855f7', '#e17055', '#636e72', '#ffffff', '#111122'];
  const PALETTE_SERIES = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#00b894', '#0984e3', '#a855f7', '#e17055'];

  /* ---------------- element factories ---------------- */
  const BASE = () => ({
    id: U.uid('el'), name: '', x: 0, y: 0, w: 400, h: 200, rotation: 0,
    opacity: 1, locked: false, visible: true,
    anim: { in: { preset: 'fade', dur: 600, delay: 0, easing: 'outCubic' }, out: { preset: 'none', dur: 400, easing: 'inOutCubic' } }
  });

  function factory(type, o) { return Object.assign(BASE(), { type }, o || {}); }

  const FACTORIES = {
    text: (o) => factory('text', Object.assign({ w: 760, h: 120, props: { text: 'Escribe tu texto', size: 54, weight: 800, color: '#ffffff', align: 'left', lineHeight: 1.18, family: 'Inter, system-ui, sans-serif', letterSpacing: 0, vAlign: 'top', bg: 'transparent', pad: 0, radius: 0 } }, o)),
    shape: (o) => factory('shape', Object.assign({ w: 300, h: 180, props: { kind: 'rect', fill: '#6c5ce7', fillOn: true, stroke: '#ffffff', strokeWidth: 0, radius: 16, points: 6 } }, o)),
    line: (o) => factory('line', Object.assign({ w: 420, h: 0, props: { color: '#ffffff', thickness: 4, style: 'solid', arrow: 'end', radius: 2 } }, o)),
    icon: (o) => factory('icon', Object.assign({ w: 140, h: 140, props: { name: 'lightbulb', color: '#00cec9', bg: '#1c1c3c', bgOn: true, radius: 24, stroke: 2, fill: false } }, o)),
    image: (o) => factory('image', Object.assign({ w: 520, h: 340, props: { src: '', fit: 'cover', radius: 16, shadow: true, frame: '#ffffff', frameWidth: 0 } }, o)),
    stat: (o) => factory('stat', Object.assign({ w: 420, h: 240, props: { value: 87, suffix: '%', prefix: '', label: 'Métrica clave', caption: 'Describe el dato', countUp: true, decimals: 0, valueColor: '#00cec9', labelColor: '#ffffff', captionColor: 'rgba(255,255,255,.6)', bg: '#141432', radius: 20, accentBar: true, align: 'left' } }, o)),
    chart: (o) => factory('chart', Object.assign({ w: 780, h: 460, props: { kind: 'bar', data: [{ label: 'Ene', value: 42 }, { label: 'Feb', value: 61 }, { label: 'Mar', value: 35 }, { label: 'Abr', value: 78 }], colors: PALETTE_SERIES.slice(), title: 'Título del gráfico', showLabels: true, showValues: true, showGrid: true, bg: '#101028', radius: 20, animate: true, angle: 0, legend: false, valueSuffix: '%' } }, o)),
    progress: (o) => factory('progress', Object.assign({ w: 700, h: 90, props: { value: 72, max: 100, label: 'Progreso', color: '#6c5ce7', track: 'rgba(255,255,255,.12)', radius: 14, thickness: 26, showValue: true, align: 'left' } }, o)),
    bullets: (o) => factory('bullets', Object.assign({ w: 700, h: 300, props: { title: '', items: ['Primer punto clave', 'Segundo punto clave', 'Tercer punto clave'], marker: 'check', color: '#ffffff', markerColor: '#00b894', size: 32, gap: 18, lineHeight: 1.35 } }, o)),
    badge: (o) => factory('badge', Object.assign({ w: 240, h: 64, props: { text: 'NUEVO', color: '#ffffff', bg: '#fd79a8', radius: 32, size: 24, weight: 800, letterSpacing: 1 } }, o)),
    callout: (o) => factory('callout', Object.assign({ w: 640, h: 200, props: { variant: 'tip', title: 'Consejo', text: 'Un dato útil para el espectador.', icon: '💡', bg: '#12233a', accent: '#0984e3', textColor: '#ffffff', radius: 18 } }, o)),
    steps: (o) => factory('steps', Object.assign({ w: 900, h: 300, props: { direction: 'h', items: [{ title: 'Paso 1', text: 'Haz esto primero' }, { title: 'Paso 2', text: 'Luego esto' }, { title: 'Paso 3', text: 'Y para terminar' }], color: '#6c5ce7', numberColor: '#ffffff', titleColor: '#ffffff', textColor: 'rgba(255,255,255,.62)', numbered: true, connector: true } }, o)),
    compare: (o) => factory('compare', Object.assign({ w: 900, h: 420, props: { title: '', left: { title: 'Antes', items: ['Sin plantillas', 'Horas de trabajo', 'Resultado irregular'] }, right: { title: 'Después', items: ['Con plantillas', 'Minutos de trabajo', 'Resultado pro'] }, leftColor: '#d63031', rightColor: '#00b894', textColor: '#ffffff', vs: true, bg: '#101028', radius: 18 } }, o)),
    timeline: (o) => factory('timeline', Object.assign({ w: 900, h: 300, props: { orientation: 'h', color: '#6c5ce7', items: [{ time: '2023', label: 'Primer hito' }, { time: '2024', label: 'Segundo hito' }, { time: '2025', label: 'Tercer hito' }], textColor: '#ffffff', lineColor: 'rgba(255,255,255,.25)' } }, o)),
    code: (o) => factory('code', Object.assign({ w: 820, h: 380, props: { title: 'ejemplo.js', code: 'function hello() {\n  return "mundo";\n}', lang: 'js', bg: '#0d1117', color: '#e6edf3', radius: 16, fontSize: 22 } }, o)),
    quote: (o) => factory('quote', Object.assign({ w: 760, h: 240, props: { text: 'Una cita que refuerza tu idea.', author: 'Autor', color: '#ffffff', authorColor: 'rgba(255,255,255,.55)', accent: '#fdcb6e' } }, o))
  };

  /* ---------------- state ---------------- */
  const S = {
    project: null,
    sel: { sceneId: null, ids: [] },
    runtime: { t: 0, playing: false, loop: true, wholeVideo: false, editing: true },
    prefs: { lang: 'es', theme: 'dark', grid: 20, snap: true, guides: true, zoom: 'fit' },
    history: { stack: [], idx: -1, max: 80 },
    _ev: {}
  };

  function defaultProject() {
    const sc = newScene('Escena 1');
    sc.narration = 'Bienvenido a este tutorial.';
    return {
      version: PROJECT_VERSION,
      meta: { title: 'Proyecto sin título', createdAt: Date.now(), updatedAt: Date.now() },
      settings: {
        aspect: '16:9', fps: 30, transition: 'fade', transitionMs: 450,
        bg: '#070714', accent: '#6c5ce7', quality: 1
      },
      scenes: [sc]
    };
  }

  function newScene(name) {
    return {
      id: U.uid('sc'), name: name || 'Escena',
      durationMs: 4500, transition: 'fade', transitionMs: 450,
      background: { kind: 'gradient', color: '#08081a', from: '#141433', to: '#05050f', angle: 135, speed: 1 },
      narration: '', elements: []
    };
  }

  /* ---------------- events ---------------- */
  function on(evt, fn) { (S._ev[evt] = S._ev[evt] || []).push(fn); return () => { S._ev[evt] = S._ev[evt].filter(f => f !== fn); }; }
  function emit(evt, data) { (S._ev[evt] || []).forEach(f => { try { f(data); } catch (e) { console.error('[store]', evt, e); } }); }

  /* ---------------- history ---------------- */
  function snap() { return U.deep(S.project); }
  function pushHistory(label) {
    const st = S.history;
    st.stack = st.stack.slice(0, st.idx + 1);
    st.stack.push({ label: label || 'cambio', data: snap() });
    if (st.stack.length > st.max) st.stack.shift();
    st.idx = st.stack.length - 1;
    emit('history');
  }
  function commit(label, fn) {
    pushHistory(label); if (fn) fn(); touch(); emit('project'); emit('changed', label);
  }
  function undo() {
    const st = S.history;
    if (st.idx <= 0) { U.toast('Nada que deshacer'); return; }
    st.idx--; restore(st.stack[st.idx].data); U.toast('↩ ' + (st.stack[st.idx + 1] ? st.stack[st.idx + 1].label : ''));
  }
  function redo() {
    const st = S.history;
    if (st.idx >= st.stack.length - 1) { U.toast('Nada que rehacer'); return; }
    st.idx++; restore(st.stack[st.idx].data); U.toast('↪ ' + st.stack[st.idx].label);
  }
  function restore(data) {
    S.project = data;
    ensureSelection();
    S.runtime.t = settleTime(scene());
    touch(); emit('project'); emit('selection'); emit('changed', 'restore');
  }
  function canUndo() { return S.history.idx > 0; }
  function canRedo() { return S.history.idx < S.history.stack.length - 1; }

  /* ---------------- helpers ---------------- */
  const scene = () => S.project.scenes.find(s => s.id === S.sel.sceneId) || S.project.scenes[0];
  const sceneById = (id) => S.project.scenes.find(s => s.id === id);
  const sceneIndex = () => S.project.scenes.indexOf(scene());
  const selected = () => scene().elements.filter(e => S.sel.ids.includes(e.id));
  const elementById = (id) => { for (const s of S.project.scenes) { const e = s.elements.find(x => x.id === id); if (e) return e; } return null; };
  const design = () => { const a = ASPECTS[S.project.settings.aspect] || ASPECTS['16:9']; return { w: a.w, h: a.h }; };
  const totalDuration = () => S.project.scenes.reduce((a, s) => a + (s.durationMs || 4000), 0);
  const sceneStart = (idx) => S.project.scenes.slice(0, idx).reduce((a, s) => a + (s.durationMs || 4000), 0);
  /** time at which every entrance animation has finished (static editing position) */
  function settleTime(sc) {
    sc = sc || scene();
    const dur = sc.durationMs || 4000;
    let inEnd = 0, outMax = 0;
    (sc.elements || []).forEach(e => {
      const a = e.anim || {};
      if (a.in && a.in.preset !== 'none') inEnd = Math.max(inEnd, (a.in.delay || 0) + (a.in.dur || 600));
      if (a.out && a.out.preset !== 'none') outMax = Math.max(outMax, a.out.dur || 400);
    });
    return Math.round(U.clamp(Math.max(inEnd + 60, 300), 0, Math.max(200, dur - outMax - 60)));
  }
  function touch() { if (S.project) S.project.meta.updatedAt = Date.now(); }

  function ensureSelection() {
    if (!S.project.scenes.length) S.project.scenes.push(newScene('Escena 1'));
    if (!sceneById(S.sel.sceneId)) S.sel.sceneId = S.project.scenes[0].id;
    const sc = scene();
    S.sel.ids = (S.sel.ids || []).filter(id => sc.elements.some(e => e.id === id));
  }

  /* ---------------- mutations ---------------- */
  function addElement(el, opts) {
    const sc = scene();
    el = ensureGeom(el);
    commit(opts && opts.label || 'añadir ' + el.type, () => {
      sc.elements.push(el);
      S.sel.ids = opts && opts.select === false ? S.sel.ids : [el.id];
      S.runtime.editing = true;
    });
    emit('selection');
    return el;
  }
  function ensureGeom(el) {
    const d = design();
    const num = (v, f) => (Number.isFinite(v) ? v : f);
    // Sanea geometría inválida (null/NaN) antes de decidir tamaños.
    el.w = num(el.w, 400); el.h = num(el.h, 200);
    if (el.w > d.w) el.w = d.w * .7;
    if (el.h > d.h) el.h = d.h * .7;
    if (!Number.isFinite(el.x)) el.x = Math.round((d.w - el.w) / 2);
    if (!Number.isFinite(el.y)) el.y = Math.round((d.h - el.h) / 2);
    return el;
  }
  function addTemplateElements(list) {
    const sc = scene();
    commit('añadir plantilla', () => { list.forEach(e => sc.elements.push(e)); S.sel.ids = list.map(e => e.id); });
    emit('selection');
  }
  function updateElement(id, patch, label) {
    const e = elementById(id); if (!e) return;
    if (patch.props) { e.props = Object.assign({}, e.props, patch.props); delete patch.props; }
    if (patch.anim) { e.anim = Object.assign({}, e.anim, patch.anim); delete patch.anim; }
    Object.assign(e, patch);
    touch();
  }
  function updateSelected(patch, label, noHistory) {
    const list = selected(); if (!list.length) return;
    const apply = () => list.forEach(e => updateElement(e.id, U.deep(patch)));
    if (noHistory) { pushHistory_deferred(apply); } else commit(label || 'editar', apply);
    emit('project'); emit('selection');
  }
  let _deferT = null;
  function pushHistory_deferred(apply) {
    if (!_deferT) pushHistory('editar');
    clearTimeout(_deferT);
    _deferT = setTimeout(() => { _deferT = null; }, 700);
    apply(); touch(); emit('project');
  }
  function deleteSelected() {
    const ids = S.sel.ids.slice(); if (!ids.length) return;
    const sc = scene();
    commit('eliminar', () => { sc.elements = sc.elements.filter(e => !ids.includes(e.id)); S.sel.ids = []; });
    emit('selection');
  }
  function duplicateSelected() {
    const sc = scene(), list = selected(); if (!list.length) return;
    const copies = list.map(e => { const c = U.deep(e); c.id = U.uid('el'); c.x += 28; c.y += 28; c.name = (c.name || '') + ' copia'; return c; });
    commit('duplicar', () => { sc.elements.push(...copies); S.sel.ids = copies.map(c => c.id); });
    emit('selection');
  }
  function moveLayer(id, dir) {
    const sc = scene(), i = sc.elements.findIndex(e => e.id === id); if (i < 0) return;
    const j = U.clamp(i + dir, 0, sc.elements.length - 1); if (i === j) return;
    commit('orden de capa', () => { const [x] = sc.elements.splice(i, 1); sc.elements.splice(j, 0, x); });
  }
  function select(ids, additive) {
    S.sel.ids = additive ? Array.from(new Set(S.sel.ids.concat(ids))) : ids.slice();
    emit('selection');
  }
  function selectAll() { S.sel.ids = scene().elements.filter(e => !e.locked).map(e => e.id); emit('selection'); }

  /* ---- scenes ---- */
  function setScene(id) { S.sel.sceneId = id; S.sel.ids = []; S.runtime.t = settleTime(scene()); emit('selection'); emit('scene'); emit('project'); emit('time'); }
  /** change scene without firing the heavy events (used during playback) */
  function setSceneQuiet(id) { if (!sceneById(id)) return; S.sel.sceneId = id; S.sel.ids = []; emit('scene-quiet'); }
  function addScene(copyCurrent) {
    let sc = newScene('Escena ' + (S.project.scenes.length + 1));
    if (copyCurrent) { sc = U.deep(scene()); sc.id = U.uid('sc'); sc.name = 'Escena ' + (S.project.scenes.length + 1); sc.elements.forEach(e => { e.id = U.uid('el'); }); }
    commit('añadir escena', () => { S.project.scenes.push(sc); S.sel.sceneId = sc.id; S.sel.ids = []; });
    emit('scene');
  }
  function duplicateScene(id) {
    const i = S.project.scenes.findIndex(s => s.id === id); if (i < 0) return;
    const c = U.deep(S.project.scenes[i]); c.id = U.uid('sc'); c.name += ' copia'; c.elements.forEach(e => e.id = U.uid('el'));
    commit('duplicar escena', () => { S.project.scenes.splice(i + 1, 0, c); S.sel.sceneId = c.id; S.sel.ids = []; });
    emit('scene');
  }
  function deleteScene(id) {
    if (S.project.scenes.length <= 1) { U.toast('Debe quedar al menos una escena'); return; }
    const i = S.project.scenes.findIndex(s => s.id === id); if (i < 0) return;
    commit('eliminar escena', () => { S.project.scenes.splice(i, 1); if (S.sel.sceneId === id) S.sel.sceneId = S.project.scenes[Math.max(0, i - 1)].id; S.sel.ids = []; });
    emit('scene');
  }
  function moveScene(id, dir) {
    const i = S.project.scenes.findIndex(s => s.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= S.project.scenes.length) return;
    commit('reordenar escenas', () => { const [x] = S.project.scenes.splice(i, 1); S.project.scenes.splice(j, 0, x); });
    emit('scene');
  }
  function updateScene(patch, label, noHistory) {
    const sc = scene(); const apply = () => { Object.assign(sc, U.deep(patch)); touch(); emit('project'); };
    if (noHistory) pushHistory_deferred(apply);
    else { commit(label || 'editar escena', apply); emit('scene'); }
  }
  function updateSettings(patch) { commit('ajustes', () => { Object.assign(S.project.settings, patch); emit('settings'); }); }

  /* ---------------- persistence ---------------- */
  const autosave = U.debounce(() => { saveLocal(); }, 900);
  function saveLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(S.project));
      localStorage.setItem(PREFS_KEY, JSON.stringify(S.prefs));
      emit('saved');
    } catch (e) { console.warn('No se pudo autoguardar', e); emit('save-error'); }
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch (e) { console.warn('Proyecto local corrupto', e); return null; }
  }
  function loadPrefs() { try { const p = localStorage.getItem(PREFS_KEY); if (p) Object.assign(S.prefs, JSON.parse(p)); } catch (e) {} }

  function migrate(p) {
    if (!p || typeof p !== 'object') throw new Error('Proyecto inválido');
    p.version = p.version || 1;
    p.meta = p.meta || { title: 'Proyecto', createdAt: Date.now(), updatedAt: Date.now() };
    p.settings = Object.assign({ aspect: '16:9', fps: 30, transition: 'fade', transitionMs: 450, bg: '#070714', accent: '#6c5ce7' }, p.settings || {});
    if (!ASPECTS[p.settings.aspect]) p.settings.aspect = '16:9';
    p.scenes = (p.scenes || []).map(s => normalizeScene(s));
    if (!p.scenes.length) p.scenes = [newScene('Escena 1')];
    p.version = PROJECT_VERSION;
    return p;
  }
  function normalizeScene(s) {
    s.id = s.id || U.uid('sc');
    s.name = s.name || 'Escena';
    s.durationMs = s.durationMs || 4500;
    s.transition = s.transition || 'fade';
    s.transitionMs = s.transitionMs == null ? 450 : s.transitionMs;
    s.background = Object.assign({ kind: 'gradient', color: '#08081a', from: '#141433', to: '#05050f', angle: 135, speed: 1 }, s.background || {});
    s.narration = s.narration || '';
    s.elements = (s.elements || []).map(e => normalizeElement(e));
    return s;
  }
  function normalizeElement(e) {
    const def = FACTORIES[e.type] ? FACTORIES[e.type]() : FACTORIES.text();
    const out = Object.assign({}, def, e);
    out.props = Object.assign({}, def.props, e.props || {});
    out.anim = Object.assign({}, def.anim, e.anim || {});
    out.anim.in = Object.assign({}, def.anim.in, (e.anim && e.anim.in) || {});
    out.anim.out = Object.assign({}, def.anim.out, (e.anim && e.anim.out) || {});
    out.id = e.id || U.uid('el');
    if (out.rotation == null) out.rotation = 0;
    return out;
  }

  function newProject() {
    S.project = defaultProject(); S.sel = { sceneId: S.project.scenes[0].id, ids: [] };
    S.history = { stack: [], idx: -1, max: 80 };
    pushHistory('proyecto nuevo'); saveLocal(); emit('project'); emit('scene'); emit('selection');
  }
  function loadProject(obj, opts) {
    S.project = migrate(U.deep(obj));
    S.sel = { sceneId: S.project.scenes[0].id, ids: [] };
    S.history = { stack: [], idx: -1, max: 80 };
    pushHistory('abrir proyecto');
    S.runtime.t = settleTime(scene());
    if (!opts || opts.save !== false) saveLocal();
    emit('project'); emit('scene'); emit('settings'); emit('selection');
  }
  function exportProject() { touch(); return U.deep(S.project); }

  function init() {
    loadPrefs();
    const local = loadLocal();
    if (local) { S.project = local; } else { S.project = defaultProject(); }
    ensureSelection();
    S.runtime.t = settleTime(scene());
    pushHistory('carga inicial');
    return S.project;
  }

  IS.store = {
    PROJECT_VERSION, ASPECTS, PALETTE, PALETTE_SERIES, FACTORIES,
    get project() { return S.project; },
    get sel() { return S.sel; },
    get runtime() { return S.runtime; },
    get prefs() { return S.prefs; },
    init, on, emit, commit, pushHistory, undo, redo, canUndo, canRedo,
    scene, sceneById, sceneIndex, selected, elementById, design, totalDuration, sceneStart, settleTime, ensureSelection,
    newScene, newProject, loadProject, exportProject, saveLocal, loadLocal, migrate,
    addElement, addTemplateElements, updateElement, updateSelected, deleteSelected, duplicateSelected, moveLayer,
    select, selectAll, setScene, setSceneQuiet, addScene, duplicateScene, deleteScene, moveScene, updateScene, updateSettings,
    autosave, touch, normalizeScene, normalizeElement
  };
})(window.IS = window.IS || {});
