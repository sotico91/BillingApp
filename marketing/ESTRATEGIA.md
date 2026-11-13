# Estrategia para llegar a más gente

Plan de crecimiento de Rumi tras salir de la prueba cerrada (escrito el 2026-11-13). Supone poco o ningún presupuesto y una sola persona detrás.

**Antes de publicar nada que diga "ya está en Google Play":** el acceso a producción se pidió el 2026-11-12 y Google responde en 7 días o menos por correo. Hasta que la ficha sea pública, el QR y el enlace `https://play.google.com/store/apps/details?id=com.sotico91.rumiapp` solo abren para los testers. Si la respuesta es "14 días más de prueba", seguimos con `rumi-pruebame-es`.

## A quién le hablamos

- **Quién:** gente de 22 a 35 años en Colombia, con sueldo o ingresos por quincena, que siente que "la plata se va" y lleva sus cuentas en Excel o en ningún lado (6 de los 9 testers usaban Excel o Sheets; 3 no anotaban nada).
- **Qué nos hace distintos**, en este orden:
  1. **Sin cuenta y sin conectar el banco.** Todo cifrado en el teléfono. Es la objeción número uno a las apps de finanzas.
  2. **Pregúntale a Rumi como le hablas a una amiga:** "¿me alcanza para unos tenis de 200 mil?"
  3. **Gastos hormiga 🐜:** es un término que ya usa todo el mundo en Colombia y engancha solo.
  4. **Anotar en segundos** (los testers le dieron 4,7/5).
- **Frase de cabecera:** "Cuentas claras, mente tranquila."

## Los videos

| Video | Estado | Uso |
|---|---|---|
| `rumi-lanzamiento-es` (nuevo, ~50 s) | Listo; publicarlo **el día que Play apruebe** | Anuncio del lanzamiento: gracias a los testers, qué hace, privacidad, gratis + Pro, cómo encontrarla. QR a la ficha. |
| `rumi-habla-play-es`, `rumi-recuerda-play-es` (nuevos) | Listos | Los mismos dos de la mascota, que terminaban en "Muy pronto en tu tienda", ahora cierran con "Ya en Google Play" y el QR. |
| `rumi-pruebame-es` | Se retira al salir a producción | Solo sirve si Google pide más días de prueba. |
| `anota`, `pregunta`, `hormiga`, `todo`, `billeteras`, `privacidad` (15 s, grabación real) | Siguen sirviendo | Reels y TikTok cortos. Les falta la tarjeta final con "Ya en Google Play"; se puede agregar en `Ad.tsx`. |

**Los próximos videos.** Lo que mejor funciona en TikTok, Reels y Shorts es corto (7 a 20 s), con un gancho en los dos primeros segundos y con algo de la vida real, no con una lista de funciones:

1. **"¿Cuánto te gastas en tintos al mes?"** (hecho: `rumi-tintos-es`) La mascota hace la cuenta de 4.500 × 22 días = 99.000 y remata con la pantalla de gastos hormiga.
2. **"La quincena llegó… y se fue."** (hecho: `rumi-quincena-es`) El saldo del 15 al 20 y la pregunta "¿Cómo voy a cerrar el mes?", con la respuesta real de la app. "¿Me alcanza hasta el 30?" sin monto todavía no lo entiende Pregúntale a Rumi.
3. **"Le pregunté a mi app si me alcanza para…"** (episodio 1 hecho: `rumi-alcanza-es`, unos tenis de 300 mil) Una serie con preguntas que manda la gente en los comentarios, respondidas con la app real. Es contenido gratis cada semana.
4. **"No le doy mi clave del banco a ninguna app."** (hecho: `rumi-banco-es`) Privacidad en 10 s: sin correo, sin banco, cifrado.
5. **"Reto enero: 31 días anotando todo."** (hecho: `rumi-reto-enero-es`) Para el 1 de enero, cuando todo el mundo hace propósitos con la plata.
6. **La prima de diciembre:** (hecho: `rumi-prima-es`) "¿En qué se te va la prima?", con topes para regalos y salidas y una meta de ahorro para enero. Sale en la primera quincena de diciembre.

