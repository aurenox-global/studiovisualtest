#!/usr/bin/env python3
"""Prueba de humo de InfoStudio Pro (Chromium headless vía Playwright).

Arranca un servidor estático sobre la carpeta del proyecto, recorre las
funciones principales y falla si aparece cualquier error de consola.

Uso:
    pip install playwright && playwright install chromium
    python3 tests/smoke.py

Salida: código 0 si todo pasa, 1 si hay errores. Imprime un resumen.
"""
import functools
import http.server
import json
import os
import socketserver
import sys
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("SMOKE_PORT", "8137"))
socketserver.TCPServer.allow_reuse_address = True


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):  # silencio
        pass


def serve():
    handler = functools.partial(_Quiet, directory=ROOT)
    with socketserver.TCPServer(("127.0.0.1", PORT), handler) as httpd:
        httpd.serve_forever()


def main():
    threading.Thread(target=serve, daemon=True).start()
    time.sleep(0.5)
    url = f"http://127.0.0.1:{PORT}/"
    errors, checks = [], []

    def ok(name, cond, detail=""):
        checks.append((name, bool(cond), detail))

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1600, "height": 900})
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.goto(url, wait_until="networkidle")

        ok("boot · IS expuesto", page.evaluate("() => !!window.IS"))
        ok("boot · módulos", page.evaluate("() => ['util','store','library','render','editor','ui','exporter'].every(k => !!IS[k])"))

        # --- Regresión: usar una plantilla de vídeo genera geometría válida ---
        geo = page.evaluate("""() => {
            const S = IS.store, L = IS.library;
            const t = L.VIDEO_TEMPLATES.find(x => x.id === 'vt-tutorial');
            const A = S.ASPECTS[t.aspect];
            const scenes = t.build({ w: A.w, h: A.h, aspectW: A.w, aspectH: A.h });
            const bad = [];
            scenes.forEach(sc => sc.elements.forEach(e => {
                if (![e.x, e.y, e.w, e.h].every(Number.isFinite)) bad.push(e.name || e.type);
            }));
            return { scenes: scenes.length, elements: scenes.reduce((a, sc) => a + sc.elements.length, 0), bad };
        }""")
        ok("plantillas de vídeo · geometría válida", not geo["bad"] and geo["scenes"] == 5 and geo["elements"] > 10, json.dumps(geo))

        page.evaluate("() => IS.ui.showView('templates')")
        page.wait_for_timeout(600)
        ok("galería de plantillas", page.evaluate("() => document.querySelectorAll('#view-templates .tpl-card').length") >= 13)

        page.evaluate("() => IS.ui.showView('editor')")
        page.wait_for_timeout(200)
        # inspector: el bloque de keyframes aparece al seleccionar un elemento
        insp = page.evaluate("""() => {
            const S = IS.store;
            S.newProject();
            S.addElement(S.FACTORIES.text({ x: 200, y: 200, w: 600, h: 120 }));
            IS.ui.showTab('edit');
            return Array.from(document.getElementById('tab-edit').querySelectorAll('h3')).map(h => h.textContent);
        }""")
        ok("inspector · sección de keyframes", any('Fotogramas clave' in t for t in insp), json.dumps(insp))
        canvas = page.evaluate("""() => {
            const c = document.getElementById('stageCanvas');
            if (!c) return { ok: false };
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            let nonzero = 0;
            for (let i = 3; i < d.length; i += 4) if (d[i] > 0) nonzero++;
            return { ok: c.width > 0 && c.height > 0, painted: nonzero };
        }""")
        ok("lienzo pintado", canvas.get("ok") and canvas.get("painted", 0) > 100, json.dumps(canvas))

        # --- Regresión: fotogramas clave (keyframes por propiedad) ---
        kf = page.evaluate("""() => {
            const S = IS.store;
            S.newProject();
            const e = S.FACTORIES.shape({ x: 100, y: 200, w: 300, h: 150, props: { kind: 'rect', fill: '#00b894', fillOn: true, radius: 12 } });
            S.addElement(e);
            S.select([e.id]);
            S.runtime.t = 0; S.captureKeyframe(0);
            S.runtime.t = 2000;
            const el = S.elementById(e.id);
            S.kfSet(el, { x: 900, y: 600 });            // crea keyframe en 2000
            const g = t => S.effectiveGeom(el, t);
            const out = { n: el.keyframes.length, x0: Math.round(g(0).x), x1: Math.round(g(1000).x), x2: Math.round(g(2000).x) };
            const bad = S.sanitizeKeyframes([{ t: 'x', props: null }, { t: 500, props: { x: NaN } }, null], el);
            out.bad = bad.length; out.badT = bad[0] ? bad[0].t : null;
            return out;
        }""")
        ok("keyframes · 2 capturados", kf["n"] == 2, json.dumps(kf))
        ok("keyframes · interpolación", kf["x0"] == 100 and kf["x2"] == 900 and 100 < kf["x1"] < 900, json.dumps(kf))
        ok("keyframes · saneado", kf["bad"] == 1 and kf["badT"] == 500, json.dumps(kf))

        # el render usa la geometría interpolada en cada instante
        render_kf = page.evaluate("""() => {
            const S = IS.store;
            const sample = (t) => {
                const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
                const ctx = c.getContext('2d');
                IS.render.frame(ctx, S.project, S.scene(), t, {});
                const d = ctx.getImageData(0, 0, c.width, c.height).data;
                // checksum de color barato (muestrea 1 de cada 16 píxeles)
                let sum = 0, n = 0;
                for (let i = 0; i < d.length; i += 64) { sum = (sum + d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7) % 2147483647; n++; }
                return { n: n, sum: sum };
            };
            return { a: sample(0), b: sample(2000) };
        }""")
        ok("keyframes · render anima", render_kf["a"]["sum"] != render_kf["b"]["sum"], json.dumps(render_kf))

        page.evaluate("() => IS.ui.showView('help')")
        page.wait_for_timeout(150)
        ok("vista de ayuda", page.evaluate("() => !!document.querySelector('#view-help')"))

        browser.close()

    width = max(len(c[0]) for c in checks)
    for name, passed, detail in checks:
        print(f"{'✓' if passed else '✗'} {name.ljust(width)} {detail if not passed else ''}")
    if errors:
        print("\nErrores de consola:")
        for e in errors:
            print("  -", e)

    failed = [c for c in checks if not c[1]]
    print(f"\n{len(checks) - len(failed)}/{len(checks)} comprobaciones OK · {len(errors)} errores de consola")
    return 1 if (failed or errors) else 0


if __name__ == "__main__":
    sys.exit(main())
