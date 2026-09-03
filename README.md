# Consentimiento de Tatuajes (Web estática)

Web estática (HTML + CSS + JS) que **genera desde cero el PDF de consentimiento informado de tatuajes** con [pdf-lib](https://pdf-lib.js.org/), con vista previa en tiempo real y firmas táctiles. Pensada para **GitHub Pages** y tablets Android.

El PDF (una hoja A4) se construye con el mismo modelo que dibuja la vista previa en canvas, por lo que **lo que ves es exactamente lo que se exporta**.

## Estructura del repositorio

```
consentimiento/
├── index.html              → El formulario (HTML) + vista previa + modales
├── css/style.css           → Estilos (responsive, táctil, acordeón colapsable)
├── js/script.js            → Motor PDF (pdf-lib) + lógica de guardado y config
├── apps-script/
│   ├── Code.gs             → Google Apps Script (recibe PDF y lo guarda en Drive)
│   └── appsscript.json     → Manifiesto del Web App (access: ANYONE)
├── .gitignore              → Archivos que no se suben a GitHub
└── README.md               → Este documento
```

- **Todo lo de `apps-script/`** se usa desde el editor de [script.google.com](https://script.google.com) (no se ejecuta desde la web, es el *backend* que recibe los PDFs). Ver la guía completa más abajo.
- **La web en sí** son solo `index.html`, `css/style.css` y `js/script.js`; no necesita servidor backend propio.

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

El componente de **Google Apps Script** es lo que permite guardar los PDFs en tu
Google Drive desde la web. Es un *Web App* (un endpoint público) que recibe el PDF
en Base64, lo decodifica y lo crea como archivo en una carpeta de Drive que tú
configuras. A continuación la guía completa para crearlo y conectarlo.

### Qué hace exactamente
1. La web convierte el PDF a texto Base64 y hace `fetch()` a tu URL `/exec`.
2. El Web App recibe `{ fileName, fileData, mimeType }` (como texto plano).
3. El script guarda el archivo en la carpeta de Drive configurada.
4. Devuelve un JSON con el estado y un enlace para abrir el documento.

### 1. Crear el proyecto de Apps Script
1. Entra en [script.google.com](https://script.google.com).
2. Pulsa **"Proyecto nuevo"** (o "Nuevo proyecto").
3. Sustituye el contenido del editor por el de **`apps-script/Code.gs`** (incluido en el repositorio).
4. Copia también el archivo **`apps-script/appsscript.json`**: en el editor pulsa
   **Vista (Engranaje) → "Mostrar archivo de manifiesto"** y pega su contenido.
   Este manifiesto ya trae `"access": "ANYONE"`, clave para el CORS.

### 2. Configurar la carpeta de destino
La carpeta **no está hardcodeada** (es un requisito del proyecto: nada de IDs en el
repositorio). Se configura una única vez con `setupFolder()`:

1. Pega en el editor la siguiente línea (reemplaza el ID):
   ```js
   setupFolder('AQUI_EL_ID_DE_LA_CARPETA_DE_DRIVE')
   ```
2. Selecciona `setupFolder` en el desplegable de funciones y pulsa **Ejecutar**.
3. Autoriza los permisos (Drive) cuando lo pida.

> El ID es el tramo de la URL de la carpeta: `https://drive.google.com/drive/folders/<AQUI_EL_ID>`
> El ID queda guardado en *ScriptProperties* de Apps Script. Puedes cambiar la
> carpeta en cualquier momento llamando de nuevo a `setupFolder` con otro ID, sin
> tocar el repositorio ni redesplegar.

### 3. Desplegar como Aplicación Web
1. Botón **Implementar → Nueva implementación**.
2. **Tipo**: *Aplicación web*.
3. **Descripción**: p. ej. `Subir PDFs consentimiento`.
4. **Ejecutar como**: **Tú (tu cuenta de Google)** — *obligatorio* para el CORS.
5. **Quién tiene acceso**: **Cualquier persona** — *imprescindible* para que la web
   pública (GitHub Pages) pueda llamarlo desde otro dominio.
6. Pulsa **Implementar** y **copia la URL de implementación** (termina en `/exec`).

### 4. Conectar la web al Web App
1. Abre la web (GitHub Pages o local).
2. Pulsa el botón **⚙ Configuración** (arriba a la derecha).
3. En **"Apps Script (destino de los PDFs)"** pega la URL `/exec`.
4. Pulsa **Guardar**. La URL se guarda en el `localStorage` del navegador.

> Con esto, al pulsar **💾 Guardar PDF → Subir a Google Drive** tu documento
> aparecerá en la carpeta configurada.

### Notas técnicas y errores frecuentes del Apps Script
- **CORS**: Apps Script tiene restricciones. `ContentService` NO permite fijar
  cabeceras arbitrarias (no existe `setHeaders`). La solución es desplegar con
  *Ejecutar como: Tú* y *Acceso: Cualquier persona*, y usar `"access": "ANYONE"`
  en el manifiesto. Por eso la web envía el JSON como **texto plano** (no
  `application/json`), que es lo que el CORS de Apps Script permite.
- **Error "Error al subir el documento"**: revisa que (a) la URL `/exec` esté bien
  pegada en Configuración, (b) hayas ejecutado `setupFolder` con un ID válido,
  (c) el Web App esté desplegado con acceso "Cualquier persona".
- **El PDF no aparece en Drive**: confirma en qué cuenta estás logueado en Drive y
  que la carpeta exista con el ID correcto.

### Estructura de archivos de `apps-script/`
- `Code.gs` — lógica: `setupFolder`, `getFolderId`, `respuestaCORS`, `doGet`, `doPost`.
- `appsscript.json` — manifiesto (permite que cualquiera llame al Web App).

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