const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
  res.json(JSON.parse(fs.readFileSync(ruta, "utf8")));
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
const TIPOS_INSTRUCTOR = ["project", "project-fe", "fe-respuesta-correcta", "fe-nombre-instructor"];
const TIPOS_ALUMNO = ["fe-respuesta-alumno", "fe-nombre-alumno"];

// Cada sala (grupo) tiene su propio estado y sus propios mensajes
const salas = new Map();

function limpiarSala(s) {
  return String(s || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20) || "GENERAL";
}

function estadoSala(id) {
  if (!salas.has(id)) {
    salas.set(id, { proyeccion: null, correccion: null, instructor: null, actividad: Date.now() });
  }
  const st = salas.get(id);
  st.actividad = Date.now();
  return st;
}

wss.on("connection", (ws) => {
  ws.isInstructor = false;
  ws.isAlive = true;
  ws.sala = "GENERAL"; // hasta que el cliente mande "join"
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
        const st = estadoSala(ws.sala);
        if (st.instructor) ws.send(JSON.stringify(st.instructor));
        if (st.proyeccion) ws.send(JSON.stringify(st.proyeccion));
        if (st.correccion) ws.send(JSON.stringify(st.correccion));
        broadcastCount(ws.sala);
        if (anterior !== ws.sala) broadcastCount(anterior);
        return;
      }

      if (TIPOS_INSTRUCTOR.includes(data.type) && !ws.isInstructor) return;

      const st = estadoSala(ws.sala);

      if (data.type === "project") {
        broadcast({ type: "projection", data: data.data }, ws.sala);
      } else if (data.type === "project-fe") {
        st.proyeccion = { type: "fe-projection", data: data.data };
        st.correccion = null;
        broadcast(st.proyeccion, ws.sala);
      } else if (data.type === "fe-respuesta-correcta") {
        st.correccion = data;
        broadcast(data, ws.sala);
      } else if (data.type === "fe-nombre-instructor") {
        st.instructor = data;
        broadcast(data, ws.sala);
      } else if (TIPOS_ALUMNO.includes(data.type)) {
        broadcast(data, ws.sala);
      }
    } catch (error) {
      console.error("Mensaje WebSocket inválido:", error.message);
    }
  });

  ws.on("close", () => {
    broadcastCount(ws.sala);
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
