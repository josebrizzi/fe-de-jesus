/* ============================================================
   devocionales.js — Devocionales "Un día a la vez"
   Registro de los libros de devocionales de la app.

   ▶ PARA AGREGAR UN DEVOCIONAL NUEVO:
     1. Crear el archivo "dev-d13.js" con las lecturas (mismo formato).
     2. Agregar una línea acá abajo con su título, descripción, color y emoji.
     3. (Si el service worker cambió, subir también sw.js con la caché bump-ada.)
   ============================================================ */
window.DEVOCIONALES = [
  { id:"d01", k:"DEVOCIONAL 1",  t:"Devocional 1", d:"El título real sale del PDF — está esperando carga",  e:"📖", g:"linear-gradient(135deg,#2d7fc1,#1b5e93)" },
  { id:"d02", k:"DEVOCIONAL 2",  t:"Devocional 2", d:"El título real sale del PDF — está esperando carga",  e:"🌅", g:"linear-gradient(135deg,#c1802d,#8a5416)" },
  { id:"d03", k:"DEVOCIONAL 3",  t:"Devocional 3", d:"El título real sale del PDF — está esperando carga",  e:"🕊️", g:"linear-gradient(135deg,#5b8bd0,#315a9e)" },
  { id:"d04", k:"DEVOCIONAL 4",  t:"Devocional 4", d:"El título real sale del PDF — está esperando carga",  e:"🌿", g:"linear-gradient(135deg,#3f9d6b,#236a45)" },
  { id:"d05", k:"DEVOCIONAL 5",  t:"Devocional 5", d:"El título real sale del PDF — está esperando carga",  e:"🙏", g:"linear-gradient(135deg,#8a6bc1,#5b3f8f)" },
  { id:"d06", k:"DEVOCIONAL 6",  t:"Devocional 6", d:"El título real sale del PDF — está esperando carga",  e:"🔥", g:"linear-gradient(135deg,#c15b4d,#8f3226)" },
  { id:"d07", k:"DEVOCIONAL 7",  t:"Devocional 7", d:"El título real sale del PDF — está esperando carga",  e:"💧", g:"linear-gradient(135deg,#4aa3b8,#2a6e80)" },
  { id:"d08", k:"DEVOCIONAL 8",  t:"Devocional 8", d:"El título real sale del PDF — está esperando carga",  e:"⭐", g:"linear-gradient(135deg,#b8862d,#7d5a14)" },
  { id:"d09", k:"DEVOCIONAL 9",  t:"Devocional 9", d:"El título real sale del PDF — está esperando carga",  e:"✝️", g:"linear-gradient(135deg,#6a1b9a,#4a0f6b)" },
  { id:"d10", k:"DEVOCIONAL 10", t:"Devocional 10", d:"El título real sale del PDF — está esperando carga", e:"💛", g:"linear-gradient(135deg,#c19a2d,#8f6f14)" },
  { id:"d11", k:"DEVOCIONAL 11", t:"Devocional 11", d:"El título real sale del PDF — está esperando carga", e:"⛊", g:"linear-gradient(135deg,#4d7fc1,#2b5391)" },
  { id:"d12", k:"DEVOCIONAL 12", t:"Devocional 12", d:"El título real sale del PDF — está esperando carga", e:"🌄", g:"linear-gradient(135deg,#7fa653,#4f7231)" }
];
window.devVersion = "1";
console.log("Devocionales v" + window.devVersion + ": devocionales.js cargado ✓ (" + window.DEVOCIONALES.length + " libros)");
