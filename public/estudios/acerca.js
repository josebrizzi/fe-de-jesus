// HERRAMIENTAS DE APOYO - Fe de Jesús (certificado, respaldo, WhatsApp, iglesia)
(function(){
  var TELEFONO = "5491128945261";

  var WHATSAPP = "https://wa.me/" + TELEFONO + "?text=" + encodeURIComponent("Hola 📖 Vengo de la app Fe de Jesús y quiero consultarte algo.");

  var css = document.createElement("style");
  css.textContent = '.acc-wrap{padding:4px 16px 8px}.acc-wrap h2{font-size:16px;color:#8e8e8e;margin:26px 4px 10px;text-transform:uppercase;letter-spacing:.8px;font-weight:700}.acc-grid{display:flex;gap:10px;flex-wrap:wrap}.acc-btn{flex:1;min-width:110px;display:flex;flex-direction:column;align-items:center;gap:8px;background:#fff;border:1px solid #efefef;border-radius:16px;padding:18px 10px;text-decoration:none;color:#262626;cursor:pointer;font-weight:800;font-size:15px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.04)}.acc-btn:active{transform:scale(.97)}.acc-btn span{font-size:32px}.acc-btn.gr{background:#00a86b;color:#fff}.acc-btn.bl{background:#0095f6;color:#fff}';
  document.head.appendChild(css);

  window.hacerRespaldo = function(btn){
    if(typeof window.fejRespaldo === "function") window.fejRespaldo();
    btn.innerHTML = '<span>✅</span>¡Progreso guardado!';
    btn.style.background = "#00a86b";
    btn.style.color = "#fff";
    setTimeout(function(){
      btn.innerHTML = '<span>💾</span>Respaldar mi progreso';
      btn.style.background = "#fff";
      btn.style.color = "#262626";
    }, 3000);
  };

  window.encontrarIglesia = function(){
    var abrirConUbicacion = function(lat, lng){
      window.open("https://www.google.com/maps/search/Iglesia%20Adventista%20del%20S%C3%A9ptimo%20D%C3%ADa/@" + lat + "," + lng + ",14z", "_blank");
    };
    var abrirSinUbicacion = function(){
      window.open("https://www.google.com/maps/search/Iglesia%20Adventista%20del%20S%C3%A9ptimo%20D%C3%ADa%20cerca%20de%20m%C3%AD", "_blank");
    };
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(abrirConUbicacion, abrirSinUbicacion, { timeout: 8000, maximumAge: 60000 });
    } else { abrirSinUbicacion(); }
  };

  function botones(){
    var esPortada = !!document.getElementById("lista");
    var esLeccion = !!document.getElementById("app");
    if(!esPortada && !esLeccion) return;

    var wrap = document.createElement("div");
    wrap.className = "acc-wrap";
    wrap.innerHTML = '<h2>' + (esPortada ? "Herramientas" : "¿Querés saber más?") + '</h2>' +
      '<div class="acc-grid">' +
      '<a class="acc-btn gr" href="certificado.html"><span>🎓</span>Mi certificado</a>' +
      '<button class="acc-btn" id="accRespaldo" onclick="hacerRespaldo(this)"><span>💾</span>Respaldar mi progreso</button>' +
      '<a class="acc-btn bl" href="' + WHATSAPP + '" target="_blank" rel="noopener"><span>💬</span>Escribir por WhatsApp</a>' +
      '<button class="acc-btn" onclick="encontrarIglesia()"><span>📍</span>Encontrá una iglesia</button>' +
      '</div>';

    if(esPortada){ document.querySelector(".sec").appendChild(wrap); }
    else { document.getElementById("app").appendChild(wrap); }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", botones);
  } else { botones(); }
})();

console.log("Fe de Jesús: acerca.js cargado ✓");
