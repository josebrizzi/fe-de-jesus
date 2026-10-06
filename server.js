const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, maxPayload: 4 * 1024 * 1024 });

const PORT = process.env.PORT || 8090;

const db = new sqlite3.Database(
  path.join(__dirname, "data", "biblia.db"),
  (err) => {
    if (err) {
      console.error("Error al abrir la base de datos:", err.message);
    } else {
      console.log("Base de datos Biblia Sincronizada conectada.");
    }
  }
);

// En Render, la raíz lleva a la página de inicio de Fe de Jesús
app.get("/", (req, res, next) => {
  if (process.env.RENDER || process.env.RENDER_EXTERNAL_URL) return res.redirect("/fe-de-jesus/inicio.html");
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/versions", (req, res) => {
  db.all(
    "SELECT DISTINCT version FROM verses ORDER BY version",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(rows.map((row) => row.version));
    }
  );
});

app.get("/api/books", (req, res) => {
  const version = req.query.version;

  if (!version) {
    return res.status(400).json({ error: "Falta la versión." });
  }

  db.all(
    `
    SELECT DISTINCT book_number, book_name
    FROM verses
    WHERE version = ?
    ORDER BY book_number
    `,
    [version],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(rows);
    }
  );
});

app.get("/api/chapters", (req, res) => {
  const version = req.query.version;
  const bookNumber = Number(req.query.book);

  if (!version || !bookNumber) {
    return res.status(400).json({
      error: "Faltan parámetros."
    });
  }

  db.all(
    `
    SELECT DISTINCT chapter
    FROM verses
    WHERE version = ?
      AND book_number = ?
    ORDER BY chapter
    `,
    [version, bookNumber],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(rows.map((row) => row.chapter));
    }
  );
});

app.get("/api/verses", (req, res) => {
  const version = req.query.version;
  const bookNumber = Number(req.query.book);
  const chapter = Number(req.query.chapter);

  if (!version || !bookNumber || !chapter) {
    return res.status(400).json({
      error: "Faltan parámetros."
    });
  }

  db.all(
    `
    SELECT verse, text
    FROM verses
    WHERE version = ?
      AND book_number = ?
      AND chapter = ?
    ORDER BY verse
    `,
    [version, bookNumber, chapter],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(rows);
    }
  );
});

app.get("/api/verse", (req, res) => {
  const version = req.query.version;
  const bookNumber = Number(req.query.book);
  const chapter = Number(req.query.chapter);
  const verse = Number(req.query.verse);

  if (!version || !bookNumber || !chapter || !verse) {
    return res.status(400).json({
      error: "Faltan parámetros."
    });
  }

  db.get(
    `
    SELECT
      version,
      book_number,
      book_name,
      chapter,
      verse,
      text
    FROM verses
    WHERE version = ?
      AND book_number = ?
      AND chapter = ?
      AND verse = ?
    `,
    [version, bookNumber, chapter, verse],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!row) {
        return res.status(404).json({
          error: "Versículo no encontrado."
        });
      }

      res.json(row);
    }
  );
});

// ============================================================
// FE DE JESÚS SINCRONIZADA
// ============================================================

app.use(
  "/fe-de-jesus",
  express.static(
    path.join(__dirname, "public", "fe-de-jesus")
  )
);

app.get("/api/fe-de-jesus/estudios", (req, res) => {
  const dir = path.join(__dirname, "public", "fe-de-jesus", "datos");
  if (!fs.existsSync(dir)) {
    return res.json([]);
  }
  const archivos = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const estudios = archivos.map((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    return {
      id: data.id,
      titulo: data.titulo,
      subtitulo: data.subtitulo,
      totalPreguntas: data.preguntas ? data.preguntas.length : 0
    };
  });
  res.json(estudios);
});

app.get("/api/fe-de-jesus/estudio/:id", (req, res) => {
  const id = String(req.params.id).padStart(2, "0");
  const ruta = path.join(__dirname, "public", "fe-de-jesus", "datos", `${id}.json`);
  if (!fs.existsSync(ruta)) {
    return res.status(404).json({ error: "Estudio no encontrado" });
  }
  const estudioCompleto = JSON.parse(fs.readFileSync(ruta, "utf8"));
  res.json(prepararEstudio(estudioCompleto, req));
});

// ============================================================
// BIBLIA - API DE VERSÍCULOS
// ============================================================

// Cargar la base SQLite de la Biblia (solo lectura)
let bibliaDB = null;
try {
  const sqlite3Lib = require("sqlite3").verbose();
  const rutaBiblia = path.join(__dirname, "data", "biblia.db");
  if (fs.existsSync(rutaBiblia)) {
    bibliaDB = new sqlite3Lib.Database(rutaBiblia, sqlite3Lib.OPEN_READONLY, (err) => {
      if (err) {
        console.error("Error abriendo biblia.db:", err.message);
        bibliaDB = null;
      } else {
        console.log("Base de datos de la Biblia conectada (solo lectura).");
      }
    });
  } else {
    console.warn("No se encontró data/biblia.db");
  }
} catch (e) {
  console.warn("No se pudo inicializar biblia.db:", e.message);
}

