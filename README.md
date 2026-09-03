# Consentimiento de Tatuajes (Web estática)

Web estática (HTML + CSS + JS) que **genera desde cero el PDF de consentimiento informado de tatuajes** con [pdf-lib](https://pdf-lib.js.org/), con vista previa en tiempo real y firmas táctiles. Pensada para **GitHub Pages** y tablets Android.

El PDF (una hoja A4) se construye con el mismo modelo que dibuja la vista previa en canvas, por lo que **lo que ves es exactamente lo que se exporta**.

## Cómo funciona

1. Rellena el formulario (título, establecimiento, cliente, detalles del tatuaje, salud, declaración adicional y firmas).
2. La **vista previa** se regenera al instante mientras escribes o firmas.
3. Pulsa **💾 Guardar PDF** y elige cómo guardarlo:
   - **Descargar en el dispositivo**
   - **Subir a Google Drive**
   - **Guardar y subir a Google Drive** (ambas, en secuencia).

## Opciones de guardado

- **Descargar en el dispositivo:** descarga el `Blob` PDF localmente.
- **Subir a Google Drive:** convierte el PDF a Base64 y hace un `fetch()` POST al Web App de Apps Script con `{ fileName, fileData, mimeType }`. Muestra "Subiendo a Google Drive…" y, al terminar, un toast de confirmación con un enlace **Ver en Drive**.
- Si el Apps Script no está configurado, la opción Drive avisa de que debes pegar la URL en **⚙ Configuración**.

## Apps Script (subida a Google Drive)

### 1. Crea el script
Ves a [script.google.com](https://script.google.com) → Proyecto nuevo. Sustituye el contenido por el de **`apps-script/Code.gs`** (incluido en el repositorio).

### 2. Configura la carpeta
La carpeta de destino **no está hardcodeada** en el código. Se configura una sola vez mediante `setupFolder()` en la consola del editor (Menú **Ejecutar → Ejecutar función**), pasándole el ID de la carpeta de Drive:

```js
setupFolder('AQUI_EL_ID_DE_LA_CARPETA')
```

El ID es el tramo de la URL: `https://drive.google.com/drive/folders/<AQUI_EL_ID>`. Queda guardado en *ScriptProperties*, por lo que puedes apuntar a carpetas distintas en test y producción sin tocar código.

### 3. Despliega como Web App
- Menú **Implementar → Nueva implementación** → tipo **Aplicación web**.
- **Descripción:** p. ej. `Subir PDFs consentimiento`.
- **Ejecutar como:** *Tú (mi_bandeja@…) — tu cuenta*.
- **Quién tiene acceso:** *Cualquier persona*.
- **Implementar** y copia la URL `https://script.google.com/macros/s/XXXXX/exec`.

### 4. Pega la URL en la web
Botón **⚙ Configuración** → campo *Apps Script (destino de los PDFs)* → pega la URL /exec → Guardar. La URL se guarda permanentemente en `localStorage`.

## Datos persistentes vs. temporales

- **Permanentes (localStorage):** URL del Apps Script y datos del establecimiento.
- **Se borran al recargar:** datos del cliente, detalles del tatuaje, salud marcada, confirmación de cuidados y firmas.

## Despliegue en GitHub

Este proyecto ya está desplegado en **GitHub Pages**:
- Sitio: <https://Alejandrlucena.github.io/consentimiento/>
- Repositorio: <https://github.com/Alejandrlucena/consentimiento>

Para republicar tras un cambio: sube los archivos a la rama `main` y GitHub Pages regenera automáticamente (tarda un momento; recarga con `Ctrl+F5`).

> ⚠️ **No uses `file://` (doble clic):** Edge/Chrome bloquean `localStorage` y el `fetch` (CORS). Usa siempre un servidor local o GitHub Pages.

## Probar en local (Windows)

- Haz **doble clic en `iniciar.bat`**.
- Se abrirá una ventana con el servidor en `http://localhost:8000`.
- Abre esa dirección en tu navegador (Edge/Chrome).

> Puedes detenerlo cerrando la ventana o pulsando `Ctrl+C`. Para cambiar el puerto, edita `servidor.ps1` (variable `$Puerto`).

## Privacidad

El repositorio es **público** para poder usar GitHub Pages gratuito (que no funciona en repos privados). Recuerda **no a cometer ni el ID de tu carpeta de Drive ni tokens** en el código ni en el historial: la carpeta se configura en *ScriptProperties* de Apps Script, nunca en el repo. Si alguna vez filtras un token, revócalo en GitHub y genera uno nuevo.

GitHub Pages (`*.github.io`) es pública y no permite autenticación de visitantes.