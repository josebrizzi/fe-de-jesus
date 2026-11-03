/* ============================================================
   devocionales.js — Devocionales "Un día a la vez"
   Registro de los 15 libros de devocionales de la app
   (matutinas de Elena G. de White, en orden por año).

   ▶ PARA AGREGAR UN DEVOCIONAL NUEVO:
     1. Crear el archivo "dev-d16.js" con las lecturas (mismo formato).
     2. Agregar una línea acá abajo con su título, descripción, color y emoji.
     3. (Si el service worker cambió, subir también sw.js con la caché bump-ada.)
   ============================================================ */
window.DEVOCIONALES = [
  { id:"d01", k:"1959", t:"La fe por la cual vivo", d:"Elena G. de White · 366 lecturas", e:"📖", g:"linear-gradient(135deg,#2d7fc1,#1b5e93)" },
  { id:"d02", k:"1965", t:"A fin de conocerle", d:"Elena G. de White · 366 lecturas", e:"🌅", g:"linear-gradient(135deg,#c1802d,#8a5416)" },
  { id:"d03", k:"1968", t:"En los lugares celestiales", d:"Elena G. de White · 366 lecturas", e:"🕊️", g:"linear-gradient(135deg,#5b8bd0,#315a9e)" },
  { id:"d04", k:"1971", t:"Conflicto y valor", d:"Elena G. de White · 366 lecturas", e:"🌿", g:"linear-gradient(135deg,#3f9d6b,#236a45)" },
  { id:"d05", k:"1974", t:"La maravillosa gracia de Dios", d:"Elena G. de White · 366 lecturas", e:"🙏", g:"linear-gradient(135deg,#8a6bc1,#5b3f8f)" },
  { id:"d06", k:"1976", t:"Maranata: el Señor viene", d:"Elena G. de White · 366 lecturas", e:"🔥", g:"linear-gradient(135deg,#c15b4d,#8f3226)" },
  { id:"d07", k:"1978", t:"Hijos e hijas de Dios", d:"Elena G. de White · 366 lecturas", e:"💧", g:"linear-gradient(135deg,#4aa3b8,#2a6e80)" },
  { id:"d08", k:"1979", t:"Cada día con Dios", d:"Elena G. de White · 366 lecturas", e:"⭐", g:"linear-gradient(135deg,#b8862d,#7d5a14)" },
  { id:"d09", k:"1982", t:"Alza tus ojos", d:"Elena G. de White · 366 lecturas", e:"✝️", g:"linear-gradient(135deg,#6a1b9a,#4a0f6b)" },
  { id:"d10", k:"1985", t:"Reflejemos a Jesús", d:"Elena G. de White · 366 lecturas", e:"💛", g:"linear-gradient(135deg,#c19a2d,#8f6f14)" },
  { id:"d11", k:"1988", t:"Exaltad a Jesús", d:"Elena G. de White · 366 lecturas", e:"⛊", g:"linear-gradient(135deg,#4d7fc1,#2b5391)" },
  { id:"d12", k:"1991", t:"Dios nos cuida", d:"Elena G. de White · 366 lecturas", e:"🌄", g:"linear-gradient(135deg,#7fa653,#4f7231)" },
  { id:"d13", k:"1995", t:"Recibiréis poder", d:"Elena G. de White · 366 lecturas", e:"🕯️", g:"linear-gradient(135deg,#2f9e8f,#1a6b60)" },
  { id:"d14", k:"1999", t:"El Cristo triunfante", d:"Elena G. de White · 366 lecturas", e:"👑", g:"linear-gradient(135deg,#8a5bc1,#5b3a8f)" },
  { id:"d15", k:"2004", t:"Ser semejante a Jesús", d:"Elena G. de White · 366 lecturas", e:"🌟", g:"linear-gradient(135deg,#c15b84,#8f3a5b)" }
];
window.devVersion = "2";
console.log("Devocionales v" + window.devVersion + ": devocionales.js cargado ✓ (" + window.DEVOCIONALES.length + " libros)");
