/* ============================================================
   InfoStudio Pro — ui.js
   All interface wiring: views, panels, library, inspector,
   scene strip, transport, layers and template galleries.
   ============================================================ */
(function (IS) {
  'use strict';
  const U = IS.util, S = IS.store, R = IS.render, L = IS.library;
  const { el, $, $$ } = U;

  const UI = {};
  let color = '#6c5ce7';
  let currentTab = 'add';

  /* ================= views / tabs ================= */
  UI.showView = function (name, btn) {
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
    $$('.nav-links button').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on'); else { const b = $('[data-nav="' + name + '"]'); if (b) b.classList.add('on'); }
    if (name === 'editor') requestAnimationFrame(() => IS.editor.layout());
    if (name === 'templates') UI.renderTemplates();
  };

  UI.showTab = function (name) {
    currentTab = name;
    $$('.panel-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    $$('.tab-pane').forEach(p => p.classList.toggle('on', p.id === 'tab-' + name));
    if (name === 'layers') UI.renderLayers();
    if (name === 'add') UI.renderLibrary();
    if (name === 'scene') UI.renderSceneTab();
    if (name === 'edit') UI.renderInspector();
  };

  UI.togglePanel = function () { $('#panel').classList.toggle('open'); };

  UI.toggleTheme = function () {
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', cur);
    S.prefs.theme = cur; try { localStorage.setItem('infostudio.prefs.v1', JSON.stringify(S.prefs)); } catch (e) {}
    IS.editor.redraw(); IS.ui.renderScenes();
  };

  UI.togglePref = function (k) {
    S.prefs[k] = !S.prefs[k];
    $('#btn' + k.charAt(0).toUpperCase() + k.slice(1)).classList.toggle('on', !!S.prefs[k]);
    IS.editor.redrawOverlay();
    try { localStorage.setItem('infostudio.prefs.v1', JSON.stringify(S.prefs)); } catch (e) {}
  };

  UI.changeAspect = function (v) {
    const old = S.design();
    const nd = S.ASPECTS[v];
    const k = nd.w / nd.h, ko = old.w / old.h;
    const scale = k > ko ? nd.h / old.h : nd.w / old.w;
    S.commit('formato', () => {
      S.project.settings.aspect = v;
      // rescale elements so composition keeps proportions
      S.project.scenes.forEach(sc => sc.elements.forEach(e => { e.x = Math.round(e.x * scale); e.y = Math.round(e.y * scale); e.w = Math.round(e.w * scale); e.h = Math.round(e.h * scale); }));
    });
    IS.editor.layout(); UI.renderScenes();
  };

  UI.setZoom = function (z, btn) {
    IS.editor.setZoom(z);
    $$('#zoomSeg button').forEach(b => b.classList.toggle('on', b === btn));
  };
  UI.syncZoom = function () {
    const mode = IS.editor.zoomMode();
    $$('#zoomSeg button').forEach(b => b.classList.toggle('on', b.dataset.zoom === mode));
  };

  UI.toggleLoop = function () { S.runtime.loop = !S.runtime.loop; $('#btnLoop').classList.toggle('on', S.runtime.loop); };
  UI.toggleWhole = function () { S.runtime.wholeVideo = !S.runtime.wholeVideo; $('#btnWhole').classList.toggle('on', S.runtime.wholeVideo); U.toast(S.runtime.wholeVideo ? 'Reproducir vídeo completo' : 'Reproducir solo la escena'); };

  UI.stepScene = function (dir) {
    const i = S.project.scenes.indexOf(S.scene());
    const j = U.clamp(i + dir, 0, S.project.scenes.length - 1);
    if (j !== i) S.setScene(S.project.scenes[j].id);
  };

  UI.currentColor = () => color;

  /* ================= transport ================= */
  UI.updateTransport = function () {
    const sc = S.scene();
    const dur = sc.durationMs || 4000;
    $('#scrub').max = dur; $('#scrub').value = S.runtime.t;
    $('#timeLabel').textContent = U.fmtTime(S.runtime.t) + ' / ' + U.fmtTime(dur);
    $('#totalLabel').textContent = 'Σ ' + U.fmtTime(S.totalDuration());
  };
  UI.setPlaying = function (p) {
    const label = p ? '⏸️ Pausa' : '▶️ Reproducir';
    const i = p ? '⏸️' : '▶️';
    const b1 = $('#btnPlay'); if (b1) { b1.textContent = label; }
    const b2 = $('#btnPlay2'); if (b2) b2.textContent = i;
    if (p) IS.ui.redrawStageOnly();
  };
  UI.redrawStageOnly = function () { IS.editor.redraw(); };

  /* ================= projects ================= */
  UI.newProject = function () {
    U.confirmDialog('Proyecto nuevo', 'Se descartará el proyecto actual (el guardado local). ¿Continuar?', () => {
      S.newProject(); IS.editor.layout(); UI.renderAll(); U.toast('Proyecto nuevo ✨');
    }, 'Crear nuevo');
  };
  UI.openProject = function () {
    U.pickFile('.json,application/json').then(f => {
      if (!f) return;
      U.readAsText(f).then(txt => {
        try { const obj = JSON.parse(txt); S.loadProject(obj); IS.editor.layout(); UI.renderAll(); U.toast('Proyecto cargado 📂'); }
        catch (e) { U.toast('❌ El archivo no es un proyecto válido'); }
      });
    });
  };
  UI.saveProject = function () {
    const p = S.exportProject();
    U.download((p.meta.title || 'infostudio').replace(/[^\w\-]+/g, '_') + '.infostudio.json', JSON.stringify(p, null, 2), 'application/json');
    U.toast('💾 Proyecto guardado');
  };
  UI.duplicateSelected = function () { S.duplicateSelected(); };

  /* ================= library panel ================= */
  function componentTemplate(type) {
    const d = S.design();
    const cx = Math.round(d.w * .12), cy = Math.round(d.h * .16);
    const f = S.FACTORIES[type];
    const e = f();
    if (type === 'text') { e.x = cx; e.y = cy; e.w = Math.round(d.w * .6); e.props.size = Math.round(d.h * .055); e.props.text = 'Título de la diapositiva'; }
    else if (type === 'bullets') { e.x = cx; e.y = cy; e.w = Math.round(d.w * .6); e.props.size = Math.round(d.h * .032); e.props.items = ['Primer punto clave', 'Segundo punto clave', 'Tercer punto clave']; }
    else if (type === 'chart') { e.x = cx; e.y = cy + Math.round(d.h * .06); e.w = Math.round(d.w * .48); e.h = Math.round(d.h * .42); }
    else if (type === 'stat') { e.x = cx; e.y = cy; e.w = Math.round(d.w * .24); e.h = Math.round(d.h * .28); }
    else if (type === 'progress') { e.x = cx; e.y = cy + Math.round(d.h * .1); e.w = Math.round(d.w * .5); }
    else if (type === 'image') { e.w = Math.round(d.w * .3); e.h = Math.round(d.h * .32); }
    else if (type === 'steps') { e.x = cx; e.y = cy + Math.round(d.h * .08); e.w = Math.round(d.w * .7); e.h = Math.round(d.h * .4); }
    else if (type === 'compare') { e.x = cx; e.y = cy + Math.round(d.h * .06); e.w = Math.round(d.w * .7); e.h = Math.round(d.h * .5); }
    else if (type === 'timeline') { e.x = cx; e.y = cy + Math.round(d.h * .08); e.w = Math.round(d.w * .7); e.h = Math.round(d.h * .35); }
    else if (type === 'code') { e.x = cx; e.y = cy; e.w = Math.round(d.w * .5); e.h = Math.round(d.h * .45); }
    else if (type === 'callout') { e.x = cx; e.y = cy + Math.round(d.h * .08); e.w = Math.round(d.w * .5); e.h = Math.round(d.h * .24); }
    else if (type === 'badge') { e.x = cx; e.y = cy; e.w = Math.round(d.w * .12); e.h = Math.round(d.h * .07); }
    else if (type === 'quote') { e.x = cx; e.y = cy + Math.round(d.h * .06); e.w = Math.round(d.w * .55); e.h = Math.round(d.h * .26); }
    else { e.x = cx; e.y = cy; }
    e.x = Math.round(e.x); e.y = Math.round(e.y); e.w = Math.round(e.w); e.h = Math.round(e.h);
    return e;
  }

  UI.renderLibrary = function () {
    const pane = $('#tab-add'); pane.innerHTML = '';
    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: 'Plantillas de escena' }),
      el('div', { class: 'grid2' }, L.SCENE_TEMPLATES.slice(0, 6).map(t =>
        el('button', { class: 'chip', text: t.name, onclick: () => UI.applySceneTemplate(t.id) }))),
      el('p', { class: 'hint', text: 'Añaden todos los elementos de la plantilla a la escena actual.' })
    ]));
    L.COMPONENT_GROUPS.forEach(g => {
      pane.appendChild(el('div', { class: 'psec' }, [
        el('h3', { text: g.name }),
        el('div', { class: 'lib-grid' }, g.items.map(([type, label, em]) =>
          el('button', { class: 'lib-item', onclick: () => { S.addElement(componentTemplate(type)); UI.showTab('edit'); } }, [
            el('span', { class: 'em', text: em }), el('span', { text: label })
          ])))
      ]));
    });
    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: 'Colores' }),
      el('div', { class: 'swatches' }, S.PALETTE.map(c => el('button', { class: 'sw' + (c === color ? ' on' : ''), style: { background: c }, title: c, onclick: (ev) => { color = c; UI.renderLibrary(); $$('#colorSwatches .sw').forEach(x => x.classList.toggle('on', x.title === c)); } }))),
      el('input', { type: 'color', class: 'inp', value: color, style: { marginTop: '8px', width: '100%', height: '30px', padding: '0', border: 'none', background: 'transparent' }, oninput: (ev) => { color = ev.target.value; } })
    ]));
  };

  UI.applySceneTemplate = function (id) {
    const t = L.SCENE_TEMPLATES.find(x => x.id === id);
    if (!t) return;
    const list = t.build(S.design());
    list.forEach(e => { e.id = U.uid('el'); });
    S.addTemplateElements(list);
    UI.showTab('edit');
    U.toast('🧩 Plantilla añadida');
  };

  /* ================= scene tab ================= */
  UI.renderSceneTab = function () {
    const sc = S.scene(), pane = $('#tab-scene'); pane.innerHTML = '';
    const nameInp = el('input', { class: 'inp wide', value: sc.name, oninput: e => { sc.name = e.target.value; S.touch(); S.autosave(); UI.renderScenesSoon(); } });
    pane.appendChild(el('div', { class: 'psec' }, [el('h3', { text: 'Escena' }), el('div', { class: 'row' }, [el('label', { text: 'Nombre' }), nameInp])]));

    const dur = el('input', { type: 'range', class: 'sl', min: 1000, max: 20000, step: 250, value: sc.durationMs, oninput: e => { sc.durationMs = +e.target.value; $('#durVal').textContent = U.fmtTime(sc.durationMs); S.autosave(); UI.updateTransport(); IS.editor.redraw(); } });
    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: 'Duración' }),
      el('div', { class: 'row' }, [el('label', { text: 'Tiempo en pantalla' }), el('span', { id: 'durVal', class: 'inp', style: { width: 'auto', border: 'none', background: 'none' }, text: U.fmtTime(sc.durationMs) })]),
      dur,
      el('div', { class: 'hint', text: 'Vídeo completo: ' + U.fmtTime(S.totalDuration()) + ' en ' + S.project.scenes.length + ' escena(s).' })
    ]));

    // background
    const bg = sc.background || {};
    const bgSel = el('select', { class: 'inp wide', onchange: e => { sc.background.kind = e.target.value; S.commit('fondo', () => {}); UI.renderSceneTab(); IS.editor.redraw(); UI.renderScenesSoon(); } },
      L.BG_KINDS.map(k => el('option', { value: k.id, text: k.name, selected: bg.kind === k.id })));
    const mkColor = (label, key) => el('div', { class: 'row' }, [el('label', { text: label }), el('input', { type: 'color', class: 'inp', style: { width: '56px', padding: '2px', height: '28px' }, value: bg[key] || '#000000', oninput: e => { sc.background[key] = e.target.value; IS.editor.redraw(); UI.renderScenesSoon(); } })]);
    const bgBox = el('div', { class: 'psec' }, [el('h3', { text: 'Fondo' }), bgSel]);
    if (bg.kind === 'solid') bgBox.appendChild(mkColor('Color', 'color'));
    else if (bg.kind === 'gradient' || bg.kind === 'radial' || bg.kind === 'mesh') { bgBox.appendChild(mkColor('Color A', 'from')); bgBox.appendChild(mkColor('Color B', 'to')); }
    else { bgBox.appendChild(mkColor('Base', 'color')); bgBox.appendChild(mkColor('Acento', 'from')); }
    pane.appendChild(bgBox);

    // transition
    const trOpts = [['none', 'Ninguna'], ['fade', 'Fundido'], ['slideLeft', 'Deslizar ←'], ['slideRight', 'Deslizar →'], ['slideUp', 'Deslizar ↑'], ['slideDown', 'Deslizar ↓'], ['zoom', 'Zoom'], ['wipe', 'Barrido'], ['wipeUp', 'Barrido ↑']];
    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: 'Transición de entrada' }),
      el('div', { class: 'row' }, [el('label', { text: 'Tipo' }), el('select', { class: 'inp', onchange: e => { sc.transition = e.target.value; S.commit('transición', () => {}); }, }, trOpts.map(o => el('option', { value: o[0], text: o[1], selected: sc.transition === o[0] })))]),
      el('div', { class: 'row' }, [el('label', { text: 'Duración' }), el('input', { type: 'number', class: 'inp', min: 0, max: 2000, step: 50, value: sc.transitionMs, onchange: e => { sc.transitionMs = +e.target.value; S.commit('transición'); } })])
    ]));

    // narration
    const nar = el('textarea', { class: 'inp', placeholder: 'Lo que se dice en esta escena…', oninput: e => { sc.narration = e.target.value; S.autosave(); } });
    nar.value = sc.narration || '';
    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: 'Locución / guion' }),
      nar,
      el('div', { class: 'grid2', style: { marginTop: '8px' } }, [
        el('button', { class: 'btn sm', text: '🔊 Escuchar', onclick: () => IS.exporter.speakScene(sc) }),
        el('button', { class: 'btn sm', text: '⏱️ Estimación', onclick: () => U.toast(estimateNarration(sc.narration)) })
      ]),
      el('p', { class: 'hint', text: 'La locución se usa para generar subtítulos (.srt/.vtt). Pulsa “Escuchar” para probarla con la voz del sistema.' })
    ]));

    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: 'Escenas' }),
      el('div', { class: 'grid2' }, [
        el('button', { class: 'btn sm', text: '➕ Nueva', onclick: () => { S.addScene(false); UI.renderAll(); } }),
        el('button', { class: 'btn sm', text: '⧉ Duplicar', onclick: () => { S.duplicateScene(sc.id); UI.renderAll(); } }),
        el('button', { class: 'btn sm', text: '⬅️ Mover', onclick: () => { S.moveScene(sc.id, -1); UI.renderAll(); } }),
        el('button', { class: 'btn sm', text: '➡️ Mover', onclick: () => { S.moveScene(sc.id, 1); UI.renderAll(); } }),
        el('button', { class: 'btn sm danger', text: '🗑️ Eliminar', onclick: () => { S.deleteScene(sc.id); UI.renderAll(); } })
      ])
    ]));
  };

  function estimateNarration(txt) {
    const words = (String(txt || '').trim().match(/\S+/g) || []).length;
    const secs = words / 2.6;
    return '≈ ' + words + ' palabras · ' + secs.toFixed(1) + ' s a ritmo natural';
  }

  /* ================= inspector ================= */
  const F = {
    text: [
      { k: 'text', l: 'Texto', t: 'area' },
      { k: 'size', l: 'Tamaño', t: 'num', min: 8, max: 300, step: 1 },
      { k: 'weight', l: 'Grosor', t: 'select', opts: [[300, 'Ligera'], [400, 'Normal'], [500, 'Media'], [600, 'Semi'], [700, 'Bold'], [800, 'Extra'], [850, 'Black']] },
      { k: 'align', l: 'Alineación', t: 'select3', opts: [['left', '⬅'], ['center', '↔'], ['right', '➡']] },
      { k: 'vAlign', l: 'Vertical', t: 'select3', opts: [['top', '⬆'], ['middle', '↕'], ['bottom', '⬇']] },
      { k: 'lineHeight', l: 'Interlínea', t: 'num', min: .8, max: 2.2, step: .05 },
      { k: 'letterSpacing', l: 'Espaciado', t: 'num', min: -5, max: 20, step: .5 },
      { k: 'color', l: 'Color', t: 'color' },
      { k: 'bg', l: 'Fondo', t: 'color' },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 80, step: 1 },
      { k: 'family', l: 'Tipografía', t: 'select', opts: [['Inter, system-ui, sans-serif', 'Sans (sistema)'], ['Georgia, serif', 'Serif'], ['ui-monospace, Menlo, monospace', 'Monoespaciada'], ['Impact, system-ui, sans-serif', 'Impacto']] }
    ],
    shape: [
      { k: 'kind', l: 'Forma', t: 'select', opts: [['rect', 'Rectángulo'], ['ellipse', 'Elipse'], ['triangle', 'Triángulo'], ['star', 'Estrella'], ['polygon', 'Polígono'], ['diamond', 'Rombo']] },
      { k: 'points', l: 'Lados', t: 'num', min: 3, max: 12, step: 1 },
      { k: 'fillOn', l: 'Relleno', t: 'check' },
      { k: 'fill', l: 'Color relleno', t: 'color' },
      { k: 'stroke', l: 'Borde', t: 'color' },
      { k: 'strokeWidth', l: 'Grosor borde', t: 'num', min: 0, max: 60, step: 1 },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 200, step: 1 }
    ],
    line: [
      { k: 'color', l: 'Color', t: 'color' },
      { k: 'thickness', l: 'Grosor', t: 'num', min: 1, max: 60, step: 1 },
      { k: 'style', l: 'Estilo', t: 'select', opts: [['solid', 'Sólida'], ['dashed', 'Discontinua'], ['dotted', 'Punteada']] },
      { k: 'arrow', l: 'Puntas', t: 'select', opts: [['none', 'Ninguna'], ['end', 'Final'], ['start', 'Inicio'], ['both', 'Ambas']] }
    ],
    icon: [
      { k: 'name', l: 'Icono', t: 'icon' },
      { k: 'color', l: 'Color', t: 'color' },
      { k: 'bgOn', l: 'Fondo', t: 'check' },
      { k: 'bg', l: 'Color fondo', t: 'color' },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 80, step: 1 }
    ],
    image: [
      { k: 'src', l: 'Imagen', t: 'image' },
      { k: 'fit', l: 'Ajuste', t: 'select', opts: [['cover', 'Cubrir'], ['contain', 'Contener']] },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 200, step: 1 },
      { k: 'shadow', l: 'Sombra', t: 'check' },
      { k: 'frameWidth', l: 'Marco', t: 'num', min: 0, max: 40, step: 1 },
      { k: 'frame', l: 'Color marco', t: 'color' }
    ],
    stat: [
      { k: 'value', l: 'Valor', t: 'num', min: -100000, max: 100000, step: 1 },
      { k: 'decimals', l: 'Decimales', t: 'num', min: 0, max: 3, step: 1 },
      { k: 'prefix', l: 'Prefijo', t: 'text' },
      { k: 'suffix', l: 'Sufijo', t: 'text' },
      { k: 'label', l: 'Etiqueta', t: 'text' },
      { k: 'caption', l: 'Descripción', t: 'text' },
      { k: 'countUp', l: 'Animar número', t: 'check' },
      { k: 'valueColor', l: 'Color valor', t: 'color' },
      { k: 'labelColor', l: 'Color etiqueta', t: 'color' },
      { k: 'bg', l: 'Fondo tarjeta', t: 'color' },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 80, step: 1 },
      { k: 'accentBar', l: 'Barra lateral', t: 'check' }
    ],
    chart: [
      { k: 'kind', l: 'Tipo', t: 'select', opts: [['bar', 'Barras'], ['hbar', 'Barras horizontales'], ['line', 'Líneas'], ['area', 'Área'], ['pie', 'Circular'], ['donut', 'Anillo'], ['radar', 'Radar']] },
      { k: 'title', l: 'Título', t: 'text' },
      { k: 'data', l: 'Datos', t: 'data' },
      { k: 'colors', l: 'Colores', t: 'colors' },
      { k: 'showLabels', l: 'Etiquetas', t: 'check' },
      { k: 'showValues', l: 'Valores', t: 'check' },
      { k: 'showGrid', l: 'Rejilla', t: 'check' },
      { k: 'animate', l: 'Animar', t: 'check' },
      { k: 'valueSuffix', l: 'Sufijo', t: 'text' },
      { k: 'bg', l: 'Fondo', t: 'color' },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 80, step: 1 }
    ],
    progress: [
      { k: 'label', l: 'Etiqueta', t: 'text' },
      { k: 'value', l: 'Valor', t: 'num', min: 0, max: 100, step: 1 },
      { k: 'color', l: 'Color', t: 'color' },
      { k: 'thickness', l: 'Grosor', t: 'num', min: 6, max: 120, step: 2 },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 60, step: 1 },
      { k: 'showValue', l: 'Mostrar %', t: 'check' }
    ],
    bullets: [
      { k: 'title', l: 'Título', t: 'text' },
      { k: 'items', l: 'Puntos', t: 'lines' },
      { k: 'marker', l: 'Viñeta', t: 'select', opts: [['check', '✔ Check'], ['arrow', '➜ Flecha'], ['dot', '• Punto'], ['number', '1. Número'], ['none', 'Ninguna']] },
      { k: 'color', l: 'Color texto', t: 'color' },
      { k: 'markerColor', l: 'Color viñeta', t: 'color' },
      { k: 'size', l: 'Tamaño', t: 'num', min: 10, max: 120, step: 1 },
      { k: 'gap', l: 'Espaciado', t: 'num', min: 0, max: 120, step: 1 }
    ],
    badge: [
      { k: 'text', l: 'Texto', t: 'text' },
      { k: 'size', l: 'Tamaño', t: 'num', min: 8, max: 120, step: 1 },
      { k: 'letterSpacing', l: 'Espaciado', t: 'num', min: 0, max: 20, step: .5 },
      { k: 'color', l: 'Texto', t: 'color' },
      { k: 'bg', l: 'Fondo', t: 'color' },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 100, step: 1 }
    ],
    callout: [
      { k: 'variant', l: 'Tipo', t: 'select', opts: [['info', 'Info'], ['tip', 'Consejo'], ['warn', 'Aviso'], ['success', 'Éxito']] },
      { k: 'icon', l: 'Emoji', t: 'text' },
      { k: 'title', l: 'Título', t: 'text' },
      { k: 'text', l: 'Mensaje', t: 'area' },
      { k: 'accent', l: 'Acento', t: 'color' },
      { k: 'bg', l: 'Fondo', t: 'color' },
      { k: 'textColor', l: 'Texto', t: 'color' },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 80, step: 1 }
    ],
    steps: [
      { k: 'direction', l: 'Dirección', t: 'select', opts: [['h', 'Horizontal'], ['v', 'Vertical']] },
      { k: 'items', l: 'Pasos', t: 'steps' },
      { k: 'numbered', l: 'Numerados', t: 'check' },
      { k: 'connector', l: 'Conector', t: 'check' },
      { k: 'color', l: 'Color', t: 'color' },
      { k: 'titleColor', l: 'Color título', t: 'color' },
      { k: 'textColor', l: 'Color texto', t: 'color' }
    ],
    compare: [
      { k: 'left', l: 'Izquierda', t: 'side' },
      { k: 'right', l: 'Derecha', t: 'side' },
      { k: 'leftColor', l: 'Color A', t: 'color' },
      { k: 'rightColor', l: 'Color B', t: 'color' },
      { k: 'vs', l: 'Mostrar VS', t: 'check' },
      { k: 'bg', l: 'Fondo', t: 'color' },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 80, step: 1 }
    ],
    timeline: [
      { k: 'orientation', l: 'Dirección', t: 'select', opts: [['h', 'Horizontal'], ['v', 'Vertical']] },
      { k: 'items', l: 'Hitos', t: 'timelineItems' },
      { k: 'color', l: 'Color', t: 'color' },
      { k: 'textColor', l: 'Color texto', t: 'color' }
    ],
    code: [
      { k: 'title', l: 'Nombre archivo', t: 'text' },
      { k: 'code', l: 'Código', t: 'areaTall' },
      { k: 'fontSize', l: 'Tamaño', t: 'num', min: 8, max: 60, step: 1 },
      { k: 'bg', l: 'Fondo', t: 'color' },
      { k: 'color', l: 'Texto', t: 'color' },
      { k: 'radius', l: 'Radio', t: 'num', min: 0, max: 60, step: 1 }
    ],
    quote: [
      { k: 'text', l: 'Cita', t: 'area' },
      { k: 'author', l: 'Autor', t: 'text' },
      { k: 'color', l: 'Texto', t: 'color' },
      { k: 'accent', l: 'Acento', t: 'color' },
      { k: 'authorColor', l: 'Color autor', t: 'color' }
    ]
  };

  function patchProps(k, v, structural) {
    const sc = S.scene();
    S.selected().forEach(e => { e.props[k] = v; });
    S.touch();
    if (structural) S.commit('editar ' + k, () => {}); else S.autosave();
    IS.editor.redraw(); UI.renderScenesSoon();
  }
  function patchGeom(k, v, structural) {
    S.selected().forEach(e => { e[k] = v; });
    S.touch();
    if (structural) S.commit('editar ' + k, () => {}); else S.autosave();
    IS.editor.redraw(); IS.editor.redrawOverlay();
  }

  UI.renderInspector = function () {
    const pane = $('#tab-edit'); pane.innerHTML = '';
    const sel = S.selected();
    if (!sel.length) {
      S.sel.ids = [];
      pane.appendChild(el('div', { class: 'psec' }, [
        el('h3', { text: 'Sin selección' }),
        el('p', { class: 'hint', text: 'Selecciona un elemento en el lienzo para editar sus propiedades, o añade uno desde la pestaña “Añadir”.' }),
        el('div', { class: 'grid2', style: { marginTop: '10px' } }, [
          el('button', { class: 'btn sm', text: 'Añadir título', onclick: () => { S.addElement(componentTemplate('text')); UI.showTab('edit'); } }),
          el('button', { class: 'btn sm', text: 'Añadir KPI', onclick: () => { S.addElement(componentTemplate('stat')); UI.showTab('edit'); } }),
          el('button', { class: 'btn sm', text: 'Añadir gráfico', onclick: () => { S.addElement(componentTemplate('chart')); UI.showTab('edit'); } }),
          el('button', { class: 'btn sm', text: 'Insertar imagen', onclick: () => { IS.editor.setTool('image'); } })
        ]),
        el('p', { class: 'hint', text: 'Consejo: usa Ctrl+A para seleccionar todo y las herramientas de alineación para ordenar la composición.' })
      ]));
      return;
    }
    const e0 = sel[sel.length - 1];
    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: sel.length > 1 ? sel.length + ' elementos seleccionados' : typeName(e0) }),
      el('div', { class: 'row' }, [el('label', { text: 'Nombre' }), el('input', { class: 'inp', value: e0.name || '', placeholder: typeName(e0), oninput: ev => { S.selected().forEach(x => x.name = ev.target.value); UI.renderLayersSoon(); S.autosave(); } })]),
      el('div', { class: 'grid3' }, [
        el('button', { class: 'chip', text: '👁️', title: 'Mostrar/ocultar', onclick: () => { S.selected().forEach(x => x.visible = !x.visible); S.commit('visibilidad'); UI.syncAfterChange(); } }),
        el('button', { class: 'chip' + (e0.locked ? ' on' : ''), text: '🔒', title: 'Bloquear', onclick: () => { S.selected().forEach(x => x.locked = !x.locked); S.commit('bloquear'); UI.syncAfterChange(); } }),
        el('button', { class: 'chip', text: '⧉', title: 'Duplicar', onclick: () => UI.duplicateSelected() })
      ])
    ]));

    // transform
    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: 'Transformar' }),
      el('div', { class: 'grid2' }, [
        numInput('X', 'x', e0.x), numInput('Y', 'y', e0.y), numInput('Ancho', 'w', e0.w), numInput('Alto', 'h', e0.h)
      ]),
      el('div', { class: 'row', style: { marginTop: '7px' } }, [el('label', { text: 'Rotación' }), numInput('', 'rotation', e0.rotation || 0)]),
      el('div', { class: 'row' }, [el('label', { text: 'Opacidad' }), el('input', { type: 'range', class: 'sl', min: 0, max: 100, value: Math.round((e0.opacity == null ? 1 : e0.opacity) * 100), oninput: ev => S.selected().forEach(x => x.opacity = +ev.target.value / 100) })]),
      el('div', { class: 'hint', id: 'geomHint', text: '' })
    ]));

    // align
    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: 'Alinear y ordenar' }),
      el('div', { class: 'grid3' }, ['⬅️|left', '↔|hcenter', '➡️|right', '⬆️|top', '↕|vcenter', '⬇️|bottom'].map(s => {
        const [em, kind] = s.split('|');
        return el('button', { class: 'chip', text: em, title: kind, onclick: () => UI.align(kind) });
      })),
      el('div', { class: 'grid2', style: { marginTop: '6px' } }, [
        el('button', { class: 'chip', text: '⇔ Distribuir', onclick: () => UI.distribute('h') }),
        el('button', { class: 'chip', text: '⇕ Distribuir', onclick: () => UI.distribute('v') })
      ]),
      el('div', { class: 'grid3', style: { marginTop: '6px' } }, [
        el('button', { class: 'chip', text: '⬆️ Frente', onclick: () => moveZ(1e6) }),
        el('button', { class: 'chip', text: '🔼 Subir', onclick: () => moveZ(1) }),
        el('button', { class: 'chip', text: '🔽 Bajar', onclick: () => moveZ(-1) }),
        el('button', { class: 'chip', text: '⬇️ Fondo', onclick: () => moveZ(-1e6) })
      ])
    ]));

    // type properties
    const fields = F[e0.type] || [];
    if (fields.length) {
      const box = el('div', { class: 'psec' }, [el('h3', { text: 'Propiedades' })]);
      fields.forEach(f => { if (sel.length > 1 && f.t === 'data') return; const node = fieldNode(f, e0); if (node) box.appendChild(node); });
      pane.appendChild(box);
    }

    // animation
    const animPresets = L.ANIM_PRESETS.map(p => [p.id, p.name]);
    const easings = U.EASINGS.map(x => [x, x]);
    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: 'Animación de entrada' }),
      el('div', { class: 'row' }, [el('label', { text: 'Efecto' }), sel1(animPresets, e0.anim.in.preset, v => { S.selected().forEach(x => x.anim.in.preset = v); S.commit('animación'); IS.editor.redraw(); })]),
      el('div', { class: 'row' }, [el('label', { text: 'Duración ms' }), numSimple(e0.anim.in.dur, v => { S.selected().forEach(x => x.anim.in.dur = v); S.commit('animación'); IS.editor.redraw(); })]),
      el('div', { class: 'row' }, [el('label', { text: 'Retardo ms' }), numSimple(e0.anim.in.delay, v => { S.selected().forEach(x => x.anim.in.delay = v); S.commit('animación'); IS.editor.redraw(); })]),
      el('div', { class: 'row' }, [el('label', { text: 'Curva' }), sel1(easings, e0.anim.in.easing, v => { S.selected().forEach(x => x.anim.in.easing = v); S.commit('animación'); IS.editor.redraw(); })])
    ]));
    pane.appendChild(el('div', { class: 'psec' }, [
      el('h3', { text: 'Animación de salida' }),
      el('div', { class: 'row' }, [el('label', { text: 'Efecto' }), sel1(animPresets, e0.anim.out.preset, v => { S.selected().forEach(x => x.anim.out.preset = v); S.commit('animación'); IS.editor.redraw(); })]),
      el('div', { class: 'row' }, [el('label', { text: 'Duración ms' }), numSimple(e0.anim.out.dur, v => { S.selected().forEach(x => x.anim.out.dur = v); S.commit('animación'); IS.editor.redraw(); })]),
      el('div', { class: 'row' }, [el('label', { text: 'Curva' }), sel1(easings, e0.anim.out.easing, v => { S.selected().forEach(x => x.anim.out.easing = v); S.commit('animación'); IS.editor.redraw(); })])
    ]));

    pane.appendChild(el('div', { class: 'psec' }, [
      el('div', { class: 'grid2' }, [
        el('button', { class: 'btn sm', text: '▶️ Probar', onclick: () => { S.runtime.t = 0; IS.editor.play(); } }),
        el('button', { class: 'btn sm danger', text: '🗑️ Eliminar', onclick: () => { S.deleteSelected(); UI.renderInspector(); } })
      ])
    ]));
  };

  function typeName(e) { return ({ text: 'Texto', shape: 'Forma', line: 'Línea', icon: 'Icono', image: 'Imagen', stat: 'Dato / KPI', chart: 'Gráfico', progress: 'Progreso', bullets: 'Lista', badge: 'Etiqueta', callout: 'Aviso', steps: 'Pasos', compare: 'Comparativa', timeline: 'Línea de tiempo', code: 'Código', quote: 'Cita' })[e.type] || 'Elemento'; }
  function moveZ(dir) { const sc = S.scene(); const ids = S.sel.ids.slice(); ids.forEach(id => { if (dir > 1000) { const i = sc.elements.findIndex(x => x.id === id); if (i >= 0) { const [x] = sc.elements.splice(i, 1); sc.elements.push(x); } } else if (dir < -1000) { const i = sc.elements.findIndex(x => x.id === id); if (i >= 0) { const [x] = sc.elements.splice(i, 1); sc.elements.unshift(x); } } else S.moveLayer(id, dir); }); S.commit('orden'); UI.syncAfterChange(); }

  function numInput(label, key, val) {
    const wrap = el('label', { style: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text3)' } }, [
      label ? el('span', { text: label, style: { width: '34px' } }) : null,
      el('input', { type: 'number', class: 'inp', style: { width: '100%' }, value: Math.round(val || 0), onchange: ev => patchGeom(key, +ev.target.value, true) })
    ]);
    return wrap;
  }
  function numSimple(val, cb) { return el('input', { type: 'number', class: 'inp', value: Math.round(val || 0), step: 50, onchange: ev => cb(+ev.target.value) }); }
  function sel1(opts, val, cb) { return el('select', { class: 'inp', onchange: ev => cb(ev.target.value) }, opts.map(o => el('option', { value: o[0], text: o[1], selected: String(o[0]) === String(val) }))); }

  function fieldNode(f, e) {
    const v = e.props[f.k];
    const row = el('div', { class: 'row' });
    switch (f.t) {
      case 'num': case 'text': {
        row.appendChild(el('label', { text: f.l }));
        row.appendChild(el('input', { type: f.t === 'num' ? 'number' : 'text', class: 'inp', min: f.min, max: f.max, step: f.step || 1, value: v == null ? '' : v, oninput: ev => patchProps(f.k, f.t === 'num' ? +ev.target.value : ev.target.value) }));
        return row;
      }
      case 'color': {
        row.appendChild(el('label', { text: f.l }));
        row.appendChild(el('input', { type: 'color', class: 'inp', style: { width: '56px', padding: '2px', height: '28px' }, value: toHex(v), oninput: ev => patchProps(f.k, ev.target.value) }));
        return row;
      }
      case 'check': {
        row.appendChild(el('label', { text: f.l }));
        row.appendChild(el('input', { type: 'checkbox', checked: !!v, onchange: ev => patchProps(f.k, ev.target.checked, true) }));
        return row;
      }
      case 'select': {
        row.appendChild(el('label', { text: f.l }));
        row.appendChild(el('select', { class: 'inp', onchange: ev => { const raw = ev.target.value; const val = f.opts.some(o => typeof o[0] === 'number') ? +raw : raw; patchProps(f.k, val, true); } }, f.opts.map(o => el('option', { value: o[0], text: o[1], selected: String(o[0]) === String(v) }))));
        return row;
      }
      case 'select3': {
        row.appendChild(el('label', { text: f.l }));
        const g = el('div', { class: 'seg' });
        f.opts.forEach(o => g.appendChild(el('button', { class: v === o[0] ? 'on' : '', text: o[1], onclick: (ev) => { patchProps(f.k, o[0], true); $$('button', g).forEach(b => b.classList.remove('on')); ev.target.classList.add('on'); } })));
        row.appendChild(g); return row;
      }
      case 'area': case 'areaTall': {
        const wrap = el('div', {}, [el('h3', { text: f.l, style: { marginBottom: '5px' } })]);
        const ta = el('textarea', { class: 'inp', style: f.t === 'areaTall' ? { minHeight: '140px', fontFamily: 'var(--mono)', fontSize: '11.5px' } : {}, oninput: ev => patchProps(f.k, ev.target.value) });
        ta.value = v == null ? '' : v;
        wrap.appendChild(ta); return wrap;
      }
      case 'lines': {
        const wrap = el('div', {}, [el('h3', { text: f.l, style: { marginBottom: '5px' } })]);
        const ta = el('textarea', { class: 'inp', placeholder: 'Un punto por línea…', oninput: ev => patchProps(f.k, ev.target.value.split('\n')) });
        ta.value = (v || []).join('\n');
        wrap.appendChild(ta);
        wrap.appendChild(el('p', { class: 'hint', text: 'Una línea = un punto.' }));
        return wrap;
      }
      case 'data': return dataEditor(v, e);
      case 'colors': return colorsEditor(v);
      case 'side': return sideEditor(f.k, v);
      case 'steps': return objListEditor(f.l, v, [['title', 'Título'], ['text', 'Descripción']]);
      case 'timelineItems': return objListEditor(f.l, v, [['time', 'Momento'], ['label', 'Descripción']]);
      case 'icon': {
        const wrap = el('div', {}, [el('h3', { text: f.l, style: { marginBottom: '6px' } })]);
        const grid = el('div', { class: 'lib-grid' });
        L.iconNames().forEach(n => {
          const b = el('button', { class: 'lib-item' + (v === n ? ' on' : ''), style: { padding: '6px' }, onclick: () => { patchProps('name', n, true); UI.renderInspector(); } });
          const c = el('canvas', { width: 44, height: 44 });
          L.drawIcon(c.getContext('2d'), n, 0, 0, 44, 'currentColor' in c.getContext('2d') ? '#cfcfe6' : '#cfcfe6', { strokeScale: 1.6 });
          b.appendChild(c); grid.appendChild(b);
        });
        wrap.appendChild(grid); return wrap;
      }
      case 'image': {
        const wrap = el('div', {}, [el('h3', { text: f.l, style: { marginBottom: '6px' } })]);
        wrap.appendChild(el('button', { class: 'btn sm block', text: '🖼️ Elegir imagen…', onclick: () => U.pickFile('image/*').then(file => { if (!file) return; U.readAsDataURL(file).then(src => { patchProps('src', src, true); UI.renderInspector(); }); }) }));
        if (v) { const im = el('img', { src: v, style: { width: '100%', borderRadius: '8px', marginTop: '8px' } }); wrap.appendChild(im); }
        return wrap;
      }
      default: return null;
    }
  }

  function dataEditor(data, e) {
    const wrap = el('div', {}, [el('h3', { text: 'Datos', style: { marginBottom: '6px' } })]);
    data = data || [];
    const commitAll = (arr, structural) => { patchProps('data', arr, structural); if (structural) UI.renderInspector(); };
    data.forEach((d, i) => {
      const row = el('div', { class: 'row', style: { gap: '4px' } }, [
        el('input', { class: 'inp', style: { flex: '1', width: 'auto' }, value: d.label || '', placeholder: 'Etiqueta', oninput: ev => { d.label = ev.target.value; commitAll(data); } }),
        el('input', { type: 'number', class: 'inp', style: { width: '62px' }, value: d.value == null ? 0 : d.value, oninput: ev => { d.value = +ev.target.value; commitAll(data); } }),
        el('button', { class: 'icon-btn', text: '✕', title: 'Quitar', onclick: () => { data.splice(i, 1); commitAll(data, true); } })
      ]);
      wrap.appendChild(row);
    });
    wrap.appendChild(el('button', { class: 'btn sm block', text: '➕ Añadir dato', style: { marginTop: '6px' }, onclick: () => { data.push({ label: 'Nuevo', value: 50 }); commitAll(data, true); } }));
    return wrap;
  }
  function colorsEditor(colors) {
    colors = colors || [];
    const wrap = el('div', {}, [el('h3', { text: 'Colores de serie', style: { marginBottom: '6px' } })]);
    const row = el('div', { class: 'swatches' });
    colors.forEach((c, i) => row.appendChild(el('input', { type: 'color', class: 'inp', style: { width: '30px', height: '26px', padding: '1px' }, value: toHex(c), oninput: ev => { colors[i] = ev.target.value; patchProps('colors', colors); IS.editor.redraw(); } })));
    wrap.appendChild(row);
    wrap.appendChild(el('button', { class: 'btn sm block', text: '↺ Paleta por defecto', style: { marginTop: '6px' }, onclick: () => { patchProps('colors', S.PALETTE_SERIES.slice(), true); UI.renderInspector(); } }));
    return wrap;
  }
  function sideEditor(key, side) {
    side = side || { title: '', items: [] };
    const wrap = el('div', {}, [el('h3', { text: key === 'left' ? 'Columna A' : 'Columna B', style: { marginBottom: '5px' } })]);
    wrap.appendChild(el('input', { class: 'inp wide', value: side.title || '', placeholder: 'Título', oninput: ev => { side.title = ev.target.value; patchProps(key, side); } }));
    const ta = el('textarea', { class: 'inp', style: { marginTop: '5px' }, placeholder: 'Un punto por línea', oninput: ev => { side.items = ev.target.value.split('\n'); patchProps(key, side); } });
    ta.value = (side.items || []).join('\n');
    wrap.appendChild(ta);
    return wrap;
  }
  function objListEditor(label, arr, sub) {
    arr = arr || [];
    const wrap = el('div', {}, [el('h3', { text: label, style: { marginBottom: '6px' } })]);
    const commitAll = (structural) => { patchProps(labelKey(label), arr, structural); if (structural) UI.renderInspector(); };
    arr.forEach((it, i) => {
      const row = el('div', { class: 'row', style: { gap: '4px', alignItems: 'flex-start' } });
      sub.forEach(s => {
        if (s[0] === 'text') { const ta = el('textarea', { class: 'inp', style: { flex: '1', minHeight: '34px' }, value: it[s[0]] == null ? '' : it[s[0]], oninput: ev => { it[s[0]] = ev.target.value; commitAll(); } }); row.appendChild(ta); }
        else row.appendChild(el('input', { class: 'inp', style: { width: '76px' }, value: it[s[0]] == null ? '' : it[s[0]], placeholder: s[1], oninput: ev => { it[s[0]] = ev.target.value; commitAll(); } }));
      });
      row.appendChild(el('button', { class: 'icon-btn', text: '✕', onclick: () => { arr.splice(i, 1); commitAll(true); } }));
      wrap.appendChild(row);
    });
    wrap.appendChild(el('button', { class: 'btn sm block', text: '➕ Añadir', style: { marginTop: '6px' }, onclick: () => { arr.push(label === 'Pasos' ? { title: 'Paso', text: 'Descripción' } : { time: 'Año', label: 'Hito' }); commitAll(true); } }));
    return wrap;
  }
  function labelKey() { return 'items'; }
  function toHex(c) { if (!c || c === 'transparent') return '#000000'; if (/^#([0-9a-f]{6})$/i.test(c)) return c; if (/^#([0-9a-f]{3})$/i.test(c)) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; const m = /rgba?\(([^)]+)\)/.exec(c); if (m) { const p = m[1].split(',').map(x => parseInt(x)); return '#' + p.slice(0, 3).map(x => (x || 0).toString(16).padStart(2, '0')).join(''); } return '#000000'; }

  UI.align = function (kind) {
    const sel = S.selected(); if (!sel.length) return;
    const d = S.design();
    let box;
    if (sel.length === 1) box = { x: 0, y: 0, w: d.w, h: d.h };
    else { const xs = sel.map(e => e.x), ys = sel.map(e => e.y), x2 = sel.map(e => e.x + e.w), y2 = sel.map(e => e.y + e.h); box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...x2) - Math.min(...xs), h: Math.max(...y2) - Math.min(...ys) }; }
    sel.forEach(e => {
      if (kind === 'left') e.x = box.x;
      else if (kind === 'right') e.x = box.x + box.w - e.w;
      else if (kind === 'hcenter') e.x = Math.round(box.x + (box.w - e.w) / 2);
      else if (kind === 'top') e.y = box.y;
      else if (kind === 'bottom') e.y = box.y + box.h - e.h;
      else if (kind === 'vcenter') e.y = Math.round(box.y + (box.h - e.h) / 2);
    });
    S.commit('alinear'); IS.editor.redraw(); IS.editor.redrawOverlay(); UI.renderInspector();
  };
  UI.distribute = function (axis) {
    const sel = S.selected(); if (sel.length < 3) { U.toast('Selecciona al menos 3 elementos'); return; }
    const sorted = sel.slice().sort((a, b) => axis === 'h' ? a.x - b.x : a.y - b.y);
    const first = sorted[0], last = sorted[sorted.length - 1];
    const total = axis === 'h' ? (last.x + last.w - first.x) : (last.y + last.h - first.y);
    const sum = sorted.reduce((s, e) => s + (axis === 'h' ? e.w : e.h), 0);
    const gap = (total - sum) / (sorted.length - 1);
    let pos = axis === 'h' ? first.x : first.y;
    sorted.forEach(e => { if (axis === 'h') { e.x = Math.round(pos); pos += e.w + gap; } else { e.y = Math.round(pos); pos += e.h + gap; } });
    S.commit('distribuir'); IS.editor.redraw(); IS.editor.redrawOverlay();
  };

  UI.editTextInline = function (e) {
    UI.showTab('edit');
    setTimeout(() => { const ta = $('#tab-edit textarea'); if (ta) { ta.focus(); ta.select(); } }, 60);
  };
  UI.focusTextEditor = function () { UI.editTextInline(); };

  UI.refreshInspectorValues = function () { if (currentTab === 'edit') { /* values already live */ } };

  /* ================= layers ================= */
  UI.renderLayers = function () {
    const pane = $('#tab-layers'); pane.innerHTML = '';
    const list = el('div', { class: 'layers' });
    const arr = S.scene().elements;
    if (!arr.length) list.appendChild(el('p', { class: 'hint', text: 'Esta escena está vacía. Añade elementos desde la pestaña “Añadir”.' }));
    arr.slice().reverse().forEach(e => {
      const row = el('div', { class: 'layer' + (S.sel.ids.includes(e.id) ? ' on' : '') }, [
        el('button', { class: 'ly-btn', text: e.visible ? '👁️' : '🚫', title: 'Visibilidad', onclick: ev => { ev.stopPropagation(); e.visible = !e.visible; S.commit('visibilidad'); UI.syncAfterChange(); } }),
        el('button', { class: 'ly-btn', text: e.locked ? '🔒' : '🔓', title: 'Bloquear', onclick: ev => { ev.stopPropagation(); e.locked = !e.locked; S.commit('bloquear'); UI.syncAfterChange(); } }),
        el('span', { class: 'ly-name', text: e.name || typeName(e) }),
        el('button', { class: 'ly-btn', text: '🔼', title: 'Subir', onclick: ev => { ev.stopPropagation(); S.moveLayer(e.id, 1); UI.syncAfterChange(); } }),
        el('button', { class: 'ly-btn', text: '🔽', title: 'Bajar', onclick: ev => { ev.stopPropagation(); S.moveLayer(e.id, -1); UI.syncAfterChange(); } })
      ]);
      row.addEventListener('click', ev => { S.select([e.id], ev.shiftKey); UI.renderLayers(); });
      list.appendChild(row);
    });
    pane.appendChild(el('div', { class: 'psec' }, [el('h3', { text: 'Capas (' + arr.length + ')' }), list]));
    pane.appendChild(el('div', { class: 'psec' }, [el('div', { class: 'grid2' }, [
      el('button', { class: 'btn sm', text: 'Seleccionar todo', onclick: () => { S.selectAll(); UI.renderAll(); } }),
      el('button', { class: 'btn sm', text: 'Deseleccionar', onclick: () => { S.select([]); UI.renderAll(); } })
    ])]));
  };

  /* ================= scenes strip ================= */
  let _scenesT = null;
  UI.renderScenesSoon = function () { clearTimeout(_scenesT); _scenesT = setTimeout(UI.renderScenes, 320); };
  UI.renderScenes = function () {
    const strip = $('#scenesStrip'); if (!strip) return;
    strip.innerHTML = '';
    const dd = S.design();
    const th = 76, tw = Math.round(th * dd.w / dd.h);
    S.project.scenes.forEach((sc, i) => {
      const c = el('canvas', { class: 'thumb', style: { width: tw + 'px', height: th + 'px' } });
      const card = el('div', { class: 'scene-card' + (sc.id === S.sel.sceneId ? ' on' : ''), title: sc.name, style: { width: 'auto' } }, [
        c,
        el('span', { class: 'sc-idx', text: String(i + 1) }),
        el('div', { class: 'sc-actions' }, [
          el('button', { text: '⧉', title: 'Duplicar', onclick: ev => { ev.stopPropagation(); S.duplicateScene(sc.id); UI.renderAll(); } }),
          el('button', { text: '🗑️', title: 'Eliminar', onclick: ev => { ev.stopPropagation(); S.deleteScene(sc.id); UI.renderAll(); } })
        ]),
        el('div', { class: 'sc-foot' }, [el('span', { text: sc.name }), el('span', { text: (sc.durationMs / 1000).toFixed(1) + 's' })])
      ]);
      card.addEventListener('click', () => { S.setScene(sc.id); UI.renderAll(); });
      strip.appendChild(card);
      requestAnimationFrame(() => { try { R.thumb(c, S.project, sc, tw, th); } catch (e) {} });
    });
    strip.appendChild(el('button', { class: 'scene-add', text: '＋', title: 'Añadir escena', onclick: () => { S.addScene(false); UI.renderAll(); } }));
    UI.updateTransport();
  };

  /* ================= templates view ================= */
  UI.renderTemplates = function () {
    const vg = $('#videoTplGrid'), sg = $('#sceneTplGrid');
    if (!vg || !sg) return;
    vg.innerHTML = ''; sg.innerHTML = '';
    L.VIDEO_TEMPLATES.forEach(t => {
      const cv = el('canvas', { class: 'pv' });
      const card = el('div', { class: 'tpl-card' }, [cv, el('div', { class: 'info' }, [el('h4', { text: t.name }), el('p', { text: t.desc }), el('div', { class: 'tags' }, t.tags.map(x => el('span', { class: 'tag', text: x }))), el('button', { class: 'btn sm primary block', text: 'Usar plantilla', onclick: () => UI.useVideoTemplate(t.id) })])]);
      vg.appendChild(card);
      requestAnimationFrame(() => { try { renderPreview(cv, t.aspect, (proj, sc) => t.build({ w: proj.aspectW, h: proj.aspectH }), 0); } catch (e) {} });
    });
    L.SCENE_TEMPLATES.forEach(t => {
      const cv = el('canvas', { class: 'pv' });
      const card = el('div', { class: 'tpl-card' }, [cv, el('div', { class: 'info' }, [el('h4', { text: t.name }), el('div', { class: 'tags' }, t.tags.map(x => el('span', { class: 'tag', text: x }))), el('button', { class: 'btn sm block', text: 'Añadir a la escena', onclick: () => { UI.showView('editor'); UI.applySceneTemplate(t.id); } })])]);
      sg.appendChild(card);
      requestAnimationFrame(() => { try { const dd = S.design(); renderPreview(cv, S.project.settings.aspect, () => t.build({ w: dd.w, h: dd.h })); } catch (e) {} });
    });
  };
  function renderPreview(canvas, aspect, buildFn, sceneIdx) {
    // build a temp project so templates render exactly like they will in the editor
    const A = S.ASPECTS[aspect] || S.ASPECTS['16:9'];
    const fake = { version: 3, meta: {}, settings: { aspect, accent: '#6c5ce7' }, scenes: [{ id: 'x', durationMs: 9000, background: { kind: 'mesh', color: '#08081a', from: '#141433', to: '#05050f' }, elements: [] }] };
    fake.aspectW = A.w; fake.aspectH = A.h;
    fake.scenes[0].elements = buildFn(fake).map(e => Object.assign({}, e, { anim: { in: { preset: 'none' }, out: { preset: 'none' } } }));
    const rect = canvas.getBoundingClientRect();
    R.thumb(canvas, fake, fake.scenes[0], Math.max(200, rect.width || 320), Math.max(112, (rect.width || 320) * A.h / A.w));
  }
  UI.useVideoTemplate = function (id) {
    const t = L.VIDEO_TEMPLATES.find(x => x.id === id);
    if (!t) return;
    U.confirmDialog('Usar plantilla', 'Se reemplazará el proyecto actual por “' + t.name + '”. ¿Continuar?', () => {
      const A = S.ASPECTS[t.aspect] || S.ASPECTS['16:9'];
      // OJO: los builders leen d.w/d.h (no solo aspectW/aspectH). Pasar ambos.
      const fake = { w: A.w, h: A.h, aspectW: A.w, aspectH: A.h };
      const scenes = t.build(fake);
      const proj = S.migrate({ version: 3, meta: { title: t.name, createdAt: Date.now(), updatedAt: Date.now() }, settings: { aspect: t.aspect, fps: 30, transition: 'fade', transitionMs: 450, bg: '#070714', accent: '#6c5ce7' }, scenes });
      S.loadProject(proj);
      IS.editor.layout(); UI.renderAll(); UI.showView('editor');
      U.toast('🎞️ Plantilla aplicada: ' + t.name);
    }, 'Usar plantilla');
  };

  /* ================= helpers ================= */
  UI.syncAfterChange = function () { IS.editor.redraw(); IS.editor.redrawOverlay(); UI.renderLayersSoon(); UI.renderScenesSoon(); };
  let _layersT = null; UI.renderLayersSoon = function () { clearTimeout(_layersT); _layersT = setTimeout(() => { if (currentTab === 'layers') UI.renderLayers(); }, 250); };
  let _editT = null; UI.renderEditSoon = function () { clearTimeout(_editT); _editT = setTimeout(() => { if (currentTab === 'edit') UI.renderInspector(); }, 200); };

  UI.renderAll = function () { UI.renderScenes(); if (currentTab === 'add') UI.renderLibrary(); if (currentTab === 'edit') UI.renderInspector(); if (currentTab === 'scene') UI.renderSceneTab(); if (currentTab === 'layers') UI.renderLayers(); UI.updateTransport(); };

  /* ================= init ================= */
  UI.init = function () {
    // aspect selector
    const as = $('#aspectSel');
    as.innerHTML = '';
    Object.keys(S.ASPECTS).forEach(k => as.appendChild(el('option', { value: k, text: S.ASPECTS[k].label, selected: S.project.settings.aspect === k })));

    $('#btnGrid').classList.toggle('on', !!S.prefs.grid);
    $('#btnSnap').classList.toggle('on', !!S.prefs.snap);
    $('#btnGuides').classList.toggle('on', !!S.prefs.guides);
    $('#btnLoop').classList.toggle('on', S.runtime.loop);
    S.runtime.wholeVideo = false;
    document.documentElement.setAttribute('data-theme', S.prefs.theme || 'dark');

    UI.renderAll();
    UI.showTab('add');

    S.on('project', () => { UI.renderScenesSoon(); UI.updateTransport(); });
    S.on('selection', () => { UI.renderInspector(); UI.renderLayers(); UI.redrawStageOnly(); if (window.innerWidth <= 860) $('#panel').classList.add('open'); });
    S.on('changed', () => { if (!S.runtime.playing) { UI.renderScenesSoon(); } });
    S.on('saved', () => setSaveState(false));
    S.on('settings', () => { const a = $('#aspectSel'); if (a) a.value = S.project.settings.aspect; });

    if (window.innerWidth <= 860) $('#panelToggle').style.display = 'grid';
  };

  let _saveT = null;
  function setSaveState(dirty) {
    clearTimeout(_saveT);
    _saveT = setTimeout(() => {
      const s = $('#saveState'); if (!s) return;
      s.textContent = dirty ? 'Editando…' : 'Guardado ✓';
      s.classList.toggle('dirty', !!dirty);
    }, dirty ? 0 : 300);
  }
  S.on('changed', () => setSaveState(true));

  // expose small helpers used by other modules
  UI.typeName = typeName; UI.componentTemplate = componentTemplate; UI.setSaveState = setSaveState;

  IS.ui = UI;
  IS.render._cb = () => IS.editor.redraw();
})(window.IS = window.IS || {});