// Normalizar nombres de libros (acepta variantes con/sin tildes)
function normalizarLibro(nombre) {
  return String(nombre)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Parsear referencias tipo "Juan 14:1-3", "1 Tesalonicenses 4:13-16", "Salmos 23"
function parsearReferencia(ref) {
  // Devuelve un ARRAY de referencias.
  // Soporta:
  //   "Juan 14:1-3"                    → 1 ref
  //   "Mateo 24:14; 1 Pedro 3:15"     → 2 refs
  //   "Hebreos 9:28; 10:12, 14"       → hereda libro: Hebreos 9:28, Hebreos 10:12, Hebreos 10:14
  const limpia = String(ref).trim();
  if (!limpia) return null;

  const partes = limpia.split(";").map(p => p.trim()).filter(p => p);
  const resultados = [];
  let ultimoLibro = null;

  for (const parte of partes) {
    // Caso A: empieza con número solo → "10:12" o "10:12, 14" (hereda libro anterior)
    let match = parte.match(/^(\d+):(\d+)(?:[,\s-]+(\d+))?$/);
    if (match && ultimoLibro) {
      const cap = parseInt(match[1], 10);
      const vIni = parseInt(match[2], 10);
      const vFin = match[3] ? parseInt(match[3], 10) : vIni;
      resultados.push({ libro: ultimoLibro, capitulo: cap, versiculoInicio: vIni, versiculoFin: vFin });
      continue;
    }

    // Caso B: formato normal "Libro Cap:Ver" o "Libro Cap:Ver-Ver" o "Libro Cap"
    match = parte.match(/^(.+?)\s+(\d+)(?::(\d+)(?:[,\s-]+(\d+))?)?$/);
    if (!match) continue;

    const libro = match[1].trim();
    ultimoLibro = libro;
    const cap = parseInt(match[2], 10);
    const vIni = match[3] ? parseInt(match[3], 10) : 1;
    const vFin = match[4] ? parseInt(match[4], 10) : (match[3] ? parseInt(match[3], 10) : 999);

    resultados.push({ libro: libro, capitulo: cap, versiculoInicio: vIni, versiculoFin: vFin });
  }

  if (resultados.length === 0) return null;
  return resultados;
}

// GET /api/biblia/versiones - lista versiones disponibles
app.get("/api/biblia/versiones", (req, res) => {
  if (!bibliaDB) return res.status(500).json({ error: "Biblia no disponible" });
  bibliaDB.all("SELECT DISTINCT version FROM verses ORDER BY version", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.version));
  });
});

// GET /api/biblia/versiculo?ref=Juan+14:1-3&version=Dios+Habla+Hoy
app.get("/api/biblia/versiculo", (req, res) => {
  if (!bibliaDB) return res.status(500).json({ error: "Biblia no disponible" });

  const ref = req.query.ref || "";
  const version = req.query.version || "Dios Habla Hoy";

  const parsedArr = parsearReferencia(ref);
  if (!parsedArr || parsedArr.length === 0) {
    return res.status(400).json({ error: "Referencia inválida. Ej: Juan 14:1-3" });
  }

  // Procesar cada referencia en paralelo
  const promesas = parsedArr.map(parsed => {
    return new Promise((resolve, reject) => {
      const libroNorm = normalizarLibro(parsed.libro);

      bibliaDB.all(
        "SELECT DISTINCT book_number, book_name FROM verses WHERE version = ?",
        [version],
        (err, libros) => {
          if (err) return reject(err);

          const libroEncontrado = libros.find(l => normalizarLibro(l.book_name) === libroNorm);
          if (!libroEncontrado) {
            return reject(new Error("No se encontró el libro: " + parsed.libro));
          }

          bibliaDB.all(
            "SELECT verse, text FROM verses WHERE version = ? AND book_number = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse",
            [version, libroEncontrado.book_number, parsed.capitulo, parsed.versiculoInicio, parsed.versiculoFin],
            (err2, versos) => {
              if (err2) return reject(err2);
              if (versos.length === 0) {
                return reject(new Error("No se encontraron versículos para " + parsed.libro + " " + parsed.capitulo));
              }
              resolve({
                libro: libroEncontrado.book_name,
                capitulo: parsed.capitulo,
                versiculoInicio: parsed.versiculoInicio,
                versiculoFin: parsed.versiculoFin,
                version: version,
                referencia: parsed.libro + " " + parsed.capitulo + ":" + parsed.versiculoInicio + (parsed.versiculoFin !== parsed.versiculoInicio ? "-" + parsed.versiculoFin : ""),
                versiculos: versos.map(v => ({ n: v.verse, texto: v.text }))
              });
            }
          );
        }
      );
    });
  });

  Promise.all(promesas)
    .then(bloques => {
      // Si hay una sola referencia, devolver el formato clásico (retrocompatible)
      if (bloques.length === 1) {
        return res.json(bloques[0]);
      }
      // Si hay varias, devolver array
      res.json(bloques);
    })
    .catch(err => {
      res.status(404).json({ error: err.message });
    });
});

