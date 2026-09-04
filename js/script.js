(function () {
  'use strict';

  var CONFIG_KEY = 'consent_config';
  var PAGE_W = 612;
  var PAGE_H = 792;
  var INSET = 2.0; // margen horizontal del valor dentro del hueco (pts)

  // Guardia anti-caché / carga incompleta.
  if (typeof TEMPLATE_PDF_B64 === 'undefined' || typeof TEMPLATE_PREVIEW_B64 === 'undefined' ||
      typeof DOC_LINES === 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      var aviso = document.createElement('div');
      aviso.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;background:#dc2626;color:#fff;padding:10px 14px;font:14px/1.4 sans-serif';
      aviso.textContent = 'No se ha podido cargar la plantilla o el contenido del documento (js/template.js / js/docdata.js). Recarga la página con Ctrl+F5 para forzar la actualizaci\u00f3n de la cach\u00e9.';
      document.body.appendChild(aviso);
    });
    return;
  }

  // ---------------------------------------------------------------------
  // Posiciones de los "huecos" a rellenar (coordenadas top-down en pts).
  // x0..x1 = límites del hueco; yTop..yBot = alto del renglón.
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

  // Orden de los huecos DENTRO de cada línea (por su y top-down), para
  // sustituir las tiradas de "_" y "…" de la línea por los spans vinculados.
  var BLANKS_BY_LINE = {
    '82.7': ['nombre', 'dni'],
    '101.0': ['estudio'],
    '718.5': ['rgpdResponsable', 'rgpdCif'],
    '725.4': ['rgpdDomicilio'],
    '746.1': ['rgpdCorreo', 'rgpdTelefono']
  };

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
    docPreview: document.getElementById('docPreview'),
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
    cfgEstudioCiudad: document.getElementById('cfgEstudioCiudad'),
    cfgEstudioCorreo: document.getElementById('cfgEstudioCorreo')
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
  function getInputValueRaw(label) {
    var inp = document.getElementById(label);
    return inp ? inp.value : '';
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

  function canvasToWhiteDataUrl(src) {
    var c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(src, 0, 0);
    return c.toDataURL('image/png');
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

  function mostrarToast(msg, tipo) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.className = 'toast toast-' + (tipo || '');
    el.toast.classList.add('show');
    clearTimeout(el.toast._t);
    el.toast._t = setTimeout(function () { el.toast.classList.remove('show'); }, 3000);
  }

  // =====================================================================
  // CONSTRUCCIÓN DE LA VISTA PREVIA HTML (documento con binding)
  // =====================================================================
  var fillSpans = {};   // bind id -> { span, blankText }
  var sigCols = {};     // 'client' | 'center' -> { frame, ... }

  function textNode(txt) {
    return document.createTextNode(txt);
  }

  function buildDoc() {
    var doc = document.createElement('div');
    doc.className = 'doc';

    // --- Cabecera de contacto (info del centro), aislada del título ---
    var cfg = cargarConfig();
    var est = cfg.estudio || {};
    var head = document.createElement('div');
    head.className = 'doc-head';
    var contact = document.createElement('div');
    contact.className = 'doc-contact';
    contact.innerHTML =
      (est.nombre ? '<div class="estudio-name">' + esc(est.nombre) + '</div>' : '') +
      (est.direccion && est.ciudad ? '<div>' + esc(est.direccion) + ', ' + esc(est.ciudad) + '</div>' : (est.direccion ? '<div>' + esc(est.direccion) + '</div>' : '')) +
      (est.telefono ? '<div>Tel.: ' + esc(est.telefono) + '</div>' : '') +
      (est.correo ? '<div>' + esc(est.correo) + '</div>' : '');
    if (contact.childNodes.length) head.appendChild(contact);
    doc.appendChild(head);

    // --- Título ---
    var h = document.createElement('div');
    h.className = 'doc-title';
    h.textContent = 'DECLARACI\u00d3N DE CONSENTIMIENTO INFORMADO';
    doc.appendChild(h);
    var sh = document.createElement('div');
    sh.className = 'doc-subtitle';
    sh.textContent = 'ELIMINACI\u00d3N DE TATUAJES Y LESIONES PIGMENTARIAS';
    doc.appendChild(sh);

    // --- Cuerpo (líneas extraídas del documento original) ---
    var H3_YS = { '125.2': 1, '157.4': 1, '431.0': 1 };
    DOC_LINES.forEach(function (ln) {
      if (ln.y === 608.1) return; // las líneas de firma se montan aparte
      if (String(ln.y) === '82.7' || String(ln.y) === '101.0') {
        doc.appendChild(buildTextLine(ln, 'doc-line'));
        return;
      }
      if (ln.y >= 704) {
        // Cláusula RGPD: una sola línea por <p>, todo en <span> inline
        doc.appendChild(buildRgpdPara(ln));
        return;
      }
      if (H3_YS[String(ln.y)]) {
        doc.appendChild(buildTextLine(ln, 'doc-h3'));
        return;
      }
      doc.appendChild(buildTextLine(ln, 'doc-line'));
    });

    // --- Bloque de firmas (dos columnas) ---
    el.docPreview.appendChild(doc);
    doc.appendChild(buildFirmas());
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function segFont(bold, italic) {
    return (italic ? 'italic ' : '') + (bold ? 'bold ' : '');
  }

  // Construye una línea de texto normal (párrafo) con sus <span> y los
  // huecos convertidos en <span class="fill" data-bind>.
  function buildTextLine(ln, cls) {
    var p = document.createElement('p');
    p.className = cls || 'doc-line';
    if (ln.segs && ln.segs[0]) p.style.fontSize = ln.segs[0][2] + 'pt';
    var fills = BLANKS_BY_LINE[String(ln.y)] || null;
    var fi = 0;
    ln.segs.forEach(function (seg) {
      var t = seg[0];
      // split por tiradas de subrayado / puntos suspensivos
      var tokens = String(t).split(/([_…]+)/);
      var st = document.createElement('span');
      st.className = 'seg';
      st.style.fontStyle = seg[4] ? 'italic' : 'normal';
      st.style.fontWeight = seg[3] ? 'bold' : 'normal';
      tokens.forEach(function (tok) {
        if (tok === '') return;
        if (/^[_…]+$/.test(tok)) {
          if (fills && fi < fills.length) {
            var bind = fills[fi++];
            var span = document.createElement('span');
            span.className = 'fill ' + bind;
            span.setAttribute('data-bind', bind);
            span.textContent = '';
            fillSpans[bind] = { span: span, blank: tok };
            st.appendChild(span);
          } else {
            st.appendChild(textNode(tok));
          }
        } else {
          st.appendChild(textNode(tok));
        }
      });
      p.appendChild(st);
    });
    return p;
  }

  // Cláusula RGPD: un <p> por línea, con los huecos en <span> (inline),
  // manteniendo el texto legal continuo y legible (sin ellipsis).
  function buildRgpdPara(ln) {
    var p = document.createElement('p');
    if (ln.segs && ln.segs[0]) p.style.fontSize = ln.segs[0][2] + 'pt';
    var fills = BLANKS_BY_LINE[String(ln.y)] || null;
    var fi = 0;
    ln.segs.forEach(function (seg) {
      var t = String(seg[0]);
      var tokens = t.split(/([_…]+)/);
      var st = document.createElement('span');
      tokens.forEach(function (tok) {
        if (tok === '') return;
        if (/^[_…]+$/.test(tok)) {
          if (fills && fi < fills.length) {
            var bind = fills[fi++];
            var span = document.createElement('span');
            span.className = 'fill ' + bind;
            span.setAttribute('data-bind', bind);
            span.textContent = '';
            fillSpans[bind] = { span: span, blank: tok };
            st.appendChild(span);
          } else {
            st.appendChild(textNode(tok));
          }
        } else {
          st.appendChild(textNode(tok));
        }
      });
      p.appendChild(st);
    });
    return p;
  }

  function buildFirmas() {
    var area = document.createElement('div');
    area.className = 'firma-area';

    // Columna cliente
    var c1 = document.createElement('div');
    c1.className = 'firma-col';
    var t1 = document.createElement('div');
    t1.className = 'firma-title';
    t1.textContent = 'FIRMA DEL CLIENTE Y D.N.I.';
    c1.appendChild(t1);
    c1.appendChild(sigFrame('client'));

    var meta1 = document.createElement('div');
    meta1.className = 'firma-meta';
    meta1.innerHTML =
      metaRow('Nombre completo', 'nombre') + metaRow('DNI/NIE', 'dni') +
      '<div class="meta-row"><span class="meta-label">Firma: </span><span class="meta-val" id="metaFechaClient">' + esc(ahora()) + '</span></div>';
    sigCols.client.meta = meta1;
    c1.appendChild(meta1);

    // Columna centro
    var c2 = document.createElement('div');
    c2.className = 'firma-col';
    var t2 = document.createElement('div');
    t2.className = 'firma-title';
    t2.textContent = 'FIRMA DEL CENTRO';
    c2.appendChild(t2);
    c2.appendChild(sigFrame('center'));

    var meta2 = document.createElement('div');
    meta2.className = 'firma-meta';
    meta2.innerHTML =
      metaRow('Nombre del centro', 'estudio') + metaRow('CIF/DNI rep.', 'rgpdCif') +
      '<div class="meta-row"><span class="meta-label">Fecha/Hora: </span><span class="meta-val" id="metaFechaCentro">' + esc(ahora()) + '</span></div>';
    sigCols.center.meta = meta2;
    c2.appendChild(meta2);

    area.appendChild(c1);
    area.appendChild(c2);
    return area;
  }

  function metaRow(label, bind) {
    return '<div class="meta-row"><span class="meta-label">' + esc(label) + ': </span>' +
      '<span class="meta-val" data-meta-bind="' + esc(bind) + '"></span></div>';
  }

  function sigFrame(key) {
    var frame = document.createElement('div');
    frame.className = 'sig-frame';
    var img = document.createElement('img');
    img.className = 'sig-img';
    img.alt = '';
    frame.appendChild(img);
    sigCols[key] = sigCols[key] || {};
    sigCols[key].frame = frame;
    sigCols[key].img = img;
    return frame;
  }

  // Actualiza los textos vinculados y las imágenes de firma. Se llama en
  // cada cambio de input / firma (reactividad en tiempo real).
  function refreshDocs() {
    Object.keys(fillSpans).forEach(function (bind) {
      var o = fillSpans[bind];
      var val = getInputValueRaw(bind);
      var has = val && val.trim() !== '';
      if (has) {
        o.span.textContent = val;
      } else if (bind === 'nombre' || bind === 'dni' || bind === 'estudio') {
        // Mantener el subrayado de la plantilla visible mientras el campo
        // está vacío (sin puntos suspensivos; solo guiones bajos).
        o.span.textContent = o.blank;
      } else {
        o.span.textContent = '';
      }
    });
    // meta filas debajo de firmas
    document.querySelectorAll('.firma-meta [data-meta-bind]').forEach(function (s) {
      var bind = s.getAttribute('data-meta-bind');
      var val = getInputValueRaw(bind);
      s.textContent = (val && val.trim() !== '') ? val : '';
    });
    refreshSig('client', el.firmaCanvas);
    refreshSig('center', el.firmaProfCanvas);
  }

  function refreshSig(key, canvas) {
    var c = sigCols[key];
    if (canvas && !firmaVacia(canvas)) {
      c.img.style.display = 'block';
      c.img.src = canvasToWhiteDataUrl(canvas);
      if (c.empty) { c.empty.remove(); c.empty = null; }
    } else {
      if (c.img && c.img.parentNode === c.frame) { c.img.remove(); }
      if (!c.empty) {
        c.empty = document.createElement('div');
        c.empty.className = 'sig-empty';
        c.empty.textContent = '(firma pendiente)';
        c.frame.appendChild(c.empty);
      }
    }
  }

  function guardarEstudioEnFormulario() {
    var config = cargarConfig();
    var est = config.estudio || {};
    if (el.estudio) el.estudio.value = est.nombre || '';
  }

  // =====================================================================
  // PDF (pdf-lib): se reconstruye sobre la PLANTILLA ORIGINAL incrustada,
  // rellenando los huecos con los mismos valores vinculados que la preview.
  // =====================================================================
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

  var SIG_CLIENT = { imgX: 110, imgY: 620, imgW: 170, imgH: 42 };
  var SIG_CENTER = { imgX: 413, imgY: 620, imgW: 160, imgH: 42 };
  var DAT_CLIENT = [
    { x0: 110, x1: 290, yBase: 674, size: 7, minSize: 5, get: function () { return 'Nombre completo: ' + getInputValue('nombreCompleto'); } },
    { x0: 110, x1: 290, yBase: 684, size: 7, minSize: 5, get: function () { return 'DNI/NIE: ' + getInputValue('dni'); } },
    { x0: 110, x1: 290, yBase: 694, size: 7, minSize: 5, get: function () { return 'Firma: ' + ahora(); } }
  ];
  var DAT_CENTER = [
    { x0: 413, x1: 573, yBase: 674, size: 7, minSize: 5, get: function () { return 'Centro: ' + getInputValue('estudio'); } },
    { x0: 413, x1: 573, yBase: 684, size: 7, minSize: 5, get: function () { return 'CIF/DNI rep.: ' + getInputValue('rgpdCif'); } },
    { x0: 413, x1: 573, yBase: 694, size: 7, minSize: 5, get: function () { return 'Fecha/Hora: ' + ahora(); } }
  ];

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
    var c = document.createElement('canvas');
    c.width = sigCanvas.width;
    c.height = sigCanvas.height;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(sigCanvas, 0, 0);
    var dataUrl = c.toDataURL('image/png');
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

  function blobToBase64(blob, cb) {
    blob.arrayBuffer().then(function (buf) {
      var b = new Uint8Array(buf);
      var s = '';
      for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      cb(btoa(s));
    }).catch(function () { cb(null); });
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
    refreshDocs();
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
    pad.onEnd = function () { refreshDocs(); };
    return pad;
  }

  el.btnLimpiarFirma.addEventListener('click', function () {
    signaturePad.clear();
    refreshDocs();
  });
  el.btnLimpiarFirmaProf.addEventListener('click', function () {
    signaturePadProf.clear();
    refreshDocs();
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
    el.cfgEstudioCorreo.value = (est.correo || '');
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
      ciudad: el.cfgEstudioCiudad.value.trim(),
      correo: el.cfgEstudioCorreo ? el.cfgEstudioCorreo.value.trim() : ''
    };
    guardarConfig(config);
    el.popupConfig.classList.remove('active');
    guardarEstudioEnFormulario();
    rebuildPreview();
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
    rebuildPreview();
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
      inp.addEventListener('input', refreshDocs);
      inp.addEventListener('change', refreshDocs);
    }
  });

  function rebuildPreview() {
    el.docPreview.textContent = '';
    fillSpans = {};
    sigCols = {};
    buildDoc();
    refreshDocs();
  }

  function init() {
    aplicarEstadoSecciones();
    signaturePad = initSigPad(el.firmaCanvas);
    signaturePadProf = initSigPad(el.firmaProfCanvas);
    guardarEstudioEnFormulario();
    rebuildPreview();
    el.btnGuardar.disabled = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
