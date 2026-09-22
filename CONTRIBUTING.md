# Contribuir a InfoStudio Pro

¡Gracias por tu interés! Este documento resume cómo colaborar.

## Principios del proyecto

- **Cero dependencias externas**: sin CDN, sin *frameworks*, sin peticiones a terceros.
- **Sin paso de compilación**: HTML + CSS + JS vanilla con namespaces (`window.IS`).
- **Render determinista**: la misma función (`IS.render.frame`) dibuja en editor, miniaturas y exportación.
- **Accesibilidad**: HTML semántico, `aria-*`, navegación por teclado y foco visible.

## Cómo proponer cambios

1. Haz un *fork* y crea una rama descriptiva (`fix/plantillas-geometria`, `feat/keyframes`).
2. Mantén los cambios enfocados: un *pull request* por tema.
3. Ejecuta las pruebas antes de enviar:

   ```bash
   pip install playwright && playwright install chromium
   python3 tests/smoke.py
   ```

4. Verifica que la app siga **sin errores de consola** y sin dependencias nuevas.
5. Describe el cambio y, si aplica, adjunta capturas.

## Estilo

- Español para textos de UI y documentación; inglés para nombres de código.
- Comentarios solo donde aportan contexto (el *porqué*, no el *qué*).
- Respeta el sistema de *design tokens* de `assets/css/app.css`.

## Reportar errores

Incluye pasos para reproducir, resultado esperado y real, navegador/versión y, si puedes, una captura.
