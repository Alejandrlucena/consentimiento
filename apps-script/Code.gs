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
 *       "Vista" → "Mostrar archivo de manifiesto" → pega su contenido,
 *       o usa "Editor/Project Settings" para editar el manifiesto).
 *
 *  2) Configura la carpeta de Drive donde se guardarán los PDFs
 *     - Pega en el editor la función setupFolder con el ID de tu carpeta:
 *           setupFolder('ID_DE_LA_CARPETA_DE_DRIVE')
 *       y pulsa "Ejecutar". El ID es el tramo de la URL de la carpeta:
 *           https://drive.google.com/drive/folders/<AQUI_EL_ID>
 *     - (Este ID queda en ScriptProperties y se puede cambiar sin tocar
 *       el repositorio ni volver a desplegar.)
 *
 *  3) Despliega como Aplicación Web
 *     - Botón azul "Implementar" → "Nueva implementación".
 *     - Tipo: "Aplicación web".
 *     - "Descripción": p. ej. "Subir PDFs de consentimiento".
 *     - "Ejecutar como": TU cuenta (fundamental para el CORS).
 *     - "Quién tiene acceso": "Cualquier persona" (imprescindible para
 *       que la web pública pueda llamarlo).
 *     - "Implementar" y copia la URL que termina en /exec.
 *
 *  4) Conecta la web al Web App
 *     - En la web (GitHub Pages), pulsa "⚙ Configuración".
 *     - Pega la URL /exec en el campo "Apps Script".
 *     - Guardar. La URL queda en el localStorage del navegador.
 *
 *  IMPORTANTE: nada de IDs ni URLs hardcodeados en el repositorio (para
 *  poder cambiar de entorno de test a producción sin tocar código).
 *  La carpeta de destino se configura mediante ScriptProperties.
 * =====================================================================
 */

/**
 * Configura la carpeta de Drive de destino.
 * Ejecuta una vez esta función en el editor (o usa Script: setupFolder),
 * pasando el ID de la carpeta (el tramo de la URL de la carpeta).
 * Así puedes apuntar a una carpeta distinta en test y en producción.
 *   Ejemplo (en la consola del editor):
 *     setupFolder('ID_DE_LA_CARPETA')
 */
function setupFolder(folderId) {
  PropertiesService.getScriptProperties()
    .setProperty('FOLDER_ID', folderId.trim());
}

/** Devuelve el ID de la carpeta configurado (sin hardcodearlo). */
function getFolderId() {
  var id = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
  if (!id) {
    throw new Error('FOLDER_ID no configurado. Ejecuta setupFolder(\"ID_DE_LA_CARPETA\") en el editor.');
  }
  return id;
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
  return respuestaCORS({ status: 'ok', message: 'Apps Script operativo' }, 200);
}

/**
 * POST: recibe el PDF en Base64 y lo crea en la carpeta de destino.
 *
 * El cliente (js/script.js) envía un JSON como texto plano. No se usa
 * Content-Type: application/json porque el CORS de Apps Script solo
 * permite algunos tipos; por eso el JSON viaja en e.postData.contents
 * como texto y aquí se hace JSON.parse.
 *
 * Contrato de datos esperados en el body:
 *   {
 *     "fileName": "nombre_del_archivo.pdf",   // opcional (si no, usa fecha)
 *     "fileData": "BASE64_DEL_PDF",           // obligatorio
 *     "mimeType": "application/pdf"            // opcional (por defecto PDF)
 *   }
 *
 * Respuestas (JSON):
 *   - 200 { status:'success', message, fileUrl, fileName }
 *   - 500 { status:'error', message, error }
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

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
      fileName: fileName
    }, 200);

  } catch (error) {
    return respuestaCORS({
      status: 'error',
      message: 'Error al subir el documento',
      error: String(error)
    }, 500);
  }
}