// HERRAMIENTAS DE APOYO - Fe de Jesús (enlace entre estudios) · v18
// Desde v18 este archivo solo dibuja, en las pantallas de Apocalipsis,
// el botón para volver a Fe de Jesús. El respaldo del progreso es
// automático al completar cada estudio (lo hace registro.js).
(function(){
  var css = document.createElement("style");
  css.textContent = '.acc-wrap{padding:2px 14px 8px}.acc-wrap h2{font-size:11.5px;color:var(--texto2,#6b7480);margin:20px 4px 8px;text-transform:uppercase;letter-spacing:1px;font-weight:700}.acc-grid{display:flex;gap:9px;flex-wrap:wrap}.acc-btn{flex:1;min-width:105px;display:flex;flex-direction:column;align-items:center;gap:7px;background:var(--panel,#fff);border:none;border-radius:14px;padding:15px 9px;text-decoration:none;color:var(--texto,#1f2429);cursor:pointer;font-weight:700;font-size:14.5px;text-align:center;box-shadow:0 1px 2px rgba(31,36,41,.05),0 3px 12px rgba(31,36,41,.06)}.acc-btn:active{transform:scale(.97)}.acc-btn span{font-size:30px}';
  document.head.appendChild(css);

  function botones(){
    var esPortada = !!document.getElementById("lista");
    var esLeccion = !!document.getElementById("app");
    if(!esPortada && !esLeccion) return;

    /* Solo en las pantallas de Apocalipsis: botón para ir a Fe de Jesús */
    var esApo = /apocalipsis|apo-leccion/.test(location.pathname);
    if(!esApo) return;

    var wrap = document.createElement("div");
    wrap.className = "acc-wrap";
    wrap.innerHTML = '<h2>' + (esPortada ? "Herramientas" : "¿Querés saber más?") + '</h2>' +
      '<div class="acc-grid">' +
      '<a class="acc-btn" href="index.html"><span>📖</span>Fe de Jesús</a>' +
      '</div>';

    if(esPortada){ document.querySelector(".sec").appendChild(wrap); }
    else { document.getElementById("app").appendChild(wrap); }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", botones);
  } else { botones(); }
})();

console.log("Fe de Jesús v18: acerca.js cargado ✓");
