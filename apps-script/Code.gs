/**
 * Code.gs — Google Apps Script
 * Punto de entrada del Web App que recibe los PDFs generados desde la web
 * estática (GitHub Pages) y los guarda en una carpeta de Google Drive.
 *
 * IMPORTANTE: nada de IDs ni URLs hardcodeados (para permitir cambiar de
 * entorno de test a producción sin tocar código). La carpeta de destino se
 * configura mediante ScriptProperties (ver función setupFolder).
 *
 * Despliegue:
 *   - Menú "Implementar" → "Nueva implementación" → tipo "Aplicación web".
 *   - "Ejecutar como": Tú (tu cuenta).
 *   - "Quién tiene acceso": Cualquier persona.
 *   - Copia la URL /exec y pégala en "⚙ Configuración" de la web.
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
 * El cliente envía un JSON como texto plano (Application/JSON no lo permite
 * el CORS de Apps Script), por lo que se parsea e.postData.contents.
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