'use strict';
/* ============================================================
   FEQUIZ — MODO GRUPAL · servidor de partidas (pin en vivo)
   ------------------------------------------------------------
   Se conecta al server.js de tu repo con UNA sola línea
   (agregada al final del archivo server.js, antes del listen):

     require("./public/fequiz/servidor.js")(app);

   Todo funciona en memoria (sin base de datos): salas con pin,
   jugadores en vivo, puntaje por velocidad y racha, podio.
   Las salas se borran solas después de 3 horas sin actividad.
   ============================================================ */
module.exports = function instalarFeQuizGrupal(app) {
  const express = require("express");

  // Parseo del cuerpo JSON (no molesta si ya existe otro)
  try { app.use(express.json({ limit: "300kb" })); } catch (e) { /* ya instalado */ }

  /* ---------- estado en memoria ---------- */
  const PARTIDAS = new Map();          // pin -> partida
  const MAX_PARTIDAS = 30;             // salas simultáneas
  const TTL_MS = 3 * 60 * 60 * 1000;   // 3 h sin actividad → se borra
  const SEGS_DEF = 45;                 // segundos por pregunta
  const CUENTA_MS = 3400;              // cuenta regresiva 3-2-1

  /* ---------- utilidades ---------- */
  const azar = n => Math.floor(Math.random() * n);
  function token() {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }
  function limpiarApodo(s) {
    return String(s || "").replace(/\s+/g, " ").trim().slice(0, 14);
  }
  function generarPin() {
    for (let i = 0; i < 60; i++) {
      const pin = String(100000 + azar(900000));
      if (!PARTIDAS.has(pin)) return pin;
    }
    return null;
  }
  function ordenPodio(p) {
    return [...p.jugadores.values()]
      .sort((a, b) => b.puntos - a.puntos || b.aciertos - a.aciertos || a.orden - b.orden)
      .map(j => ({ apodo: j.apodo, puntos: j.puntos, aciertos: j.aciertos, racha: j.racha }));
  }
  function conteos(p) {
    const c = [0, 0, 0, 0];
    p.jugadores.forEach(j => {
      if (j.respondio && j.opcionUltima != null && c[j.opcionUltima] != null) c[j.opcionUltima]++;
    });
    return c;
  }
  function barrer() {
    const ahora = Date.now();
    for (const [pin, p] of PARTIDAS) {
      if (ahora - p.actividad > TTL_MS) PARTIDAS.delete(pin);
    }
  }

  /* ---------- máquina de estados (avanza sola por tiempo) ---------- */
  function siguientePregunta(p) {
    if (p.idx + 1 < p.preguntas.length) {
      p.idx += 1;
      p.jugadores.forEach(j => { j.respondio = false; j.opcionUltima = null; });
      p.estado = "pregunta";
      p.preguntaHasta = Date.now() + p.segs * 1000;
    } else {
      p.estado = "podio";
    }
    p.actividad = Date.now();
  }
  function avanzar(p) {
    const ahora = Date.now();
    if (p.estado === "cuenta" && ahora >= p.cuentaHasta) {
      p.idx = 0;
      p.jugadores.forEach(j => { j.respondio = false; j.opcionUltima = null; });
      p.estado = "pregunta";
      p.preguntaHasta = ahora + p.segs * 1000;
    } else if (p.estado === "pregunta" && ahora >= p.preguntaHasta) {
      p.jugadores.forEach(j => {
        if (!j.respondio) { j.racha = 0; j.ptsUltima = 0; j.correctaUltima = false; }
      });
      p.estado = "revelacion";
      p.revelacionDesde = ahora;
    }
    /* la revelación NO avanza sola: el anfitrión pasa a la siguiente
       pregunta con SIGUIENTE cuando termina de explicar el tema */
    p.actividad = ahora;
  }

  /* ---------- respuesta para un cliente ---------- */
  function payloadEstado(p, j) {
    const out = {
      ok: true,
      pin: p.pin,
      estado: p.estado,
      idx: Math.max(0, p.idx),
      total: p.preguntas.length,
      titulo: p.titulo,
      icono: p.icono,
      servidorAhora: Date.now(),
      segs: p.segs,
      activos: p.jugadores.size,
      respondieron: 0
    };
    const lista = ordenPodio(p);
    if (p.estado === "lobby") {
      out.jugadores = lista;
    } else if (p.estado === "cuenta") {
      out.cuentaHasta = p.cuentaHasta;
      out.jugadores = lista;
    } else if (p.estado === "pregunta") {
      const q = p.preguntas[p.idx];
      out.pregunta = { p: q.p, opciones: q.opciones };   // SIN la correcta
      out.preguntaHasta = p.preguntaHasta;
      out.respondieron = [...p.jugadores.values()].filter(x => x.respondio).length;
    } else if (p.estado === "revelacion") {
      const q = p.preguntas[p.idx];
      out.revelacion = {
        p: q.p, opciones: q.opciones, correctaIdx: q.correctaIdx,
        resp: q.resp || "", r: q.r || "", conteos: conteos(p)
      };
      out.top = lista.slice(0, 5);
      out.respondieron = [...p.jugadores.values()].filter(x => x.respondio).length;
    } else if (p.estado === "podio") {
      out.top = lista;
    }
    if (j) {
      out.yo = {
        apodo: j.apodo, puntos: j.puntos, racha: j.racha, respondio: j.respondio,
        correctaUltima: j.correctaUltima, ptsUltima: j.ptsUltima,
        posicion: lista.findIndex(x => x.apodo === j.apodo) + 1
      };
    }
    return out;
  }

  function buscarPartida(req, res) {
    barrer();
    const p = PARTIDAS.get(String(req.body && req.body.pin || req.query.pin || ""));
    if (!p) { res.status(404).json({ ok: false, error: "no-pin" }); return null; }
    return p;
  }

  /* ---------- POST /api/fequiz/crear ---------- */
  app.post("/api/fequiz/crear", (req, res) => {
    barrer();
    const b = req.body || {};
    const preguntas = Array.isArray(b.preguntas) ? b.preguntas.slice(0, 30) : [];
    if (!preguntas.length) return res.status(400).json({ ok: false, error: "sin-preguntas" });
    for (const q of preguntas) {
      if (!q || !q.p || !Array.isArray(q.opciones) || q.opciones.length < 2 ||
          typeof q.correctaIdx !== "number" || q.correctaIdx < 0 || q.correctaIdx >= q.opciones.length) {
        return res.status(400).json({ ok: false, error: "sin-preguntas" });
      }
    }
    if (PARTIDAS.size >= MAX_PARTIDAS) {
      // libera la sala más vieja
      let vieja = null, vPin = null;
      PARTIDAS.forEach((pa, pin) => { if (!vieja || pa.actividad < vieja.actividad) { vieja = pa; vPin = pin; } });
      if (vPin) PARTIDAS.delete(vPin);
    }
    const pin = generarPin();
    if (!pin) return res.status(500).json({ ok: false, error: "sin-pin" });
    const ahora = Date.now();
    PARTIDAS.set(pin, {
      pin, token: String(b.token || token()).slice(0, 40),
      titulo: String(b.titulo || "FeQuiz").slice(0, 60),
      icono: String(b.icono || "🎮").slice(0, 8),
      segs: Math.min(Math.max(parseInt(b.segs, 10) || SEGS_DEF, 10), 60),
      preguntas, idx: -1, estado: "lobby",
      cuentaHasta: 0, preguntaHasta: 0, revelacionDesde: 0,
      jugadores: new Map(), actividad: ahora
    });
    res.json({ ok: true, pin, token: PARTIDAS.get(pin).token });
  });

  /* ---------- POST /api/fequiz/unirse ---------- */
  app.post("/api/fequiz/unirse", (req, res) => {
    const p = buscarPartida(req, res); if (!p) return;
    const apodo = limpiarApodo(req.body && req.body.apodo);
    if (!apodo) return res.status(400).json({ ok: false, error: "apodo" });
    /* ¿el apodo ya está? → es una reconexión: se le devuelve SU ficha
       con sus puntos y se le da una clave nueva. Así nadie queda afuera
       por reconectar, y no pierde lo que venía jugando. */
    let viejoTok = null, viejo = null;
    p.jugadores.forEach((j, t) => {
      if (j.apodo.toLowerCase() === apodo.toLowerCase()) { viejoTok = t; viejo = j; }
    });
    if (viejo) {
      p.jugadores.delete(viejoTok);
      const tok = token();
      p.jugadores.set(tok, viejo);
      p.actividad = Date.now();
      return res.json({ ok: true, pin: p.pin, token: tok, apodo, titulo: p.titulo, icono: p.icono, reconectado: true });
    }
    if (p.estado === "podio") return res.status(400).json({ ok: false, error: "termino" });
    const tok = token();
    p.jugadores.set(tok, {
      apodo, puntos: 0, racha: 0, aciertos: 0,
      respondio: false, opcionUltima: null, correctaUltima: false, ptsUltima: 0,
      orden: p.jugadores.size
    });
    p.actividad = Date.now();
    res.json({ ok: true, pin: p.pin, token: tok, apodo, titulo: p.titulo, icono: p.icono });
  });

  /* ---------- POST /api/fequiz/arrancar (anfitrión) ---------- */
  app.post("/api/fequiz/arrancar", (req, res) => {
    const p = buscarPartida(req, res); if (!p) return;
    if (String(req.body && req.body.token) !== p.token) return res.status(403).json({ ok: false, error: "clave" });
    if (p.estado !== "lobby") return res.status(400).json({ ok: false, error: "estado" });
    p.estado = "cuenta";
    p.cuentaHasta = Date.now() + CUENTA_MS;
    p.actividad = Date.now();
    res.json({ ok: true });
  });

  /* ---------- POST /api/fequiz/responder (jugador) ---------- */
  app.post("/api/fequiz/responder", (req, res) => {
    const p = buscarPartida(req, res); if (!p) return;
    const j = p.jugadores.get(String(req.body && req.body.token));
    if (!j) return res.status(403).json({ ok: false, error: "clave" });
    avanzar(p);
    if (p.estado !== "pregunta" || Date.now() >= p.preguntaHasta) {
      return res.status(400).json({ ok: false, error: "tarde" });
    }
    if (j.respondio) return res.status(400).json({ ok: false, error: "repetida" });
    const opcion = parseInt(req.body.opcion, 10);
    const q = p.preguntas[p.idx];
    if (!(opcion >= 0 && opcion < q.opciones.length)) {
      return res.status(400).json({ ok: false, error: "opcion" });
    }
    j.respondio = true;
    j.opcionUltima = opcion;
    const correcta = opcion === q.correctaIdx;
    j.correctaUltima = correcta;
    if (correcta) {
      const restante = Math.max(0, p.preguntaHasta - Date.now());
      j.ptsUltima = 500 + Math.round(500 * restante / (p.segs * 1000)) + Math.min(j.racha * 50, 250);
      j.puntos += j.ptsUltima;
      j.aciertos += 1;
      j.racha += 1;
    } else {
      j.racha = 0;
      j.ptsUltima = 0;
    }
    p.actividad = Date.now();
    // si ya respondieron todos, corta el tiempo de la pregunta
    let faltan = 0;
    p.jugadores.forEach(x => { if (!x.respondio) faltan++; });
    if (faltan === 0) p.preguntaHasta = Math.min(p.preguntaHasta, Date.now() + 900);
    res.json({ ok: true });
  });

  /* ---------- POST /api/fequiz/siguiente (anfitrión) ---------- */
  app.post("/api/fequiz/siguiente", (req, res) => {
    const p = buscarPartida(req, res); if (!p) return;
    if (String(req.body && req.body.token) !== p.token) return res.status(403).json({ ok: false, error: "clave" });
    avanzar(p);
    if (p.estado === "pregunta") {
      // el anfitrión cortó la pregunta → a revelar
      p.jugadores.forEach(j => { if (!j.respondio) { j.racha = 0; j.ptsUltima = 0; j.correctaUltima = false; } });
      p.estado = "revelacion";
      p.revelacionDesde = Date.now();
    } else if (p.estado === "revelacion" || p.estado === "cuenta") {
      siguientePregunta(p);
    } else {
      return res.status(400).json({ ok: false, error: "estado" });
    }
    p.actividad = Date.now();
    res.json({ ok: true });
  });

  /* ---------- POST /api/fequiz/revancha (anfitrión) ---------- */
  app.post("/api/fequiz/revancha", (req, res) => {
    const p = buscarPartida(req, res); if (!p) return;
    if (String(req.body && req.body.token) !== p.token) return res.status(403).json({ ok: false, error: "clave" });
    p.jugadores.forEach(j => {
      j.puntos = 0; j.racha = 0; j.aciertos = 0;
      j.respondio = false; j.opcionUltima = null; j.ptsUltima = 0; j.correctaUltima = false;
    });
    p.idx = -1;
    p.estado = "lobby";
    p.actividad = Date.now();
    res.json({ ok: true });
  });

  /* ---------- POST /api/fequiz/cerrar (anfitrión) ---------- */
  app.post("/api/fequiz/cerrar", (req, res) => {
    const p = buscarPartida(req, res); if (!p) return;
    if (String(req.body && req.body.token) !== p.token) return res.status(403).json({ ok: false, error: "clave" });
    PARTIDAS.delete(p.pin);
    res.json({ ok: true });
  });

  /* ---------- GET /fequiz/proyeccion → pantalla del proyector (URL corta) ---------- */
  app.get("/fequiz/proyeccion", (req, res) => {
    const q = req.originalUrl.indexOf("?") >= 0 ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    res.redirect("/fequiz/proyeccion.html" + q);
  });

  /* ---------- GET /api/fequiz/estado (todos, por sondeo) ---------- */
  app.get("/api/fequiz/estado", (req, res) => {
    barrer();
    const p = PARTIDAS.get(String(req.query.pin || ""));
    if (!p) return res.status(404).json({ ok: false, error: "no-pin" });
    avanzar(p);
    const tok = String(req.query.token || "");
    let j = null;
    if (tok && tok === p.token) {
      // anfitrión: sin "yo"
    } else if (tok && p.jugadores.has(tok)) {
      j = p.jugadores.get(tok);
    }
    p.actividad = Date.now();
    res.json(payloadEstado(p, j));
  });

  console.log("FeQuiz · MODO GRUPAL listo: /api/fequiz (crear, unirse, arrancar, responder, siguiente, revancha, cerrar, estado)");
};
