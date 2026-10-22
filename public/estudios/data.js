/* Metadatos del curso - Fe de Jesús */
const CURSO = {
  titulo: "Fe de Jesús",
  descripcion: "Curso de estudio bíblico en 20 lecciones: de la Biblia al bautismo, un estudio por día.",
  versionPreferida: "RVR1960"
};

// Las lecciones se cargan desde data-a.js, data-b.js, data-c.js y data-d.js
const LECCIONES = [];

// ============ VERSIÓN DE LA APP ============
/* Se muestra en el pie de pantalla ("Fe de Jesús · v5") para poder verificar
   en el celular que la última versión subida a GitHub llegó al teléfono. */
window.fejVersion = "5";

// ============ ENLACE PERSONALIZADO DE INSTRUCTOR ============
/* Un instructor comparte: ...estudios/?i=SU_TELEFONO&n=SU_NOMBRE&a=NOMBRE_ALUMNO
   Al abrir ese enlace, la app queda "conectada": las respuestas y decisiones
   del alumno llegan por WhatsApp al teléfono del instructor que lo envió.
   Con &m=rev el instructor activa el MODO REVISIÓN: el alumno responde sin ver
   las respuestas (con opción "No lo sé") y el instructor le devuelve el estudio
   corregido enviándole leccion.html?dia=N&c=1 → recién entonces se revelan los
   aciertos y las enseñanzas de ese día (ida y vuelta).
   LÍMITE DE AVANCE: todo alumno conectado por enlace adelanta como MÁXIMO
   2 estudios sin revisión. El enlace de corrección (con &t=1 también marca los
   días anteriores) desbloquea los próximos estudios. Sin enlace no hay límite. */
(function(){
  function maxHecho(){
    var m = 0;
    try{
      var o = JSON.parse(localStorage.getItem("fej_done") || "{}");
      for(var k in o){ var n = parseInt(k, 10); if(n > m) m = n; }
    }catch(err){}
    return m;
  }
  try{
    var p = new URLSearchParams(location.search);
    /* Corrección devuelta: ?dia=N&c=1 marca ese día como corregido (devuelto por
       el instructor). Con &t=1 también quedan marcados TODOS los días anteriores,
       útil cuando el instructor devuelve de una vez varios días pendientes. */
    var cor = p.get("c");
    var diaC = p.get("dia");
    if(cor === "1" && diaC && /^\d+$/.test(diaC) && +diaC >= 1 && +diaC <= 20){
      if(p.get("t") === "1"){
        for(var d = 1; d <= +diaC; d++) localStorage.setItem("fej_corr_" + d, "1");
      } else {
        localStorage.setItem("fej_corr_" + diaC, "1");
      }
    }
    /* Enlace de instructor: ?i=tel&n=nombre&a=alumno[&m=rev] */
    var tel = (p.get("i") || "").replace(/\D/g, "");
    var nom = (p.get("n") || "").trim();
    var alu = (p.get("a") || "").trim();
    var mod = (p.get("m") || "").trim();
    if(tel && tel.length >= 8 && tel.length <= 15){
      var prev = null;
      try{ prev = JSON.parse(localStorage.getItem("fej_cfg") || "null"); }catch(err){}
      var cfg = {
        tel: tel,
        nombre: nom,
        alumno: alu,
        modo: (mod === "rev") ? "rev" : "auto",
        desde: new Date().toLocaleString("es-AR")
      };
      /* Si el enlace no trae modo, conservo el modo previo si ya existía uno guardado */
      if(mod !== "rev" && prev && prev.modo === "rev") cfg.modo = "rev";
      /* ANCLA DE AVANCE (base): hasta qué día puede abrir esta conexión antes de
         esperar la revisión del instructor. Se toma UNA sola vez por instructor:
         reabrir el mismo enlace NO agranda el límite. Si el alumno cambia de
         instructor (o es una conexión nueva), el ancla respeta su progreso previo. */
      if(!prev || prev.tel !== tel || !prev.base){
        cfg.base = Math.min(20, Math.max((prev && prev.base) || 0, maxHecho() + 1));
      } else {
        cfg.base = prev.base;
      }
      localStorage.setItem("fej_cfg", JSON.stringify(cfg));
    }
    /* Migración: conexiones guardadas antes de la v5 reciben su ancla acá,
       para que los alumnos con progreso previo no queden bloqueados. */
    var c0 = null;
    try{ c0 = JSON.parse(localStorage.getItem("fej_cfg") || "null"); }catch(err){}
    if(c0 && !c0.base){
      c0.base = Math.min(20, maxHecho() + 1);
      localStorage.setItem("fej_cfg", JSON.stringify(c0));
    }
  }catch(e){}
})();
window.fejCfg = function(){
  try{ return JSON.parse(localStorage.getItem("fej_cfg") || "null"); }catch(e){ return null; }
};
window.fejTelDestino = function(){
  var c = window.fejCfg();
  if(c && c.tel && String(c.tel).replace(/\D/g,"").length >= 8) return String(c.tel).replace(/\D/g,"");
  return "5491128945261"; /* número principal (José) */
};
window.fejModoRev = function(){
  var c = window.fejCfg();
  return !!(c && c.modo === "rev");
};
window.fejCorregido = function(dia){
  try{ return localStorage.getItem("fej_corr_" + dia) === "1"; }catch(e){ return false; }
};
window.fejMaxCorregido = function(){
  try{
    var m = 0;
    for(var d = 1; d <= 20; d++){ if(localStorage.getItem("fej_corr_" + d) === "1") m = d; }
    return m;
  }catch(e){ return 0; }
};
/* Hasta qué día puede abrir un alumno conectado por enlace: máximo 2 estudios
   sin revisión del instructor. Sin conexión de instructor no hay límite. */
window.fejLimite = function(){
  var c = window.fejCfg();
  if(!c) return 20;
  return Math.min(20, Math.max(2, c.base || 0, window.fejMaxCorregido() + 2));
};

// ============ PWA ============
(function(){
  document.head.insertAdjacentHTML("beforeend",
    '<link rel="manifest" href="manifest.json">' +
    '<meta name="theme-color" content="#1877f2">' +
    '<link rel="icon" type="image/svg+xml" href="icon.svg">'
  );
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").then(function(reg){
        /* Busca una versión nueva del service worker en cada arranque,
           no solo una vez cada 24 horas. */
        try{ reg.update(); }catch(e){}
      }).catch(function(){});
    });
    /* Si un service worker nuevo toma el control (hubo actualización),
       recargo una sola vez por sesión para que el teléfono use siempre
       los archivos más recientes. */
    navigator.serviceWorker.addEventListener("controllerchange", function(){
      var ya = false;
      try{ ya = sessionStorage.getItem("fej_sw_re") === "1"; }catch(e){}
      if(ya) return;
      try{ sessionStorage.setItem("fej_sw_re", "1"); }catch(e){}
      location.reload();
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

// ============ CARGADOR DE MÓDULOS ============
function cargarModulo(src){
  var s = document.createElement("script");
  s.src = src;
  s.async = false;
  document.head.appendChild(s);
}
cargarModulo("registro.js");
cargarModulo("acerca.js");

console.log("Fe de Jesús v" + window.fejVersion + ": data.js cargado ✓");