// GET /api/biblia/buscar?q=amor&version=...&limit=50
// Dos modos:
//   - Si q parece referencia ("Juan 3:16") → busca ese versículo
//   - Si no, busca por texto (LIKE %q%)
app.get("/api/biblia/buscar", (req, res) => {
  if (!bibliaDB) return res.status(500).json({ error: "Biblia no disponible" });

  const q = String(req.query.q || "").trim();
  const version = req.query.version || "Dios Habla Hoy";
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  if (!q) return res.status(400).json({ error: "Falta el parámetro q" });

  // Detectar si parece una referencia bíblica
  const esReferencia = /^[1-3]?\s*[A-Za-zÁÉÍÓÚÑáéíóúñ]+\s+\d+(?::\d+)?/.test(q);

  if (esReferencia) {
    const parsedArr = parsearReferencia(q);
    if (!parsedArr || parsedArr.length === 0) {
      return res.json({ tipo: "referencia", resultados: [], error: "Referencia inválida" });
    }

    const promesas = parsedArr.map(parsed => new Promise((resolve) => {
      const libroNorm = normalizarLibro(parsed.libro);
      bibliaDB.all(
        "SELECT DISTINCT book_number, book_name FROM verses WHERE version = ?",
        [version],
        (err, libros) => {
          if (err) return resolve(null);
          const enc = libros.find(l => normalizarLibro(l.book_name) === libroNorm);
          if (!enc) return resolve(null);

          bibliaDB.all(
            "SELECT chapter, verse, text FROM verses WHERE version = ? AND book_number = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse",
            [version, enc.book_number, parsed.capitulo, parsed.versiculoInicio, parsed.versiculoFin],
            (err2, versos) => {
              if (err2) return resolve(null);
              resolve({
                libro: enc.book_name,
                capitulo: parsed.capitulo,
                versiculoInicio: parsed.versiculoInicio,
                versiculoFin: parsed.versiculoFin,
                versiculos: versos.map(v => ({ n: v.verse, texto: v.text }))
              });
            }
          );
        }
      );
    }));

    Promise.all(promesas).then(bloques => {
      const resultados = bloques.filter(b => b && b.versiculos.length > 0);
      res.json({ tipo: "referencia", resultados: resultados });
    });

  } else {
    bibliaDB.all(
      `SELECT book_name, chapter, verse, text FROM verses 
       WHERE version = ? AND text LIKE ? 
       ORDER BY book_number, chapter, verse 
       LIMIT ?`,
      [version, '%' + q + '%', limit],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          tipo: "texto",
          query: q,
          total: rows.length,
          resultados: rows.map(r => ({
            libro: r.book_name,
            capitulo: r.chapter,
            versiculo: r.verse,
            texto: r.text
          }))
        });
      }
    );
  }
});


