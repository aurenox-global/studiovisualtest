/* ============================================================
   InfoStudio Pro — app.js
   Bootstrap, global keyboard shortcuts, drag & drop, PWA.
   ============================================================ */
(function (IS) {
  'use strict';
  const U = IS.util, S = IS.store;
  const { $ } = U;

  function init() {
    S.init();
    IS.editor.init();
    IS.ui.init();

    bindKeys();
    bindDrop();
    bindUnload();

    // deep link: open a shared project via #p=<base64>
    try {
      const m = /[#&]p=([^&]+)/.exec(location.hash || '');
      if (m) {
        const obj = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
        S.loadProject(obj, { save: false });
        IS.editor.layout(); IS.ui.renderAll();
        U.toast('📂 Proyecto compartido cargado');
      }
    } catch (e) { /* ignore */ }

    setTimeout(() => { IS.editor.layout(); IS.ui.renderAll(); }, 60);
    registerSW();
    console.log('%cInfoStudio Pro', 'font-weight:700;color:#6c5ce7', 'listo · v' + S.PROJECT_VERSION);
  }

  /* ---------------- keyboard ---------------- */
  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === 'Escape') { U.closeModal(); IS.exporter && IS.exporter.stopSpeech && IS.exporter.stopSpeech(); return; }

      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? S.redo() : S.undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); S.redo(); return; }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); IS.ui.saveProject(); return; }
      if (mod && e.key.toLowerCase() === 'a' && !typing) { e.preventDefault(); S.selectAll(); IS.ui.renderLayers(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); S.duplicateSelected(); return; }
      if (typing) return;

      if (e.code === 'Space') { e.preventDefault(); IS.editor.toggle(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); S.deleteSelected(); return; }

      // nudge
      if (e.key.startsWith('Arrow') && S.sel.ids.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        S.selected().forEach(el => {
          if (el.locked) return;
          const g = S.effectiveGeom(el);
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          if (dx || dy) S.kfSet(el, { x: Math.round(g.x + dx), y: Math.round(g.y + dy) });
        });
        S.commit('mover'); IS.editor.redraw(); IS.editor.redrawOverlay(); IS.ui.renderInspector();
        return;
      }

      // keyframes
      if (e.key.toLowerCase() === 'k' && S.sel.ids.length) { e.preventDefault(); IS.ui.captureKeyframe(); return; }
      if (e.key === ',') { e.preventDefault(); IS.ui.kfJump(-1); return; }
      if (e.key === '.') { e.preventDefault(); IS.ui.kfJump(1); return; }

      const map = { v: 'select', x: 'text', r: 'rect', o: 'ellipse', g: 'triangle', s: 'star', p: 'polygon', l: 'line', a: 'arrow', d: 'pen', i: 'image' };
      if (!mod && map[e.key.toLowerCase()]) { IS.editor.setTool(map[e.key.toLowerCase()]); return; }

      if (e.key === 'PageDown') { IS.ui.stepScene(1); }
      if (e.key === 'PageUp') { IS.ui.stepScene(-1); }
    });
  }

  /* ---------------- drag & drop images ---------------- */
  function bindDrop() {
    const area = $('#stageArea');
    if (!area) return;
    ['dragenter', 'dragover'].forEach(ev => area.addEventListener(ev, e => { e.preventDefault(); area.style.outline = '2px dashed #6c5ce7'; area.style.outlineOffset = '-6px'; }));
    ['dragleave', 'drop'].forEach(ev => area.addEventListener(ev, e => { e.preventDefault(); area.style.outline = 'none'; }));
    area.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      if (/^image\//.test(f.type)) {
        U.readAsDataURL(f).then(src => {
          const d = S.design(); const img = new Image();
          img.onload = () => {
            let w = Math.min(d.w * .42, 700), h = w * (img.naturalHeight / img.naturalWidth);
            if (h > d.h * .6) { h = d.h * .6; w = h * (img.naturalWidth / img.naturalHeight); }
            S.addElement(S.FACTORIES.image({ x: Math.round((d.w - w) / 2), y: Math.round((d.h - h) / 2), w: Math.round(w), h: Math.round(h), props: { src, fit: 'cover', radius: 18, shadow: true, frame: '#fff', frameWidth: 0 } }));
            U.toast('🖼️ Imagen añadida');
          };
          img.src = src;
        });
      } else if (/\.json$/i.test(f.name)) {
        U.readAsText(f).then(t => { try { S.loadProject(JSON.parse(t)); IS.editor.layout(); IS.ui.renderAll(); U.toast('📂 Proyecto cargado'); } catch (err) { U.toast('❌ JSON inválido'); } });
      }
    });
  }

  function bindUnload() {
    window.addEventListener('beforeunload', () => { try { S.saveLocal(); } catch (e) {} });
    window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') S.saveLocal(); });
  }

  /* ---------------- PWA ---------------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.IS = window.IS || {});
