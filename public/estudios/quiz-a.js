/* Opciones multiple choice — Días 1 a 10 — Fe de Jesús
   Regla: la PRIMERA opción de cada lista es la CORRECTA.
   leccion.html las mezcla al azar al mostrarlas.
   Las preguntas que NO aparecen acá (1:9, 2:6) se responden escribiendo. */
window.QUIZ = Object.assign(window.QUIZ || {}, {

"1:1":["Dios","Los apóstoles","Los escribas de Israel","Los padres de la iglesia"],
"1:2":["Profetas","Reyes","Sacerdotes","Escribas"],
"1:3":["Palabra de Dios","Tradición humana","Consejos de hombres sabios","Leyes antiguas"],
"1:4":["A una lámpara que guía nuestros pasos","A un espejo que refleja la moda","A una balanza que pesa acciones","A un reloj que marca el tiempo"],
"1:5":["Para que creyendo tengáis vida en su nombre","Para conocer la historia de Israel","Para aprender reglas de convivencia","Para estudiar culturas antiguas"],
"1:6":["Muy importante","Poco importante","Solo para pastores y maestros","Ya no es importante hoy"],
"1:7":["Enseñar, redargüir, corregir e instruir en justicia","Entretener, sorprender y divertir","Dar fama, riqueza y poder","Relatar leyendas y mitos"],
"1:8":["Paciencia, consolación y esperanza","Riquezas y salud material","Fama y reconocimiento público","Poder sobre las naciones"],

"2:1":["Uno","Dos","Tres dioses distintos","Muchos, según cada pueblo"],
"2:2":["Dios es espíritu (sin materia)","Dios tiene cuerpo físico como nosotros","Dios es solo una energía","Dios es una fuerza de la naturaleza"],
"2:3":["El Padre, el Hijo y el Espíritu Santo","El Padre, María y los ángeles","El Hijo, Pedro y Pablo","Dios, Moisés y Elías"],
"2:4":["Amor","Severidad sin misericordia","Indiferencia","Orgullo"],
"2:5":["Como hijos de Dios","Como extraños y extranjeros","Como esclavos sin valor","Como simples animales"],
"2:7":["Mediante el don de su Hijo: la cruz de Cristo","Con la mente y la lógica solamente","Con estudios y exámenes teológicos","Por méritos y buenas obras"],

"3:1":["Orando","Con meditaciones vacías","Consultando a los videntes","Con ofrendas y sacrificios"],
"3:2":["Hablar con Dios","Un ritual de palabras repetidas","Una canción religiosa","Un simple deseo del corazón"],
"3:3":["Mucho","Ninguno","Muy poco","Solo la de los pastores"],
"3:4":["Jesús","María","Los ángeles","Los santos"],
"3:5":["Siempre","Solo a los pastores","Solo a los perfectos","A veces, según la fama de uno"],
"3:7":["La certeza de lo que se espera, la convicción de lo que no se ve","Una corazonada sin fundamento","La seguridad de lo que ya se ve","Una opinión personal sobre Dios"],
"3:8":["Oyendo la Palabra de Dios","Practicando deportes","Leyendo filosofía","Tomando vacaciones y descanso"],

"4:1":["En el cielo","En el Edén","En Egipto","En Babel"],
"4:2":["En un ángel importante (Lucifer)","En Adán","En Caín","En Eva"],
"4:3":["No comer de un fruto","No viajar a otra tierra","No hablar con la serpiente","No construir ciudades"],
"4:4":["Desobedecer a Dios","Robar en el Edén","Mentir a un ángel","Pelear con Abel"],
"4:5":["La transgresión de la ley","Un error sin importancia","Solo lo que condena el Estado","Una mala costumbre heredada"],
"4:6":["Al diablo","Al mundo","A sí mismo","A los ídolos"],
"4:7":["El pecado separa de Dios","El pecado acerca a Dios","No cambia nada","Solo produce timidez"],
"4:8":["La muerte eterna","La reencarnación","Una vida mejor en la tierra","El castigo temporal"],

"5:1":["La muerte","La enfermedad","La pobreza","El miedo"],
"5:2":["No","Sí, con esfuerzo y disciplina","Sí, con dinero y ofrendas","Sí, con sacrificios de animales"],
"5:3":["Dio a su Hijo","Dio una segunda ley","Envió a los ángeles","Ocultó el problema"],
"5:4":["Buscar y salvar al perdido","Juzgar a los pecadores","Fundar un imperio","Enseñar filosofía"],
"5:5":["No","Sí, uno solo","Sí, en su juventud","La Biblia no lo aclara"],
"5:6":["Con su muerte vicaria (murió en lugar del pecador)","Con sus buenas enseñanzas","Con sus milagros","Con su ejemplo de trabajo"],
"5:7":["La resurrección de Cristo","El nacimiento de Cristo","El bautismo de Cristo","La transfiguración"],
"5:8":["Somos nuevas criaturas","Somos perfectos sin tentaciones","Ya no necesitamos la Biblia","Tenemos una vida fácil sin pruebas"],

"6:1":["A Cristo y su sacrificio","A nuestras buenas obras","A nuestra membresía en la iglesia","A nuestros ancestros fieles"],
"6:2":["Es gratis","Cuesta grandes sacrificios","Cuesta dinero","Cuesta peregrinaciones"],
"6:3":["Que es pecador","Que es bueno por naturaleza","Que no necesita ayuda","Que hay otros peores que él"],
"6:4":["Arrepentimiento","Tristeza pasajera","Vergüenza social","Entusiasmo emocional"],
"6:5":["Confesarlos a Dios","Esconderlos con cuidado","Justificarlos con excusas","Contarlos solo a amigos de confianza"],
"6:6":["Si vuestros pecados fueren como la grana, como la nieve serán emblanquecidos","Si pagáis vuestras deudas, seréis perdonados","Si hacéis penitencia, seréis limpios","Si prometéis no pecar más, seréis aceptados"],
"6:7":["Dios no recuerda más nuestros pecados","Dios los recuerda a veces","Dios los guarda para el juicio final","Dios los anota en un expediente eterno"],

"7:1":["Vendré otra vez","Enviaré a otro profeta","Os dejaré un libro sagrado","Volveré cuando me llaméis"],
"7:2":["Bendita (la esperanza bienaventurada)","Una fantasía piadosa","Un tema de terror","Una leyenda antigua"],
"7:3":["En nube, poder y gloria","En forma invisible al mundo","Naciendo otra vez en Belén","Por medios de comunicación"],
"7:4":["Todos","Solo los justos","Solo los pastores","Nadie"],
"7:5":["Recompensar a cada uno conforme a sus obras","Establecer un reino terrenal político","Destruir el planeta","Vivir en secreto entre los hombres"],
"7:6":["Resucitarán primero","Permanecerán en la tumba para siempre","Subirán al cielo antes que nadie","Reencarnarán en nuevas vidas"],
"7:7":["Serán arrebatados para recibir al Señor en el aire","Se esconderán en las montañas","Reinarán mil años en la tierra","Seguirán trabajando normalmente"],

"8:1":["¿Cuándo serán estas cosas, y qué señal habrá de tu venida, y del fin del siglo?","¿Cuándo construirás tu palacio?","¿Quién será el mayor en el reino?","¿Cómo alimentarás a las multitudes?"],
"8:2":["No, solo Dios","Sí, está marcada en el calendario","Sí, la calculan los astrónomos","Sí, la revelan los videntes"],
"8:3":["No","Sí","Solo los nuevos creyentes","Depende del país donde vivas"],
"8:4":["Guerras, rumores de guerras, hambres y terremotos","La paz mundial y la prosperidad","El fin de todas las enfermedades","La unión de todas las religiones"],
"8:5":["Acumulación de riquezas y opresión de los trabajadores","Justicia social plena","La desaparición del dinero","Igualdad perfecta entre todos"],
"8:6":["Tiempos peligrosos: amadores de sí mismos, avaros, vanagloriosos","Un renacimiento espiritual global","Indiferencia religiosa total","Respeto universal entre las personas"],
"8:7":["La ciencia y el conocimiento","La fe y la piedad","La humildad y el servicio","La justicia y la equidad"],
"8:8":["El sol se oscurecerá, la luna no dará su resplandor y las estrellas caerán","Un eclipse total permanente","Nuevos planetas aparecerán","El sol quemará la tierra"],

"9:1":["Dios, con polvo y sopló aliento","La naturaleza por evolución","Los ángeles con barro","El hombre se creó a sí mismo"],
"9:2":["A causa del pecado","Por el destino","Por la naturaleza humana","Por puro azar"],
"9:3":["El cuerpo vuelve al polvo y el espíritu a Dios","El alma viaja inmediatamente al cielo","El alma duerme en el purgatorio","La vida continúa en otro cuerpo"],
"9:4":["A un sueño","A un viaje largo","A una sombra","A una noche eterna"],
"9:5":["No","Sí, todo","Sí, pero muy poco","Solo los santos saben"],
"9:6":["El alma que pecare, esa morirá","El alma es inmortal por naturaleza","El alma reencarna en otros cuerpos","El alma flota sobre el cuerpo"],
"9:7":["No","Sí, a los santos difuntos","Sí, a los antepasados","Solo en casos muy difíciles"],

"10:1":["Todo, bueno y malo","Solo los delitos graves","Solo lo que se hace en público","Solo las palabras dichas"],
"10:2":["Todos","Solo los malvados","Solo los creyentes","Solo los que van a la iglesia"],
"10:3":["A Jesús","A Pedro","A los ángeles","A los ancianos"],
"10:4":["En los libros del cielo","En nuestras propias memorias","En archivos de la tierra","En ninguna parte"],
"10:5":["Los ángeles","Los apóstoles","Los profetas","Nuestros vecinos"],
"10:6":["Jesús","El Espíritu Santo","Moisés","Un ángel guardián"],
"10:7":["Por la ley de la libertad","Por la Constitución del país","Por la opinión pública","Por nuestra conciencia sola"],
"10:8":["Vida eterna para los justos; apartamiento para los que rechazaron","Todos entrarán al cielo","Todos pasarán por el purgatorio","Habrá una segunda oportunidad para todos"]

});
console.log("Fe de Jesús: quiz-a.js cargado ✓");
