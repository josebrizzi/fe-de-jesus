'use strict';
/* ============================================================
   FEQUIZ — Fe de Jesús · Edición joven (estilo Kahoot)
   Mismo contenido, otra energía: quizzes con puntos, racha,
   tiempo y confeti. 100% offline (service worker + Montserrat).
   ============================================================ */
(function () {

  const $ = sel => document.querySelector(sel);
  const P = $('#pantalla');
  const TOTAL_SEGS = 20;          // segundos por pregunta
  const PREG_MIXTO = 10;          // preguntas del modo mixto
  const AUTO_MS = 4000;           // tiempo de lectura del panel de respuesta

  const FIG = [
    '<svg viewBox="0 0 20 20"><polygon points="10,2 18.5,18 1.5,18" fill="#fff"/></svg>',
    '<svg viewBox="0 0 20 20"><polygon points="10,1 19,10 10,19 1,10" fill="#fff"/></svg>',
    '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="#fff"/></svg>',
    '<svg viewBox="0 0 20 20"><rect x="2" y="2" width="16" height="16" rx="2.5" fill="#fff"/></svg>'
  ];
  const ICO_OK = '<svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICO_MAL = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>';
  const ICO_TROFEO = '<svg viewBox="0 0 24 24"><path d="M7 4h10v4a5 5 0 0 1-10 0V4zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 13v4m-4 3h8m-8 0a4 4 0 0 1 8 0" fill="none" stroke="#5C3A00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const OK_FRASES = ['¡CORRECTO!', '¡MUY BIEN!', '¡GENIAL!', '¡IMPARABLE!', '¡ESE ERA!'];
  const MAL_FRASES = ['CASI...', 'UY, NO ERA ESA', 'LA PRÓXIMA CAE SEGURA'];

  const S = {
    vista: 'inicio',
    modo: 'estudios',
    apodo: '',
    juego: null,        // juego actual {id,titulo,icono,grad,...} | 'mixto'
    lista: [],          // preguntas preparadas
    idx: 0,
    puntos: 0,
    racha: 0,
    rachaMax: 0,
    aciertos: 0,
    resenas: [],
    timeLeft: TOTAL_SEGS,
    timer: null,
    auto: null,
    bloqueado: false,
    sonido: true
  };

  /* ---------- almacenamiento ---------- */
  const guardo = (k, v) => { try { localStorage.setItem('fequiz_' + k, JSON.stringify(v)); } catch (e) {} };
  const leo = (k, def) => {
    try { const v = localStorage.getItem('fequiz_' + k); return v == null ? def : JSON.parse(v); }
    catch (e) { return def; }
  };
  const progresos = () => leo('progresos', {});
  const statsGlob = () => leo('stats', { puntos: 0, partidas: 0, rachaMax: 0 });

  /* ---------- utilidades ---------- */
  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n || 0).toLocaleString('es-AR');
  const azar = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- sonidos (WebAudio, sin archivos) ---------- */
  let ctxAudio = null;
  function tono(f, dur, tipo, vol, cuando) {
    if (!S.sonido) return;
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

  /* ---------- datos ---------- */
  const DATOS = window.FEQUIZ_DATOS || { estudios: [], apocalipsis: [] };
  const claveJuego = (modo, id) => (modo === 'estudios' ? 'e' : 'a') + id;
  function prepararPregunta(q, origen) {
    const ops = shuffle(q.opciones.map((t, i) => ({ t, i })));
    return {
      p: q.p,
      opciones: ops.map(o => o.t),
      correctaIdx: ops.findIndex(o => o.i === 0),
      r: q.r || '',
      resp: q.resp || '',
      origen
    };
  }
  function armarLista(juegoId, modo) {
    if (juegoId === 'mixto') {
      const pool = [];
      for (const modo2 of ['estudios', 'apocalipsis']) {
        for (const j of DATOS[modo2]) {
          const origen = { icono: j.icono, titulo: j.titulo, modo: modo2, id: j.id };
          for (const q of j.preguntas) pool.push(prepararPregunta(q, origen));
        }
      }
      return shuffle(pool).slice(0, PREG_MIXTO);
    }
    const j = DATOS[modo].find(x => x.id === juegoId);
    if (!j) return [];
    const origen = { icono: j.icono, titulo: j.titulo, modo, id: j.id };
    return shuffle(j.preguntas).map(q => prepararPregunta(q, origen));
  }

  /* ---------- header ---------- */
  const btnVolver = $('#btn-volver');
  const btnMarca = $('#btn-marca');
  const btnSonido = $('#btn-sonido');
  const icoOn = $('#ico-sonido-on');
  const icoOff = $('#ico-sonido-off');

  function pintarSonido() {
    icoOn.classList.toggle('oculto', !S.sonido);
    icoOff.classList.toggle('oculto', S.sonido);
  }
  btnSonido.addEventListener('click', () => {
    S.sonido = !S.sonido;
    guardo('sonido', S.sonido);
    pintarSonido();
    if (S.sonido) sonidos.tap();
  });

  function pintarHeader() {
    btnVolver.classList.toggle('oculto', !(S.vista === 'juego' || S.vista === 'selector'));
  }
  btnVolver.addEventListener('click', () => {
    if (window.FEQUIZ_GRUPAL && window.FEQUIZ_GRUPAL.activo) {
      window.FEQUIZ_GRUPAL.salir(); ir('inicio'); return;
    }
    if (S.vista === 'juego') { pararTimers(); ir('selector'); }
    else ir('inicio');
  });
  btnMarca.addEventListener('click', () => {
    if (window.FEQUIZ_GRUPAL && window.FEQUIZ_GRUPAL.activo) window.FEQUIZ_GRUPAL.salir();
    pararTimers(); ir('inicio');
  });

  function pararTimers() {
    clearInterval(S.timer); clearTimeout(S.auto);
    S.timer = S.auto = null;
    const panel = $('.respuesta-panel');
    if (panel) panel.remove();
  }

  /* ---------- navegación ---------- */
  function ir(vista, arg) {
    pararTimers();
    S.vista = vista;
    pintarHeader();
    window.scrollTo(0, 0);
    if (vista === 'inicio') vistaInicio();
    else if (vista === 'selector') vistaSelector(arg || S.modo);
    else if (vista === 'juego') vistaJuego(arg);
    else if (vista === 'resultados') vistaResultados();
  }

  /* ============================================================
     VISTA: INICIO
     ============================================================ */
  function vistaInicio() {
    const st = statsGlob();
    P.innerHTML = `
      <section class="hero">
        <div class="hero-figuras" aria-hidden="true">
          <svg viewBox="0 0 20 20"><polygon points="10,2 18.5,18 1.5,18" fill="#E21B3C"/></svg>
          <svg viewBox="0 0 20 20"><polygon points="10,1 19,10 10,19 1,10" fill="#1368CE"/></svg>
          <svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#FFA602"/></svg>
          <svg viewBox="0 0 20 20"><rect x="2" y="2" width="16" height="16" rx="2.5" fill="#26890C"/></svg>
        </div>
        <h1>FEQUIZ</h1>
        <p class="lema">Fe de Jesús, modo juego · ¿Cuánto sabés?</p>
      </section>

      <section class="apodo-zona">
        <input id="apodo" class="apodo" maxlength="14" placeholder="TU APODO" value="${esc(S.apodo)}" autocomplete="off">
        <button id="btn-jugar" class="btn-grande" style="margin-top:12px">JUGAR</button>
      </section>

      <section class="tarjetas-modos" aria-label="Modos de juego">
        <button class="tarjeta-modo" data-modo="estudios">
          <div class="ico">📖</div><div class="tit">20 Estudios</div><div class="sub">Fe de Jesús</div>
        </button>
        <button class="tarjeta-modo" data-modo="apocalipsis">
          <div class="ico">⏳</div><div class="tit">Apocalipsis</div><div class="sub">18 lecciones</div>
        </button>
      </section>

      <button id="btn-mixto" class="btn-grande amarillo">MODO MIXTO · ${PREG_MIXTO} AL AZAR</button>

      <div class="stats-zona">
        <span class="chip-stat"><b>${fmt(st.puntos)}</b> pts acumulados</span>
        <span class="chip-stat"><b>${fmt(st.partidas)}</b> partidas</span>
        <span class="chip-stat">Racha récord <b>${fmt(st.rachaMax)}</b></span>
      </div>

      <div class="pie">
        <span class="mini">FeQuiz · Fe de Jesús — mismo contenido, otra energía</span>
      </div>`;

    const input = $('#apodo');
    input.addEventListener('input', () => { S.apodo = input.value.trim(); guardo('apodo', S.apodo); });
    $('#btn-jugar').addEventListener('click', () => { sonidos.tap(); ir('selector', S.modo); });
    P.querySelectorAll('.tarjeta-modo').forEach(b =>
      b.addEventListener('click', () => { sonidos.tap(); ir('selector', b.dataset.modo); }));
    $('#btn-mixto').addEventListener('click', () => arrancar('mixto'));
    document.dispatchEvent(new Event('fequiz-inicio'));
  }

  /* ============================================================
     VISTA: SELECTOR
     ============================================================ */
  function vistaSelector(modo) {
    S.modo = modo;
    const juegos = DATOS[modo] || [];
    const prog = progresos();
    const tarjetas = juegos.map(j => {
      const key = claveJuego(modo, j.id);
      const p = prog[key];
      const check = p ? `<span class="hecho" aria-hidden="true">${ICO_OK}</span>` : '';
      const pie = p
        ? `<span class="récord">Mejor: ${fmt(p.mejor)}</span><span>·</span><span>${j.preguntas.length} preg.</span>`
        : `<span>Sin jugar</span><span>·</span><span>${j.preguntas.length} preg.</span>`;
      return `
        <button class="tarjeta-juego" data-id="${j.id}">
          <span class="cinta" style="background:${esc(j.grad)}"></span>
          ${check}
          <span class="cuerpo">
            <span class="fila1">
              <span class="num" style="background:${esc(j.grad)}">${j.id}</span>
              <span class="ico" aria-hidden="true">${esc(j.icono)}</span>
            </span>
            <span class="tit">${esc(j.titulo)}</span>
            <span class="pie-t">${pie}</span>
          </span>
        </button>`;
    }).join('');

    P.innerHTML = `
      <h2 class="tit-seccion">Elegí tu juego</h2>
      <p class="sub-seccion">Respondé, sumá puntos y superá tu récord</p>
      <div class="pestanas" role="tablist">
        <button data-modo="estudios" class="${modo === 'estudios' ? 'activo' : ''}">20 Estudios</button>
        <button data-modo="apocalipsis" class="${modo === 'apocalipsis' ? 'activo' : ''}">Apocalipsis</button>
      </div>
      <div class="grilla-juegos">${tarjetas}</div>
      <div class="pie"><span class="mini">${modo === 'estudios' ? 'Los 20 estudios del curso Fe de Jesús' : 'Las 18 lecciones del estudio Apocalipsis'}</span></div>`;

    P.querySelectorAll('.pestanas button').forEach(b =>
      b.addEventListener('click', () => { sonidos.tap(); ir('selector', b.dataset.modo); }));
    P.querySelectorAll('.tarjeta-juego').forEach(b =>
      b.addEventListener('click', () => arrancar(Number(b.dataset.id))));
  }

  /* ============================================================
     VISTA: JUEGO
     ============================================================ */
  function arrancar(juegoId) {
    sonidos.tap();
    let juego = 'mixto';
    let modo = S.modo;
    if (juegoId !== 'mixto') {
      modo = typeof juegoId === 'string' ? juegoId : modo;
      juego = DATOS[modo].find(x => x.id === Number(juegoId)) || null;
      if (!juego) return;
    }
    S.juego = juego;
    S.modo = modo;
    S.lista = armarLista(juegoId, modo);
    if (!S.lista.length) return;
    S.idx = 0; S.puntos = 0; S.racha = 0; S.rachaMax = 0; S.aciertos = 0; S.resenas = [];
    ir('juego');
    cuentaRegresiva(() => pintarPregunta());
  }

  function vistaJuego() { /* se dibuja desde pintarPregunta tras la cuenta */ }

  function cuentaRegresiva(cb) {
    const ov = document.createElement('div');
    ov.className = 'cuenta';
    ov.innerHTML = '<span>3</span>';
    document.body.appendChild(ov);
    const pasos = ['3', '2', '1', '¡YA!'];
    let i = 0;
    const paso = () => {
      const sp = ov.querySelector('span');
      sp.textContent = pasos[i];
      sp.style.animation = 'none'; void sp.offsetWidth; sp.style.animation = '';
      tono(i < 3 ? 440 : 880, .12, 'square', .14);
      i++;
      if (i < pasos.length) setTimeout(paso, 800);
      else setTimeout(() => { ov.remove(); cb(); }, 620);
    };
    paso();
  }

  function pintarPregunta() {
    const it = S.lista[S.idx];
    const total = S.lista.length;
    const compacta = it.p.length > 130 ? ' compacta' : '';
    const opsCompacta = it.opciones.some(o => o.length > 55) ? ' compacta' : '';
    const rachaChip = S.racha >= 2 ? `<span class="chip racha">Racha x${S.racha}</span>` : '';

    P.innerHTML = `
      <div class="juego-top">
        <span class="chip">Pregunta ${S.idx + 1} de ${total}</span>
        ${rachaChip}
        <span class="chip puntos" id="chip-puntos">${fmt(S.puntos)}</span>
      </div>
      <div class="timer-zona">
        <div class="timer-pista"><div class="timer-barra" id="timer-barra"></div></div>
        <div class="timer-num" id="timer-num">${TOTAL_SEGS}</div>
      </div>
      <div class="origen"><span class="ico" aria-hidden="true">${esc(it.origen.icono)}</span>${esc(it.origen.titulo)}</div>
      <div class="tarjeta-pregunta${compacta}">${esc(it.p)}</div>
      <div class="opciones">
        ${it.opciones.map((t, i) => `
          <button class="opcion r${i + 1}${opsCompacta}" data-i="${i}">
            <span class="figura" aria-hidden="true">${FIG[i]}</span>
            <span class="texto">${esc(t)}</span>
          </button>`).join('')}
      </div>`;

    P.querySelectorAll('.opcion').forEach(b =>
      b.addEventListener('click', () => responder(Number(b.dataset.i))));

    S.timeLeft = TOTAL_SEGS;
    S.bloqueado = false;
    arrancarTimer();
  }

  function arrancarTimer() {
    const barra = $('#timer-barra');
    const num = $('#timer-num');
    let ultimoSeg = TOTAL_SEGS;
    clearInterval(S.timer);
    S.timer = setInterval(() => {
      S.timeLeft = Math.max(0, S.timeLeft - .1);
      barra.style.width = (S.timeLeft / TOTAL_SEGS * 100) + '%';
      const seg = Math.ceil(S.timeLeft);
      if (seg !== ultimoSeg) {
        ultimoSeg = seg;
        num.textContent = seg;
        num.classList.toggle('apurado', seg <= 10 && seg > 5);
        num.classList.toggle('critico', seg <= 5);
        if (seg <= 5 && seg > 0) sonidos.tick();
      }
      if (S.timeLeft <= 0) responder(-1);
    }, 100);
  }

  function responder(i) {
    if (S.bloqueado) return;
    S.bloqueado = true;
    clearInterval(S.timer);

    const it = S.lista[S.idx];
    const botones = [...P.querySelectorAll('.opcion')];
    botones.forEach(b => b.disabled = true);
    const ok = i === it.correctaIdx;
    const agotado = i === -1;

    botones.forEach((b, bi) => {
      if (bi === it.correctaIdx) b.classList.add('acierto');
      else if (bi === i) b.classList.add('fallo');
      else b.classList.add('atenuada');
    });

    let pts = 0;
    if (ok) {
      const velocidad = S.timeLeft / TOTAL_SEGS;
      pts = 500 + Math.round(500 * velocidad) + Math.min(S.racha * 50, 250);
      S.puntos += pts;
      S.aciertos++;
      S.racha++;
      S.rachaMax = Math.max(S.rachaMax, S.racha);
      sonidos.ok();
      const fly = document.createElement('div');
      fly.className = 'suma-puntos';
      fly.textContent = '+' + fmt(pts);
      document.body.appendChild(fly);
      setTimeout(() => fly.remove(), 1200);
      const chip = $('#chip-puntos');
      if (chip) chip.textContent = fmt(S.puntos);
    } else {
      S.racha = 0;
      sonidos.mal();
    }

    S.resenas.push({ ok, p: it.p, correcta: it.opciones[it.correctaIdx], resp: it.resp, r: it.r, pts, origen: it.origen });

    const ultima = S.idx === S.lista.length - 1;
    const veredicto = ok
      ? `${azar(OK_FRASES)} +${fmt(pts)}`
      : agotado ? '¡SE ACABÓ EL TIEMPO!' : azar(MAL_FRASES);
    const detalle = it.resp || it.correcta;
    const ref = it.r ? `${it.r}` : '';

    const panel = document.createElement('div');
    panel.className = 'respuesta-panel';
    panel.innerHTML = `
      <div class="resp-veredicto ${ok ? 'ok' : 'mal'}">${ok ? ICO_OK : ICO_MAL}<span>${veredicto}</span></div>
      ${ok ? '' : `<p class="resp-texto"><b>Respuesta:</b> ${esc(detalle)}</p>`}
      ${ok ? `<p class="resp-texto">${esc(detalle)}</p>` : ''}
      ${ref ? `<p class="resp-ref">${esc(ref)}</p>` : ''}
      <button id="btn-siguiente" class="btn-grande resp-btn">${ultima ? 'VER RESULTADOS' : 'SIGUIENTE'}</button>
      <div class="resp-prog"><i id="resp-prog"></i></div>`;
    document.body.appendChild(panel);

    const barra = panel.querySelector('#resp-prog');
    requestAnimationFrame(() => barra && barra.classList.add('animada'));
    panel.querySelector('#btn-siguiente').addEventListener('click', siguiente);
    clearTimeout(S.auto);
    S.auto = setTimeout(siguiente, AUTO_MS);
  }

  function siguiente() {
    if (!S.bloqueado) return;
    pararTimers();
    S.bloqueado = false;
    S.idx++;
    if (S.idx < S.lista.length) {
      window.scrollTo(0, 0);
      pintarPregunta();
    } else {
      ir('resultados');
    }
  }

  /* ============================================================
     VISTA: RESULTADOS
     ============================================================ */
  function vistaResultados() {
    const total = S.lista.length;
    const precision = Math.round(S.aciertos / total * 100);
    const st = statsGlob();
    const esMixto = S.juego === 'mixto';

    // guardar progreso
    let record = false;
    if (!esMixto) {
      const key = claveJuego(S.modo, S.juego.id);
      const prog = progresos();
      const antes = prog[key];
      if (!antes || S.puntos > antes.mejor) { record = true; prog[key] = { mejor: S.puntos, jugadas: (antes ? antes.jugadas : 0) + 1 }; }
      else prog[key] = { mejor: antes.mejor, jugadas: antes.jugadas + 1 };
      guardo('progresos', prog);
    }
    guardo('stats', {
      puntos: st.puntos + S.puntos,
      partidas: st.partidas + 1,
      rachaMax: Math.max(st.rachaMax, S.rachaMax)
    });

    const repaso = S.resenas.map(r => `
      <div class="repaso-fila ${r.ok ? 'ok' : 'mal'}">
        <span class="marca-r">${r.ok ? ICO_OK : ICO_MAL}</span>
        <p>${esc(r.p)}</p>
        <span class="puntitos">${r.ok ? '+' + fmt(r.pts) : '0'}</span>
      </div>`).join('');

    const saludo = S.apodo ? `¡${esc(S.apodo)}, terminaste!` : '¡Terminaste!';

    P.innerHTML = `
      <section class="resultado">
        <div class="saludo">${saludo}</div>
        <div class="rotulo">puntos</div>
        <div class="puntos-finales" id="puntos-finales">0</div>
        ${record ? `<div class="badge-record">${ICO_TROFEO} ¡NUEVO RÉCORD!</div>` : ''}
        <div class="res-stats">
          <div class="res-stat"><b>${S.aciertos}/${total}</b><span>aciertos</span></div>
          <div class="res-stat"><b>${precision}%</b><span>precisión</span></div>
          <div class="res-stat"><b>${S.rachaMax}</b><span>mejor racha</span></div>
        </div>
        <div class="repaso">${repaso}</div>
        <button id="btn-otra" class="btn-grande verde">JUGAR OTRA VEZ</button>
        <button id="btn-otro" class="btn-grande hueco">ELEGIR OTRO JUEGO</button>
      </section>`;

    sonidos.fanfarria();
    confeti();

    // cuenta ascendente
    const el = $('#puntos-finales');
    const t0 = performance.now();
    const dur = 1200;
    const paso = t => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(Math.round(S.puntos * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);

    $('#btn-otra').addEventListener('click', () => arrancar(S.juego === 'mixto' ? 'mixto' : S.juego.id));
    $('#btn-otro').addEventListener('click', () => ir('selector', S.modo));
  }

  /* ---------- confeti ---------- */
  function confeti() {
    const cv = $('#confeti');
    const ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const colores = ['#E21B3C', '#1368CE', '#FFA602', '#26890C', '#ffffff'];
    const ps = [];
    for (let i = 0; i < 150; i++) {
      ps.push({
        x: Math.random() * cv.width,
        y: -20 - Math.random() * cv.height * .5,
        w: 6 + Math.random() * 7,
        h: 9 + Math.random() * 9,
        c: azar(colores),
        vy: 2.4 + Math.random() * 3.2,
        vx: -1.6 + Math.random() * 3.2,
        a: Math.random() * Math.PI,
        va: -.14 + Math.random() * .28
      });
    }
    const t0 = performance.now();
    (function animar(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t - t0 < 3200) requestAnimationFrame(animar);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }

  /* ---------- arranque ---------- */
  S.apodo = leo('apodo', '');
  S.sonido = leo('sonido', true);
  pintarSonido();
  if (!DATOS.estudios.length || !DATOS.apocalipsis.length) {
    P.innerHTML = '<h2 class="tit-seccion">Ups...</h2><p class="sub-seccion">No se pudieron cargar los datos del juego. Recargá la página.</p>';
  } else {
    ir('inicio');
  }

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
