/* Metadatos del curso — Fe de Jesús */
const CURSO = {
  titulo: "Fe de Jesús",
  descripcion: "Curso de estudio bíblico en 20 lecciones: de la Biblia al bautismo, un estudio por día.",
  versionPreferida: "RVR1960"
};

/* Las lecciones se cargan desde data-a.js, data-b.js, data-c.js y data-d.js */
const LECCIONES = [];

/* ============ PWA (se activa en todas las páginas automáticamente) ============ */
(function(){
  document.head.insertAdjacentHTML("beforeend",
    '<link rel="manifest" href="manifest.json">' +
    '<meta name="theme-color" content="#dc2743">' +
    '<link rel="icon" type="image/svg+xml" href="icon.svg">'
  );
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    });
  }
})();

/* ============ TAMAÑO DE FUENTE AGRANDADO ============ */
(function(){
  var s = document.createElement("style");
  s.textContent = `
header .t{font-size:20px}
.logo{font-size:24px}
.logo small{font-size:16px}
.pill{font-size:17px}
.st small{font-size:14px}
.hero .dia{font-size:16px}
.hero h1{font-size:31px}
.hero p{font-size:18px}
.btn{font-size:19px}
.sec h2{font-size:16px}
.d{font-size:16px}
.card h3{font-size:20px;line-height:1.35}
.stx{font-size:16px}
.he{font-size:22px}
.card h2{font-size:23px}
.intro{font-size:20px;line-height:1.7}
.pq{font-size:20px}
.pnum{width:27px;height:27px;font-size:14px}
.chip{font-size:17px;padding:7px 15px}
.resp{font-size:17px}
.des{font-size:20px;line-height:1.72}
.egw{font-size:18px;line-height:1.65}
.egw b{font-size:15px}
ul.lis li{font-size:20px;line-height:1.6}
ul.lis li span{font-size:16px !important}
.colwrap h4{font-size:18px}
.dec h2{font-size:21px}
.dec p{font-size:20px}
.dbtns button{font-size:20px}
.navg button{font-size:18px}
.cplt{font-size:20px}
#sheet h3{font-size:26px}
#sheet .vv{font-size:16px}
#sheet .bd{font-size:25px;line-height:1.8}
#sheet sup{font-size:18px}
.toast{font-size:18px}
footer{font-size:16px}
`;
  document.head.appendChild(s);
})();

/* ============ REGISTRO DE ALUMNOS ============ */
(function(){
  /* URL del receptor de Google Sheets (planilla del instructor) */
  var REGISTRO_URL = "https://script.google.com/macros/s/AKfycbwFnRRvs-5kJ8O1WXyqo-IOePnoRsk1mMnsk7Mk-UEjsVQFhSQXmVkNyqW-u2wHGlJK/exec";

  window.fejPerfil = function(){
    return JSON.parse(localStorage.getItem("fej_alumno") || "null");
  };

  window.fejRegistrar = function(evento, detalle){
    try{
      var p = window.fejPerfil() || {};
      var fila = {
        fecha: new Date().toLocaleString("es-AR"),
        nombre: p.nombre || "(sin registrar)",
        telefono: p.telefono || "",
        evento: evento,
        detalle: detalle || ""
      };
      var log = JSON.parse(localStorage.getItem("fej_log") || "[]");
      log.push(fila);
      localStorage.setItem("fej_log", JSON.stringify(log));
      if(REGISTRO_URL && !p.privado){
        fetch(REGISTRO_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(fila)
        }).catch(function(){});
      }
    }catch(err){}
  };

  window.fejTextoProgreso = function(){
    var p = window.fejPerfil() || {};
    var doneMap = JSON.parse(localStorage.getItem("fej_done") || "{}");
    var deces = JSON.parse(localStorage.getItem("fej_dec") || "{}");
    var log = JSON.parse(localStorage.getItem("fej_log") || "[]");
    var ultimas = log.slice(-12).reverse().map(function(f){
      return "• " + f.fecha + " — " + f.evento + " (" + f.detalle + ")";
    });
    var completadas = Object.keys(doneMap).map(Number).sort(function(a,b){return a-b;});
    var decisiones = Object.keys(deces).map(Number).sort(function(a,b){return a-b;})
      .map(function(d){ return "Día " + d + ": " + (deces[d]==="si"?"SÍ":"NO"); });
    return "📊 *Mi progreso en Fe de Jesús*" +
      "\n\n👤 " + (p.nombre || "Sin registrar") +
      "\n✅ Lecciones completadas: " + completadas.length + "/20" +
      (completadas.length ? "\n   Días: " + completadas.join(", ") : "") +
      (decisiones.length ? "\n✍️ Decisiones: " + decisiones.join(" | ") : "") +
      (ultimas.length ? "\n\n🕐 Última actividad:\n" + ultimas.join("\n") : "") +
      "\n\n— Enviado desde la app Fe de Jesús";
  };

  /* Registro automático de apertura de lección (una vez por lección) */
  window.addEventListener("load", function(){
    var params = new URLSearchParams(location.search);
    var dia = +params.get("dia");
    if(dia){
      var clave = "fej_abierta_" + dia;
      if(!localStorage.getItem(clave)){
        localStorage.setItem(clave, "1");
        window.fejRegistrar("Abrió la lección", "Lección " + dia);
      }
    }
  });

  /* Registro de completar/desmarcar y decisiones (por clicks) */
  document.addEventListener("click", function(e){
    var t = e.target.closest("#btnCplt, #btnDone, .dbtns button");
    if(!t) return;
    var params = new URLSearchParams(location.search);
    var dia = +params.get("dia") || 1;
    setTimeout(function(){
      var doneMap = JSON.parse(localStorage.getItem("fej_done") || "{}");
      if(t.id === "btnCplt" || t.id === "btnDone"){
        window.fejRegistrar(doneMap[dia] ? "Completó la lección" : "Desmarcó la lección", "Lección " + dia);
      } else {
        var txt = (t.textContent || "").trim().toUpperCase();
        window.fejRegistrar("Decisión: " + (txt === "SÍ" || txt === "SI" ? "SÍ" : "NO"), "Lección " + dia);
      }
    }, 200);
  }, true);
})();

