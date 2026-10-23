/* ============================================================
   pdf.js — Fe de Jesús
   Genera el PDF del estudio completado para enviar al instructor.
   Sin dependencias externas: el PDF se arma a mano (PDF 1.4,
   fuentes Helvetica base + WinAnsi), así funciona OFFLINE dentro
   de la PWA y no hace falta ninguna librería de internet.

   Uso en leccion.html:
     var doc  = armarDocPdf();                       // datos del estudio
     var pdf  = window.fejPdf.construirPdf(doc);     // string PDF (1 byte = 1 char)
     var blob = window.fejPdf.blobDe(pdf);           // Blob application/pdf
     var nom  = window.fejPdf.nombreArchivo(doc);    // "Fe-de-Jesus-Dia-03-Maria.pdf"
   ============================================================ */
(function(global){
"use strict";

var A4_W = 595.28, A4_H = 841.89;
var MX = 56;                     /* margen lateral */
var MT = 64, MB = 58;            /* margen superior / inferior */
var ANCHO = A4_W - MX * 2;       /* ancho útil */

var NEGRO   = [0.05, 0.07, 0.10];
var GRIS    = [0.42, 0.45, 0.49];
var GRISCL  = [0.60, 0.63, 0.66];
var AZUL    = [0.09, 0.47, 0.95];   /* #1877F2 */
var AZULOSC = [0.04, 0.28, 0.62];
var VERDE   = [0.10, 0.47, 0.24];
var LINEA   = [0.88, 0.90, 0.93];

/* ---- Texto seguro para WinAnsi (cp1252): tildes y ñ OK, emoji fuera ---- */
function latin1(s){
  return String(s)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\u0000-\u00FF]/g, "")
    .trim();
}
function esc(s){ return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function bytesDe(s){
  var n = s.length, u = new Uint8Array(n);
  for(var i = 0; i < n; i++) u[i] = s.charCodeAt(i) & 0xFF;
  return u;
}

/* ---- Medidor de ancho de texto: canvas si existe, si no aproximación ---- */
function crearMedidor(){
  try{
    var c = document.createElement("canvas");
    var ctx = c.getContext("2d");
    if(ctx){
      return function(texto, size, bold, italic){
        ctx.font = (italic ? "italic " : "") + (bold ? "bold " : "") + size + "px Helvetica, Arial, sans-serif";
        return ctx.measureText(texto).width * 1.04;
      };
    }
  }catch(e){}
  return function(texto, size, bold){ return latin1(texto).length * size * (bold ? 0.58 : 0.53); };
}

/* ---- Corte de líneas por palabra ---- */
function partirLineas(texto, anchoMax, size, bold, italic, med){
  var t = latin1(texto);
  if(!t) return [""];
  var palabras = t.split(/\s+/).filter(Boolean);
  var lineas = [], linea = "";
  for(var i = 0; i < palabras.length; i++){
    var prueba = linea ? linea + " " + palabras[i] : palabras[i];
    if(!linea || med(prueba, size, bold, italic) <= anchoMax) linea = prueba;
    else { lineas.push(linea); linea = palabras[i]; }
  }
  if(linea) lineas.push(linea);
  return lineas;
}
function pad10(n){ var s = String(n); while(s.length < 10) s = "0" + s; return s; }
function num2(n){ return (n < 10 ? "0" : "") + n; }

/* ============================================================
   construirPdf(doc, medidorExt) -> string con el PDF completo
   doc = {
     dia, titulo, alumno, fecha, instructor,
     items: [ { n, pregunta, referencia,
                opciones:[".."], elegida:".." | nols:true,
                escrita:"texto" } ... ],
     decision: { texto, valor:"si"|"no"|"", nombre, fecha } | null
   }
   ============================================================ */
function construirPdf(doc, medidorExt){
  var med = medidorExt || crearMedidor();
  var paginas = [];
  var pag = null;
  function nuevaPagina(){ pag = { ops: [], y: A4_H - MT }; paginas.push(pag); return pag; }
  nuevaPagina();

  /* Bloques: { t, x1, x2, size, bold, it, color, lh, gapAntes, lineas }
     x1 = sangría primera línea, x2 = sangría del resto (sangría francesa).
     regla = { regla:true, grosor, color, gapAntes }                 */
  function escribir(bloques){
    var altura = 0;
    bloques.forEach(function(b){
      if(b.regla){ altura += (b.gapAntes || 0) + 10; return; }
      if(!b.lineas) b.lineas = partirLineas(b.t, ANCHO - (b.x2 || b.x1) - 2, b.size, b.bold, b.it, med);
      altura += (b.gapAntes || 0) + b.lineas.length * b.lh;
    });
    /* Si el bloque entero no entra pero sí en una página nueva, arranco página */
    if(pag.y - altura < MB && (A4_H - MT - MB) >= altura) nuevaPagina();

    bloques.forEach(function(b){
      if(b.gapAntes){ if(pag.y - b.gapAntes < MB) nuevaPagina(); else pag.y -= b.gapAntes; }
      if(b.regla){
        if(pag.y - 10 < MB) nuevaPagina();
        var yl = (pag.y - 3).toFixed(2);
        pag.ops.push((b.color || LINEA).join(" ") + " RG " + (b.grosor || 0.8) + " w " + MX + " " + yl + " m " + (A4_W - MX) + " " + yl + " l S");
        pag.y -= 7;
        return;
      }
      var xs = [b.x1, (b.x2 !== undefined ? b.x2 : b.x1)];
      for(var i = 0; i < b.lineas.length; i++){
        var lh = b.lh;
        if(pag.y - lh < MB) nuevaPagina();
        var f = b.bold ? "/F2" : (b.it ? "/F3" : "/F1");
        var x = xs[i === 0 ? 0 : 1];
        pag.ops.push("BT " + f + " " + b.size + " Tf " + b.color.join(" ") + " rg 1 0 0 1 " + x.toFixed(2) + " " + pag.y.toFixed(2) + " Tm (" + esc(b.lineas[i]) + ") Tj ET");
        pag.y -= lh;
      }
    });
  }

  /* Línea compuesta en una sola base (etiqueta gris + dato en negrita) */
  function lineaCompuesta(partes, size, lh, gapAntes){
    if(gapAntes){ if(pag.y - gapAntes < MB) nuevaPagina(); else pag.y -= gapAntes; }
    if(pag.y - lh < MB) nuevaPagina();
    var x = MX, y = pag.y;
    partes.forEach(function(pt){
      var f = pt.bold ? "/F2" : "/F1";
      pag.ops.push("BT " + f + " " + size + " Tf " + pt.color.join(" ") + " rg 1 0 0 1 " + x.toFixed(2) + " " + y.toFixed(2) + " Tm (" + esc(latin1(pt.t)) + ") Tj ET");
      x += med(pt.t, size, pt.bold, false) + (pt.sep || 0);
    });
    pag.y -= lh;
  }

  /* ================= ENCABEZADO ================= */
  escribir([{ t: "FE DE JESÚS  ·  ESTUDIO PARA REVISIÓN", x1: MX, size: 8.5, bold: true, color: AZUL, lh: 12 }]);
  escribir([{ t: "DÍA " + doc.dia + " DE 20", x1: MX, size: 10, bold: true, color: GRIS, lh: 14, gapAntes: 10 }]);
  escribir([{ t: doc.titulo || "", x1: MX, size: 17, bold: true, color: NEGRO, lh: 23 }]);
  escribir([{ regla: true, grosor: 1.8, color: AZUL, gapAntes: 4 }]);

  lineaCompuesta([
    { t: "Alumno: ", color: GRIS },
    { t: doc.alumno || "Sin nombre", bold: true, color: NEGRO },
    { t: "      Fecha: ", color: GRIS },
    { t: doc.fecha || "", bold: true, color: NEGRO }
  ], 10.5, 15, 10);
  if(doc.instructor){
    lineaCompuesta([
      { t: "Instructor: ", color: GRIS },
      { t: doc.instructor, bold: true, color: NEGRO }
    ], 10.5, 15, 2);
  }
  escribir([{ regla: true, grosor: 0.8, color: LINEA, gapAntes: 8 }]);

  /* ================= PREGUNTAS ================= */
  (doc.items || []).forEach(function(it, idx){
    var XP = MX + 24;
    var bloques = [];
    bloques.push({
      t: it.n + ". " + (it.pregunta || ""),
      x1: MX, x2: XP, size: 11.5, bold: true, color: NEGRO, lh: 16.5,
      gapAntes: idx ? 6 : 2
    });
    if(it.referencia){
      bloques.push({ t: "(" + it.referencia + ")", x1: XP, size: 9.5, color: AZULOSC, lh: 13, gapAntes: 3 });
    }
    if(it.opciones && it.opciones.length){
      if(it.elegida){
        it.opciones.forEach(function(o){
          var elegida = (o === it.elegida);
          bloques.push({
            t: (elegida ? "»  " : "·  ") + o,
            x1: XP, size: 10.5, bold: elegida,
            color: elegida ? AZULOSC : GRIS, lh: 15, gapAntes: 2.5
          });
        });
      } else if(it.nols){
        bloques.push({ t: "»  No lo sé (quiere que su instructor se lo explique)", x1: XP, size: 10.5, bold: true, color: AZULOSC, lh: 15, gapAntes: 2.5 });
      }
    } else if(it.escrita !== undefined){
      bloques.push({ t: "Respuesta:", x1: XP, size: 9, bold: true, color: GRIS, lh: 12, gapAntes: 4 });
      if(it.escrita){
        bloques.push({ t: it.escrita, x1: XP, size: 11, color: NEGRO, lh: 15.5, gapAntes: 3 });
      } else {
        bloques.push({ t: "(sin responder)", x1: XP, size: 11, it: true, color: GRISCL, lh: 15.5, gapAntes: 3 });
      }
    }
    if(idx < doc.items.length - 1) bloques.push({ regla: true, gapAntes: 8 });
    escribir(bloques);
  });

  /* ================= DECISIÓN PERSONAL ================= */
  if(doc.decision){
    var d = doc.decision;
    var bloquesD = [];
    bloquesD.push({ regla: true, grosor: 1.4, color: AZUL, gapAntes: 12 });
    bloquesD.push({ t: "DECISIÓN PERSONAL", x1: MX, size: 10, bold: true, color: AZUL, lh: 14, gapAntes: 8 });
    if(d.texto) bloquesD.push({ t: '"' + d.texto + '"', x1: MX, size: 11, it: true, color: NEGRO, lh: 15.5, gapAntes: 4 });
    var vColor = d.valor === "si" ? VERDE : (d.valor === "no" ? GRIS : GRISCL);
    var vTxt = d.valor === "si" ? "SÍ" : (d.valor === "no" ? "NO" : "sin marcar");
    bloquesD.push({ t: "Mi decisión: " + vTxt, x1: MX, size: 11.5, bold: true, color: vColor, lh: 16, gapAntes: 5 });
    bloquesD.push({ t: "Nombre: " + (d.nombre || doc.alumno || "—") + "      Fecha: " + (d.fecha || doc.fecha || "—"), x1: MX, size: 10, color: GRIS, lh: 14, gapAntes: 4 });
    escribir(bloquesD);
  }

  /* ================= PIE DE PÁGINA (una vez conocido el total) ================= */
  var total = paginas.length;
  paginas.forEach(function(p, i){
    var txt = latin1("Fe de Jesús  ·  Día " + doc.dia + "  ·  Página " + (i + 1) + " de " + total);
    var w = med(txt, 8, false, false);
    var x = Math.max(MX, (A4_W - w) / 2);
    p.ops.push("BT /F1 8 Tf 0.55 0.57 0.60 rg 1 0 0 1 " + x.toFixed(2) + " 34 Tm (" + esc(txt) + ") Tj ET");
  });

  /* ================= ARMADO DEL ARCHIVO ================= */
  var contenido = paginas.map(function(p){ return p.ops.join("\n"); });
  var nP = contenido.length;
  var kids = [];
  for(var i = 0; i < nP; i++) kids.push((7 + 2 * i) + " 0 R");

  var objs = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + nP + " >>";
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>";
  objs[6] = "<< /Title (Fe de Jesus - Estudio " + num2(doc.dia || 0) + ") /Producer (Fe de Jesus PWA) >>";
  for(i = 0; i < nP; i++){
    var idPag = 7 + 2 * i, idCon = 8 + 2 * i;
    objs[idPag] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + A4_W + " " + A4_H + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents " + idCon + " 0 R >>";
    objs[idCon] = "<< /Length " + contenido[i].length + " >>\nstream\n" + contenido[i] + "\nendstream";
  }

  var maxObj = 6 + nP * 2;
  var out = "%PDF-1.4\n";
  var offsets = [];
  for(var id = 1; id <= maxObj; id++){
    offsets[id] = out.length;
    out += id + " 0 obj\n" + objs[id] + "\nendobj\n";
  }
  var xrefPos = out.length;
  out += "xref\n0 " + (maxObj + 1) + "\n0000000000 65535 f \n";
  for(id = 1; id <= maxObj; id++) out += pad10(offsets[id]) + " 00000 n \n";
  out += "trailer\n<< /Size " + (maxObj + 1) + " /Root 1 0 R /Info 6 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";
  return out;
}

/* ---- Nombre de archivo seguro (sin tildes, sin espacios) ---- */
function nombreArchivo(doc){
  function lim(s){
    return latin1(s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  /* María -> Maria */
      .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  var partes = ["Fe-de-Jesus-Dia-" + num2(doc.dia || 0)];
  if(doc.alumno && doc.alumno !== "Sin nombre"){
    var a = lim(doc.alumno);
    if(a) partes.push(a);
  }
  return partes.join("-") + ".pdf";
}

var API = {
  construirPdf: construirPdf,
  nombreArchivo: nombreArchivo,
  bytesDe: bytesDe,
  blobDe: function(pdfStr){ return new Blob([bytesDe(pdfStr)], { type: "application/pdf" }); }
};

if(typeof module !== "undefined" && module.exports){ module.exports = API; }
else { global.fejPdf = API; }

})(typeof window !== "undefined" ? window : globalThis);
