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

/* ============ ACERCA DE + ENCONTRÁ UNA IGLESIA ============ */
(function(){
  /* ⚠️⚠️⚠️ REEMPLAZÁ ESTE NÚMERO POR EL TUYO ⚠️⚠️⚠️
     Formato internacional, SIN +, sin espacios, sin guiones.
     Ejemplo Argentina: 549 + código de área + número → 5491155555555 */
  var TELEFONO = "5491128945261";

  var WHATSAPP = "https://wa.me/" + TELEFONO + "?text=" +
    encodeURIComponent("Hola José 📖 Vengo de la app Fe de Jesús y quiero consultarte algo.");

  var css = document.createElement("style");
  css.textContent = `
.acc-wrap{padding:4px 16px 8px}
.acc-wrap h2{font-size:16px;color:#8e8e8e;margin:26px 4px 10px;text-transform:uppercase;letter-spacing:.8px;font-weight:700}
.acc-grid{display:flex;gap:10px}
.acc-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;background:#fff;border:1px solid #efefef;border-radius:16px;padding:18px 10px;text-decoration:none;color:#262626;cursor:pointer;font-weight:800;font-size:15px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.04)}
.acc-btn:active{transform:scale(.97)}
.acc-btn span{font-size:32px}
#qaOverlay{position:fixed;inset:0;background:rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:.25s;z-index:70}
#qaOverlay.on{opacity:1;pointer-events:auto}
#qaModal{position:fixed;left:50%;top:50%;transform:translate(-50%,-46%) scale(.96);opacity:0;pointer-events:none;transition:.25s;z-index:71;width:min(92vw,420px);max-height:84vh;overflow-y:auto;background:#fff;border-radius:20px;padding:26px 22px;box-shadow:0 12px 40px rgba(0,0,0,.25)}
#qaModal.on{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto}
#qaModal .x{position:absolute;top:8px;right:12px;background:none;border:none;font-size:28px;color:#8e8e8e;cursor:pointer}
.qa-av{width:76px;height:76px;border-radius:50%;margin:0 auto;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);display:flex;align-items:center;justify-content:center;padding:3px}
.qa-av span{background:#fff;width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px}
#qaModal h2{text-align:center;font-size:22px;margin:12px 0 2px;line-height:1.25}
#qaModal .rol{text-align:center;color:#8e8e8e;font-size:14px;font-weight:600}
#qaModal p{font-size:16px;line-height:1.65;color:#333;margin-top:14px}
.qa-cred{background:#f7f4ee;border-left:4px solid #b79a5f;border-radius:10px;padding:12px 14px;margin-top:14px;font-size:15px;line-height:1.6;color:#555}
.qa-cred b{color:#8a744a}
.qa-btns{display:flex;flex-direction:column;gap:10px;margin-top:18px}
.qa-btn{display:block;text-align:center;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:800;cursor:pointer;text-decoration:none}
.qa-btn.wa{background:#25d366;color:#fff}
.qa-btn.ig{background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff}
.qa-firma{text-align:center;margin-top:16px;font-size:13px;color:#c7c7c7}
`;
  document.head.appendChild(css);

  var overlay = null, modal = null;

  function crearModal(){
    if(document.getElementById("qaModal")) return;
    overlay = document.createElement("div");
    overlay.id = "qaOverlay";
    overlay.onclick = window.cerrarAcerca;
    modal = document.createElement("div");
    modal.id = "qaModal";
    modal.innerHTML = `
      <button class="x" onclick="cerrarAcerca()">×</button>
      <div class="qa-av"><span>👤</span></div>
      <h2>José Francisco Brizzi</h2>
      <div class="rol">Abogado — Universidad de Buenos Aires (UBA)</div>
      <p>«Hace años que camino con el Señor. Esta herramienta nació del deseo de que más personas conozcan a Jesús a través del estudio de Su Palabra.»</p>
      <div class="qa-cred">📖 <b>Sobre el contenido:</b> todo el contenido de los estudios pertenece a la <b>IGLESIA ADVENTISTA DEL SÉPTIMO DÍA</b>, y está basado en el curso de estudio bíblico «La Fe de Jesús». Las citas provienen de los libros de Elena G. de White.</div>
      <p>¿Terminaste los 20 estudios y querés dar el siguiente paso? Encontrá una iglesia cerca tuyo y coordiná tu bautismo. 🙏</p>
      <div class="qa-btns">
        <a class="qa-btn wa" href="${WHATSAPP}" target="_blank" rel="noopener">💬 Escribirme por WhatsApp</a>
        <button class="qa-btn ig" onclick="encontrarIglesia()">📍 Encontrá una iglesia cerca tuyo</button>
      </div>
      <div class="qa-firma">"JESÚS VIENE PRONTO"</div>
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }

  window.abrirAcerca = function(){
    crearModal();
    requestAnimationFrame(function(){
      overlay.classList.add("on");
      modal.classList.add("on");
    });
  };

  window.cerrarAcerca = function(){
    if(overlay){
      overlay.classList.remove("on");
      modal.classList.remove("on");
    }
  };

  window.encontrarIglesia = function(){
    var abrirConUbicacion = function(lat, lng){
      window.open(
        "https://www.google.com/maps/search/Iglesia%20Adventista%20del%20S%C3%A9ptimo%20D%C3%ADa/@" +
        lat + "," + lng + ",14z",
        "_blank"
      );
    };
    var abrirSinUbicacion = function(){
      window.open(
        "https://www.google.com/maps/search/Iglesia%20Adventista%20del%20S%C3%A9ptimo%20D%C3%ADa%20cerca%20de%20m%C3%AD",
        "_blank"
      );
    };
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        function(p){ abrirConUbicacion(p.coords.latitude, p.coords.longitude); },
        abrirSinUbicacion,
        { timeout: 8000, maximumAge: 60000 }
      );
    } else {
      abrirSinUbicacion();
    }
  };

  function botones(){
    var esPortada = !!document.getElementById("lista");
    var esLeccion = !!document.getElementById("app");
    if(!esPortada && !esLeccion) return;

    var wrap = document.createElement("div");
    wrap.className = "acc-wrap";
    wrap.innerHTML = `
      <h2>${esPortada ? "Acerca de" : "¿Querés saber más?"}</h2>
      <div class="acc-grid">
        <div class="acc-btn" onclick="abrirAcerca()"><span>👤</span>Quiénes somos</div>
        <div class="acc-btn" onclick="encontrarIglesia()"><span>📍</span>Encontrá una iglesia</div>
      </div>`;

    if(esPortada){
      document.querySelector(".sec").appendChild(wrap);
    } else {
      document.getElementById("app").appendChild(wrap);
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", botones);
  } else {
    botones();
  }
})();
