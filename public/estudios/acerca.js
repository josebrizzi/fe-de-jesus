// HERRAMIENTAS DE APOYO - Fe de Jesús (certificado, respaldo, WhatsApp) · v16
(function(){
  var TELEFONO = "5491128945261";

  var WHATSAPP = "https://wa.me/" + TELEFONO + "?text=" + encodeURIComponent("Hola 📖 Vengo de la app Fe de Jesús y quiero consultarte algo.");

  var css = document.createElement("style");
  css.textContent = '.acc-wrap{padding:2px 14px 8px}.acc-wrap h2{font-size:11.5px;color:var(--texto2,#6b7480);margin:20px 4px 8px;text-transform:uppercase;letter-spacing:1px;font-weight:700}.acc-grid{display:flex;gap:9px;flex-wrap:wrap}.acc-btn{flex:1;min-width:105px;display:flex;flex-direction:column;align-items:center;gap:7px;background:var(--panel,#fff);border:none;border-radius:14px;padding:15px 9px;text-decoration:none;color:var(--texto,#1f2429);cursor:pointer;font-weight:700;font-size:14.5px;text-align:center;box-shadow:0 1px 2px rgba(31,36,41,.05),0 3px 12px rgba(31,36,41,.06)}.acc-btn:active{transform:scale(.97)}.acc-btn span{font-size:30px}.acc-btn.gr{background:var(--verde,#279a58);color:#fff}.acc-btn.bl{background:var(--azul,#414141);color:var(--btnfg,#fff)}';
  document.head.appendChild(css);

  window.hacerRespaldo = function(btn){
    if(typeof window.fejRespaldo === "function") window.fejRespaldo();
    btn.innerHTML = '<span>✅</span>¡Progreso guardado!';
    btn.style.background = "var(--verde,#279a58)";
    btn.style.color = "#fff";
    setTimeout(function(){
      btn.innerHTML = '<span>💾</span>Respaldar mi progreso';
      btn.style.background = "";
      btn.style.color = "";
    }, 3000);
  };

  function botones(){
    var esPortada = !!document.getElementById("lista");
    var esLeccion = !!document.getElementById("app");
    if(!esPortada && !esLeccion) return;

    var esApo = /apocalipsis|apo-leccion/.test(location.pathname);
    var wrap = document.createElement("div");
    wrap.className = "acc-wrap";
    wrap.innerHTML = '<h2>' + (esPortada ? "Herramientas" : "¿Querés saber más?") + '</h2>' +
      '<div class="acc-grid">' +
      (esApo
        ? '<a class="acc-btn" href="index.html"><span>📖</span>Fe de Jesús</a>'
        : '<a class="acc-btn gr" href="certificado.html"><span>🎓</span>Mi certificado</a>') +
      '<button class="acc-btn" id="accRespaldo" onclick="hacerRespaldo(this)"><span>💾</span>Respaldar mi progreso</button>' +
      '<a class="acc-btn bl" href="' + WHATSAPP + '" target="_blank" rel="noopener"><span>💬</span>Escribir por WhatsApp</a>' +
      '</div>';

    if(esPortada){ document.querySelector(".sec").appendChild(wrap); }
    else { document.getElementById("app").appendChild(wrap); }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", botones);
  } else { botones(); }
})();

console.log("Fe de Jesús v16: acerca.js cargado ✓");
