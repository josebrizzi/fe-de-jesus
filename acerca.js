// HERRAMIENTAS DE APOYO - Fe de Jesús (v18: resúmenes de ideas clave)
/* v18: se quitaron las pastillas "Mi certificado", "Respaldar mi progreso"
   (el respaldo ahora se hace solo al completar cada estudio) y "Escribir por
   WhatsApp". En las portadas queda el botón de Resúmenes y, en Apocalipsis,
   el acceso directo al curso Fe de Jesús. */
(function(){
  var css = document.createElement("style");
  css.textContent = '.acc-wrap{padding:2px 14px 8px}.acc-wrap h2{font-size:11.5px;color:var(--texto2,#6b7480);margin:20px 4px 8px;text-transform:uppercase;letter-spacing:1px;font-weight:700}.acc-grid{display:flex;gap:9px;flex-wrap:wrap}.acc-btn{flex:1;min-width:105px;display:flex;flex-direction:column;align-items:center;gap:7px;background:var(--panel,#fff);border:none;border-radius:14px;padding:15px 9px;text-decoration:none;color:var(--texto,#1f2429);cursor:pointer;font-weight:700;font-size:14.5px;text-align:center;box-shadow:0 1px 2px rgba(31,36,41,.05),0 3px 12px rgba(31,36,41,.06)}.acc-btn:active{transform:scale(.97)}.acc-btn span{font-size:30px}.acc-btn.bl{background:var(--azul,#414141);color:var(--btnfg,#fff)}';
  document.head.appendChild(css);

  function botones(){
    var esPortada = !!document.getElementById("lista");
    if(!esPortada) return;

    var esApo = /apocalipsis/.test(location.pathname);
    var tipo = esApo ? "apo" : "fej";
    var wrap = document.createElement("div");
    wrap.className = "acc-wrap";
    wrap.innerHTML = '<h2>Herramientas</h2>' +
      '<div class="acc-grid">' +
      (esApo ? '<a class="acc-btn" href="index.html"><span>📖</span>Fe de Jesús</a>' : "") +
      '<button class="acc-btn bl" onclick="window.fejAbrirResumenes(\'' + tipo + '\')"><span>📋</span>Resúmenes de ideas clave</button>' +
      '</div>';

    document.querySelector(".sec").appendChild(wrap);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", botones);
  } else { botones(); }
})();

console.log("Fe de Jesús v18: acerca.js cargado ✓");
