// HERRAMIENTAS DE APOYO - Fe de Jesús (certificado, respaldo, WhatsApp) · v13
(function(){
  var TELEFONO = "5491128945261";

  var WHATSAPP = "https://wa.me/" + TELEFONO + "?text=" + encodeURIComponent("Hola 📖 Vengo de la app Fe de Jesús y quiero consultarte algo.");

  var css = document.createElement("style");
  css.textContent = '.acc-wrap{padding:4px 16px 8px}.acc-wrap h2{font-size:13px;color:var(--texto2,#64748b);margin:26px 4px 10px;text-transform:uppercase;letter-spacing:.8px;font-weight:800}.acc-grid{display:flex;gap:10px;flex-wrap:wrap}.acc-btn{flex:1;min-width:110px;display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--panel,#fff);border:1px solid var(--borde,#e4e9f1);border-radius:16px;padding:18px 10px;text-decoration:none;color:var(--texto,#1c2733);cursor:pointer;font-weight:800;font-size:15px;text-align:center;box-shadow:0 1px 2px rgba(28,39,51,.04),0 6px 18px rgba(28,39,51,.05)}.acc-btn:active{transform:scale(.97)}.acc-btn span{font-size:32px}.acc-btn.gr{background:var(--verde,#279a58);color:#fff}.acc-btn.bl{background:var(--azul,#2d7fc1);color:#fff}';
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

console.log("Fe de Jesús v13: acerca.js cargado ✓");
