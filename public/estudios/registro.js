// REGISTRO DE ALUMNOS - Fe de Jesús
(function(){
  var REGISTRO_URL = "https://script.google.com/macros/s/AKfycbykRiG6IoNWWkGrVv9aHDKv5kZtsbkl11Z-Y2uOXHbqctptrjNeTrlupTgre7mkiGlh/exec";

  function perfil(){ return JSON.parse(localStorage.getItem("fej_alumno") || "null"); }
  window.fejPerfil = perfil;

  window.fejRegistrar = function(evento, detalle){
    try{
      var p = perfil() || {};
      var fila = { fecha: new Date().toLocaleString("es-AR"), nombre: p.nombre || "(sin registrar)", telefono: p.telefono || "", evento: evento, detalle: detalle || "" };
      var log = JSON.parse(localStorage.getItem("fej_log") || "[]");
      log.push(fila);
      localStorage.setItem("fej_log", JSON.stringify(log));
      if(REGISTRO_URL && !p.privado){
        fetch(REGISTRO_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(fila) }).catch(function(){});
      }
    }catch(err){}
  };

  window.fejTextoProgreso = function(){
    var p = perfil() || {};
    var doneMap = JSON.parse(localStorage.getItem("fej_done") || "{}");
    var deces = JSON.parse(localStorage.getItem("fej_dec") || "{}");
    var log = JSON.parse(localStorage.getItem("fej_log") || "[]");
    var completadas = Object.keys(doneMap).map(Number).sort(function(a,b){ return a-b; });
    var decisiones = Object.keys(deces).map(Number).sort(function(a,b){ return a-b; }).map(function(d){ return "Día " + d + ": " + (deces[d] === "si" ? "SÍ" : "NO"); });
    var ultimas = log.slice(-12).reverse().map(function(f){ return "• " + f.fecha + " — " + f.evento + " (" + f.detalle + ")"; });
    return "📊 *Mi progreso en Fe de Jesús*\n\n👤 " + (p.nombre || "Sin registrar") + "\n✅ Lecciones completadas: " + completadas.length + "/20" + (completadas.length ? "\n   Días: " + completadas.join(", ") : "") + (decisiones.length ? "\n✍️ Decisiones: " + decisiones.join(" | ") : "") + (ultimas.length ? "\n\n🕐 Última actividad:\n" + ultimas.join("\n") : "") + "\n\n— Enviado desde la app Fe de Jesús";
  };

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

  document.addEventListener("click", function(e){
    var t = e.target.closest("#btnCplt, #btnDone, .dbtns button");
    if(!t) return;
    var dia = +(new URLSearchParams(location.search).get("dia")) || 1;
    setTimeout(function(){
      var doneMap = JSON.parse(localStorage.getItem("fej_done") || "{}");
      if(t.id === "btnCplt" || t.id === "btnDone"){
        window.fejRegistrar(doneMap[dia] ? "Completó la lección" : "Desmarcó la lección", "Lección " + dia);
      } else {
        var txt = (t.textContent || "").trim().toUpperCase();
        window.fejRegistrar("Decisión: " + ((txt === "SÍ" || txt === "SI") ? "SÍ" : "NO"), "Lección " + dia);
      }
    }, 200);
  }, true);
})();

// PANTALLA DE REGISTRO (primera vez)
(function(){
  var css = document.createElement("style");
  css.textContent = '#rgOverlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:80;display:none;align-items:center;justify-content:center;padding:18px}#rgOverlay.on{display:flex}#rgModal{background:#fff;border-radius:20px;padding:26px 22px;width:min(92vw,400px);max-height:88vh;overflow-y:auto;position:relative;box-shadow:0 12px 40px rgba(0,0,0,.3)}#rgModal h2{font-size:22px;text-align:center;margin-bottom:4px}#rgModal .sub{text-align:center;color:#8e8e8e;font-size:14px;margin-bottom:16px}#rgModal label{display:block;font-weight:700;font-size:15px;margin:12px 0 5px}#rgModal input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #dbdbdb;border-radius:10px;font-size:16px}#rgModal input:focus{outline:none;border-color:#0095f6}.rg-aviso{background:#e8f3fd;border-radius:10px;padding:12px;font-size:13.5px;color:#3178c6;line-height:1.5;margin-top:14px}.rg-btn{width:100%;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:800;cursor:pointer;margin-top:10px}.rg-btn.si{background:#0095f6;color:#fff}.rg-btn.priv{background:#fff;color:#8e8e8e;border:2px solid #dbdbdb}.rg-pie{text-align:center;font-size:12px;color:#c7c7c7;margin-top:12px}';
  document.head.appendChild(css);

  function mostrar(){
    var p = window.fejPerfil();
    if(p && (p.nombre || p.privado)) return;
    var ov = document.createElement("div");
    ov.id = "rgOverlay";
    ov.innerHTML = '<div id="rgModal"><h2>📖 ¡Bienvenido!</h2><div class="sub">Antes de comenzar, contanos quién sos para acompañarte en el camino</div><label>Tu nombre completo</label><input id="rgNombre" placeholder="Ej: María González" autocomplete="name"><label>Tu teléfono (opcional)</label><input id="rgTel" placeholder="Para que tu instructor pueda contactarte" inputmode="tel"><div class="rg-aviso">🤝 Tu nombre y tu avance en los estudios se comparten con el instructor, José, para poder acompañarte en tu crecimiento y en tu decisión de bautismo.</div><button class="rg-btn si" id="rgOk">✅ Registrarme y comenzar</button><button class="rg-btn priv" id="rgPriv">🔒 Prefiero estudiar en privado</button><div class="rg-pie">Podés cambiar esto después desde "Quiénes somos"</div></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function(){ ov.classList.add("on"); });
    ov.querySelector("#rgOk").onclick = function(){
      var n = ov.querySelector("#rgNombre").value.trim();
      if(!n){ ov.querySelector("#rgNombre").focus(); return; }
      localStorage.setItem("fej_alumno", JSON.stringify({ nombre: n, telefono: ov.querySelector("#rgTel").value.trim(), privado: false, desde: new Date().toLocaleString("es-AR") }));
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

console.log("Fe de Jesús: registro.js cargado ✓");