// ============================================================
// MONTAJE DE LA API DE BIBLIA BAJO /biblia
// (para que funcione a través de Tailscale Funnel)
// ============================================================
try {
  const expressLib = require("express");
  const pathLib = require("path");
  const fsLib = require("fs");
  const sqliteLib = require("sqlite3").verbose();

  const routerBiblia = expressLib.Router();
  const rutaBibliaDB = pathLib.join(__dirname, "data", "biblia.db");

  if (fsLib.existsSync(rutaBibliaDB)) {
    const bdb = new sqliteLib.Database(rutaBibliaDB, sqliteLib.OPEN_READONLY);
    const norm = function(n) {
      return String(n).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    };

    routerBiblia.get("/api/biblia/versiones", function(req, res) {
      bdb.all("SELECT DISTINCT version FROM verses ORDER BY version", [], function(err, rows) {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(function(r) { return r.version; }));
      });
    });

    routerBiblia.get("/api/biblia/versiculo", function(req, res) {
      const ref = req.query.ref || "";
      const version = req.query.version || "Dios Habla Hoy";
      const parsedArr = parsearReferencia(ref);
      if (!parsedArr || parsedArr.length === 0) {
        return res.status(400).json({ error: "Referencia inválida. Ej: Juan 14:1-3" });
      }

      const promesas = parsedArr.map(function(parsed) {
        return new Promise(function(resolve, reject) {
          const libroNorm = normalizarLibro(parsed.libro);
          bdb.all("SELECT DISTINCT book_number, book_name FROM verses WHERE version = ?", [version], function(err, libros) {
            if (err) return reject(err);
            const enc = libros.find(function(l) { return normalizarLibro(l.book_name) === libroNorm; });
            if (!enc) return reject(new Error("No se encontró el libro: " + parsed.libro));

            bdb.all(
              "SELECT verse, text FROM verses WHERE version = ? AND book_number = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse",
              [version, enc.book_number, parsed.capitulo, parsed.versiculoInicio, parsed.versiculoFin],
              function(err2, versos) {
                if (err2) return reject(err2);
                if (versos.length === 0) return reject(new Error("No se encontraron versículos"));
                resolve({
                  libro: enc.book_name,
                  capitulo: parsed.capitulo,
                  versiculoInicio: parsed.versiculoInicio,
                  versiculoFin: parsed.versiculoFin,
                  version: version,
                  referencia: parsed.libro + " " + parsed.capitulo + ":" + parsed.versiculoInicio + (parsed.versiculoFin !== parsed.versiculoInicio ? "-" + parsed.versiculoFin : ""),
                  versiculos: versos.map(function(v) { return { n: v.verse, texto: v.text }; })
                });
              }
            );
          });
        });
      });

      Promise.all(promesas).then(function(bloques) {
        if (bloques.length === 1) return res.json(bloques[0]);
        res.json(bloques);
      }).catch(function(err) {
        res.status(404).json({ error: err.message });
      });
    });

    routerBiblia.get("/api/biblia/buscar", function(req, res) {
      const q = String(req.query.q || "").trim();
      const version = req.query.version || "Dios Habla Hoy";
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

      if (!q) return res.status(400).json({ error: "Falta el parámetro q" });

      const esReferencia = /^[1-3]?\s*[A-Za-zÁÉÍÓÚÑáéíóúñ]+\s+\d+(?::\d+)?/.test(q);

      if (esReferencia) {
        const parsedArr = parsearReferencia(q);
        if (!parsedArr || parsedArr.length === 0) {
          return res.json({ tipo: "referencia", resultados: [], error: "Referencia inválida" });
        }

        const promesas = parsedArr.map(function(parsed) {
          return new Promise(function(resolve) {
            const libroNorm = normalizarLibro(parsed.libro);
            bdb.all("SELECT DISTINCT book_number, book_name FROM verses WHERE version = ?", [version], function(err, libros) {
              if (err) return resolve(null);
              const enc = libros.find(function(l) { return normalizarLibro(l.book_name) === libroNorm; });
              if (!enc) return resolve(null);

              bdb.all(
                "SELECT chapter, verse, text FROM verses WHERE version = ? AND book_number = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse",
                [version, enc.book_number, parsed.capitulo, parsed.versiculoInicio, parsed.versiculoFin],
                function(err2, versos) {
                  if (err2) return resolve(null);
                  resolve({
                    libro: enc.book_name,
                    capitulo: parsed.capitulo,
                    versiculoInicio: parsed.versiculoInicio,
                    versiculoFin: parsed.versiculoFin,
                    versiculos: versos.map(function(v) { return { n: v.verse, texto: v.text }; })
                  });
                }
              );
            });
          });
        });

        Promise.all(promesas).then(function(bloques) {
          const resultados = bloques.filter(function(b) { return b && b.versiculos.length > 0; });
          res.json({ tipo: "referencia", resultados: resultados });
        });

      } else {
        bdb.all(
          "SELECT book_name, chapter, verse, text FROM verses WHERE version = ? AND text LIKE ? ORDER BY book_number, chapter, verse LIMIT ?",
          [version, '%' + q + '%', limit],
          function(err, rows) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
              tipo: "texto",
              query: q,
              total: rows.length,
              resultados: rows.map(function(r) {
                return { libro: r.book_name, capitulo: r.chapter, versiculo: r.verse, texto: r.text };
              })
            });
          }
        );
      }
    });

    app.use("/biblia", routerBiblia);
    console.log("API de Biblia montada también bajo /biblia");
  }
} catch (e) {
  console.warn("No se pudo montar el prefijo /biblia:", e.message);
}
const INSTRUCTOR_KEY = process.env.INSTRUCTOR_KEY || "cambia-esta-clave";
if (INSTRUCTOR_KEY === "cambia-esta-clave") {
  console.warn("AVISO: usando la clave por defecto. Define la variable INSTRUCTOR_KEY.");
}
const TIPOS_INSTRUCTOR = [
  "project", "project-fe", "fe-respuesta-correcta", "fe-nombre-instructor",
  "fe-pdf-habilitar", "fe-cerrar-estudio"
];

// Límites
const MAX_AUDIO = 1500000;      // caracteres del audio en base64 (aprox. 1.1 MB)
const MAX_HISTORIAL = 30;       // mensajes de chat que se recuerdan por sala (en memoria)
const MAX_RESPUESTAS = 2000;    // respuestas de alumnos que se recuerdan por sala (en memoria)

// Cada sala (grupo) tiene su propio estado y sus propios mensajes
const salas = new Map();

