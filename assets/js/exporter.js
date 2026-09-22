/* ============================================================
   InfoStudio Pro — exporter.js
   Video recording, PNG frames (ZIP), subtitles, standalone HTML
   deck and text-to-speech narration.
   ============================================================ */
(function (IS) {
  'use strict';
  const U = IS.util, S = IS.store, R = IS.render;
  const { el } = U;

  const E = {};

  /* ---------------- codecs ---------------- */
  const CODECS = [
    { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4', label: 'MP4 (H.264 + AAC)' },
    { mime: 'video/mp4', ext: 'mp4', label: 'MP4' },
    { mime: 'video/webm;codecs=vp9,opus', ext: 'webm', label: 'WebM (VP9 + Opus)' },
    { mime: 'video/webm;codecs=vp8,opus', ext: 'webm', label: 'WebM (VP8 + Opus)' },
    { mime: 'video/webm', ext: 'webm', label: 'WebM' }
  ];
  function bestCodec() {
    if (typeof MediaRecorder === 'undefined') return null;
    for (const c of CODECS) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c.mime)) return c;
    return null;
  }
  function supportedMimes() { if (typeof MediaRecorder === 'undefined') return []; return CODECS.filter(c => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c.mime)); }

  /* ---------------- export menu ---------------- */
  E.openMenu = function () {
    const codec = bestCodec();
    const body = el('div', {}, [
      el('div', { class: 'psec', style: { padding: '0 0 14px' } }, [
        el('h3', { text: '🎥 Vídeo' }),
        el('p', { class: 'hint', style: { marginBottom: '10px' }, text: codec ? 'Grabación en tiempo real a ' + codec.label + '. Activa el micrófono si quieres narrar en directo.' : 'Tu navegador no soporta MediaRecorder. Usa la secuencia PNG + ffmpeg.' }),
        el('div', { class: 'row' }, [el('label', { text: 'Calidad' }), el('select', { class: 'inp', id: 'expQuality' }, [el('option', { value: '1', text: 'Alta (1x)' }), el('option', { value: '0.75', text: 'Media (0,75x)' }), el('option', { value: '0.5', text: 'Rápida (0,5x)' })])]),
        el('div', { class: 'row' }, [el('label', { text: 'FPS' }), el('select', { class: 'inp', id: 'expFps' }, [[24, '24'], [30, '30'], [60, '60']].map(o => el('option', { value: o[0], text: o[1] + ' fps', selected: o[0] === (S.project.settings.fps || 30) })))]),
        el('label', { style: { display: 'flex', gap: '7px', alignItems: 'center', fontSize: '11.5px', color: 'var(--text2)', margin: '6px 0 10px' } }, [
          el('input', { type: 'checkbox', id: 'expMic' }), ' Grabar micrófono (narración en directo)'
        ]),
        el('button', { class: 'btn primary block', text: '🔴 Grabar vídeo', disabled: !codec, onclick: () => { const q = +document.getElementById('expQuality').value, fps = +document.getElementById('expFps').value, mic = document.getElementById('expMic').checked; U.closeModal(); E.recordVideo({ scale: q, fps, mic }); } })
      ]),
      el('div', { class: 'psec', style: { padding: '14px 0' } }, [
        el('h3', { text: '🖼️ Imágenes' }),
        el('div', { class: 'grid2' }, [
          el('button', { class: 'btn sm', text: 'PNG de la escena', onclick: () => { U.closeModal(); E.exportScenePNG(); } }),
          el('button', { class: 'btn sm', text: 'Secuencia PNG (ZIP)', onclick: () => { U.closeModal(); E.exportSequence(); } }),
          el('button', { class: 'btn sm', text: 'Miniatura 1280×720', onclick: () => { U.closeModal(); E.exportThumbnail(); } }),
          el('button', { class: 'btn sm', text: 'PNG de cada escena', onclick: () => { U.closeModal(); E.exportAllScenesPNG(); } })
        ])
      ]),
      el('div', { class: 'psec', style: { padding: '14px 0' } }, [
        el('h3', { text: '📝 Texto y datos' }),
        el('div', { class: 'grid2' }, [
          el('button', { class: 'btn sm', text: 'Subtítulos .srt', onclick: () => { U.closeModal(); E.exportSubs('srt'); } }),
          el('button', { class: 'btn sm', text: 'Subtítulos .vtt', onclick: () => { U.closeModal(); E.exportSubs('vtt'); } }),
          el('button', { class: 'btn sm', text: 'Guion .md', onclick: () => { U.closeModal(); E.exportScript(); } }),
          el('button', { class: 'btn sm', text: 'Proyecto .json', onclick: () => { U.closeModal(); IS.ui.saveProject(); } })
        ])
      ]),
      el('div', { class: 'psec', style: { padding: '14px 0 0' } }, [
        el('h3', { text: '🌐 HTML autónomo' }),
        el('p', { class: 'hint', style: { marginBottom: '10px' }, text: 'Un único archivo .html con el vídeo “en vivo”: imágenes de cada escena, transiciones, navegación y guion. Ideal para embeber o enviar por correo.' }),
        el('button', { class: 'btn sm', text: '🌐 Generar HTML', onclick: () => { U.closeModal(); E.exportHTML(); } })
      ])
    ]);
    U.openModal('Exportar', body, [el('button', { class: 'btn', text: 'Cerrar', onclick: U.closeModal })]);
  };

  /* ---------------- offscreen render loop ---------------- */
  function makeCanvas(scale) {
    const a = S.ASPECTS[S.project.settings.aspect] || S.ASPECTS['16:9'];
    const cv = document.createElement('canvas');
    cv.width = Math.round(a.w * scale); cv.height = Math.round(a.h * scale);
    return { cv, ctx: cv.getContext('2d'), W: a.w, H: a.h };
  }

  /* frame-accurate iteration over the whole timeline */
  function timelineFrames(fps, cb) {
    const scenes = S.project.scenes;
    const total = S.totalDuration();
    const step = 1000 / fps;
    let t = 0, n = 0;
    const frames = [];
    while (t < total - 1) { frames.push(t); t += step; n++; }
    return { total, frames };
  }
  function renderAt(ctx, cv, W, H, tGlobal, opts) {
    const scenes = S.project.scenes;
    let acc = 0, idx = 0;
    for (let i = 0; i < scenes.length; i++) { const d = scenes[i].durationMs || 4000; if (tGlobal < acc + d || i === scenes.length - 1) { idx = i; break; } acc += d; }
    const sc = scenes[idx];
    const tLocal = U.clamp(tGlobal - acc, 0, sc.durationMs);
    R.renderStage(ctx, W, H, cv.width, cv.height, S.project, sc, tLocal, opts);
    return { scene: sc, idx, tLocal };
  }

  /* ---------------- video recording ---------------- */
  E.recordVideo = async function (opts) {
    opts = Object.assign({ scale: 1, fps: 30, mic: false }, opts || {});
    const codec = bestCodec();
    if (!codec) { U.toast('❌ MediaRecorder no disponible'); return; }
    const { cv, ctx, W, H } = makeCanvas(opts.scale);

    let micStream = null;
    if (opts.mic) {
      try { micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { U.toast('⚠️ Sin acceso al micrófono: se graba sin audio'); }
    }

    const vStream = cv.captureStream ? cv.captureStream(opts.fps) : null;
    if (!vStream) { U.toast('❌ captureStream no soportado'); return; }
    const tracks = vStream.getVideoTracks();
    if (micStream) micStream.getAudioTracks().forEach(t => tracks.push(t));
    const stream = new MediaStream(tracks);

    let rec;
    try { rec = new MediaRecorder(stream, { mimeType: codec.mime, videoBitsPerSecond: Math.round(6_000_000 * opts.scale * opts.scale) }); }
    catch (e) { rec = new MediaRecorder(stream); }
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };

    const prog = U.progress('Grabando vídeo…');
    const total = S.totalDuration();
    // 3-2-1 countdown
    await countdown(prog, 3);

    return new Promise(resolve => {
      rec.onstop = () => {
        prog.done();
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: codec.mime });
        U.download(fileName() + '.' + codec.ext, blob);
        U.toast('🎥 Vídeo exportado (' + (blob.size / 1048576).toFixed(1) + ' MB)');
        resolve(blob);
      };
      rec.start(250);
      const t0 = performance.now();
      IS.ui.setPlaying(true); IS.ui.setPlaying(false);
      function loop(now) {
        const t = now - t0;
        renderAt(ctx, cv, W, H, t, { quality: 1 });
        prog.set(Math.min(1, t / total), 'Grabando… ' + Math.round(t / 1000) + 's / ' + Math.round(total / 1000) + 's');
        if (t >= total) { setTimeout(() => { try { rec.stop(); } catch (e) { prog.done(); } }, 350); return; }
        requestAnimationFrame(loop);
      }
      // draw first frame, then start
      renderAt(ctx, cv, W, H, 0, { quality: 1 });
      requestAnimationFrame(loop);
    });
  };

  function countdown(prog, n) {
    return new Promise(res => {
      let i = n;
      const tick = () => {
        if (i <= 0) return res();
        prog.set(0, 'Empieza en ' + i + '…');
        i--; setTimeout(tick, 850);
      };
      tick();
    });
  }

  function fileName() {
    return (S.project.meta.title || 'infostudio').replace(/[^\w\-]+/g, '_').slice(0, 60) || 'infostudio';
  }

  /* ---------------- PNG exports ---------------- */
  E.exportScenePNG = function () {
    const a = S.ASPECTS[S.project.settings.aspect];
    const { cv, ctx, W, H } = makeCanvas(1);
    R.renderStage(ctx, W, H, cv.width, cv.height, S.project, S.scene(), S.runtime.t, {});
    cv.toBlob(b => { U.download(fileName() + '_escena.png', b); U.toast('🖼️ PNG exportado'); });
  };
  E.exportAllScenesPNG = function () {
    const prog = U.progress('Exportando escenas…');
    S.project.scenes.forEach((sc, i) => {
      const { cv, ctx, W, H } = makeCanvas(1);
      R.renderStage(ctx, W, H, cv.width, cv.height, S.project, sc, (sc.durationMs || 4000) * .55, {});
      cv.toBlob(b => U.download(fileName() + '_escena' + String(i + 1).padStart(2, '0') + '.png', b));
      prog.set((i + 1) / S.project.scenes.length);
    });
    setTimeout(() => { prog.done(); U.toast('🖼️ Escenas exportadas'); }, 400);
  };
  E.exportThumbnail = function () {
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720;
    const ctx = cv.getContext('2d');
    const A = S.ASPECTS[S.project.settings.aspect];
    const s = Math.min(1280 / A.w, 720 / A.h);
    ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, 1280, 720);
    ctx.save(); ctx.translate((1280 - A.w * s) / 2, (720 - A.h * s) / 2); ctx.scale(s, s);
    R.frame(ctx, S.project, S.scene(), (S.scene().durationMs || 4000) * .55, {});
    ctx.restore();
    cv.toBlob(b => { U.download(fileName() + '_thumb.jpg', b); U.toast('🖼️ Miniatura 1280×720'); }, 'image/jpeg', .92);
  };

  /* ---------------- PNG sequence (ZIP) ---------------- */
  E.exportSequence = async function () {
    const fps = S.project.settings.fps || 30;
    const { total, frames } = timelineFrames(fps);
    const prog = U.progress('Renderizando ' + frames.length + ' fotogramas…');
    const files = [];
    const reuse = makeCanvas(1);
    for (let i = 0; i < frames.length; i++) {
      renderAt(reuse.ctx, reuse.cv, reuse.W, reuse.H, frames[i], {});
      const blob = await new Promise(r => reuse.cv.toBlob(r, 'image/png'));
      files.push({ name: 'frame_' + String(i).padStart(5, '0') + '.png', data: new Uint8Array(await blob.arrayBuffer()) });
      if (i % 5 === 0 || i === frames.length - 1) { prog.set((i + 1) / frames.length, 'Fotograma ' + (i + 1) + ' / ' + frames.length); await new Promise(r => setTimeout(r)); }
    }
    prog.set(1, 'Comprimiendo ZIP…');
    await new Promise(r => setTimeout(r));
    const zip = zipStore(files);
    U.download(fileName() + '_frames.zip', zip, 'application/zip');
    prog.done();
    U.toast('📦 ' + files.length + ' fotogramas exportados — móntalos con ffmpeg');
  };

  /* minimal ZIP (stored, no compression) */
  function zipStore(files) {
    const enc = new TextEncoder();
    const chunks = []; const central = []; let offset = 0;
    const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
    const crc32 = (buf) => { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    files.forEach(f => {
      const name = enc.encode(f.name);
      const crc = crc32(f.data);
      const local = new Uint8Array(30 + name.length);
      const dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0, true); dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true); dv.setUint16(12, 0, true); dv.setUint32(14, crc, true);
      dv.setUint32(18, f.data.length, true); dv.setUint32(22, f.data.length, true);
      dv.setUint16(26, name.length, true); dv.setUint16(28, 0, true);
      local.set(name, 30);
      chunks.push(local, f.data);
      const cd = new Uint8Array(46 + name.length);
      const dv2 = new DataView(cd.buffer);
      dv2.setUint32(0, 0x02014b50, true); dv2.setUint16(4, 20, true); dv2.setUint16(6, 20, true);
      dv2.setUint16(8, 0, true); dv2.setUint16(10, 0, true); dv2.setUint16(12, 0, true); dv2.setUint16(14, 0, true);
      dv2.setUint32(16, crc, true); dv2.setUint32(20, f.data.length, true); dv2.setUint32(24, f.data.length, true);
      dv2.setUint16(28, name.length, true); dv2.setUint16(30, 0, true); dv2.setUint16(32, 0, true);
      dv2.setUint16(34, 0, true); dv2.setUint16(36, 0, true); dv2.setUint32(38, 0, true); dv2.setUint32(42, offset, true);
      cd.set(name, 46);
      central.push(cd);
      offset += local.length + f.data.length;
    });
    const centralSize = central.reduce((a, c) => a + c.length, 0);
    const end = new Uint8Array(22); const dv3 = new DataView(end.buffer);
    dv3.setUint32(0, 0x06054b50, true); dv3.setUint16(8, files.length, true); dv3.setUint16(10, files.length, true);
    dv3.setUint32(12, centralSize, true); dv3.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, end], { type: 'application/zip' });
  }

  /* ---------------- subtitles ---------------- */
  function subCues() {
    const cues = []; let acc = 0;
    S.project.scenes.forEach((sc, i) => {
      const d = sc.durationMs || 4000;
      const txt = (sc.narration || '').trim();
      if (txt) cues.push({ start: acc, end: acc + d - 120, text: txt });
      acc += d;
    });
    return cues;
  }
  const ts = (ms, comma) => {
    ms = Math.max(0, Math.round(ms));
    const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000), x = ms % 1000;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + (comma ? ',' : '.') + String(x).padStart(3, '0');
  };
  E.exportSubs = function (fmt) {
    const cues = subCues();
    if (!cues.length) { U.toast('⚠️ Añade locución en las escenas para generar subtítulos'); return; }
    let out = '';
    if (fmt === 'vtt') { out = 'WEBVTT\n\n'; cues.forEach(c => { out += ts(c.start) + ' --> ' + ts(c.end) + '\n' + c.text + '\n\n'; }); }
    else { cues.forEach((c, i) => { out += (i + 1) + '\n' + ts(c.start, true) + ' --> ' + ts(c.end, true) + '\n' + c.text + '\n\n'; }); }
    U.download(fileName() + '.' + fmt, out, 'text/plain');
    U.toast('📝 Subtítulos .' + fmt + ' exportados (' + cues.length + ' líneas)');
  };

  /* ---------------- script (markdown) ---------------- */
  E.exportScript = function () {
    let out = '# ' + (S.project.meta.title || 'Guion') + '\n\n';
    out += '**Formato:** ' + S.project.settings.aspect + ' · **FPS:** ' + S.project.settings.fps + ' · **Duración:** ' + (S.totalDuration() / 1000).toFixed(1) + ' s\n\n---\n\n';
    S.project.scenes.forEach((sc, i) => {
      out += '## Escena ' + (i + 1) + ' — ' + sc.name + '  (' + (sc.durationMs / 1000).toFixed(1) + ' s)\n\n';
      if (sc.narration) out += '**Locución:** ' + sc.narration + '\n\n';
      out += '**Elementos:**\n';
      sc.elements.forEach(e => {
        let detail = '';
        const p = e.props || {};
        if (e.type === 'text') detail = ': “' + String(p.text || '').split('\n')[0] + '”';
        else if (e.type === 'stat') detail = ': ' + p.value + (p.suffix || '') + ' — ' + (p.label || '');
        else if (e.type === 'chart') detail = ': ' + p.kind + ' (' + (p.data || []).length + ' datos)';
        else if (e.type === 'bullets') detail = ': ' + (p.items || []).length + ' puntos';
        out += '- ' + (e.name || e.type) + detail + ' · entrada: ' + (e.anim.in.preset) + ' (' + e.anim.in.delay + 'ms + ' + e.anim.in.dur + 'ms)\n';
      });
      out += '\n';
    });
    U.download(fileName() + '_guion.md', out, 'text/markdown');
    U.toast('📝 Guion exportado');
  };

  /* ---------------- standalone HTML deck ---------------- */
  E.exportHTML = async function () {
    const prog = U.progress('Generando HTML…');
    const A = S.ASPECTS[S.project.settings.aspect];
    const slides = [];
    const { cv, ctx, W, H } = makeCanvas(1);
    for (let i = 0; i < S.project.scenes.length; i++) {
      const sc = S.project.scenes[i];
      R.renderStage(ctx, W, H, cv.width, cv.height, S.project, sc, (sc.durationMs || 4000) * .6, {});
      const url = cv.toDataURL('image/jpeg', .9);
      slides.push({ img: url, dur: sc.durationMs || 4000, name: sc.name, narration: sc.narration || '', transition: sc.transition || 'fade' });
      prog.set((i + 1) / S.project.scenes.length);
    }
    const title = U.escapeHtml(S.project.meta.title || 'Presentación');
    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>
:root{color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:#05050f;color:#fff;font-family:system-ui,sans-serif;overflow:hidden}
#stage{position:fixed;inset:0;display:grid;place-items:center}
.slide{grid-area:1/1;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .45s ease}
.slide.on{opacity:1}
#cap{position:fixed;left:0;right:0;bottom:64px;text-align:center;padding:0 6vw;font-size:clamp(14px,2.2vw,26px);text-shadow:0 2px 12px #000;pointer-events:none;opacity:0;transition:opacity .3s}
#cap.on{opacity:1}
#bar{position:fixed;left:0;right:0;bottom:0;height:56px;display:flex;align-items:center;gap:12px;padding:0 14px;background:rgba(5,5,16,.86);backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,.08)}
#bar button{background:none;border:0;color:#fff;font-size:18px;cursor:pointer;padding:6px 10px;border-radius:8px}
#bar button:hover{background:rgba(255,255,255,.1)}
#prog{flex:1;height:5px;background:#22224a;border-radius:4px;overflow:hidden}
#progf{height:100%;width:0;background:linear-gradient(90deg,#6c5ce7,#fd79a8)}
#lbl{font-size:12px;color:#aaa;min-width:96px;text-align:right;font-variant-numeric:tabular-nums}
</style></head><body>
<div id="stage">${slides.map((s, i) => `<img class="slide${i === 0 ? ' on' : ''}" src="${s.img}" alt="Escena ${i + 1}">`).join('')}</div>
<div id="cap"></div>
<div id="bar"><button id="prev" aria-label="Anterior">⏮️</button><button id="play" aria-label="Reproducir">▶️</button><button id="next" aria-label="Siguiente">⏭️</button><div id="prog"><div id="progf"></div></div><span id="lbl"></span></div>
<script>
var slides=${JSON.stringify(slides.map(s => ({ dur: s.dur, narration: s.narration, name: s.name })))};
var i=0,playing=false,t0=0,raf=null,elapsed=0;
var imgs=document.querySelectorAll('.slide'),cap=document.getElementById('cap'),pf=document.getElementById('progf'),lbl=document.getElementById('lbl');
function show(n){i=(n+slides.length)%slides.length;imgs.forEach(function(im,k){im.classList.toggle('on',k===i)});
var nar=slides[i].narration;cap.textContent=nar;cap.classList.toggle('on',!!nar);lbl.textContent=(i+1)+' / '+slides.length;progf.style.width='0%';}
function tick(now){if(!playing)return;if(!t0)t0=now;elapsed=now-t0;var d=slides[i].dur;
pf.style.width=Math.min(100,elapsed/d*100)+'%';if(elapsed>=d){t0=0;elapsed=0;if(i===slides.length-1){stop();}else show(i+1);}raf=requestAnimationFrame(tick);}
function play(){playing=true;document.getElementById('play').textContent='⏸️';t0=0;raf=requestAnimationFrame(tick);}
function stop(){playing=false;document.getElementById('play').textContent='▶️';if(raf)cancelAnimationFrame(raf);raf=null;}
document.getElementById('play').onclick=function(){playing?stop():play()};
document.getElementById('next').onclick=function(){stop();show(i+1);play()};
document.getElementById('prev').onclick=function(){stop();show(i-1);play()};
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){stop();show(i+1)}if(e.key==='ArrowLeft'){stop();show(i-1)}if(e.code==='Space'){e.preventDefault();playing?stop():play()}});
show(0);
<\/script></body></html>`;
    U.download(fileName() + '.html', html, 'text/html');
    prog.done();
    U.toast('🌐 HTML autónomo exportado');
  };

  /* ---------------- text to speech ---------------- */
  E.speakScene = function (sc) {
    if (!('speechSynthesis' in window)) { U.toast('❌ Síntesis de voz no disponible'); return; }
    const txt = (sc.narration || '').trim();
    if (!txt) { U.toast('⚠️ Esta escena no tiene locución'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'es-ES'; u.rate = 1; u.pitch = 1;
    const v = window.speechSynthesis.getVoices().find(x => /es/i.test(x.lang));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };
  E.stopSpeech = function () { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };

  E.supportedMimes = supportedMimes;
  E.bestCodec = bestCodec;
  IS.exporter = E;
})(window.IS = window.IS || {});
