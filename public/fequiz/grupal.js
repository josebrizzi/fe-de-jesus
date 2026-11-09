'use strict';
/* ============================================================
   FEQUIZ — MODO GRUPAL (estilo Kahoot para la congregación)
   El anfitrión dirige desde la pantalla grande con un PIN;
   cada persona entra desde su celular y compite por puntos.
   Este archivo funciona junto a servidor.js (mismo servidor).
   ============================================================ */
(function () {

  const $ = s => document.querySelector(s);
  const P = $('#pantalla');
  const API = '/api/fequiz';
  const CLAVE_SESION = 'fequiz_grupal';
  const SEGS = 20;
  const PREG_MIXTO = 10;

  const FIG = [
    '<svg viewBox="0 0 20 20"><polygon points="10,2 18.5,18 1.5,18" fill="#fff"/></svg>',
    '<svg viewBox="0 0 20 20"><polygon points="10,1 19,10 10,19 1,10" fill="#fff"/></svg>',
    '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="#fff"/></svg>',
    '<svg viewBox="0 0 20 20"><rect x="2" y="2" width="16" height="16" rx="2.5" fill="#fff"/></svg>'
  ];
  const ICO_OK = '<svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICO_MAL = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>';
  const OK_FRASES = ['¡CORRECTO!', '¡MUY BIEN!', '¡GENIAL!', '¡IMPARABLE!'];
  const MEDALLAS = ['🥇', '🥈', '🥉'];

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n || 0).toLocaleString('es-AR');
  const azar = a => a[Math.floor(Math.random() * a.length)];

  const G = {
    activo: false, rol: null,          // 'anfitrion' | 'jugador'
    pin: '', token: '', apodo: '',
    ult: null, clave: '', offset: 0,
    enviadaIdx: -1, podioHecho: false,
    poll: null, raf: 0, overlay: null
  };

  /* ---------- sonido (WebAudio, sin archivos) ---------- */
  let ctxAudio = null;
  function tono(f, dur, tipo, vol, cuando) {
    let sonido = true;
    try { sonido = JSON.parse(localStorage.getItem('fequiz_sonido') || 'true') !== false; } catch (e) {}
    if (!sonido) return;
    try {
      ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
      if (ctxAudio.state === 'suspended') ctxAudio.resume();
      const t0 = ctxAudio.currentTime + (cuando || 0);
      const o = ctxAudio.createOscillator();
      const g = ctxAudio.createGain();
      o.type = tipo || 'square';
      o.frequency.value = f;
      g.gain.setValueAtTime(vol || .15, t0);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      o.connect(g); g.connect(ctxAudio.destination);
      o.start(t0); o.stop(t0 + dur + .02);
    } catch (e) {}
  }
  const sonidos = {
    tap: () => tono(340, .06, 'square', .1),
    ok: () => { tono(523.25, .1, 'square', .15, 0); tono(659.25, .1, 'square', .15, .1); tono(783.99, .22, 'square', .15, .2); },
    mal: () => tono(140, .32, 'sawtooth', .18),
    tick: () => tono(880, .05, 'square', .07),
    fanfarria: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tono(f, .17, 'square', .15, i * .13))
  };

  /* ---------- sesión (para volver si se corta la página) ---------- */
  function guardarSesion() {
    try { localStorage.setItem(CLAVE_SESION, JSON.stringify({ rol: G.rol, pin: G.pin, token: G.token, apodo: G.apodo })); } catch (e) {}
  }
  function leerSesion() {
    try { return JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null'); } catch (e) { return null; }
  }
  function borrarSesion() { try { localStorage.removeItem(CLAVE_SESION); } catch (e) {} }

  /* ---------- API ---------- */
  async function api(ruta, cuerpo) {
    const op = cuerpo ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
    } : undefined;
    const r = await fetch(API + ruta, op);
    let d = null; try { d = await r.json(); } catch (e) {}
    if (!r.ok || !d || d.ok === false) {
      const err = new Error((d && d.error) || 'red');
      err.codigo = d && d.error;
      throw err;
    }
    return d;
  }

  /* ---------- preparación de preguntas (anfitrión) ---------- */
  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
    return x;
  }
  function preparar(q) {
    const ops = shuffle(q.opciones.map((t, i) => ({ t, i })));
    return { p: q.p, opciones: ops.map(o => o.t), correctaIdx: ops.findIndex(o => o.i === 0), r: q.r || '', resp: q.resp || '' };
  }
  function armarLista(modo, juegoId) {
    const DATOS = window.FEQUIZ_DATOS || { estudios: [], apocalipsis: [] };
    if (juegoId === 'mixto') {
      const pool = [];
      for (const m of ['estudios', 'apocalipsis']) {
        for (const j of DATOS[m]) for (const q of j.preguntas) pool.push(preparar(q));
      }
      return shuffle(pool).slice(0, PREG_MIXTO);
    }
    const j = DATOS[modo].find(x => x.id === juegoId);
    return j ? shuffle(j.preguntas).map(preparar) : [];
  }

  /* ---------- sondeo del estado ---------- */
  let sondeando = false;
  async function sondear() {
    if (!G.activo || sondeando) return;
    sondeando = true;
    try {
      const d = await api('/estado?pin=' + encodeURIComponent(G.pin) + '&token=' + encodeURIComponent(G.token));
      G.ult = d;
      G.offset = d.servidorAhora - Date.now();
      pintar(d);
    } catch (err) {
      if (err.codigo === 'no-pin') salaTermino();
      /* otros errores (red): se reintenta en el próximo ciclo */
    } finally {
      sondeando = false;
    }
  }
  function arrancarSondeo() {
    pararSondeo();
    G.activo = true;
    G.poll = setInterval(sondear, 800);
    sondear();
  }
  function pararSondeo() {
    clearInterval(G.poll); G.poll = null;
    cancelAnimationFrame(G.raf);
    quitarOverlay();
  }
  function salaTermino() {
    pararSondeo();
    G.activo = false;
    borrarSesion();
    document.dispatchEvent(new Event('fequiz-inicio'));
    P.innerHTML = `
      <h2 class="tit-seccion">La partida terminó</h2>
      <p class="sub-seccion">El anfitrión la cerró o dejó de existir.</p>
      <button class="btn-grande" id="g-volver-home">VOLVER AL INICIO</button>`;
    $('#g-volver-home').addEventListener('click', () => $('#btn-marca').click());
  }

  /* ---------- ciclo de reloj (timer y cuenta) ---------- */
  function ahoraServidor() { return Date.now() + G.offset; }
  function ciclo() {
    if (!G.activo) return;
    const d = G.ult;
    if (d) {
      if (d.estado === 'pregunta') {
        const barra = $('#timer-barra'), num = $('#timer-num');
        if (barra && d.preguntaHasta) {
          const rest = Math.max(0, d.preguntaHasta - ahoraServidor());
          barra.style.width = (rest / (d.segs * 1000) * 100) + '%';
          const seg = Math.ceil(rest / 1000);
          if (num) {
            num.textContent = seg;
            num.classList.toggle('apurado', seg <= 10 && seg > 5);
            num.classList.toggle('critico', seg <= 5);
          }
          if (seg <= 5 && seg !== G.ultTick) { G.ultTick = seg; if (seg > 0) sonidos.tick(); }
        }
      } else if (d.estado === 'cuenta' && G.overlay) {
        const sp = G.overlay.querySelector('span');
        if (sp) {
          const rest = Math.max(0, d.cuentaHasta - ahoraServidor());
          const paso = rest > 2400 ? '3' : rest > 1400 ? '2' : rest > 400 ? '1' : '¡YA!';
          if (sp.textContent !== paso) { sp.textContent = paso; tono(paso === '¡YA!' ? 880 : 440, .12, 'square', .14); }
        }
      }
    }
    G.raf = requestAnimationFrame(ciclo);
  }
  function quitarOverlay() {
    if (G.overlay) { G.overlay.remove(); G.overlay = null; }
  }

  /* ---------- pintado según estado ---------- */
  function pintar(d) {
    const clave = [G.rol, d.estado, d.idx, d.activos, d.respondieron,
      d.yo ? d.yo.respondio : 0].join('|');
    if (clave !== G.clave) {
      const antes = G.clave;
      G.clave = clave;
      renderVista(d, antes);
    } else {
      const chip = $('#chip-respondieron');
      if (chip) chip.textContent = 'Respondieron ' + d.respondieron + '/' + d.activos;
    }
    if (!G.raf) G.raf = requestAnimationFrame(ciclo);
  }

  function renderVista(d, antes) {
    quitarOverlay();
    if (G.rol === 'anfitrion') {
      if (d.estado === 'lobby') vLobbyAnfitrion(d);
      else if (d.estado === 'cuenta') vCuenta(d);
      else if (d.estado === 'pregunta') vPreguntaAnfitrion(d);
      else if (d.estado === 'revelacion') vRevelacionAnfitrion(d);
      else if (d.estado === 'podio') vPodio(d, true);
    } else {
      if (d.estado === 'lobby' || d.estado === 'cuenta') vLobbyJugador(d);
      else if (d.estado === 'pregunta') vPreguntaJugador(d);
      else if (d.estado === 'revelacion') vRevelacionJugador(d);
      else if (d.estado === 'podio') vPodio(d, false);
    }
    window.scrollTo(0, 0);
  }

  /* ---------- vistas: ANFITRIÓN ---------- */
  function vLobbyAnfitrion(d) {
    const chips = (d.jugadores || []).map(j =>
      `<span class="jugador-chip">${esc(j.apodo)}</span>`).join('');
    const url = location.host + '/fequiz';
    P.innerHTML = `
      <h2 class="tit-seccion">Partida creada</h2>
      <p class="sub-seccion">${esc(d.icono)} ${esc(d.titulo)} · ${d.total} preguntas</p>
      <div class="pin-caja">
        <div class="pin-rotulo">CÓDIGO DE LA PARTIDA</div>
        <div class="pin-numero">${esc(String(d.pin).slice(0, 3))} ${esc(String(d.pin).slice(3))}</div>
      </div>
      <div class="pin-como">Entran desde su celular en<br><b>${esc(url)}</b> → «UNIRSE CON PIN»</div>
      <div class="lobby-cuenta"><b>${d.activos}</b> ${d.activos === 1 ? 'esperando' : 'esperando'}</div>
      ${d.activos ? `<div class="chips-jugadores">${chips}</div>`
                  : `<p class="sub-seccion">Todavía no entró nadie…</p>`}
      <button id="g-empezar" class="btn-grande verde" ${d.activos ? '' : 'disabled'}>EMPEZAR</button>
      <div class="fila-dos">
        <button id="g-proyectar" class="btn-grande azul"><span class="g-mini">PANTALLA GRANDE</span>📺 PROYECTAR</button>
        <button id="g-invitar" class="btn-grande whatsapp"><span class="g-mini">GRUPO · AMIGOS</span>WHATSAPP</button>
      </div>
      <button id="g-cerrar" class="btn-grande hueco" style="margin-top:12px">CERRAR LA PARTIDA</button>`;
    $('#g-empezar').addEventListener('click', async () => {
      sonidos.tap();
      try { await api('/arrancar', { pin: G.pin, token: G.token }); } catch (e) {}
    });
    $('#g-proyectar').addEventListener('click', () => {
      sonidos.tap();
      /* abre la pantalla de proyección como espejo de esta sala */
      window.open('proyeccion.html?pin=' + encodeURIComponent(G.pin) + '&token=' + encodeURIComponent(G.token),
        'fequiz-proyeccion');
    });
    $('#g-invitar').addEventListener('click', () => {
      sonidos.tap();
      const enlace = location.origin + location.pathname + '?pin=' + G.pin;
      const texto = '🎮 ¡Se viene FeQuiz!\n\nSumate a la partida desde este enlace (tocá y ya estás adentro):\n' +
        enlace + '\n\nDespués escribí tu apodo · PIN ' + G.pin + ' por si la pantalla lo pide';
      window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
    });
    $('#g-cerrar').addEventListener('click', async () => {
      try { await api('/cerrar', { pin: G.pin, token: G.token }); } catch (e) {}
      $('#btn-marca').click();
    });
  }

  function vCuenta(d) {
    P.innerHTML = `<div class="cuenta-zona"><div class="origen"><span class="ico">${esc(d.icono)}</span>${esc(d.titulo)}</div>
      <p class="sub-seccion">¿Listos? Primera pregunta…</p></div>`;
    G.overlay = document.createElement('div');
    G.overlay.className = 'cuenta';
    G.overlay.innerHTML = '<span>3</span>';
    document.body.appendChild(G.overlay);
  }

  function opcionesHtml(q, conConteos) {
    return `<div class="opciones">${q.opciones.map((t, i) => `
      <div class="opcion r${i + 1} mirando${conConteos && i === q.correctaIdx ? ' acierto' : ''}">
        <span class="figura">${FIG[i]}</span>
        <span class="texto">${esc(t)}</span>
        ${conConteos && q.conteos && q.conteos[i] ? `<span class="conteo">${q.conteos[i]}</span>` : ''}
      </div>`).join('')}</div>`;
  }

  function vPreguntaAnfitrion(d) {
    const q = d.pregunta;
    P.innerHTML = `
      <div class="juego-top">
        <span class="chip">Pregunta ${d.idx + 1} de ${d.total}</span>
        <span class="chip" id="chip-respondieron">Respondieron ${d.respondieron}/${d.activos}</span>
      </div>
      <div class="timer-zona">
        <div class="timer-pista"><div class="timer-barra" id="timer-barra"></div></div>
        <div class="timer-num" id="timer-num">${d.segs}</div>
      </div>
      <div class="tarjeta-pregunta${q.p.length > 130 ? ' compacta' : ''}">${esc(q.p)}</div>
      ${opcionesHtml(q, false)}`;
  }

  function vRevelacionAnfitrion(d) {
    const q = d.revelacion;
    const top = (d.top || []).map((j, i) => `
      <div class="top-fila${i === 0 ? ' primero' : ''}">
        <span class="top-pos">${i < 3 ? MEDALLAS[i] : (i + 1) + '°'}</span>
        <span class="top-apodo">${esc(j.apodo)}</span>
        <span class="top-pts">${fmt(j.puntos)}</span>
      </div>`).join('');
    P.innerHTML = `
      <div class="origen"><span class="ico">${esc(d.icono)}</span>${esc(d.titulo)}</div>
      <div class="tarjeta-pregunta compacta">${esc(q.p)}</div>
      ${opcionesHtml(q, true)}
      <div class="resp-veredicto ok" style="margin:14px 0 6px">${ICO_OK}<span>${esc(q.resp || q.opciones[q.correctaIdx])}</span></div>
      ${q.r ? `<p class="resp-ref" style="margin:0 0 10px">${esc(q.r)}</p>` : ''}
      <h3 class="tit-top">Los mejores</h3>
      <div class="top-lista">${top}</div>
      <button id="g-siguiente" class="btn-grande verde" style="margin-top:14px">${d.idx + 1 < d.total ? 'SIGUIENTE' : 'VER PODIO'}</button>
      <p class="mini-aviso">Si nadie toca, avanza solo en unos segundos</p>`;
    $('#g-siguiente').addEventListener('click', async () => {
      sonidos.tap();
      try { await api('/siguiente', { pin: G.pin, token: G.token }); } catch (e) {}
    });
  }

  /* ---------- vistas: JUGADOR ---------- */
  function vLobbyJugador(d) {
    const chips = (d.jugadores || []).map(j => `<span class="jugador-chip">${esc(j.apodo)}</span>`).join('');
    P.innerHTML = `
      <section class="hero"><h1 style="font-size:34px">¡DENTRO!</h1>
        <p class="lema">${esc(G.apodo)} · PIN ${esc(String(d.pin).slice(0, 3))} ${esc(String(d.pin).slice(3))}</p></section>
      <div class="espera"><i></i><i></i><i></i></div>
      <p class="sub-seccion">Esperando al anfitrión…</p>
      <div class="lobby-cuenta"><b>${d.activos}</b> ${d.activos === 1 ? 'jugador' : 'jugadores'} en la sala</div>
      ${chips ? `<div class="chips-jugadores">${chips}</div>` : ''}`;
  }

  function vPreguntaJugador(d) {
    const q = d.pregunta;
    const enviada = G.enviadaIdx === d.idx || (d.yo && d.yo.respondio);
    if (!enviada) G.miOpcion = -1;
    const compacta = q.p.length > 90 ? ' compacta' : '';
    P.innerHTML = `
      <div class="juego-top">
        <span class="chip">Pregunta ${d.idx + 1} de ${d.total}</span>
        <span class="chip" id="chip-respondieron">Respondieron ${d.respondieron}/${d.activos}</span>
      </div>
      <div class="timer-zona">
        <div class="timer-pista"><div class="timer-barra" id="timer-barra"></div></div>
        <div class="timer-num" id="timer-num">${d.segs}</div>
      </div>
      <div class="tarjeta-pregunta mini${compacta}">${esc(q.p)}</div>
      <div class="opciones${enviada ? ' bloqueadas' : ''}">${q.opciones.map((t, i) => `
        <button class="opcion r${i + 1}${enviada && G.miOpcion === i ? ' elegida' : ''}" data-i="${i}" ${enviada ? 'disabled' : ''}>
          <span class="figura">${FIG[i]}</span><span class="texto">${esc(t)}</span>
        </button>`).join('')}</div>
      ${enviada ? `<div class="enviada-ok">${ICO_OK}<span>¡Respuesta enviada! Esperando…</span></div>` : ''}`;
    if (!enviada) {
      P.querySelectorAll('.opcion').forEach(b => b.addEventListener('click', async () => {
        const i = Number(b.dataset.i);
        G.miOpcion = i;
        P.querySelectorAll('.opcion').forEach(x => { x.disabled = true; x.classList.add('atenuada'); });
        b.classList.remove('atenuada');
        sonidos.tap();
        G.enviadaIdx = d.idx;
        try { await api('/responder', { pin: G.pin, token: G.token, opcion: i }); }
        catch (e) { G.enviadaIdx = -1; }
        sondear();
      }));
    }
  }

  function vRevelacionJugador(d) {
    const q = d.revelacion;
    const yo = d.yo || {};
    const frase = yo.correctaUltima ? azar(OK_FRASES) + (yo.ptsUltima ? ' +' + fmt(yo.ptsUltima) : '')
      : yo.respondio ? 'CASI... LA PRÓXIMA CAE' : 'SE TE ESCAPÓ';
    P.innerHTML = `
      <div class="origen"><span class="ico">${esc(d.icono)}</span>${esc(d.titulo)}</div>
      <div class="resp-veredicto ${yo.correctaUltima ? 'ok' : 'mal'}" style="justify-content:center;font-size:24px;margin:10px 0">
        ${yo.correctaUltima ? ICO_OK : ICO_MAL}<span>${frase}</span></div>
      <div class="pos-zona">
        <div class="pos-num">${yo.posicion || '-'}°</div>
        <div class="pos-de">de ${d.activos} · ${fmt(yo.puntos)} pts</div>
      </div>
      <p class="resp-texto" style="text-align:center"><b>Respuesta:</b> ${esc(q.resp || q.opciones[q.correctaIdx])}</p>
      ${q.r ? `<p class="resp-ref" style="text-align:center;margin-bottom:10px">${esc(q.r)}</p>` : ''}
      <p class="mini-aviso">Preparate para la próxima…</p>`;
    if (yo.correctaUltima) sonidos.ok(); else sonidos.mal();
  }

  /* ---------- PODIO (los dos roles) ---------- */
  function vPodio(d, esAnfitrion) {
    const top = d.top || [];
    const medallero = [top[1], top[0], top[2]];   // 2º · 1º · 3º
    const barras = medallero.map((j, i) => {
      const lugar = i === 1 ? 0 : i === 0 ? 1 : 2;
      const altura = lugar === 0 ? 130 : lugar === 1 ? 92 : 70;
      return j ? `
        <div class="podio-col">
          <div class="podio-medalla">${MEDALLAS[lugar]}</div>
          <div class="podio-apodo">${esc(j.apodo)}</div>
          <div class="podio-pts">${fmt(j.puntos)}</div>
          <div class="podio-barra b${lugar}" style="height:${altura}px"></div>
        </div>` : `<div class="podio-col"><div class="podio-barra b${lugar}" style="height:${altura}px"></div></div>`;
    }).join('');
    const lista = top.map((j, i) => `
      <div class="top-fila${i === 0 ? ' primero' : ''}">
        <span class="top-pos">${i < 3 ? MEDALLAS[i] : (i + 1) + '°'}</span>
        <span class="top-apodo">${esc(j.apodo)}</span>
        <span class="top-pts">${fmt(j.puntos)}</span>
      </div>`).join('');
    const yo = d.yo;
    P.innerHTML = `
      <section class="resultado">
        <div class="saludo">${esAnfitrion ? '¡Se terminó el juego!' : `Terminaste ${yo && yo.posicion ? yo.posicion + '°' : ''} de ${d.activos}`}</div>
        <div class="rotulo">podio</div>
        <div class="podio">${barras}</div>
        <div class="top-lista" style="margin-top:14px">${lista}</div>
        ${esAnfitrion ? `
          <button id="g-revancha" class="btn-grande amarillo" style="margin-top:16px">REVANCHA · MISMA TRIBU</button>
          <button id="g-cerrar" class="btn-grande hueco" style="margin-top:12px">CERRAR LA PARTIDA</button>`
        : `<p class="mini-aviso" style="margin-top:16px">El anfitrión puede lanzar la revancha</p>
           <button id="g-salir" class="btn-grande hueco" style="margin-top:12px">SALIR</button>`}
      </section>`;
    if (!G.podioHecho) {
      G.podioHecho = true;
      sonidos.fanfarria();
      confeti();
    }
    if (esAnfitrion) {
      $('#g-revancha').addEventListener('click', async () => {
        sonidos.tap();
        G.podioHecho = false;
        try { await api('/revancha', { pin: G.pin, token: G.token }); } catch (e) {}
      });
      $('#g-cerrar').addEventListener('click', async () => {
        try { await api('/cerrar', { pin: G.pin, token: G.token }); } catch (e) {}
        $('#btn-marca').click();
      });
    } else {
      $('#g-salir').addEventListener('click', () => $('#btn-marca').click());
    }
  }

  /* ---------- confeti ---------- */
  function confeti() {
    const cv = $('#confeti'); if (!cv) return;
    const ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const colores = ['#E21B3C', '#1368CE', '#FFA602', '#26890C', '#ffffff'];
    const ps = [];
    for (let i = 0; i < 150; i++) ps.push({
      x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .5,
      w: 6 + Math.random() * 7, h: 9 + Math.random() * 9, c: azar(colores),
      vy: 2.4 + Math.random() * 3.2, vx: -1.6 + Math.random() * 3.2,
      a: Math.random() * Math.PI, va: -.14 + Math.random() * .28
    });
    const t0 = performance.now();
    (function animar(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t - t0 < 3200) requestAnimationFrame(animar); else ctx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }

  /* ============================================================
     FLUJOS DE ENTRADA
     ============================================================ */

  /* --- anfitrión: elegir el juego y crear la sala --- */
  function vistaDirigir() {
    G.rol = 'anfitrion';
    const DATOS = window.FEQUIZ_DATOS || { estudios: [], apocalipsis: [] };
    const modo = G.modoSel || 'estudios';
    const juegos = DATOS[modo] || [];
    const tarjetas = juegos.map(j => `
      <button class="tarjeta-juego" data-id="${j.id}">
        <span class="cinta" style="background:${esc(j.grad)}"></span>
        <span class="cuerpo">
          <span class="fila1"><span class="num" style="background:${esc(j.grad)}">${j.id}</span>
          <span class="ico">${esc(j.icono)}</span></span>
          <span class="tit">${esc(j.titulo)}</span>
          <span class="pie-t"><span>${j.preguntas.length} preg.</span></span>
        </span>
      </button>`).join('');
    P.innerHTML = `
      <h2 class="tit-seccion">¿Qué van a jugar?</h2>
      <p class="sub-seccion">La sala se crea al instante con su PIN</p>
      <div class="pestanas">
        <button data-modo="estudios" class="${modo === 'estudios' ? 'activo' : ''}">20 Estudios</button>
        <button data-modo="apocalipsis" class="${modo === 'apocalipsis' ? 'activo' : ''}">Apocalipsis</button>
      </div>
      <div class="grilla-juegos">${tarjetas}</div>
      <button id="g-mixto" class="btn-grande amarillo" style="margin-top:14px">MODO MIXTO · ${PREG_MIXTO} AL AZAR</button>`;
    P.querySelectorAll('.pestanas button').forEach(b =>
      b.addEventListener('click', () => { sonidos.tap(); G.modoSel = b.dataset.modo; vistaDirigir(); }));
    P.querySelectorAll('.tarjeta-juego').forEach(b =>
      b.addEventListener('click', () => crearPartida(modo, Number(b.dataset.id))));
    $('#g-mixto').addEventListener('click', () => crearPartida(modo, 'mixto'));
  }

  async function crearPartida(modo, juegoId) {
    sonidos.tap();
    const DATOS = window.FEQUIZ_DATOS;
    let titulo = 'Modo mixto', icono = '🎲', lista = [];
    if (juegoId === 'mixto') lista = armarLista(modo, 'mixto');
    else {
      const j = DATOS[modo].find(x => x.id === juegoId);
      if (!j) return;
      titulo = j.titulo; icono = j.icono; lista = armarLista(modo, juegoId);
    }
    if (!lista.length) return;
    P.innerHTML = '<p class="sub-seccion" style="margin-top:30px">Creando la sala…</p>';
    try {
      const d = await api('/crear', {
        token: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
        modo, juegoId, titulo, icono, preguntas: lista, segs: SEGS
      });
      G.rol = 'anfitrion'; G.pin = d.pin; G.token = d.token;
      G.clave = ''; G.podioHecho = false; G.enviadaIdx = -1;
      guardarSesion();
      headerVolver(true);
      arrancarSondeo();
    } catch (err) {
      P.innerHTML = `<h2 class="tit-seccion">No se pudo crear</h2>
        <p class="sub-seccion">${err.codigo === 'red' ? 'Sin conexión con el servidor. Probá de nuevo.' : 'Intentá otra vez en un rato.'}</p>
        <button class="btn-grande" id="g-retry">REINTENTAR</button>`;
      $('#g-retry').addEventListener('click', vistaDirigir);
    }
  }

  /* --- jugador: entrar con pin (acepta PIN precargado del enlace de invitación) --- */
  function vistaUnirse(pinPrecargado) {
    G.rol = 'jugador';
    const apodoGuardado = (function () { try { return JSON.parse(localStorage.getItem('fequiz_apodo') || '""'); } catch (e) { return ''; } })();
    P.innerHTML = `
      <h2 class="tit-seccion">Unirse con PIN</h2>
      <p class="sub-seccion">${pinPrecargado ? 'Sumate a la partida · el código ya está cargado' : 'Pedile el código al anfitrión'}</p>
      <input id="g-pin" class="apodo pin-input" inputmode="numeric" maxlength="6"
        placeholder="······" autocomplete="off" autocapitalize="off" value="${pinPrecargado ? esc(pinPrecargado) : ''}">
      <input id="g-apodo" class="apodo" style="margin-top:12px" maxlength="14"
        placeholder="TU APODO" value="${esc(apodoGuardado || '')}" autocomplete="off">
      <p class="g-error oculto" id="g-err"></p>
      <button id="g-entrar" class="btn-grande verde" style="margin-top:12px">ENTRAR</button>`;
    const pin = $('#g-pin'), apodo = $('#g-apodo'), err = $('#g-err');
    pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); });
    function entrar() {
      if (pin.value.length !== 6) { err.textContent = 'El PIN tiene 6 números'; err.classList.remove('oculto'); return; }
      if (!apodo.value.trim()) { err.textContent = 'Escribí tu apodo'; err.classList.remove('oculto'); return; }
      err.classList.add('oculto');
      sonidos.tap();
      api('/unirse', { pin: pin.value, apodo: apodo.value }).then(d => {
        G.rol = 'jugador'; G.pin = d.pin; G.token = d.token; G.apodo = d.apodo;
        try { localStorage.setItem('fequiz_apodo', JSON.stringify(d.apodo)); } catch (e) {}
        G.clave = ''; G.enviadaIdx = -1;
        guardarSesion();
        headerVolver(true);
        arrancarSondeo();
      }).catch(e2 => {
        err.textContent = e2.codigo === 'no-pin' ? 'Ese PIN no existe. Revisalo.'
          : e2.codigo === 'apodo' ? 'Ese apodo ya está en la partida. Elegí otro.'
          : e2.codigo === 'termino' ? 'La partida ya terminó.'
          : 'Sin conexión. Probá de nuevo.';
        err.classList.remove('oculto');
      });
    }
    $('#g-entrar').addEventListener('click', entrar);
    [pin, apodo].forEach(i => i.addEventListener('keydown', ev => { if (ev.key === 'Enter') entrar(); }));
    (pinPrecargado ? apodo : pin).focus();
  }

  function headerVolver(visible) {
    const b = $('#btn-volver');
    if (b) b.classList.toggle('oculto', !visible);
  }

  /* ---------- sección en el inicio ---------- */
  function pintarHome() {
    if (!window.FEQUIZ_DATOS) return;
    if (G.activo) return;   /* hay una vista grupal en curso (p. ej. entrar por enlace) */
    const vieja = $('#grupal-zona');
    if (vieja) vieja.remove();
    const stats = document.querySelector('.stats-zona');
    if (!stats) return;
    const sec = document.createElement('section');
    sec.className = 'grupal-zona';
    sec.id = 'grupal-zona';
    sec.innerHTML = `
      <div class="grupal-tit">📢 MODO GRUPAL</div>
      <div class="grupal-sub">Para jugar en la iglesia: la pantalla muestra el PIN y todos compiten desde su celular</div>
      <div class="grupal-btns">
        <button id="g-dirigir" class="btn-grande"><span class="g-mini">ANFITRIÓN</span>DIRIGIR PARTIDA</button>
        <button id="g-unirse" class="btn-grande amarillo"><span class="g-mini">JUGADORES</span>UNIRSE CON PIN</button>
      </div>`;
    stats.after(sec);
    $('#g-dirigir').addEventListener('click', entrarGrupal.bind(null, 'dirigir'));
    $('#g-unirse').addEventListener('click', entrarGrupal.bind(null, 'unirse'));
    const s = leerSesion();
    if (s && s.pin && !$('#g-reanudar')) {
      api('/estado?pin=' + encodeURIComponent(s.pin) + '&token=' + encodeURIComponent(s.token))
        .then(d => {
          if (!G.activo && d && d.ok) {
            const b = document.createElement('button');
            b.id = 'g-reanudar';
            b.className = 'btn-grande hueco';
            b.style.marginTop = '10px';
            b.textContent = 'VOLVER A LA PARTIDA · PIN ' + s.pin;
            b.addEventListener('click', reanudar);
            sec.appendChild(b);
          }
        }).catch(() => { borrarSesion(); });
    }
  }

  function entrarGrupal(que) {
    sonidos.tap();
    G.activo = true;
    if (que === 'dirigir') { G.rol = 'anfitrion'; headerVolver(true); vistaDirigir(); }
    else vistaUnirse();
  }

  function reanudar() {
    const s = leerSesion();
    if (!s) return;
    G.rol = s.rol; G.pin = s.pin; G.token = s.token; G.apodo = s.apodo || '';
    G.clave = ''; G.enviadaIdx = -1; G.podioHecho = false;
    headerVolver(true);
    arrancarSondeo();
  }

  /* ---------- API pública para app.js ---------- */
  window.FEQUIZ_GRUPAL = {
    get activo() { return G.activo; },
    salir() { pararSondeo(); G.activo = false; G.ult = null; G.clave = ''; }
  };

  /* ---------- arranque ---------- */
  document.addEventListener('fequiz-inicio', pintarHome);
  if ($('#btn-mixto')) pintarHome();               // el inicio ya estaba dibujado

  /* ---------- enlace de invitación (?pin=123456) ----------
     El anfitrión manda el enlace por WhatsApp: la app abre la
     pantalla UNIRSE CON PIN con el código ya cargado. */
  (function entrarPorEnlace() {
    let pin = '';
    try { pin = (new URLSearchParams(location.search).get('pin') || '').replace(/\D/g, '').slice(0, 6); } catch (e) {}
    if (pin.length !== 6 && location.hash.indexOf('pin=') > -1) {
      try { pin = (new URLSearchParams(location.hash.slice(1)).get('pin') || '').replace(/\D/g, '').slice(0, 6); } catch (e) {}
    }
    if (pin.length !== 6) return;
    borrarSesion();                    /* el enlace manda: se descarta la sesión vieja */
    G.activo = true;                   /* evita que el inicio pise esta pantalla */
    headerVolver(true);
    vistaUnirse(pin);
  })();

  (function reanudarSilencioso() {
    const s = leerSesion();
    if (!s || !s.pin || s.rol !== 'jugador') return;   // el anfitrión vuelve con el botón del inicio
    api('/estado?pin=' + encodeURIComponent(s.pin) + '&token=' + encodeURIComponent(s.token))
      .then(d => {
        if (d && d.ok && !G.activo) reanudar();
      })
      .catch(() => borrarSesion());
  })();

})();