function limpiarSala(s) {
  return String(s || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20) || "GENERAL";
}

function estadoSala(id) {
  if (!salas.has(id)) {
    salas.set(id, {
      proyeccion: null, instructor: null,
      chat: [], respuestas: new Map(),
      reveladas: new Map(),      // "estudio|pregunta" -> { estudioId, preguntaN, correcta }
      correcciones: new Map(),   // "estudio|pregunta" -> mensaje de corrección del instructor
      abierto: null,             // estudio abierto en recorrido libre
      protegidos: new Set(),     // estudios cuyas respuestas correctas no se entregan hasta habilitar el PDF
      pdf: new Map(),            // estudio -> { estudioId, todos, cids }
      actividad: Date.now()
    });
  }
  const st = salas.get(id);
  st.actividad = Date.now();
  return st;
}

function guardarRespuesta(st, data) {
  const clave = [data.estudioId, data.preguntaN, data.nombre || "Anónimo"].join("|");
  st.respuestas.delete(clave);
  st.respuestas.set(clave, data);
  while (st.respuestas.size > MAX_RESPUESTAS) {
    st.respuestas.delete(st.respuestas.keys().next().value);
  }
}

function pdfAutorizado(st, estudioId, cid) {
  const reg = st.pdf.get(String(estudioId));
  return !!reg && (reg.todos || (!!cid && reg.cids.has(cid)));
}

// Respuestas correctas de un estudio (solo opción múltiple)
function clavesDe(id) {
  try {
    const ruta = path.join(__dirname, "public", "fe-de-jesus", "datos", String(id).padStart(2, "0") + ".json");
    const est = JSON.parse(fs.readFileSync(ruta, "utf8"));
    const claves = {};
    (est.preguntas || []).forEach((p) => {
      if (p.opciones && p.opciones.length && p.correcta >= 0) claves[p.n] = p.correcta;
    });
    return claves;
  } catch (e) {
    return {};
  }
}

// Estudio que se entrega por la web. Mientras un estudio está en recorrido libre,
// los alumnos lo reciben SIN las respuestas correctas hasta que el instructor habilite el PDF.
function prepararEstudio(estudio, req) {
  const k = req.get("x-clave");
  if (k && k === INSTRUCTOR_KEY) return estudio;
  const st = salas.get(limpiarSala(req.query.sala));
  const id = String(estudio.id);
  if (!st || !st.protegidos.has(id)) return estudio;
  if (pdfAutorizado(st, id, String(req.query.cid || ""))) return estudio;
  const copia = JSON.parse(JSON.stringify(estudio));
  (copia.preguntas || []).forEach((p) => { if (p.correcta !== undefined) p.correcta = -1; });
  return copia;
}

