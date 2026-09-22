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
        canvas = page.evaluate("""() => {
            const c = document.getElementById('stageCanvas');
            if (!c) return { ok: false };
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            let nonzero = 0;
            for (let i = 3; i < d.length; i += 4) if (d[i] > 0) nonzero++;
            return { ok: c.width > 0 && c.height > 0, painted: nonzero };
        }""")
        ok("lienzo pintado", canvas.get("ok") and canvas.get("painted", 0) > 100, json.dumps(canvas))

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
