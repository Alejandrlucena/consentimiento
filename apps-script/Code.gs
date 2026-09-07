/**
 * Code.gs — Google Apps Script
 * Punto de entrada del Web App que recibe los PDFs generados desde la web
 * estática (GitHub Pages) y los guarda en una carpeta de Google Drive.
 *
 * =====================================================================
 *  GUÍA RÁPIDA DE DESPLIEGUE (paso a paso)
 * =====================================================================
 *  1) Crea el proyecto
 *     - Ve a https://script.google.com → "Proyecto nuevo".
 *     - Copia TODO el contenido de este archivo (Code.gs) en el editor.
 *     - Copia también apps-script/appsscript.json al proyecto (menú
 *       "Vista" → "Mostrar archivo de manifiesto" → pega su contenido).
 *
 *  2) Despliega como Aplicación Web
 *     - Botón azul "Implementar" → "Nueva implementación".
 *     - Tipo: "Aplicación web".
 *     - "Descripción": p. ej. "Subir PDFs de consentimiento".
 *     - "Ejecutar como": TU cuenta (fundamental para el CORS).
 *     - "Quién tiene acceso": "Cualquier persona" (imprescindible para
 *       que la web pública pueda llamarlo).
 *     - "Implementar" y copia la URL que termina en /exec.
 *
 *  3) Conecta la web al Web App
 *     - En la web (GitHub Pages), pulsa "⚙ Configuración".
 *     - Pega la URL /exec en el campo "Apps Script" y pulsa
 *       "🔗 Probar conexión".
 *
 *  NO HACE FALTA configurar la carpeta de Drive: la primera vez que se usa
 *  el script, crea SOLO la carpeta "PDFs de Consentimiento" en la raíz de
 *  tu Drive y la guarda (ScriptProperties). Si quieres usar otra carpeta,
 *  ejecuta en el editor:  setupFolder('ID_DE_LA_CARPETA').
 * =====================================================================
 */

/**
 * Configura la carpeta de Drive de destino (opcional).
 * Si no se llama, la carpeta se crea automáticamente al primer uso.
 *   Ejemplo (en la consola del editor):
 *     setupFolder('ID_DE_LA_CARPETA')
 */
function setupFolder(folderId) {
  PropertiesService.getScriptProperties()
    .setProperty('FOLDER_ID', folderId.trim());
}

/** Devuelve el nombre de la carpeta configurada o '' si aún no existe. */
function getFolderName() {
  var name = PropertiesService.getScriptProperties().getProperty('FOLDER_NAME');
  return name || '';
}

/**
 * Devuelve el ID de la carpeta de destino. Si no hay carpeta configurada,
 * la CREA automáticamente ("PDFs de Consentimiento" en la raíz de Drive)
 * y la guarda. Así el web app funciona desde cero sin setupFolder.
 */
function getFolderId() {
  var id = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
  if (id) return id;
  var folder = DriveApp.createFolder('PDFs de Consentimiento');
  var props = PropertiesService.getScriptProperties();
  props.setProperty('FOLDER_ID', folder.getId());
  props.setProperty('FOLDER_NAME', folder.getName());
  return folder.getId();
}

/**
 * Publica la respuesta con el MIME JSON apropiado.
 * Nota: ContentService.TextOutput NO permite fijar cabeceras arbitrarias
 * (setHeaders no existe). Para que el navegador pueda leer la respuesta con
 * fetch() desde otro dominio, el Web App debe desplegarse con:
 *   - "Ejecutar como": Tú
 *   - "Quién tiene acceso": Cualquier persona
 * y, además, ajustar appsscript.json con "access": "ANYONE".
 */
function respuestaCORS(json, code) {
  return ContentService
    .createTextOutput(JSON.stringify(json))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET: útil para comprobar el estado del Web App o en navegadores que
 * lanzan preflight en determinadas condiciones.
 */
function doGet() {
  try {
    var name = getFolderName();
    return respuestaCORS({
      status: 'ok',
      message: 'Apps Script operativo',
      folderName: name
    }, 200);
  } catch (error) {
    return respuestaCORS({ status: 'error', message: 'Error al comprobar el Web App', error: String(error) }, 500);
  }
}

/**
 * POST: recibe el PDF en Base64 y lo crea en la carpeta de destino.
 * También responde a la acción "config" (probar conexión): crea la carpeta
 * si no existe y devuelve su nombre, sin guardar ningún PDF.
 *
 * El cliente (js/script.js) envía un JSON como texto plano. No se usa
 * Content-Type: application/json porque el CORS de Apps Script solo
 * permite algunos tipos; por eso el JSON viaja en e.postData.contents
 * como texto y aquí se hace JSON.parse.
 *
 * Contrato de datos esperados en el body:
 *   {
 *     "action":   "upload" | "config",        // "upload" por defecto
 *     "fileName": "nombre_del_archivo.pdf",   // opcional (si no, usa fecha)
 *     "fileData": "BASE64_DEL_PDF",           // obligatorio para "upload"
 *     "mimeType": "application/pdf"            // opcional (por defecto PDF)
 *   }
 *
 * Respuestas (JSON):
 *   - 200 { status:'success', message, fileUrl, fileName, folderName }
 *   - 500 { status:'error', message, error }
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'config') {
      var folderId = getFolderId();
      return respuestaCORS({
        status: 'success',
        message: 'Conexión correcta. Los documentos se guardan en la carpeta: ' + getFolderName(),
        folderId: folderId,
        folderName: getFolderName()
      }, 200);
    }

    var fileName = data.fileName || ('documento_' + Date.now() + '.pdf');
    var base64   = data.fileData || '';
    var mimeType = data.mimeType || 'application/pdf';
    var folderId = getFolderId();

    // Decodifica el Base64 a bytes y crea un Blob
    var bytes = Utilities.base64Decode(base64);
    var blob  = Utilities.newBlob(bytes, mimeType, fileName);

    // Crea el archivo en la carpeta destino (ID configurado externamente)
    var file = DriveApp.getFolderById(folderId).createFile(blob);

    return respuestaCORS({
      status: 'success',
      message: 'Documento subido correctamente a Google Drive',
      fileUrl: file.getUrl(),
      fileName: fileName,
      folderName: getFolderName()
    }, 200);

  } catch (error) {
    return respuestaCORS({
      status: 'error',
      message: 'Error al subir el documento',
      error: String(error)
    }, 500);
  }
}