wss.on("connection", (ws) => {
  ws.isInstructor = false;
  ws.isAlive = true;
  ws.sala = "GENERAL"; // hasta que el cliente mande "join"
  ws.cid = "";
  ws.nombre = "";
  ws.ultimoChat = 0;
  ws.on("pong", () => { ws.isAlive = true; });

  broadcastCount(ws.sala);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "auth") {
        ws.isInstructor = data.key === INSTRUCTOR_KEY;
        ws.send(JSON.stringify({ type: ws.isInstructor ? "auth-ok" : "auth-error" }));
        return;
      }

      if (data.type === "join") {
        const anterior = ws.sala;
        ws.sala = limpiarSala(data.sala);
        ws.cid = String(data.cid || "").slice(0, 60);
        const st = estadoSala(ws.sala);
        if (st.instructor) ws.send(JSON.stringify(st.instructor));

        if (!ws.isInstructor) {
          // Lo que el instructor ya reveló, corrigió o habilitó mientras el alumno no estaba
          const porEstudio = new Map();
          st.reveladas.forEach((r) => {
            if (!porEstudio.has(r.estudioId)) porEstudio.set(r.estudioId, {});
            porEstudio.get(r.estudioId)[r.preguntaN] = r.correcta;
          });
          porEstudio.forEach((claves, estudioId) => {
            ws.send(JSON.stringify({ type: "fe-reveladas", estudioId: estudioId, claves: claves }));
          });
          st.correcciones.forEach((m) => ws.send(JSON.stringify(m)));
          st.pdf.forEach((reg, e) => {
            if (pdfAutorizado(st, e, ws.cid)) {
              ws.send(JSON.stringify({ type: "fe-pdf-habilitado", estudioId: reg.estudioId, claves: clavesDe(e) }));
            }
          });
        }
        if (st.proyeccion) {
          // Se marca como "repetido" para que el alumno no pierda su lugar al reconectarse
          const copia = JSON.parse(JSON.stringify(st.proyeccion));
          if (copia.data) copia.data.repetido = true;
          ws.send(JSON.stringify(copia));
        }

        // Historial del chat: el instructor ve todo; el alumno solo lo del instructor (general o privado para él) y lo suyo
        const cid = ws.cid;
        const historial = st.chat.filter((m) =>
          ws.isInstructor ||
          (m.de === "instructor" && (!m.para || m.para === cid)) ||
          (cid && m.cid === cid)
        );
        ws.send(JSON.stringify({ type: "chat-historial", mensajes: historial }));
        // El instructor recupera las respuestas que los alumnos ya enviaron
        if (ws.isInstructor) {
          st.respuestas.forEach((d) => ws.send(JSON.stringify(d)));
        }
        broadcastCount(ws.sala);
        enviarRoster(ws.sala);
        if (anterior !== ws.sala) { broadcastCount(anterior); enviarRoster(anterior); }
        return;
      }

      // ---- CHAT ----
      if (data.type === "chat-enviar") {
        const ahora = Date.now();
        if (ahora - ws.ultimoChat < 400) return; // anti-spam
        ws.ultimoChat = ahora;

        const tipo = data.tipo === "audio" ? "audio" : "texto";
        const msg = {
          id: ahora.toString(36) + Math.random().toString(36).slice(2, 6),
          de: ws.isInstructor ? "instructor" : "alumno",
          nombre: String(data.nombre || (ws.isInstructor ? "Instructor" : "Anónimo")).slice(0, 60),
          cid: String(data.cid || "").slice(0, 60),
          tipo: tipo,
          ts: ahora
        };
        if (!ws.isInstructor && data.nombre) ws.nombre = msg.nombre;

        // Mensaje privado: solo el instructor puede elegir destinatario
        if (ws.isInstructor && data.para) {
          msg.para = String(data.para).slice(0, 60);
          msg.paraNombre = String(data.paraNombre || "").slice(0, 60);
          wss.clients.forEach((c) => {
            if (c.sala === ws.sala && c.cid === msg.para && c.nombre) msg.paraNombre = c.nombre;
          });
        }

        if (tipo === "texto") {
          msg.texto = String(data.texto || "").trim().slice(0, 1000);
          if (!msg.texto) return;
        } else {
          const a = String(data.audio || "");
          const corte = a.indexOf(";base64,");
          const cabecera = corte > 0 ? a.slice(0, corte) : "";
          if (!/^data:audio[/][A-Za-z0-9.+;=,_-]+$/.test(cabecera)) return;
          if (a.length > MAX_AUDIO) {
            ws.send(JSON.stringify({ type: "chat-error", error: "audio-largo" }));
            return;
          }
          msg.audio = a;
          msg.dur = Math.max(0, Math.min(Number(data.dur) || 0, 120));
        }

        const st = estadoSala(ws.sala);
        st.chat.push(msg);
        while (st.chat.length > MAX_HISTORIAL) st.chat.shift();
        enviarChat(msg, ws);
        enviarRoster(ws.sala); // por si el nombre del alumno cambió
        return;
      }

      // ---- RESPUESTAS DE ALUMNOS: solo las ve el instructor ----
      if (data.type === "fe-respuesta-alumno") {
        if (JSON.stringify(data).length > 20000) return;
        if (data.nombre) ws.nombre = String(data.nombre).slice(0, 60);
        guardarRespuesta(estadoSala(ws.sala), data);
        enviarAInstructores(data, ws.sala);
        enviarRoster(ws.sala);
        return;
      }
      if (data.type === "fe-nombre-alumno") {
        ws.nombre = String(data.nombre || "").slice(0, 60);
        enviarAInstructores(data, ws.sala);
        enviarRoster(ws.sala);
        return;
      }

      if (TIPOS_INSTRUCTOR.includes(data.type) && !ws.isInstructor) return;

      const st = estadoSala(ws.sala);

      if (data.type === "project") {
        broadcast({ type: "projection", data: data.data }, ws.sala);
      } else if (data.type === "project-fe") {
        const d = data.data || {};
        st.proyeccion = { type: "fe-projection", data: d };
        if (d.respuestaRevelada && d.correcta >= 0) {
          st.reveladas.set(d.estudioId + "|" + d.preguntaN, {
            estudioId: d.estudioId, preguntaN: d.preguntaN, correcta: d.correcta
          });
        }
        if (d.recorridoLibre) {
          st.abierto = { estudioId: d.estudioId, titulo: d.estudioTitulo, subtitulo: d.estudioSubtitulo, total: d.totalPreguntas };
          st.protegidos.add(String(d.estudioId));
        } else {
          st.abierto = null;
          st.protegidos.delete(String(d.estudioId));
        }
        broadcast(st.proyeccion, ws.sala);
        enviarRoster(ws.sala);
      } else if (data.type === "fe-respuesta-correcta") {
        if (JSON.stringify(data).length <= 8000) {
          st.correcciones.set(data.estudioId + "|" + data.preguntaN, data);
        }
        broadcast(data, ws.sala);
      } else if (data.type === "fe-nombre-instructor") {
        st.instructor = data;
        broadcast(data, ws.sala);
      } else if (data.type === "fe-pdf-habilitar") {
        const id = String(data.estudioId);
        let reg = st.pdf.get(id);
        if (!reg) { reg = { estudioId: data.estudioId, todos: false, cids: new Set() }; st.pdf.set(id, reg); }
        if (data.cid) reg.cids.add(String(data.cid).slice(0, 60)); else reg.todos = true;
        const aviso = JSON.stringify({ type: "fe-pdf-habilitado", estudioId: data.estudioId, claves: clavesDe(id) });
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN && c.sala === ws.sala && !c.isInstructor && (reg.todos || reg.cids.has(c.cid))) {
            c.send(aviso);
          }
        });
        enviarRoster(ws.sala);
      } else if (data.type === "fe-cerrar-estudio") {
        const cerrado = st.abierto ? st.abierto.estudioId : data.estudioId;
        st.abierto = null;
        st.proyeccion = null;
        broadcast({ type: "fe-estudio-cerrado", estudioId: cerrado }, ws.sala);
        enviarRoster(ws.sala);
      }
    } catch (error) {
      console.error("Mensaje WebSocket inválido:", error.message);
    }
  });

  ws.on("close", () => {
    broadcastCount(ws.sala);
    enviarRoster(ws.sala);
  });
});

