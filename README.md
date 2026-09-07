# Consentimiento de Tatuajes (Web estática)

Web estática (HTML + CSS + JS) que **genera desde cero el PDF de consentimiento informado de tatuajes** con [pdf-lib](https://pdf-lib.js.org/), con vista previa en tiempo real y firmas táctiles. Pensada para **GitHub Pages** y tablets Android.

El PDF (una hoja A4) se construye con el mismo modelo que dibuja la vista previa en canvas, por lo que **lo que ves es exactamente lo que se exporta**.

## Estructura del repositorio

```
consentimiento/
├── index.html              → El formulario (HTML) + vista previa + modales
├── css/style.css           → Estilos (responsive, táctil, acordeón colapsable)
├── js/script.js            → Motor PDF (pdf-lib) + lógica de guardado y config
├── js/template.js          → Plantilla del PDF en Base64 (no editar)
├── apps-script/
│   ├── Code.gs             → Google Apps Script (recibe PDF y lo guarda en Drive)
│   └── appsscript.json     → Manifiesto del Web App (access: ANYONE)
├── .gitignore              → Archivos que no se suben a GitHub
└── README.md               → Este documento
```

- **Todo lo de `apps-script/`** se usa desde el editor de [script.google.com](https://script.google.com) (no se ejecuta desde la web, es el *backend* que recibe los PDFs). Ver la guía completa más abajo.
- **La web en sí** son solo `index.html`, `css/style.css` y `js/script.js`; no necesita servidor backend propio.

## Cómo funciona

1. Rellena el formulario: en **⚙ Configuración** los datos de "Responsable del Tratamiento RGPD" (nombre del estudio + responsable, CIF, domicilio, correo y teléfono) y en el formulario los del cliente y las firmas.
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
**Ya no es necesario:** la primera vez que se usa, el Web App **crea solo** la
carpeta **"PDFs de Consentimiento"** en la raíz de tu Drive y la guarda.
Si quieres usar otra carpeta concreta, ejecuta en el editor una única vez:

   ```js
   setupFolder('ID_DE_LA_CARPETA_DE_DRIVE')
   ```

   El ID es el tramo de la URL de la carpeta. Queda en *ScriptProperties*,
   fuera del repositorio.

### 3. Desplegar como Aplicación Web
1. Botón **Implementar → Nueva implementación**.
2. **Tipo**: *Aplicación web*.
3. **Descripción**: p. ej. `Subir PDFs consentimiento`.
4. **Ejecutar como**: **Tú (tu cuenta de Google)** — *obligatorio* para el CORS.
5. **Quién tiene acceso**: **Cualquier persona** — *imprescindible* para que la web
   pública (GitHub Pages) pueda llamarlo desde otro dominio.
6. Pulsa **Implementar** y **copia la URL de implementación** (termina en `/exec`).

### 4. Conectar la web al Web App
En la web (GitHub Pages o local), pulsa **⚙ Configuración**:
- Pega la URL `/exec` en **"Apps Script (destino de los PDFs)"**.
- Pulsa **🔗 Probar conexión**: el script creará la carpeta automáticamente y
  te confirmará en qué carpeta de Drive se guardarán los PDFs.
- Pulsa **Guardar**.

> **Enlace directo (auto-configuración):** añade `?scriptUrl=TU_URL` al final de
> la URL de la web y la configuración se guardará **sola al cargar**, sin tocar
> el menú de configuración. Ideal para que quien use la web solo abra un enlace.
> Ejemplo: `https://Alejandrlucena.github.io/consentimiento/?scriptUrl=.../exec`

### 4b. Instalarlo desde cero sin conocimientos (paso a paso)
Si aún no tienes el Web App desplegado, la web te guía con **2 botones y 5 pasos**
(nada de código: se copia y se pega). Es crítico hacer los 5 pasos exactos:

1. En la web: **⚙ Configuración → "🆕 No tengo URL: instalarlo paso a paso"**.
2. Pulsa **📋 Copiar el código** (se copia solo) y **🆕 Abrir Apps Script** (se
   abre en otra pestaña; te pedirá iniciar sesión con tu cuenta de Google).
3. Dentro de Apps Script verás un recuadro blanco con este texto azul:

   ```js
   function myFunction() {

   }
   ```

   **Bórralo primero**: pulsa dentro del recuadro → mantener pulsado →
   **Seleccionar todo** → **Borrar**. Después mantener pulsado → **Pegar**.
4. Pulsa **Implementar** (botón azul arriba a la derecha) →
   **Nueva implementación**. Se abre una ventana que dice **"Seleccionar tipo"**:
   pulsa el **engranaje ⚙️** que hay justo a la derecha y elige **Aplicación web**.
   Comprueba estas 4 opciones:
   - **Tipo de implementación**: **Aplicación web**.
   - **Descripción**: pon cualquier texto (por ejemplo, el que sale por defecto
     *"Nueva descripción"*) — hay que ponerlo sí o sí.
   - **Ejecutar como**: **Yo (tu correo)** → así los PDFs se guardan en tu Drive.
   - **Quién tiene acceso**: **Cualquier persona** (**obligatorio**; si no, la web
     no podrá guardar los PDFs).
   - **Implementar**.
5. Si aparece un aviso de permisos ("no verificado"/"permitir acceso"), pulsa
   **Opciones avanzadas → Continuar / Acceder a tu proyecto → Permitir**.
6. Copia la **URL de la aplicación web** (termina en `/exec`) y **guárdala en algún
   sitio seguro** (p. ej. en tus Notas): ese enlace es tu conexión permanente y
   **te valdrá siempre**. Si lo pierdes, tendrás que repetir todo el proceso.
7. Vuelve a la web, pulsa **✅ Ya tengo la URL**, pega el enlace y **🔗 Probar
   conexión**.

> 💡 Los PDFs se guardarán en una carpeta llamada **PDFs de Consentimiento**, en tu
> Google Drive: **drive.google.com → Mi unidad → PDFs de Consentimiento**. Se crea
> **sola** la primera vez que se guarda un PDF; no hay que crear ninguna carpeta.

> Nota: la web funciona igual si te pasan la URL ya desplegada; solo tienes que
> pegarla en ⚙ Configuración (o abrir el enlace directo `?scriptUrl=`).

> Con esto, al pulsar **💾 Guardar PDF → Subir a Google Drive** tu documento
> aparecerá en la carpeta configurada.

### Notas técnicas y errores frecuentes del Apps Script
- **CORS**: Apps Script tiene restricciones. `ContentService` NO permite fijar
  cabeceras arbitrarias (no existe `setHeaders`). La solución es desplegar con
  *Ejecutar como: Tú* y *Acceso: Cualquier persona*, y usar `"access": "ANYONE"`
  en el manifiesto. Por eso la web envía el JSON como **texto plano** (no
  `application/json`), que es lo que el CORS de Apps Script permite.
- **Error "Error al subir el documento"**: revisa que (a) la URL `/exec` esté bien
  pegada (o el enlace `?scriptUrl=` sin errores), (b) el Web App esté desplegado
  con acceso "Cualquier persona", (c) te hayas conectado a la cuenta de Drive
  adecuada.
- **El PDF no aparece en Drive**: confirma en qué cuenta estás logueado en Drive y
  que la carpeta "PDFs de Consentimiento" exista en su raíz.

### Estructura de archivos de `apps-script/`
- `Code.gs` — lógica: `setupFolder`, `getFolderId`, `getFolderName`, `respuestaCORS`, `doGet`, `doPost`.
- `appsscript.json` — manifiesto (permite que cualquiera llame al Web App).

## Datos persistentes vs. temporales

- **Permanentes (localStorage):** URL del Apps Script y los datos de "Responsable del Tratamiento RGPD" (nombre del estudio, responsable, CIF, domicilio, correo y teléfono). Se guardan desde **⚙ Configuración** y se rellenan automáticamente al recargar.
- **Se borran al recargar:** datos del cliente y firmas.

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