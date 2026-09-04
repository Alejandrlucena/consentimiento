(function () {
  'use strict';

  var CONFIG_KEY = 'consent_config';
  var SCALE = 2.0;
  var PAGE_W = 612;
  var PAGE_H = 792;
  var INSET = 2.0; // margen horizontal del valor dentro del hueco (pts)

  // Guardia anti-caché: si js/template.js no está presente (p. ej. por caché
  // antigua o mezcla de versiones), se muestra un aviso claro en vez de quedar
  // la vista previa en blanco o lanzar un error críptico.
  if (typeof TEMPLATE_PDF_B64 === 'undefined' || typeof TEMPLATE_PREVIEW_B64 === 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      var aviso = document.createElement('div');
      aviso.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;background:#dc2626;color:#fff;padding:10px 14px;font:14px/1.4 sans-serif';
      aviso.textContent = 'No se ha podido cargar la plantilla (js/template.js). Recarga la página con Ctrl+F5 para forzar la actualizaci\u00f3n de la cach\u00e9.';
      document.body.appendChild(aviso);
    });
  }

  // ---------------------------------------------------------------------
  // Campos dinámicos inline. Cada hueco se borra (rectángulo blanco de las
  // dimensiones exactas de los guiones/ellipsis de la plantilla) y el valor
  // se escribe justo a continuación de la palabra estática, en el mismo
  // renglón. Coordenadas en PUNTOS (top-down para el rect de borrado).
  //  - x0,x1 : límites del hueco (pts)
  //  - yTop,yBot : alto y bajo del renglón en top-down (pts)
  //  - size, minSize : tamaño de fuente base / mínimo tras auto-ajuste
  // ---------------------------------------------------------------------
  var FIELDS = [
    { id: 'nombre',  label: 'nombreCompleto',  x0: 79.5,  x1: 319.5, yTop: 82.7,  yBot: 91.6,  size: 8, minSize: 6 },
    { id: 'dni',     label: 'dni',             x0: 369.0, x1: 578.0, yTop: 82.7,  yBot: 91.6,  size: 8, minSize: 6 },
    { id: 'estudio', label: 'estudio',         x0: 329.7, x1: 378.6, yTop: 101.0, yBot: 108.8, size: 7, minSize: 4.5 },
    { id: 'rgpdResponsable', label: 'rgpdResponsable', x0: 274.8, x1: 364.8, yTop: 718.5, yBot: 725.2, size: 6, minSize: 4 },
    { id: 'rgpdCif', label: 'rgpdCif',         x0: 390.8, x1: 468.8, yTop: 718.5, yBot: 725.2, size: 6, minSize: 4 },
    { id: 'rgpdDomicilio', label: 'rgpdDomicilio', x0: 30.0, x1: 180.0, yTop: 725.4, yBot: 732.1, size: 6, minSize: 4 },
    { id: 'rgpdCorreo', label: 'rgpdCorreo',   x0: 60.7,  x1: 150.7, yTop: 746.1, yBot: 752.8, size: 6, minSize: 4 },
    { id: 'rgpdTelefono', label: 'rgpdTelefono', x0: 198.4, x1: 342.4, yTop: 746.1, yBot: 752.8, size: 6, minSize: 4 }
  ];

  // Huellas de firma (top-down) + líneas de datos bajo cada firma.
  var SIG_CLIENT = { canvas: 'firmaCanvas', imgX: 110, imgY: 620, imgW: 170, imgH: 42 };
  var SIG_CENTER = { canvas: 'firmaProfCanvas', imgX: 413, imgY: 620, imgW: 160, imgH: 42 };
  var DAT_CLIENT = [
    { x0: 110, x1: 290, yBase: 674, size: 7, minSize: 5, get: function () { return 'Nombre completo: ' + getInputValue('nombreCompleto'); } },
    { x0: 110, x1: 290, yBase: 684, size: 7, minSize: 5, get: function () { return 'DNI/NIE: ' + getInputValue('dni'); } },
    { x0: 110, x1: 290, yBase: 694, size: 7, minSize: 5, get: function () { return 'Firma: ' + ahora(); } }
  ];
  var DAT_CENTER = [
    { x0: 413, x1: 573, yBase: 674, size: 7, minSize: 5, get: function () { return 'Centro: ' + getInputValue('estudio'); } },
    { x0: 413, x1: 573, yBase: 684, size: 7, minSize: 5, get: function () { return 'CIF/DNI rep.: ' + getInputValue('rgpdCif'); } }
  ];

  var el = {
    estudio: document.getElementById('estudio'),
    nombre: document.getElementById('nombreCompleto'),
    dni: document.getElementById('dni'),
    rgpdResponsable: document.getElementById('rgpdResponsable'),
    rgpdCif: document.getElementById('rgpdCif'),
    rgpdDomicilio: document.getElementById('rgpdDomicilio'),
    rgpdCorreo: document.getElementById('rgpdCorreo'),
    rgpdTelefono: document.getElementById('rgpdTelefono'),
    firmaCanvas: document.getElementById('firmaCanvas'),
    btnLimpiarFirma: document.getElementById('btnLimpiarFirma'),
    firmaProfCanvas: document.getElementById('firmaProfCanvas'),
    btnLimpiarFirmaProf: document.getElementById('btnLimpiarFirmaProf'),
    btnGuardar: document.getElementById('btnGuardar'),
    previewWrap: document.getElementById('previewWrap'),
    btnConfig: document.getElementById('btnConfig'),
    popupConfig: document.getElementById('popupConfig'),
    configUrl: document.getElementById('configUrl'),
    btnCancelarConfig: document.getElementById('btnCancelarConfig'),
    btnGuardarConfig: document.getElementById('btnGuardarConfig'),
    btnBorrarEstudio: document.getElementById('btnBorrarEstudio'),
    btnBorrarScript: document.getElementById('btnBorrarScript'),
    btnBorrarTodo: document.getElementById('btnBorrarTodo'),
    popupNombre: document.getElementById('popupNombre'),
    nombreFichero: document.getElementById('nombreFichero'),
    btnCancelarNombre: document.getElementById('btnCancelarNombre'),
    saveOpts: Array.prototype.slice.call(document.querySelectorAll('.save-opt')),
    toast: document.getElementById('toast'),
    cfgEstudioNombre: document.getElementById('cfgEstudioNombre'),
    cfgEstudioDireccion: document.getElementById('cfgEstudioDireccion'),
    cfgEstudioTelefono: document.getElementById('cfgEstudioTelefono'),
    cfgEstudioCiudad: document.getElementById('cfgEstudioCiudad')
  };

  var _mctx = null;
  function measureCtx() {
    if (!_mctx) {
      var c = document.createElement('canvas');
      _mctx = c.getContext('2d');
    }
    return _mctx;
  }

  function fitSize(text, size, minSize, maxW) {
    if (!text) return size;
    var ctx = measureCtx();
    var s = size;
    while (s >= minSize) {
      ctx.font = s + 'px Helvetica, Arial, sans-serif';
      if (ctx.measureText(text).width <= maxW) return s;
      s -= 0.5;
    }
    return minSize;
  }

  function canvasToPngDataUrl(c) {
    if (c.toDataURL) {
      try { return c.toDataURL('image/png'); } catch (e) {}
    }
    var cn = document.createElement('canvas');
    cn.width = c.width;
    cn.height = c.height;
    cn.getContext('2d').drawImage(c, 0, 0);
    return cn.toDataURL('image/png');
  }

  function blobToBase64(blob, cb) {
    blob.arrayBuffer().then(function (buf) {
      var b = new Uint8Array(buf);
      var s = '';
      for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      cb(btoa(s));
    }).catch(function () { cb(null); });
  }

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }

  function getInputValue(label) {
    var inp = document.getElementById(label);
    return inp ? inp.value.trim() : '';
  }

  function ahora() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function firmaVacia(canvas) {
    if (!canvas || !canvas.width || !canvas.height) return true;
    var ctx = canvas.getContext('2d');
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (var i = 0; i < data.length; i += 4) {
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return false;
    }
    return true;
  }

  function cargarConfig() {
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function guardarConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  var secciones = Array.prototype.slice.call(document.querySelectorAll('details.section'));
  function recogerEstadoSecciones() {
    var res = {};
    for (var i = 0; i < secciones.length; i++) {
      res[secciones[i].querySelector('summary').textContent.trim()] = secciones[i].hasAttribute('open');
    }
    return res;
  }
  function guardarEstadoSecciones() {
    var config = cargarConfig();
    config.secciones = recogerEstadoSecciones();
    guardarConfig(config);
  }
  function aplicarEstadoSecciones() {
    var config = cargarConfig();
    var guardadas = config.secciones || {};
    for (var i = 0; i < secciones.length; i++) {
      var clave = secciones[i].querySelector('summary').textContent.trim();
      if (guardadas[clave] === true) secciones[i].setAttribute('open', '');
      else if (guardadas[clave] === false) secciones[i].removeAttribute('open');
    }
  }

  var bgImg = null;
  function loadBg() {
    bgImg = document.createElement('img');
    return new Promise(function (res, rej) {
      bgImg.onload = res;
      bgImg.onerror = rej;
      bgImg.src = 'data:image/png;base64,' + TEMPLATE_PREVIEW_B64;
    });
  }

  function mostrarToast(msg, tipo) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.className = 'toast toast-' + (tipo || '');
    el.toast.classList.add('show');
    clearTimeout(el.toast._t);
    el.toast._t = setTimeout(function () { el.toast.classList.remove('show'); }, 3000);
  }

  // =========================================================================
  // VISTA PREVIA (canvas, top-down)
  // =========================================================================
  function previewField(ctx, f) {
    var val = getInputValue(f.label);
    if (!val) return;
    var maxW = f.x1 - f.x0 - 2 * INSET;
    var sz = fitSize(val, f.size, f.minSize, maxW);
    // borrar hueco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(f.x0 * SCALE, f.yTop * SCALE, (f.x1 - f.x0) * SCALE, (f.yBot - f.yTop) * SCALE);
    // escribir valor inline
    ctx.fillStyle = '#000000';
    ctx.font = (sz * SCALE) + 'px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(val, (f.x0 + INSET) * SCALE, (PAGE_H - f.yBot) * SCALE);
  }

  function previewDataLine(ctx, dl) {
    var val = dl.get();
    if (!val) return;
    var sz = fitSize(val, dl.size, dl.minSize, dl.x1 - dl.x0);
    ctx.fillStyle = '#000000';
    ctx.font = (sz * SCALE) + 'px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(val, dl.x0 * SCALE, dl.yBase * SCALE);
  }

  function renderPreview() {
    el.previewWrap.textContent = '';
    var c = document.createElement('canvas');
    c.width = Math.round(PAGE_W * SCALE);
    c.height = Math.round(PAGE_H * SCALE);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    if (bgImg) ctx.drawImage(bgImg, 0, 0, c.width, c.height);

    for (var i = 0; i < FIELDS.length; i++) previewField(ctx, FIELDS[i]);

    var sigs = [SIG_CLIENT, SIG_CENTER];
    for (var s = 0; s < sigs.length; s++) {
      var sq = sigs[s];
      var sigCanvas = document.getElementById(sq.canvas);
      if (sigCanvas && !firmaVacia(sigCanvas)) {
        ctx.drawImage(sigCanvas, sq.imgX * SCALE, sq.imgY * SCALE, sq.imgW * SCALE, sq.imgH * SCALE);
      }
      var lines = sq === SIG_CLIENT ? DAT_CLIENT : DAT_CENTER;
      for (var l = 0; l < lines.length; l++) previewDataLine(ctx, lines[l]);
    }

    el.previewWrap.appendChild(c);
    el.btnGuardar.disabled = false;
  }

  // =========================================================================
  // PDF (pdf-lib, bottom-up). y = PAGE_H - (top-down)
  // =========================================================================
  function pdfField(page, font, f) {
    var val = getInputValue(f.label);
    if (!val) return;
    var maxW = f.x1 - f.x0 - 2 * INSET;
    var sz = fitSize(val, f.size, f.minSize, maxW);
    page.drawRectangle({
      x: f.x0,
      y: PAGE_H - f.yBot,
      width: f.x1 - f.x0,
      height: f.yBot - f.yTop,
      color: PDFLib.rgb(1, 1, 1),
      borderWidth: 0
    });
    page.drawText(val, {
      x: f.x0 + INSET,
      y: PAGE_H - f.yBot,
      size: sz,
      font: font,
      color: PDFLib.rgb(0, 0, 0)
    });
  }

  function pdfDataLine(page, font, dl) {
    var val = dl.get();
    if (!val) return;
    var sz = fitSize(val, dl.size, dl.minSize, dl.x1 - dl.x0);
    page.drawText(val, {
      x: dl.x0,
      y: PAGE_H - dl.yBase,
      size: sz,
      font: font,
      color: PDFLib.rgb(0, 0, 0)
    });
  }

  function embedSig(doc, page, sigCanvas, box) {
    var dataUrl = canvasToPngDataUrl(sigCanvas);
    var b64 = dataUrl.split(',')[1];
    var pngBytes = b64ToBytes(b64);
    return doc.embedPng(pngBytes).then(function (img) {
      page.drawImage(img, {
        x: box.imgX,
        y: PAGE_H - box.imgY - box.imgH,
        width: box.imgW,
        height: box.imgH
      });
    });
  }

  function generarBlobPDF() {
    var bytes = b64ToBytes(TEMPLATE_PDF_B64);
    return PDFLib.PDFDocument.load(bytes).then(function (doc) {
      return doc.embedFont(PDFLib.StandardFonts.Helvetica).then(function (font) {
        var page = doc.getPage(0);

        for (var i = 0; i < FIELDS.length; i++) pdfField(page, font, FIELDS[i]);

        var sigPromises = [];
        if (!firmaVacia(el.firmaCanvas)) {
          sigPromises.push(embedSig(doc, page, el.firmaCanvas, SIG_CLIENT));
        }
        if (!firmaVacia(el.firmaProfCanvas)) {
          sigPromises.push(embedSig(doc, page, el.firmaProfCanvas, SIG_CENTER));
        }

        var dl;
        for (i = 0; i < DAT_CLIENT.length; i++) pdfDataLine(page, font, DAT_CLIENT[i]);
        for (i = 0; i < DAT_CENTER.length; i++) pdfDataLine(page, font, DAT_CENTER[i]);

        return Promise.all(sigPromises).then(function () { return doc.save(); });
      });
    }).then(function (pdfBytes) {
      return new Blob([pdfBytes], { type: 'application/pdf' });
    });
  }

  function descargarBlob(blob, nombre) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 300);
  }

  function subirADrive(blob, nombre) {
    var cfg = cargarConfig();
    if (!cfg.url || cfg.url.indexOf('http') !== 0) {
      return new Promise(function (resolve, reject) { reject(new Error('NO_URL')); });
    }
    var url = cfg.url;
    mostrarToast('Subiendo a Google Drive\u2026', '');
    return new Promise(function (resolve, reject) {
      blobToBase64(blob, function (base64) {
        if (!base64) { reject(new Error('No se pudo convertir el PDF')); return; }
        fetch(url, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            fileName: nombre,
            fileData: base64,
            mimeType: blob.type || 'application/pdf'
          })
        })
          .then(function (r) {
            return r.text().then(function (txt) { return { ok: r.ok, status: r.status, txt: txt }; });
          })
          .then(function (env) {
            var res = null;
            try { res = JSON.parse(env.txt); } catch (e) { res = null; }
            if (env.ok && res && res.status === 'success') { resolve(res); return; }
            reject(new Error((res && res.message) || 'Error en la subida a Drive'));
          })
          .catch(function (err) {
            reject(err && err.message ? err : new Error('No se pudo conectar con el Apps Script'));
          });
      });
    });
  }

  function procesarGuardado(op, nombre) {
    renderPreview();
    mostrarToast('Generando PDF\u2026', '');
    el.btnGuardar.disabled = true;
    generarBlobPDF().then(function (blob) {
      if (op === 'download' || op === 'both') descargarBlob(blob, nombre);
      if (op === 'drive' || op === 'both') {
        return subirADrive(blob, nombre).then(function (res) {
          if (res && res.status === 'success') {
            mostrarToast('Documento subido correctamente a Google Drive', 'ok');
            if (res.fileUrl) window.open(res.fileUrl, '_blank');
          } else {
            mostrarToast('Subido a Drive (sin confirmaci\u00f3n del servidor)', 'ok');
          }
        });
      }
      return null;
    }).catch(function (err) {
      if (err && err.message === 'NO_URL') {
        mostrarToast('Configura la URL de Apps Script (Configuraci\u00f3n)', 'error');
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

  var _renderTimer = null;
  function autoRegenerar() {
    clearTimeout(_renderTimer);
    _renderTimer = setTimeout(renderPreview, 60);
  }

  function guardarEstudioEnFormulario() {
    var config = cargarConfig();
    var est = config.estudio || {};
    el.estudio.value = est.nombre || '';
  }

  var signaturePad = null;
  var signaturePadProf = null;

  function initSigPad(canvas) {
    var wrapper = canvas.parentElement;
    var w = wrapper.clientWidth || 400;
    var h = wrapper.clientHeight || 160;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d', { willReadFrequently: true });
    var pad = new SignaturePad(canvas, { penColor: '#000000', minWidth: 1, maxWidth: 2.5 });
    pad.onEnd = function () { autoRegenerar(); };
    return pad;
  }

  el.btnLimpiarFirma.addEventListener('click', function () {
    signaturePad.clear();
    renderPreview();
  });
  el.btnLimpiarFirmaProf.addEventListener('click', function () {
    signaturePadProf.clear();
    renderPreview();
  });

  for (var i = 0; i < secciones.length; i++) {
    secciones[i].addEventListener('toggle', guardarEstadoSecciones);
  }

  el.btnGuardar.addEventListener('click', function () {
    el.nombreFichero.value = 'consentimiento_eliminacion_' + Date.now() + '.pdf';
    el.popupNombre.classList.add('active');
    el.nombreFichero.focus();
    el.nombreFichero.select();
  });
  el.btnCancelarNombre.addEventListener('click', function () {
    el.popupNombre.classList.remove('active');
  });

  el.saveOpts.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var op = btn.getAttribute('data-op');
      var nombre = el.nombreFichero.value.trim();
      if (!nombre) nombre = 'consentimiento_eliminacion.pdf';
      if (!/\.pdf$/i.test(nombre)) nombre += '.pdf';
      el.popupNombre.classList.remove('active');
      procesarGuardado(op, nombre);
    });
  });

  el.nombreFichero.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && el.saveOpts[0]) el.saveOpts[0].click();
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
  el.btnCancelarConfig.addEventListener('click', function () {
    el.popupConfig.classList.remove('active');
  });
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
    mostrarToast('Configuraci\u00f3n guardada', 'ok');
  });

  function borrarConfig(opciones, mensaje) {
    var config = cargarConfig();
    Object.keys(opciones).forEach(function (clave) {
      if (opciones[clave]) delete config[clave];
    });
    guardarConfig(config);
    el.popupConfig.classList.remove('active');
    guardarEstudioEnFormulario();
    autoRegenerar();
    mostrarToast(mensaje, 'ok');
  }
  el.btnBorrarEstudio.addEventListener('click', function () {
    borrarConfig({ estudio: true, secciones: true }, 'Datos del establecimiento borrados');
  });
  el.btnBorrarScript.addEventListener('click', function () {
    borrarConfig({ url: true }, 'Configuraci\u00f3n de Apps Script borrada');
  });
  el.btnBorrarTodo.addEventListener('click', function () {
    if (!window.confirm('\u00bfSeguro que quieres borrar TODA la configuraci\u00f3n guardada en este navegador?')) return;
    borrarConfig({ estudio: true, url: true, secciones: true }, 'Configuraci\u00f3n borrada por completo');
  });

  [el.popupNombre, el.popupConfig].forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  var campoIds = ['estudio', 'nombreCompleto', 'dni', 'rgpdResponsable', 'rgpdCif', 'rgpdDomicilio', 'rgpdCorreo', 'rgpdTelefono'];
  campoIds.forEach(function (id) {
    var inp = document.getElementById(id);
    if (inp) {
      inp.addEventListener('input', autoRegenerar);
      inp.addEventListener('change', autoRegenerar);
    }
  });

  function init() {
    aplicarEstadoSecciones();
    signaturePad = initSigPad(el.firmaCanvas);
    signaturePadProf = initSigPad(el.firmaProfCanvas);
    guardarEstudioEnFormulario();
    renderPreview();
  }

  loadBg().then(init, init);

})();