(function () {
  'use strict';

  var CONFIG_KEY = 'consent_config';

  // ---------- Referencias a elementos ----------
  var el = {
    estudio: document.getElementById('estudio'),
    direccion: document.getElementById('direccion'),
    telEstudio: document.getElementById('telEstudio'),
    tatuador: document.getElementById('tatuador'),
    nombre: document.getElementById('nombreCompleto'),
    dni: document.getElementById('dni'),
    titulo: document.getElementById('tituloDoc'),
    dirCliente: document.getElementById('dirCliente'),
    diseno: document.getElementById('diseno'),
    tintas: document.getElementById('tintas'),
    nacDia: document.getElementById('nacDia'),
    nacMes: document.getElementById('nacMes'),
    nacAnio: document.getElementById('nacAnio'),
    telefono: document.getElementById('telefono'),
    email: document.getElementById('email'),
    ciudad: document.getElementById('ciudad'),
    zonaTatuaje: document.getElementById('zonaTatuaje'),
    salud1: document.getElementById('salud1'),
    salud2: document.getElementById('salud2'),
    salud3: document.getElementById('salud3'),
    salud4: document.getElementById('salud4'),
    salud5: document.getElementById('salud5'),
    salud6: document.getElementById('salud6'),
    salud7: document.getElementById('salud7'),
    cuidados: document.getElementById('cuidados'),
    declaracionExtra: document.getElementById('declaracionExtra'),
    firmaCanvas: document.getElementById('firmaCanvas'),
    btnLimpiarFirma: document.getElementById('btnLimpiarFirma'),
    firmaProfCanvas: document.getElementById('firmaProfCanvas'),
    btnLimpiarFirmaProf: document.getElementById('btnLimpiarFirmaProf'),
    btnGuardar: document.getElementById('btnGuardar'),
    pdfContainer: document.getElementById('pdfContainer'),
    previewCanvas: document.getElementById('previewCanvas'),
    btnConfig: document.getElementById('btnConfig'),
    popupNombre: document.getElementById('popupNombre'),
    nombreFichero: document.getElementById('nombreFichero'),
    btnCancelarNombre: document.getElementById('btnCancelarNombre'),
    saveOpts: Array.prototype.slice.call(document.querySelectorAll('.save-opt')),
    popupConfig: document.getElementById('popupConfig'),
    configUrl: document.getElementById('configUrl'),
    cfgEstudioNombre: document.getElementById('cfgEstudioNombre'),
    cfgEstudioDireccion: document.getElementById('cfgEstudioDireccion'),
    cfgEstudioTelefono: document.getElementById('cfgEstudioTelefono'),
    cfgEstudioCiudad: document.getElementById('cfgEstudioCiudad'),
    btnCancelarConfig: document.getElementById('btnCancelarConfig'),
    btnGuardarConfig: document.getElementById('btnGuardarConfig'),
    toast: document.getElementById('toast')
  };

  var SALUD_IDS = ['salud1', 'salud2', 'salud3', 'salud4', 'salud5', 'salud6', 'salud7'];
  var SALUD_TEXT = [
    'No padezco enfermedades infecciosas transmisibles por sangre (VIH, Hepatitis B/C, etc.).',
    'No sufro problemas de coagulación ni tomo medicamentos anticoagulantes.',
    'No tengo alergias conocidas a metales, tintas, látex o antisépticos.',
    'No padezco afecciones de la piel en la zona a tatuar (psoriasis, eccemas, queloides, etc.).',
    'No estoy embarazada ni en periodo de lactancia.',
    'No sufro enfermedades cardíacas, epilepsia o diabetes (o están controladas).',
    'No estoy bajo los efectos de alcohol, drogas o medicamentos que alteren mis capacidades.'
  ];
  var GARANTIAS = [
    'He podido formular todas las preguntas y he comprendido la información sobre el procedimiento.',
    'Seré informado de los cuidados posteriores y de los posibles riesgos y complicaciones.',
    'Autorizo el tratamiento de mis datos personales con la finalidad de la prestación del servicio.',
    'Conforme al RGPD, el responsable del tratamiento de mis datos es el establecimiento indicado y puedo ejercer mis derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad dirigiéndome por escrito a dicho responsable.',
    'He recibido y comprendido las instrucciones de cuidados posteriores (higiene, protección solar, hidratación y seguimiento de la zona tatuada).'
  ];

  var signaturePad = null;
  var signaturePadProf = null;

  // ---------- Configuración persistente ----------
  function cargarConfig() {
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function guardarConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  function guardarEstudioEnFormulario() {
    var config = cargarConfig();
    var estudio = config.estudio || {};
    el.estudio.value = estudio.nombre || '';
    el.direccion.value = estudio.direccion || '';
    el.telEstudio.value = estudio.telefono || '';
    el.ciudad.value = estudio.ciudad || '';
  }

  function limpiarFormularioNoEstudio() {
    ['tatuador', 'nombre', 'dni', 'telefono', 'email', 'zonaTatuaje'].forEach(function (id) {
      if (el[id]) el[id].value = '';
    });
    if (el.nacDia) el.nacDia.value = 'Dia';
    if (el.nacMes) el.nacMes.value = 'Mes';
    if (el.nacAnio) el.nacAnio.value = 'Anio';
    if (el.declaracionExtra) el.declaracionExtra.value = '';
    SALUD_IDS.forEach(function (id) { if (el[id]) el[id].checked = false; });
    if (signaturePad) signaturePad.clear();
    if (signaturePadProf) signaturePadProf.clear();
  }

  // ---------- Fechas ----------
  function pad2(n) { return String(n).padStart(2, '0'); }

  function rellenarSelectFecha(diaSel, mesSel, anioSel, opciones) {
    var i, opt;
    opt = document.createElement('option'); opt.value = 'Dia'; opt.textContent = 'Día'; diaSel.appendChild(opt);
    opt = document.createElement('option'); opt.value = 'Mes'; opt.textContent = 'Mes'; mesSel.appendChild(opt);
    opt = document.createElement('option'); opt.value = 'Anio'; opt.textContent = 'Año'; anioSel.appendChild(opt);
    for (i = 1; i <= 31; i++) { opt = document.createElement('option'); opt.value = i; opt.textContent = pad2(i); diaSel.appendChild(opt); }
    for (i = 1; i <= 12; i++) { opt = document.createElement('option'); opt.value = i; opt.textContent = pad2(i); mesSel.appendChild(opt); }
    for (i = opciones.desde; i >= opciones.hasta; i--) { opt = document.createElement('option'); opt.value = i; opt.textContent = i; anioSel.appendChild(opt); }
    diaSel.value = 'Dia'; mesSel.value = 'Mes'; anioSel.value = 'Anio';
  }

  function initFechas() {
    var anioActual = new Date().getFullYear();
    rellenarSelectFecha(el.nacDia, el.nacMes, el.nacAnio, { desde: anioActual, hasta: anioActual - 100 });
  }

  function fechaNacimiento() {
    var d = el.nacDia.value, m = el.nacMes.value, a = el.nacAnio.value;
    if (!d || d === 'Dia') return '';
    if (!m || m === 'Mes') return '';
    if (!a || a === 'Anio') return '';
    return pad2(d) + '/' + pad2(m) + '/' + a;
  }

  function fechaActual() {
    var h = new Date();
    return pad2(h.getDate()) + '/' + pad2(h.getMonth() + 1) + '/' + h.getFullYear();
  }

  // ---------- Firmas ----------
  function initFirma(canvas, onEnd) {
    var wrapper = canvas.parentElement;
    var w = wrapper.clientWidth || 400;
    var h = wrapper.clientHeight || 160;
    canvas.width = w;
    canvas.height = h;
    // Optimiza las lecturas frecuentes (getImageData de firmaVacia)
    canvas.getContext('2d', { willReadFrequently: true });
    var pad = new SignaturePad(canvas, { penColor: '#000000', minWidth: 1, maxWidth: 2.5 });
    // Renueva la vista previa en cuanto se suelta el trazo, sin esperar a otro input
    var finish = function () { if (onEnd && !pad.isEmpty()) onEnd(); };
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('touchend', finish);
    canvas.addEventListener('mouseup', finish);
    return pad;
  }

  function firmaVacia(canvas) {
    var ctx = canvas.getContext('2d');
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2];
      if (r < 230 || g < 230 || b < 230) return false;
    }
    return true;
  }

  // ---------- Obtener valores ----------
  function getVal(id) {
    switch (id) {
      case 'estudio':   return el.estudio.value.trim();
      case 'direccion': return el.direccion.value.trim();
      case 'telEstudio':return el.telEstudio.value.trim();
      case 'tatuador':  return el.tatuador.value.trim();
      case 'nombre':    return el.nombre.value.trim();
      case 'dni':       return el.dni.value.trim();
      case 'nacimiento':return fechaNacimiento();
      case 'telefono':  return el.telefono.value.trim();
      case 'email':     return el.email.value.trim();
      case 'ciudad':    return el.ciudad.value.trim();
      case 'zona':      return el.zonaTatuaje.value.trim();
      case 'titulo':    return el.titulo ? el.titulo.value.trim() : '';
      case 'dirCliente':return el.dirCliente ? el.dirCliente.value.trim() : '';
      case 'diseno':    return el.diseno ? el.diseno.value.trim() : '';
      case 'tintas':    return el.tintas ? el.tintas.value.trim() : '';
      case 'adicional': return el.declaracionExtra ? el.declaracionExtra.value.trim() : '';
      default:          return '';
    }
  }

  // =============================================================================
  // LAYOUT EN PUNTOS A4. y se mide SIEMPRE desde ARRIBA de la página.
  //   - Vista previa: píxel = punto * SCALE (mismo sistema, sin inversión).
  //   - PDF (pdf-lib): yPDF = A4H - yTop.
  // Ambos comparten el mismo modelo => preiview y PDF coinciden.
  // =============================================================================
  var A4W = 595.28, A4H = 841.89;
  var ML = 44, MR = 44, MT = 46;
  var CW = A4W - ML - MR;   // ancho útil
  var SCALE = 1.8;          // píxeles por punto para la vista previa

  // cursor: yTop actual (puntos desde arriba)
  var yC = MT;
  var boldNormal = null;
  var boldBold = null;

  function lineH(size) { return size * 1.4; }

  // Mide la anchura de un texto en puntos usando canvas (compartido con pdf).
  var _mctx = null;
  function measure(text, size, bold) {
    if (!_mctx) {
      var cc = document.createElement('canvas');
      _mctx = cc.getContext('2d');
    }
    _mctx.font = (bold ? 'bold ' : '') + size + 'px Helvetica';
    return _mctx.measureText(text).width;
  }

  function wrap(text, size, maxW) {
    maxW = maxW || CW;
    var words = String(text).split(' ');
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (measure(test, size) > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function underline(n) { var i, s = ''; for (i = 0; i < n; i++) s += '___________'; return s; }

  // ----- Primitivas de dibujo. Cada RENDE (canvas o pdf) implementa:
  //   text(txt, x, yTop, size, bold)
  //   rect(x, yTop, w, h)      (yTop = esquina superior del rect)
  //   img(dataUrl, x, yTop, w, h)
  function drawHeader(R) {
    yC = MT;
    // Título en su propio bloque (flujo en bloque: una sola línea en su altura)
    R.text(getVal('titulo') || 'CONSENTIMIENTO INFORMADO PARA TATUAJE', ML, yC, 14, true);
    yC += lineH(14) + 4;

    // Bloque del estudio (nombre y, debajo, dirección/teléfono)
    var estudio = getVal('estudio');
    if (estudio) {
      R.text(estudio, ML, yC, 12, true);
      yC += lineH(12);
      var info = [];
      if (getVal('direccion')) info.push(getVal('direccion'));
      if (getVal('telEstudio')) info.push('Tel: ' + getVal('telEstudio'));
      if (info.length) { R.text(info.join('  ·  '), ML, yC, 8.5, false); yC += lineH(8.5); }
    }
    // Línea divisoria SIEMPRE debajo de todo el bloque del encabezado
    R.line(ML, yC + 2, A4W - MR, yC + 2);
    yC += lineH(8.5) + 6;
  }

  function title(R, txt) {
    // margin-top: separa la sección del último dato de la sección previa
    yC += 8;
    R.text(txt, ML, yC, 10.5, true);
    R.line(ML, yC + 3, A4W - MR, yC + 3);
    yC += lineH(10.5) + 6;
  }

  function item(R, label, valor, tipo) {
    R.text(label, ML, yC, 8.5, true);
    var afterX = ML + measure(label, 8.5, true) + 8;
    var p = underline(tipo === 'short' ? 2 : (tipo === 'date' ? 1 : 3));
    R.text(valor || p, afterX, yC, 8.5, false);
    yC += lineH(8.5) + 3;
  }

  function paragraph(R, txt, size, maxW) {
    var lines = wrap(txt, size, maxW || CW);
    for (var i = 0; i < lines.length; i++) {
      R.text(lines[i], ML, yC, size, false);
      yC += lineH(size);
    }
  }

  function drawBody(R) {
    // 1. Datos del cliente
    title(R, '1. DATOS DEL CLIENTE');
    item(R, 'Nombre completo:', getVal('nombre'), 'med');
    item(R, 'DNI / NIE:', getVal('dni'), 'short');
    item(R, 'Fecha de nacimiento:', getVal('nacimiento'), 'date');
    item(R, 'Dirección completa:', getVal('dirCliente'), 'med');
    item(R, 'Teléfono:', getVal('telefono'), 'short');
    item(R, 'Email:', getVal('email'), 'med');

    // 2. Detalles del procedimiento / tatuaje
    title(R, '2. DETALLES DEL PROCEDIMIENTO / TATUAJE');
    item(R, 'Zona del tatuaje:', getVal('zona'), 'med');
    item(R, 'Descripción / concepto del diseño:', getVal('diseno'), 'med');
    item(R, 'Tintas / pigmentos (nº lote):', getVal('tintas'), 'med');

    // 3. Profesional
    title(R, '3. PROFESIONAL QUE REALIZA EL TATUAJE');
    item(R, 'Tatuador/a:', getVal('tatuador'), 'med');

    // 4. Salud
    title(R, '4. DECLARACIÓN DE SALUD');
    R.text('Marque con una X las casillas que correspondan a su caso:', ML, yC, 8, false);
    yC += lineH(8) + 6;
    var box = 10;                 // tamaño del recuadro de la casilla
    var fsalud = 8;               // tamaño del texto de cada punto
    for (var s = 0; s < 7; s++) {
      var bx = ML + 2;
      // Centra verticalmente la casilla con la línea de texto (gap uniforme)
      var by = yC + (lineH(fsalud) - box) / 2;
      R.rect(bx, by, box, box);
      if (el[SALUD_IDS[s]] && el[SALUD_IDS[s]].checked) {
        // X centrada en la casilla: la Y de text es el BASELINE, así que se desplaza
        // hacia el centro vertical de la caja para no quedar "flotando" arriba.
        var fsx = 8;
        R.text('X', bx + (box - fsx * 0.6) / 2, by + box / 2 + fsx * 0.4, fsx, true);
      }
      R.text(SALUD_TEXT[s], bx + box + 8, yC, fsalud, false);
      yC += lineH(fsalud) + 4;
    }

    // 5. Adicional
    title(R, '5. DECLARACIÓN ADICIONAL');
    paragraph(R, getVal('adicional') || 'Sin observaciones.', 8.5);

    // 6. Cláusulas y protección de datos
    title(R, '6. CLÁUSULAS Y PROTECCIÓN DE DATOS');
    for (var g = 0; g < GARANTIAS.length; g++) {
      var marca = '\u2022  ';
      if (g === GARANTIAS.length - 1) {
        // Usamos corchetes ASCII (Helvetica estándar) en vez de ☐/☑, que pdf-lib
        // no puede dibujar con la fuente estándar (provoca "Error guardando el PDF").
        marca = (el.cuidados && el.cuidados.checked) ? '[X] ' : '[ ] ';
      }
      // Las frases largas (RGPD) se envuelven; las cortas van en una sola línea
      var lines = wrap(marca + GARANTIAS[g], 8, CW);
      for (var li = 0; li < lines.length; li++) {
        R.text(lines[li], ML, yC, 8, false);
        yC += lineH(8);
      }
    }

    // 7. Firma
    title(R, '7. FIRMA Y FECHA');
    item(R, 'Lugar y fecha:', ((getVal('ciudad') || '_______________') + ', ' + fechaActual()), 'med');
    yC += 6;

    var fw = CW * 0.42;
    var fh = 46;
    var x1 = ML;
    var x2 = ML + CW * 0.5;
    var yBox = yC;
    R.rect(x1, yBox, fw, fh);
    R.rect(x2, yBox, fw, fh);
    if (!firmaVacia(el.firmaCanvas)) R.img(signatureToDataURL(el.firmaCanvas), x1, yBox, fw, fh);
    if (!firmaVacia(el.firmaProfCanvas)) R.img(signatureToDataURL(el.firmaProfCanvas), x2, yBox, fw, fh);
    // Etiquetas claramente debajo de la caja (margin-top): nunca montan el borde
    R.text('Firma del cliente', x1 + 4, yBox + fh + 10, 8, false);
    R.text('Firma del tatuador/a', x2 + 4, yBox + fh + 10, 8, false);
  }

  function signatureToDataURL(canvas) { return canvas.toDataURL('image/png'); }

  // =============================================================================
  // RENDER DE VISTA PREVIA (canvas) => top-down en píxeles
  // =============================================================================
  function px(x) { return x * SCALE; }

  var canvasR = {
    text: function (txt, x, yTop, size, bold) {
      var ctx = el.previewCanvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.font = (bold ? 'bold ' : '') + px(size) + 'px Helvetica, Arial, sans-serif';
      ctx.fillText(txt, px(x), px(yTop));
    },
    rect: function (x, yTop, w, h) {
      var ctx = el.previewCanvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(px(x), px(yTop), px(w), px(h));
    },
    line: function (x1, yTop, x2, yTop2) {
      var ctx = el.previewCanvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(px(x1), px(yTop));
      ctx.lineTo(px(x2), px(yTop2));
      ctx.stroke();
    },
    img: function (dataUrl, x, yTop, w, h) {
      var ctx = el.previewCanvas.getContext('2d');
      var img = new Image();
      img.onload = function () {
        ctx.save();
        ctx.beginPath();
        ctx.rect(px(x), px(yTop), px(w), px(h));
        ctx.clip();
        ctx.drawImage(img, px(x), px(yTop), px(w), px(h));
        ctx.restore();
      };
      img.src = dataUrl;
    }
  };

  // =============================================================================
  // RENDERPDF (pdf-lib) => y bottom-up
  // =============================================================================
  var pdfR = {
    _page: null, _doc: null, _fontN: null, _fontB: null,
    text: function (txt, x, yTop, size, bold) {
      pdfR._page.drawText(txt, {
        x: x,
        y: A4H - yTop,
        size: size,
        font: bold ? pdfR._fontB : pdfR._fontN,
        color: PDFLib.rgb(0, 0, 0)
      });
    },
    rect: function (x, yTop, w, h) {
      pdfR._page.drawRectangle({
        x: x,
        y: A4H - yTop - h,
        width: w,
        height: h,
        borderColor: PDFLib.rgb(0, 0, 0),
        borderWidth: 0.6
      });
    },
    line: function (x1, yTop, x2, yTop2) {
      pdfR._page.drawLine({
        start: { x: x1, y: A4H - yTop },
        end: { x: x2, y: A4H - yTop2 },
        thickness: 0.6
      });
    },
    img: function (dataUrl, x, yTop, w, h) {
      // La firma se convierte a PNG y se incrusta en el PDF de forma asíncrona.
      pendingImages.push(embedSignature(dataUrl, x, yTop, w, h));
    }
  };

  // Cola de incrustación de firmas (se resuelve antes de guardar el PDF)
  var pendingImages = [];

  function embedSignature(dataUrl, x, yTop, w, h) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        // embedPng pertenece al DOCUMENTO PDF, no a la página.
        pdfR._doc.embedPng(pngFromImage(img)).then(function (png) {
          pdfR._page.drawImage(png, { x: x, y: A4H - yTop - h, width: w, height: h });
          resolve();
        });
      };
      img.onerror = function () { resolve(); };
      img.src = dataUrl;
    });
  }

  function pngFromImage(img) {
    var c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    var dataUrl = c.toDataURL('image/png');
    var b64 = dataUrl.split(',')[1];
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  // =============================================================================
  // PRINCIPAL
  // =============================================================================
  function renderPreview() {
    var c = el.previewCanvas;
    c.width = Math.round(A4W * SCALE);
    c.height = Math.round(A4H * SCALE);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    yC = MT;
    drawHeader(canvasR);
    drawBody(canvasR);
    el.btnGuardar.disabled = false;
  }

  function generarPDF() {
    return PDFLib.PDFDocument.create().then(function (doc) {
      var page = doc.addPage([A4W, A4H]);
      return Promise.all([
        doc.embedFont(PDFLib.StandardFonts.Helvetica),
        doc.embedFont(PDFLib.StandardFonts.HelveticaBold)
      ]).then(function (fonts) {
        pdfR._doc = doc;
        pdfR._page = page;
        pdfR._fontN = fonts[0];
        pdfR._fontB = fonts[1];
        yC = MT;
        drawHeader(pdfR);
        drawBody(pdfR);
        // Esperar a que se incrusten las firmas (si las hay)
        return Promise.all(pendingImages);
      }).then(function () {
        return doc.save();
      });
    }).then(function (bytes) {
      return new Blob([bytes], { type: 'application/pdf' });
    });
  }

  // Genera el Blob PDF (utilidad compartida)
  function generarBlobPDF() {
    pendingImages = [];
    return generarPDF();
  }

  // Descarga el Blob en el dispositivo
  function descargarBlob(blob, nombre) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 300);
  }

  // Sube el PDF a Google Drive vía Apps Script (payload en Base64)
  function subirADrive(blob, nombre) {
    var cfg = cargarConfig();
    if (!cfg.url || cfg.url.indexOf('http') !== 0) {
      return Promise.reject(new Error('NO_URL'));
    }
    var url = cfg.url;
    mostrarToast('Subiendo a Google Drive…', '');
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = reader.result;            // data:application/pdf;base64,....
        var base64 = dataUrl.split(',')[1];     // solo la parte en Base64
        var payload = {
          fileName: nombre,
          fileData: base64,
          mimeType: blob.type || 'application/pdf'
        };
        fetch(url, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        })
          .then(function (r) {
            // Leer siempre el cuerpo aunque el HTTP sea 4xx/5xx (Apps Script lo
            // incluye en la respuesta aunque fetch la marque como fallida).
            return r.text().then(function (txt) { return { ok: r.ok, status: r.status, txt: txt }; });
          })
          .then(function (env) {
            var res = null;
            try { res = JSON.parse(env.txt); } catch (e) { res = null; }
            if (env.ok && res && res.status === 'success') { resolve(res); return; }
            // Error real del servidor (contenido en el cuerpo JSON)
            var msg = (res && res.message) || 'Error en la subida a Drive';
            reject(new Error(msg));
          })
          .catch(function (err) {
            // Conserva el mensaje real del servidor si está disponible
            if (err && err.message) { reject(err); return; }
            reject(new Error('No se pudo conectar con el Apps Script'));
          });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Orquesta la opción elegida (download | drive | both)
  function procesarGuardado(op, nombre) {
    renderPreview();
    mostrarToast('Generando PDF…', '');
    el.btnGuardar.disabled = true;
    generarBlobPDF().then(function (blob) {
      if (op === 'download' || op === 'both') descargarBlob(blob, nombre);
      if (op === 'drive' || op === 'both') {
        return subirADrive(blob, nombre).then(function (res) {
          if (res && res.status === 'success') {
            mostrarToast('✅ Documento subido correctamente a Google Drive', 'ok');
            if (res.fileUrl) { abrirEnDrive(res.fileUrl); }
          } else {
            mostrarToast('Subido a Drive (sin confirmación del servidor)', 'ok');
          }
        });
      }
      return null;
    }).catch(function (err) {
      if (err && err.message === 'NO_URL') {
        mostrarToast('Configura la URL de Apps Script (⚙ Configuración)', 'error');
      } else if (err && err.message) {
        console.error(err);
        mostrarToast(err.message, 'error');
      } else {
        console.error(err);
        mostrarToast('Error guardando el PDF', 'error');
      }
    }).then(function () {
      el.btnGuardar.disabled = false;
    });
  }

  // Muestra/enfoca el popup de opciones con el nombre sugerido
  var guardarOp = null;
  var popupAbiertoPorGuardar = false;

  function mostrarToast(msg, tipo) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.className = 'toast toast-' + (tipo || '');
    el.toast.classList.add('show');
    clearTimeout(el.toast._t);
    el.toast._t = setTimeout(function () { el.toast.classList.remove('show'); }, 3000);
  }

  // Muestra un enlace "Ver en Drive" en una ventana nueva para abrir el archivo subido
  function abrirEnDrive(fileUrl) {
    var win = window.open(fileUrl, '_blank');
    if (!win) window.location.href = fileUrl;
  }

  // ---------- Regeneración ----------
  var timer = null;
  function autoRegenerar() {
    clearTimeout(timer);
    timer = setTimeout(renderPreview, 60);
  }

  function setearAutogen() {
    var campos = ['estudio', 'direccion', 'telEstudio', 'tatuador', 'nombre', 'dni', 'telefono', 'email', 'ciudad', 'zonaTatuaje', 'declaracionExtra', 'titulo', 'dirCliente', 'diseno', 'tintas'];
    campos.forEach(function (id) {
      if (el[id]) { el[id].addEventListener('input', autoRegenerar); el[id].addEventListener('change', autoRegenerar); }
    });
    [el.nacDia, el.nacMes, el.nacAnio].forEach(function (s) { if (s) s.addEventListener('change', autoRegenerar); });
    (SALUD_IDS.concat(['cuidados'])).forEach(function (id) { if (el[id]) el[id].addEventListener('change', autoRegenerar); });
  }

  // ---------- Eventos ----------
  el.btnLimpiarFirma.addEventListener('click', function () { signaturePad.clear(); renderPreview(); });
  el.btnLimpiarFirmaProf.addEventListener('click', function () { signaturePadProf.clear(); renderPreview(); });

  el.btnGuardar.addEventListener('click', function () {
    el.nombreFichero.value = 'consentimiento_' + Date.now() + '.pdf';
    el.popupNombre.classList.add('active');
    el.nombreFichero.focus();
    el.nombreFichero.select();
  });
  el.btnCancelarNombre.addEventListener('click', function () { el.popupNombre.classList.remove('active'); });

  // Cada opción del menú ejecuta su acción con el nombre indicado
  el.saveOpts.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var op = btn.getAttribute('data-op');
      var nombre = el.nombreFichero.value.trim();
      if (!nombre) { nombre = 'consentimiento.pdf'; }
      if (!/\.pdf$/i.test(nombre)) nombre += '.pdf';
      el.popupNombre.classList.remove('active');
      procesarGuardado(op, nombre);
    });
  });

  el.nombreFichero.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var primera = el.saveOpts[0];
      if (primera) primera.click();
    }
  });

  el.btnConfig.addEventListener('click', function () {
    var config = cargarConfig();
    var est = config.estudio || {};
    el.configUrl.value = config.url || '';
    el.cfgEstudioNombre.value = est.nombre || '';
    el.cfgEstudioDireccion.value = est.direccion || '';
    el.cfgEstudioTelefono.value = est.telefono || '';
    el.cfgEstudioCiudad.value = est.ciudad || '';
    el.popupConfig.classList.add('active');
  });
  el.btnCancelarConfig.addEventListener('click', function () { el.popupConfig.classList.remove('active'); });
  el.btnGuardarConfig.addEventListener('click', function () {
    var config = cargarConfig();
    config.url = el.configUrl.value.trim();
    config.estudio = {
      nombre: el.cfgEstudioNombre.value.trim(),
      direccion: el.cfgEstudioDireccion.value.trim(),
      telefono: el.cfgEstudioTelefono.value.trim(),
      ciudad: el.cfgEstudioCiudad.value.trim()
    };
    guardarConfig(config);
    el.popupConfig.classList.remove('active');
    guardarEstudioEnFormulario();
    autoRegenerar();
    mostrarToast('Configuración guardada', 'ok');
  });

  [el.popupNombre, el.popupConfig].forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // ---------- Inicialización ----------
  signaturePad = initFirma(el.firmaCanvas, renderPreview);
  signaturePadProf = initFirma(el.firmaProfCanvas, renderPreview);
  signaturePad.onEnd = renderPreview;
  signaturePadProf.onEnd = renderPreview;
  initFechas();
  guardarEstudioEnFormulario();
  limpiarFormularioNoEstudio();
  setearAutogen();
  renderPreview();

  window.addEventListener('load', function () {
    limpiarFormularioNoEstudio();
    renderPreview();
    setTimeout(limpiarFormularioNoEstudio, 300);
  });
})();