Hay que alternar dos formatos: la **mascota** (reconocible, buena para el anuncio y la marca) y la **grabación de pantalla con voz en off de una persona** (da más confianza y tiene más alcance orgánico). Con tu cara o tu voz contando "hice esta app porque…" funciona mejor que cualquier animación.

**Orden de publicación** (todos cierran con "Ya en Google Play", así que empiezan el día de la aprobación):

| Cuándo | Video |
|---|---|
| El día de la aprobación | `rumi-lanzamiento-es` (dice Google Play y App Store; si solo una tienda está pública, espera la otra o avísame para ajustarlo) |
| El día que salga en la App Store | `rumi-iphone-es` (cómo instalar en iPhone) |
| 1 o 2 días después | `rumi-banco-es` (quita el miedo antes de que alguien lo pregunte) |
| Hacia el 20 de noviembre | `rumi-tintos-es` |
| 25 a 27 de noviembre (Black Friday) | `rumi-alcanza-es` |
| 28 a 30 de noviembre (quincena) | `rumi-quincena-es` |
| Primera semana de diciembre | `rumi-metas-es` (metas de ahorro, antes de la prima) |
| 1 a 12 de diciembre (prima) | `rumi-prima-es` |
| Para rellenar entre semana | `rumi-habla-play-es`, `rumi-recuerda-play-es` y los de 15 s con grabación real |
| 30 de diciembre a 1 de enero | `rumi-reto-enero-es` |

Los videos ya traen el título de cada escena, pero no la frase completa. Al subirlos, activa los subtítulos automáticos de TikTok o de Instagram y corrígelos.

## Redes: ¿cuenta de Rumi o la tuya?

**Las dos, cada una con su papel.**

- **Cuentas de Rumi** en TikTok e Instagram, con el mismo nombre en todas (por ejemplo `@rumi.app` o `@rumifinanzas`, el que esté libre en las dos). Ahí van los videos de la mascota, los consejos y la serie "¿me alcanza para…?". Créalas como cuenta de empresa o de creador: así ves las estadísticas, pones el enlace de la ficha en la bio y después puedes pagar pauta desde ahí. Crea un correo solo para Rumi (por ejemplo, un Gmail nuevo) y abre las redes con él. Así quedan separadas de lo personal y, si algún día alguien te ayuda con ellas, no le pasas tu correo. Ese mismo correo puede reemplazar al personal como contacto en la ficha de Play.
- **Tu cuenta personal** (TikTok o Instagram, y LinkedIn): la historia de quien la hizo. "Soy desarrollador, hice una app de finanzas que no pide tu banco": cómo nació, qué te pidieron los testers, cuántas descargas lleva. A esto se le llama construir en público, y es lo que más confianza y alcance da al principio, porque la gente sigue a personas, no a marcas. Siempre etiqueta a la cuenta de Rumi.
- **Facebook:** crea la página de Rumi desde Meta Business Suite y conéctala con el Instagram. No hace falta publicar ahí a mano: Business Suite programa el mismo post en los dos. Hace falta para la pauta de Meta y para entrar como página a los grupos de Facebook de finanzas, que es donde está el público de más de 30 años.
- **YouTube:** un canal de Rumi. Ahí suben los mismos videos como Shorts, y Play pide un enlace de YouTube para el video de la ficha.
- **WhatsApp:** un canal de WhatsApp de Rumi para novedades y para los testers. En Colombia es donde la gente sí lee.
- **Para después:** X, Threads (sale solo con Instagram) y Pinterest. No valen el esfuerzo ahora.

**Con cuidado:** separa una mañana para crear todo junto, con el mismo nombre, foto (el ícono) y bio en todas: "Tu plata clara, sin conectar tu banco 🐜 Gratis en Google Play". Y no publiques en las de Rumi hasta que Play apruebe; lo que sí puedes hacer antes es reservar los nombres y contar la historia desde tu cuenta personal.

Imágenes, nombres, bios, los pasos para abrir cada cuenta y el texto de cada video: `redes/README.md`.

**Ritmo realista para una sola persona:** 3 videos a la semana en la cuenta de Rumi (el mismo en TikTok, Reels y Shorts) y 1 post a la semana en tu cuenta personal. Responde todos los comentarios el primer día: la serie "¿me alcanza para…?" vive de ellos.

## Canales, de lo más barato a lo más caro

