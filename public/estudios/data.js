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
header .t{font-size:17px}
.logo{font-size:22px}
.logo small{font-size:14px}
.pill{font-size:15px}
.st small{font-size:12px}
.hero .dia{font-size:14px}
.hero h1{font-size:27px}
.hero p{font-size:16px}
.btn{font-size:17px}
.sec h2{font-size:14px}
.d{font-size:13px}
.card h3{font-size:17px}
.stx{font-size:14px}
.card h2{font-size:19px}
.intro{font-size:17px;line-height:1.65}
.pq{font-size:17px}
.chip{font-size:15px;padding:6px 14px}
.resp{font-size:15px}
.des{font-size:17px;line-height:1.7}
.egw{font-size:16px;line-height:1.65}
.egw b{font-size:13px}
ul.lis li{font-size:17px;line-height:1.6}
ul.lis li span{font-size:14px !important}
.colwrap h4{font-size:15px}
.dec p{font-size:17px}
.dbtns button{font-size:18px}
.navg button{font-size:16px}
.cplt{font-size:18px}
#sheet h3{font-size:21px}
#sheet .vv{font-size:14px}
#sheet .bd{font-size:20px;line-height:1.75}
#sheet sup{font-size:14px}
.toast{font-size:16px}
footer{font-size:14px}
`;
  document.head.appendChild(s);
})();