// Latido: mantiene vivas las conexiones y limpia las muertas
setInterval(() => {
  wss.clients.forEach((c) => {
    if (!c.isAlive) return c.terminate();
    c.isAlive = false;
    c.ping();
  });
}, 30000);

// Limpieza: borra salas sin actividad en 12 horas y sin nadie conectado
setInterval(() => {
  const limite = Date.now() - 12 * 60 * 60 * 1000;
  salas.forEach((st, id) => {
    if (st.actividad > limite) return;
    let hayGente = false;
    wss.clients.forEach((c) => { if (c.sala === id) hayGente = true; });
    if (!hayGente) salas.delete(id);
  });
}, 60 * 60 * 1000);

function broadcast(data, sala) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.sala === sala) client.send(message);
  });
}

function enviarAInstructores(data, sala) {
  const message = JSON.stringify(data);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN && c.sala === sala && c.isInstructor) c.send(message);
  });
}

// Alumnos conectados en la sala, con su avance y si tienen el PDF habilitado (solo para los instructores)
function enviarRoster(sala) {
  const st = salas.get(sala);
  const abierto = st && st.abierto ? st.abierto : null;
  const lista = new Map();
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN && c.sala === sala && !c.isInstructor && c.cid) {
      const nombre = c.nombre || "Alumno";
      let respondidas = 0;
      if (abierto) {
        st.respuestas.forEach((d) => {
          if (d.estudioId === abierto.estudioId && d.nombre === nombre) respondidas++;
        });
      }
      lista.set(c.cid, {
        cid: c.cid, nombre: nombre, respondidas: respondidas,
        pdf: abierto ? pdfAutorizado(st, abierto.estudioId, c.cid) : false
      });
    }
  });
  enviarAInstructores({
    type: "chat-alumnos",
    alumnos: Array.from(lista.values()),
    estudio: abierto ? { id: abierto.estudioId, titulo: abierto.titulo, total: abierto.total } : null
  }, sala);
}

// Chat: el instructor habla para toda la sala (o en privado a un alumno);
// el alumno solo para los instructores (y él mismo ve su mensaje)
function enviarChat(msg, origen) {
  const texto = JSON.stringify({ type: "chat-msg", msg: msg });
  wss.clients.forEach((c) => {
    if (c.readyState !== WebSocket.OPEN || c.sala !== origen.sala) return;
    if (c.isInstructor || c === origen) { c.send(texto); return; }
    if (msg.de === "instructor" && (!msg.para || c.cid === msg.para)) c.send(texto);
  });
}

