/* ============================================================
   InfoStudio Pro — util.js
   DOM helpers, math, easing, colors, downloads, toast, modal.
   ============================================================ */
(function (IS) {
  'use strict';

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(n.style, attrs[k]);
      else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    }
    if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(c => { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  let _uid = 0;
  const uid = (p) => (p || 'id') + '_' + Date.now().toString(36) + (++_uid).toString(36) + Math.random().toString(36).slice(2, 6);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const round = (v, d) => { const m = Math.pow(10, d || 0); return Math.round(v * m) / m; };
  const deep = (o) => JSON.parse(JSON.stringify(o));
  const fmtTime = (ms) => {
    ms = Math.max(0, ms | 0);
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60, cs = Math.floor((ms % 1000) / 10);
    return (m ? m + ':' : '0:') + String(r).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
  };
  const debounce = (fn, ms) => { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); }; };
  const throttle = (fn, ms) => { let last = 0, timer; return function () { const now = Date.now(), a = arguments, c = this; if (now - last >= ms) { last = now; fn.apply(c, a); } else { clearTimeout(timer); timer = setTimeout(() => { last = Date.now(); fn.apply(c, a); }, ms - (now - last)); } }; };
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---- easing ---- */
  const ease = {
    linear:    t => t,
    outCubic:  t => 1 - Math.pow(1 - t, 3),
    inCubic:   t => t * t * t,
    inOutCubic:t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outQuint:  t => 1 - Math.pow(1 - t, 5),
    outBack:   t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    outBackSoft:t => 1 + 1.2 * Math.pow(t - 1, 3) + .2 * Math.pow(t - 1, 2),
    outElastic:t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1,
    outBounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; },
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2
  };
  const EASINGS = ['linear', 'outCubic', 'inCubic', 'inOutCubic', 'outQuint', 'outBack', 'outBackSoft', 'outElastic', 'outBounce', 'inOutSine'];

  /* ---- colors ---- */
  function hexToRgb(hex) {
    let h = String(hex || '#000').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const rgba = (hex, a) => { const c = hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a == null ? 1 : a})`; };
  function shade(hex, amt) { // amt -1..1
    const c = hexToRgb(hex);
    const f = (v) => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
    return '#' + [f(c.r), f(c.g), f(c.b)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function contrast(hex) { const c = hexToRgb(hex); const l = (.299 * c.r + .587 * c.g + .114 * c.b) / 255; return l > .62 ? '#101020' : '#ffffff'; }

  /* ---- files ---- */
  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function pickFile(accept, multiple) {
    return new Promise(res => {
      const i = el('input', { type: 'file', accept: accept || '', multiple: multiple ? 'multiple' : null, style: { display: 'none' } });
      i.addEventListener('change', () => { res(multiple ? Array.from(i.files) : (i.files[0] || null)); i.remove(); });
      document.body.appendChild(i); i.click();
    });
  }
  const readAsText = (f) => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsText(f); });
  const readAsDataURL = (f) => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });

  /* ---- UI chrome ---- */
  let _toastT;
  function toast(msg, ms) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove('show'), ms || 2400);
  }
  function openModal(title, bodyNode, footNodes) {
    const ov = $('#modal'); ov.innerHTML = '';
    const foot = el('div', { class: 'modal-foot' }, footNodes || [el('button', { class: 'btn', text: 'Cerrar', onclick: closeModal })]);
    ov.appendChild(el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
      el('div', { class: 'modal-hdr' }, [el('h3', { text: title }), el('button', { class: 'icon-btn', text: '✕', 'aria-label': 'Cerrar', onclick: closeModal })]),
      el('div', { class: 'modal-body' }, bodyNode), foot
    ]));
    ov.classList.add('show');
    const f = ov.querySelector('button,input,select,textarea'); if (f) f.focus();
  }
  function closeModal() { const ov = $('#modal'); ov.classList.remove('show'); ov.innerHTML = ''; }
  function confirmDialog(title, message, onYes, yesLabel) {
    openModal(title, el('p', { class: 'hint', style: { fontSize: '13px', color: 'var(--text2)' }, text: message }), [
      el('button', { class: 'btn', text: 'Cancelar', onclick: closeModal }),
      el('button', { class: 'btn danger', text: yesLabel || 'Continuar', onclick: () => { closeModal(); onYes(); } })
    ]);
  }
  function progress(title) {
    const ov = $('#progress'); ov.innerHTML = '';
    const fill = el('div', { class: 'pv-fill' });
    const label = el('p', { text: 'Preparando…' });
    ov.appendChild(el('div', { class: 'progress-box' }, [el('h3', { text: title, style: { margin: 0, fontSize: '15px' } }), el('div', { class: 'pv-bar' }, [fill]), label]));
    ov.classList.add('show');
    return {
      set(p, txt) { fill.style.width = Math.round(p * 100) + '%'; if (txt) label.textContent = txt; },
      done() { ov.classList.remove('show'); }
    };
  }
  function trapFocus(node) {
    node.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', node).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function fitText(ctx, text, maxW, baseSize, weight, family, maxLines) {
    let size = baseSize; const lines = [];
    const words = String(text || '').split(/\s+/);
    while (size > 8) {
      ctx.font = `${weight || 700} ${size}px ${family || 'sans-serif'}`;
      lines.length = 0; let cur = '';
      for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
      }
      if (cur) lines.push(cur);
      if (lines.length <= (maxLines || 99) || size <= 9) break;
      size -= 1;
    }
    return { size, lines };
  }

  function wrapLines(ctx, text, maxW) {
    const out = [];
    String(text || '').split('\n').forEach(par => {
      const words = par.split(/\s+/); let cur = '';
      for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && cur) { out.push(cur); cur = w; } else cur = test;
      }
      out.push(cur);
    });
    return out;
  }

  IS.util = { $, $$, el, uid, clamp, lerp, round, deep, fmtTime, debounce, throttle, escapeHtml,
    ease, EASINGS, hexToRgb, rgba, shade, contrast, download, pickFile, readAsText, readAsDataURL,
    toast, openModal, closeModal, confirmDialog, progress, trapFocus, fitText, wrapLines };
})(window.IS = window.IS || {});
