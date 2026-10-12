/* Metadatos del curso - Fe de Jesús */
const CURSO = {
  titulo: "Fe de Jesús",
  descripcion: "Curso de estudio bíblico en 20 lecciones: de la Biblia al bautismo, un estudio por día.",
  versionPreferida: "RVR1960"
};

// Las lecciones se cargan desde data-a.js, data-b.js, data-c.js y data-d.js
const LECCIONES = [];

// ============ PWA ============
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

// ============ TAMAÑO DE FUENTE AGRANDADO ============
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

// ============ ORACIÓN PERSONALIZADA EN CADA ESTUDIO ============
(function(){
  var sc = document.createElement("script");
  sc.src = "oraciones.js";
  document.head.appendChild(sc);

  var css = document.createElement("style");
  css.textContent = `
.oracion{background:linear-gradient(135deg,#ede7f6,#f3e5f5);border:1px solid #d9d0ec;border-left:4px solid #7e57c2}
.oracion h2{color:#5e35b1}
.oracion .des{font-style:italic;color:#4527a0}
`;
  document.head.appendChild(css);

  var listo = false;

  function intentar(){
    if(listo) return true;
    var app = document.getElementById("app");
    if(!app || !app.children.length) return false;
    if(!window.ORACIONES) return false;

    var params = new URLSearchParams(location.search);
    var d = +params.get("dia") || 1;
    var texto = window.ORACIONES[d];
    if(!texto) return true;

    var card = document.createElement("section");
    card.className = "card oracion";
    card.innerHTML = '<h2>🙏 Oración para comenzar el estudio</h2><div class="des">' + texto + '</div>';

    var hero = app.querySelector(".hero");
    if(hero && hero.nextSibling) app.insertBefore(card, hero.nextSibling);
    else app.insertBefore(card, app.firstChild);

    listo = true;
    return true;
  }

  var timer = setInterval(function(){
    if(intentar()) clearInterval(timer);
  }, 250);
})();

// ============ CARGADOR DE MÓDULOS ============
function cargarModulo(src){
  var s = document.createElement("script");
  s.src = src;
  s.async = false;
  document.head.appendChild(s);
}
cargarModulo("registro.js");
cargarModulo("acerca.js");

console.log("Fe de Jesús: data.js cargado ✓");
