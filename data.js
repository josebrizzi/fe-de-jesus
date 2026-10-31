/* Metadatos del curso - Fe de Jesús */
const CURSO = {
  titulo: "Fe de Jesús",
  descripcion: "Curso de estudio bíblico en 20 lecciones: de la Biblia al bautismo, un estudio por día.",
  versionPreferida: "RVR1960"
};

// Las lecciones se cargan desde data-a.js, data-b.js, data-c.js y data-d.js
const LECCIONES = [];

// ============ VERSIÓN DE LA APP ============
/* Se muestra en el pie de pantalla ("Fe de Jesús · v9") para poder verificar
   en el celular que la última versión subida a GitHub llegó al teléfono. */
window.fejVersion = "14";

// ============ ENLACE PERSONALIZADO DE INSTRUCTOR ============
/* Un instructor comparte: ...estudios/?i=SU_TELEFONO&n=SU_NOMBRE&a=NOMBRE_ALUMNO
   Al abrir ese enlace, la app queda "conectada": al completar cada estudio,
   se genera un PDF con las respuestas y la decisión del alumno, y se comparte
   por WhatsApp al teléfono del instructor que lo envió. El estudio es LIBRE:
   sin candados, sin modos, sin límites de avance. Sin enlace, todo va al
   número principal (José). */
(function(){
  try{
    var p = new URLSearchParams(location.search);
    var tel = (p.get("i") || "").replace(/\D/g, "");
    var nom = (p.get("n") || "").trim();
    var alu = (p.get("a") || "").trim();
    if(tel && tel.length >= 8 && tel.length <= 15){
      localStorage.setItem("fej_cfg", JSON.stringify({
        tel: tel,
        nombre: nom,
        alumno: alu,
        desde: new Date().toLocaleString("es-AR")
      }));
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

// ============ PWA ============
(function(){
  document.head.insertAdjacentHTML("beforeend",
    '<link rel="manifest" href="manifest.json">' +
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

// ============ JERARQUÍA DE TAMAÑOS v14 (chrome compacto, lectura grande) ============
(function(){
  var s = document.createElement("style");
  s.textContent = `header .t{font-size:17px}
.logo{font-size:18px}
.logo small{font-size:11.5px;white-space:nowrap}
.pill{font-size:13px}
.st small{font-size:11px}
.hero .dia{font-size:11px}
.hero h1{font-size:24px}
.hero p{font-size:14px}
.btn{font-size:15px}
.sec h2{font-size:12px}
.d{font-size:10.5px}
.card h3{font-size:15px;line-height:1.35}
.stx{font-size:12.5px}
.he{font-size:18px}
.card h2{font-size:20px}
.intro{font-size:20px;line-height:1.7}
.pq{font-size:20px}
.pnum{width:26px;height:26px;font-size:13px}
.chip{font-size:16px;padding:6px 13px}
.resp{font-size:17px}
.des{font-size:20px;line-height:1.72}
ul.lis li{font-size:20px;line-height:1.6}
ul.lis li span{font-size:16px !important}
.colwrap h4{font-size:17px}
.dec h2{font-size:20px}
.dec p{font-size:19px}
.dbtns button{font-size:19px}
.navg button{font-size:17px}
.cplt{font-size:19px}
#sheet h3{font-size:26px}
#sheet .vv{font-size:16px}
#sheet .bd{font-size:25px;line-height:1.8}
#sheet sup{font-size:18px}
.toast{font-size:17px}
footer{font-size:13px}
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