1. **TikTok, Instagram Reels y YouTube Shorts:** el mismo video en los tres. Tres por semana, con subtítulos siempre (casi todo el mundo los ve sin sonido) y sin dejar texto importante en los 250 px de abajo, porque ahí va la interfaz de cada red. El enlace va en la bio: el de la ficha de Play o el de `docs/index.html`.
2. **Las reseñas en Play.** Las primeras 10 a 20 reseñas pesan mucho en la ficha y en la búsqueda. El día del lanzamiento, a los testers y al grupo `rumiapptester`: "ya está pública, ¿me dejas tu reseña?". Más adelante, la app puede pedir la reseña en un buen momento (por ejemplo, al cerrar un mes con saldo a favor) con la API de reseñas en la app de Play.
3. **La ficha de Play (ASO):** que el título y la descripción corta lleven las palabras que la gente busca: *control de gastos, presupuesto, gastos hormiga, quincena, finanzas personales*. Las tres primeras capturas son las que se ven: la primera tiene que contar lo distinto (sin banco, pregúntale a Rumi). Publicar también el video de lanzamiento como video de la ficha (pide un enlace de YouTube).
4. **Comunidades donde ya se habla de plata:** Reddit (r/Colombia, r/medellin, r/bogota, de finanzas personales en español), grupos de Facebook de finanzas o de emprendedores, grupos de egresados y de universidades. Contar la historia en primera persona ("soy dev, hice una app de gastos que no pide el banco, ¿qué le falta?") y no pegar solo el enlace. Leer las reglas de cada grupo primero.
5. **Creadores pequeños de finanzas personales en Colombia** (de 5 mil a 50 mil seguidores): se les ofrece Rumi Pro de por vida (promocional en RevenueCat) a cambio de un video honesto. Contestan más que los grandes, y su gente confía en ellos.
6. **Invita a un amigo:** códigos promocionales de Play (Play Console → Monetizar → Códigos promocionales; hay un cupo gratis cada trimestre). Quien invita y quien llega se ganan un mes de Pro. Primero a mano; si funciona, se mete en la app.
7. **Prensa y blogs de tecnología en Colombia** (Enter.co, Impacto TIC, los medios de la universidad): un correo corto con la historia, el video y el enlace. La historia "app colombiana de finanzas que no pide tu banco" sí es noticia.
8. **Pauta, solo después de tener 10 reseñas o más:** Meta (Reels) con uno de los videos de 15 s, de COP 20.000 a 30.000 al día durante una semana, solo en Colombia y entre 22 y 35 años. Se mide el costo por instalación y se apaga si pasa de unos COP 3.000. Google App Campaigns después.
9. **iPhone:** cuando salga en la App Store, otra ronda de "ya llegué" con los mismos videos.

## Fechas que conviene aprovechar

| Fecha | Gancho |
|---|---|
| El día de la aprobación | Video de lanzamiento, mensaje a los testers pidiendo la reseña, posts en las comunidades |
| 15 y 30 de cada mes | La quincena: "¿cuánto te queda hasta el 30?" |
| 27 de noviembre (Black Friday) | "¿Me alcanza?" antes de comprar |
| Primera quincena de diciembre | La prima: "ponle un tope antes de que se esfume" |
| 1 de enero | El reto de enero de 31 días anotando, y el descuento del plan anual (lo que ya decía PRO.md) |

## Plan de 30, 60 y 90 días

- **Los primeros 30 días (lanzamiento):** sacar el video de lanzamiento el día que llegue la aprobación, pedirles la reseña a los testers, publicar el inglés de la ficha (sigue en borrador), mejorar las palabras clave de la ficha, tres videos cortos por semana y dos posts en comunidades.
- **De 30 a 60 días (diciembre):** la serie "¿me alcanza para…?", el video de la prima, escribirles a 10 creadores pequeños y probar Invita a un amigo con códigos.
- **De 60 a 90 días (enero):** el reto de enero, el descuento anual y la primera prueba de pauta pagada si hay reseñas.

## Cada semana se mira

En Play Console: visitas a la ficha, **conversión de visita a instalación** (si está por debajo del 25 %, hay que cambiar las capturas o el texto), instalaciones, desinstalaciones y reseñas. En RevenueCat: pruebas y suscripciones. En cada red, qué video retuvo más a la gente: de ese se hacen más.