/* ============ PANTALLA DE REGISTRO (primera vez) ============ */
(function(){
  var css = document.createElement("style");
  css.textContent = `
#rgOverlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:80;display:none;align-items:center;justify-content:center;padding:18px}
#rgOverlay.on{display:flex}
#rgModal{background:#fff;border-radius:20px;padding:26px 22px;width:min(92vw,400px);max-height:88vh;overflow-y:auto;position:relative;box-shadow:0 12px 40px rgba(0,0,0,.3)}
#rgModal h2{font-size:22px;text-align:center;margin-bottom:4px}
#rgModal .sub{text-align:center;color:#8e8e8e;font-size:14px;margin-bottom:16px}
#rgModal label{display:block;font-weight:700;font-size:15px;margin:12px 0 5px}
#rgModal input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #dbdbdb;border-radius:10px;font-size:16px}
#rgModal input:focus{outline:none;border-color:#0095f6}
.rg-aviso{background:#e8f3fd;border-radius:10px;padding:12px;font-size:13.5px;color:#3178c6;line-height:1.5;margin-top:14px}
.rg-btn{width:100%;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:800;cursor:pointer;margin-top:10px}
.rg-btn.si{background:#0095f6;color:#fff}
.rg-btn.priv{background:#fff;color:#8e8e8e;border:2px solid #dbdbdb}
.rg-pie{text-align:center;font-size:12px;color:#c7c7c7;margin-top:12px}
`;
  document.head.appendChild(css);

  function mostrar(){
    var p = window.fejPerfil();
    if(p && (p.nombre || p.privado)) return;

    var ov = document.createElement("div");
    ov.id = "rgOverlay";
    ov.innerHTML = `
      <div id="rgModal">
        <h2>📖 ¡Bienvenido!</h2>
        <div class="sub">Antes de comenzar, contanos quién sos para acompañarte en el camino</div>
        <label>Tu nombre completo</label>
        <input id="rgNombre" placeholder="Ej: María González" autocomplete="name">
        <label>Tu teléfono (opcional)</label>
        <input id="rgTel" placeholder="Para que tu instructor pueda contactarte" inputmode="tel">
        <div class="rg-aviso">🤝 Tu nombre y tu avance en los estudios se comparten con el instructor, José, para poder acompañarte en tu crecimiento y en tu decisión de bautismo.</div>
        <button class="rg-btn si" id="rgOk">✅ Registrarme y comenzar</button>
        <button class="rg-btn priv" id="rgPriv">🔒 Prefiero estudiar en privado</button>
        <div class="rg-pie">Podés cambiar esto después desde "Quiénes somos"</div>
      </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(function(){ ov.classList.add("on"); });

    ov.querySelector("#rgOk").onclick = function(){
      var n = ov.querySelector("#rgNombre").value.trim();
      if(!n){ ov.querySelector("#rgNombre").focus(); return; }
      localStorage.setItem("fej_alumno", JSON.stringify({
        nombre: n,
        telefono: ov.querySelector("#rgTel").value.trim(),
        privado: false,
        desde: new Date().toLocaleString("es-AR")
      }));
      window.fejRegistrar("Se registró como alumno", "Primera vez");
      ov.classList.remove("on");
    };
    ov.querySelector("#rgPriv").onclick = function(){
      localStorage.setItem("fej_alumno", JSON.stringify({ privado: true }));
      ov.classList.remove("on");
    };
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", mostrar);
  } else { mostrar(); }
})();

/* ============ ACERCA DE + ENCONTRÁ UNA IGLESIA + MI PROGRESO ============ */
(function(){
  /* Tu número de WhatsApp (formato internacional, sin +