function broadcastCount(sala) {
  let n = 0;
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN && c.sala === sala) n++;
  });
  broadcast({ type: "connected", count: n }, sala);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log();
  console.log("==============================================");
  console.log("        BIBLIA SINCRONIZADA");
  console.log("==============================================");
  console.log(`Servidor iniciado en puerto ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log();
});


// ===== INTERESADOS-FOLLETO: contactos desde bienvenida.html =====
(function(){
  var fs2 = require("fs");
  var path2 = require("path");
  var FILE_I = path2.join(__dirname, "data", "interesados.json");
  function leerI(){ try { return JSON.parse(fs2.readFileSync(FILE_I, "utf8")); } catch(e){ return []; } }
  function guardarI(a){ try { fs2.mkdirSync(path2.dirname(FILE_I), { recursive: true }); fs2.writeFileSync(FILE_I, JSON.stringify(a, null, 2)); } catch(e){ console.log("[INTERESADOS] error guardando:", e.message); } }
  function claveOk(req){ var K = String(process.env.INSTRUCTOR_KEY || ""); return !!K && String(req.headers["x-instructor-key"] || "") === K; }
  app.post("/api/fe-de-jesus/interesados", express.json(), function(req, res){
    var b = req.body || {};
    var nombre = String(b.nombre || "").trim().slice(0, 80);
    var contacto = String(b.contacto || "").trim().slice(0, 40);
    var mensaje = String(b.mensaje || "").trim().slice(0, 300);
    if (!nombre || contacto.length < 5) { res.status(400).json({ ok: false, error: "Faltan datos" }); return; }
    var lista = leerI();
    lista.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nombre: nombre, contacto: contacto, mensaje: mensaje, fecha: new Date().toISOString(), estado: "nuevo", instructor: "" });
    guardarI(lista);
    console.log("[INTERESADO] " + nombre + " - " + contacto);
    res.json({ ok: true });
  });
  app.get("/api/fe-de-jesus/interesados", function(req, res){
    if (!claveOk(req)) { res.status(401).json({ ok: false, error: "Clave incorrecta" }); return; }
    res.json({ ok: true, lista: leerI() });
  });
  app.post("/api/fe-de-jesus/interesados-accion", express.json(), function(req, res){
    if (!claveOk(req)) { res.status(401).json({ ok: false, error: "Clave incorrecta" }); return; }
    var b = req.body || {};
    var lista = leerI();
    if (b.accion === "eliminar") {
      lista = lista.filter(function(x){ return x.id !== String(b.id || ""); });
      guardarI(lista); res.json({ ok: true, lista: lista }); return;
    }
    var it = lista.find(function(x){ return x.id === String(b.id || ""); });
    if (!it) { res.status(404).json({ ok: false, error: "No encontrado" }); return; }
    if (b.accion === "contactado") it.estado = "contactado";
    if (b.accion === "nuevo") it.estado = "nuevo";
    if (b.accion === "asignar") it.instructor = String(b.instructor || "").trim().slice(0, 80);
    if (b.accion === "quitar-instructor") it.instructor = "";
    guardarI(lista);
    res.json({ ok: true, lista: lista });
  });
})();
// ===== FIN INTERESADOS-FOLLETO =====



// ===== ALUMNO-ACTIVO-V4: marca el contacto del folleto cuando el alumno entra con su enlace =====
(function(){
  var fs2 = require("fs");
  var path2 = require("path");
  var FILE_I = path2.join(__dirname, "data", "interesados.json");
  function leerI(){ try { return JSON.parse(fs2.readFileSync(FILE_I, "utf8")); } catch(e){ return []; } }
  function guardarI(a){ try { fs2.mkdirSync(path2.dirname(FILE_I), { recursive: true }); fs2.writeFileSync(FILE_I, JSON.stringify(a, null, 2)); } catch(e){ console.log("[ALUMNO-ACTIVO] error guardando:", e.message); } }
  app.post("/api/fe-de-jesus/alumno-activo", express.json(), function(req, res){
    var b = req.body || {};
    var id = String(b.id || "").trim().slice(0, 40);
    var nombre = String(b.nombre || "").trim().slice(0, 80);
    var sala = String(b.sala || "").trim().slice(0, 20);
    if (!id) { res.status(400).json({ ok: false, error: "Falta id" }); return; }
    var lista = leerI();
    var it = lista.find(function(x){ return x.id === id; });
    if (it) {
      var cambio = false;
      if (it.estado !== "activo") { it.estado = "activo"; cambio = true; }
      if (nombre && it.alumnoNombre !== nombre) { it.alumnoNombre = nombre; cambio = true; }
      if (!it.instructor && sala) { it.instructor = sala; cambio = true; }
      if (cambio) { it.fechaActivo = new Date().toISOString(); guardarI(lista); console.log("[ALUMNO ACTIVO] " + (nombre || id) + (it.instructor ? " -> instructor " + it.instructor : "")); }
    }
    res.json({ ok: true });
  });
})();
// ===== FIN ALUMNO-ACTIVO-V4 =====



// ===== ALUMNO-NOMBRE-V5: devuelve solo el nombre del contacto (para la entrada automatica) =====
(function(){
  var fs2 = require("fs");
  var path2 = require("path");
  var FILE_I = path2.join(__dirname, "data", "interesados.json");
  function leerI(){ try { return JSON.parse(fs2.readFileSync(FILE_I, "utf8")); } catch(e){ return []; } }
  app.get("/api/fe-de-jesus/alumno-nombre", function(req, res){
    var id = String(req.query.id || "").trim().slice(0, 40);
    var it = leerI().find(function(x){ return x.id === id; });
    if (!it) { res.status(404).json({ ok: false, error: "No encontrado" }); return; }
    res.json({ ok: true, nombre: it.nombre });
  });
})();
// ===== FIN ALUMNO-NOMBRE-V5 =====

