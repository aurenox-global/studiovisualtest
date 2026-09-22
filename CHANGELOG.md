# Changelog

Todas las versiones notables de **InfoStudio Pro**. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el proyecto usa
versionado semántico.

## [3.1.0] — 2026-09-22

### Añadido
- **Keyframes por propiedad**: anima posición, tamaño, rotación y opacidad con fotogramas clave
  (hasta 240 por elemento), interpolados en el render determinista. Easing por tramo, *hold*
  antes del primero y después del último.
- Panel **🎞️ Fotogramas clave** en el inspector: capturar en el cabezal, lista con tiempo
  editable, easing, ir/borrar y previsualización. Indicador del keyframe activo en el bloque
  Transformar.
- **Modo keyframes** en el lienzo: al mover/redimensionar/rotar un elemento que ya tiene
  keyframes, el cambio se escribe en el fotograma del cabezal (se crea si no existe). El
  overlay, el *snapping* y el *hit-testing* usan la geometría interpolada.
- Atajos `K` (capturar keyframe) y `,` / `.` (keyframe anterior / siguiente).
- `IS.store.effectiveGeom(el, t)` como única fuente de la geometría efectiva (render, overlay y exportación).

### Cambiado
- Versión de proyecto **4** (`PROJECT_VERSION`) con migración transparente: los proyectos
  guardados con la v3 se cargan igual (clave `infostudio.project.v4` con *fallback* a la v3).
- Exportación HTML autónoma: documentada la limitación de que exporta una imagen fija por escena
  (las animaciones no se reproducen ahí).

### Corregido
- El deshacer de los cambios de geometría hechos desde el inspector ahora guarda el estado previo.

## [3.0.0] — 2026-09-22

Primera versión de producción: reescritura completa del proyecto original
`studiovisualtest` (“UX/UI Design Studio Pro”).

### Añadido
- **Storyboard** con tira de escenas, miniaturas reales, reordenar, duplicar y duraciones.
- **Lienzo** multi-formato (16:9 · 9:16 · 1:1 · 4:5 · 4:3) con zoom, rejilla, imán y guías de área segura.
- **Biblioteca de infografías**: 7 tipos de gráfico, KPI animado, comparativa, pasos, timeline, código con resaltado, 42 iconos y 10 fondos animados.
- **Motor de animación** por elemento (12 entradas/salidas, retardos, *easing*) y transiciones entre escenas.
- **Edición**: selección múltiple, rotación, marquesina, alinear/distribuir, capas y deshacer/rehacer.
- **Locución** con guion por escena, previsualización TTS y subtítulos `.srt`/`.vtt`.
- **Exportación**: vídeo WebM/MP4, PNG, secuencia PNG en ZIP, miniatura, subtítulos, guion `.md`, HTML autónomo y proyecto `.json`.
- **Plantillas**: 10 escenas + 3 vídeos completos.
- **PWA** offline con *service worker*, `manifest`, iconos PNG, metadatos Open Graph y tema claro/oscuro.
- **Tests** de humo con Playwright y flujo de CI en GitHub Actions.

### Corregido
- Las **plantillas de vídeo** generaban geometría inválida (`NaN`) al aplicarse, apilando todos los elementos en la esquina superior izquierda. Ahora los *builders* reciben `{ w, h }` correctamente y `ensureGeom()` sanea cualquier geometría no finita.

### Cambiado
- Sustituye por completo al antiguo `index.html` de una sola página (sin modelo de datos, con errores de deshacer/persistencia y dependencia de CDN). Ver [`AUDIT.md`](AUDIT.md).
