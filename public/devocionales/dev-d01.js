/* ============================================================
   dev-d01.js — Devocional 1 (ejemplos de prueba)
   Lecturas del devocional, una por cada día del año.
   CLAVE de cada lectura: "MM-DD" (mes-día con dos dígitos), así el
   calendario cae siempre en la lectura correcta todos los años
   (incluido el 29 de febrero, la lectura 366).
   Campos: t = título · v = referencia · vt = texto del versículo
           x = texto de la lectura (párrafos separados por línea vacía)
           f = fuente
   ============================================================ */
window.DEVDATOS = window.DEVDATOS || {};
DEVDATOS["d01"] = {
  sinCargar: false,
  lecturas: {
    "01-01":   { t:"Un día a la vez", v:"Lamentaciones 3:22, 23", vt:"Las misericordias de Jehová son la causa de que no seamos consumidos, porque sus misericordias no tienen fin; nuevas son cada mañana.", x:"Este es un texto de EJEMPLO para probar la app: cuando lleguen los PDF de los devocionales, cada lectura será reemplazada por la verdadera.\n\nCada mañana Dios nos regala una página en blanco. Lo de ayer quedó cubierto por su misericordia, y lo de mañana está en sus manos. La invitación de la Escritura es simple: vivir el presente apoyados en él, un día a la vez.\n\nNo necesitamos fuerza para todo el año hoy; necesitamos la porción de hoy. Y esa porción ya nos fue prometida: nuevas misericordias, cada mañana, sin fin.", f:"Texto de ejemplo de la app (se reemplaza con el devocional real)" },
    "01-02":   { t:"Primero Dios", v:"Mateo 6:33", vt:"Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.", x:"Este es un texto de EJEMPLO para probar la app: será reemplazado por la lectura verdadera del PDF.\n\nJesús invierte nuestra lógica. Mientras nosotros corremos detrás de las cosas —el pan, la ropa, el mañana— él nos señala al Padre: buscá primero su reino. Las cosas, dice, serán añadidas.\n\nComenzar el día con Dios no es un truco para que todo salga bien; es poner la vida en su orden correcto. Cuando él ocupa el primer lugar, todo lo demás encuentra su lugar.", f:"Texto de ejemplo de la app (se reemplaza con el devocional real)" },
    "01-03":   { t:"Lámpara para el camino", v:"Salmos 119:105", vt:"Lámpara es a mis pies tu palabra, y lumbrera a mi camino.", x:"Este es un texto de EJEMPLO para probar la app: será reemplazado por la lectura verdadera del PDF.\n\nNadie camina de noche sin luz. La palabra de Dios no siempre muestra todo el camino de una vez, pero siempre alcanza para el próximo paso.\n\nLeerla cada día es encender la lámpara otra vez. Un paso, y luego otro, y al mirar atrás descubrimos que Dios nos hizo llegar más lejos de lo que imaginábamos.", f:"Texto de ejemplo de la app (se reemplaza con el devocional real)" }
  }
};
