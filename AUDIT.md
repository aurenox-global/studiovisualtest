# Auditoría y plan de mejora — `studiovisualtest`

Revisión del proyecto original (`aurenox-global/studiovisualtest`, un único
`index.html` de 120 KB / 2 422 líneas) y del trabajo realizado para llevarlo a
nivel de producción como herramienta de **vídeos informativos y tutoriales con
infografías**.

---

## 1. Qué era el original

Un “UX/UI Design Studio Pro” de una sola página con tres secciones:

1. **Design** – lienzo 2D/3D con formas, texto, capas, propiedades y exportar PNG/JSON.
2. **Ejemplos** – tarjetas de componentes UI con CSS/JS para copiar.
3. **Chat AI** – un “generador de animaciones” por *coincidencia de palabras clave*
   (no era IA) con ~28 efectos preescritos.

Funcionaba como demo, pero no como herramienta para producir vídeo o infografía.

## 2. Problemas encontrados

### 2.1 Arquitectura y mantenibilidad
- **Un solo archivo de 120 KB** con CSS *y* JS embebidos; imposible mantener o testear.
- **Sin modelo de datos**: el estado vivía en ~15 variables globales sueltas.
- **Sin capa de render reutilizable**: el dibujo del lienzo, el de la sección “chat”
  y los ejemplos duplicaban lógica en funciones distintas.
- **Sin build/estructura**: no había separación modelo / render / UI.

### 2.2 Errores funcionales
- `showSec()` usaba `event.target` (variable global implícita) → rompe con
  navegación por teclado y con llamadas programáticas.
- `mainCanvas = document.getElementById('mainCanvas')` se ejecutaba **antes** del
  `load`, sin comprobar `null`.
- **Deshacer/rehacer incoherente**: `saveUndo()` se llamaba *después* de mutar
  `elements` (guardaba el estado ya modificado) y no había historial de rehacer.
- **`exportJSON()` exportaba solo el array `elements`**, sin proyecto, escenas ni
  ajustes: el JSON no se podía volver a importar.
- **No existía “importar”**: no había forma de recuperar un proyecto.
- **Sin persistencia**: recargar la página perdía todo el trabajo.
- **Cambiar de tamaño la ventana** redimensionaba el canvas y **borraba el dibujo**
  (el tamaño del canvas se usaba como sistema de coordenadas).
- `globalCompositeOperation`, `setLineDash` y `shadowBlur` se dejaban “sucios”
  entre elementos en varios puntos del dibujado.
- `prompt()` del navegador para introducir texto (bloqueante, no usable en móvil).
- El botón “Animar” animaba **todo** sin control: sin duraciones, retardos ni easing.
- Errores silenciados: cualquier fallo de dibujo dejaba el lienzo a medias.
- El menú móvil (≤900 px) apilaba las tres columnas en vertical y el panel quedaba
  inutilizable.

### 2.3 Producción / entrega
- **Dependencia de CDN externa** (`cdnjs.cloudflare.com/three.js`) → riesgo de
  cadena de suministro, fallo sin conexión y petición a terceros.
- **Sin PWA** → no funciona offline.
- **Sin metadatos** (descripción, Open Graph, favicon, `theme-color`), sin
  `manifest`, sin accesibilidad (ni `aria`, ni foco, ni teclado real).
- **Sin tests** de ningún tipo.
- **Sin documentación de uso ni de despliegue** (el README solo decía el nombre).
- **Sin licencia**.
- **Sin controles de calidad de salida**: no había manera de producir vídeo,
  subtítulos ni material publicable.

### 2.4 Problemas visuales detectados al probar la versión nueva
Detectados con renderizado real + revisión por visión artificial y corregidos:
1. **Texto desbordado/apilado**: las plantillas usaban tamaños de fuente relativos
   a la altura del lienzo → textos largos se salían de su caja y parecían “pegados”.
   → *Autoajuste*: el renderer reduce la tipografía hasta que el bloque entra.
2. **Etiquetas de los KPI desbordadas** en tarjetas estrechas → fuentes ajustadas a
   `min(ancho, alto)` y *fit-to-width* por línea.
3. **Lienzo aparentemente vacío al abrir una escena**: con `t = 0` las animaciones de
   entrada están en opacidad 0. → Nuevo **“tiempo de reposo”** (`settleTime`): al
   abrir una escena el cabezal se coloca donde todas las entradas han terminado;
   al pulsar *Reproducir* se reinicia desde 0.
4. **Miniaturas deformadas/ilegibles** (aspecto 16:9 fijo para cualquier formato) →
   las tarjetas de escena respetan el aspecto real del proyecto.
5. **Insignia “VS” solapada** en la comparativa → círculo menor y centrado.
6. **Elemento decorativo suelto** que se cortaba en la plantilla de consejo → eliminado.
7. **Aviso (toast) tapando el transporte** → reubicado.

## 3. Qué se ha construido

Reescritura completa como **InfoStudio Pro** (ver `README.md`):

- **9 módulos** en vez de un archivo: `util`, `store`, `library`, `render`,
  `editor`, `ui`, `exporter`, `app` + service worker.
- **Modelo de proyecto versionado** con migración (`migrate()`), escenas,
  elementos tipados, historial de deshacer/rehacer y **autoguardado** en `localStorage`.
- **Renderer determinista** independiente del DOM: lo que ves en el editor es
  exactamente lo que se exporta (editor, miniaturas, PNG y vídeo usan la misma función).
- **Motor de animación** por elemento (12 entradas/salidas, retardos, easing) y
  **transiciones entre escenas**.
- **Biblioteca de infografías** real: 7 tipos de gráfico animado, KPI con contador,
  comparativa, pasos, línea de tiempo, código con resaltado, 42 iconos vectoriales,
  10 fondos animados generativos.
- **Entrega de vídeo**: `MediaRecorder` (WebM/MP4) con micrófono opcional,
  secuencia PNG en ZIP (implementación propia, sin librerías), subtítulos
  `.srt`/`.vtt`, guion `.md` y **HTML autónomo** con reproductor.
- **Plantillas**: 10 escenas + 3 vídeos completos listos para usar.
- **Producción**: PWA offline, sin CDN, `manifest`, accesibilidad por teclado,
  tema claro/oscuro, cabeceras de seguridad documentadas, MIT.
- **Verificación**: suite de humo con Chromium headless (Playwright) que arranca la
  app, recorre edición/plantillas/exportación y comprueba **0 errores de consola**;
  además, QA visual por capturas de todas las plantillas.

## 4. Cómo se ha verificado

```
✓ boot · ✓ añadir componentes · ✓ plantillas de escena · ✓ inspector
✓ capas · ✓ mover/deshacer · ✓ duplicar escena · ✓ miniaturas con píxeles
✓ lienzo pintado · ✓ cambio de formato · ✓ galería de plantillas
✓ vídeo completo (4 escenas) · ✓ subtítulos · ✓ reproducción
✓ menú de exportación · ✓ HTML autónomo descargado · ✓ .srt descargado
Errores de consola: (ninguno)
```

## 5. Pendiente / decisiones abiertas

- **i18n es/en**: la preferencia existe, la traducción completa no está hecha.
- **Edición de texto in situ** sobre el lienzo (hoy se edita en el inspector).
- **MP4 sin tiempo real** vía WebCodecs (hoy: secuencia PNG + ffmpeg para máxima calidad).
- **Keyframes por propiedad** (hoy: entrada/salida por elemento).
- La IA del “Chat de animaciones” original no se ha portado: era un *matcher* de
  palabras clave. Si se quiere IA real, el sitio natural es un backend opcional.
