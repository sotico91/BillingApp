# Redes de Rumi

Kit para abrir las cuentas de Rumi y publicar los videos de `../ads/out/`. Estrategia completa: `../ESTRATEGIA.md`.

**No publiques nada con el QR o "Ya en Google Play" hasta que Play apruebe producción.** Antes de eso, solo reserva los nombres y deja los perfiles listos.

## Imágenes

| Archivo | Para | Tamaño |
|---|---|---|
| `avatar.png` | Foto de perfil en todas las redes (cada una la recorta en círculo) | 1080×1080 |
| `youtube-banner.png` | Banner del canal de YouTube (solo el centro se ve en todos los equipos) | 2560×1440 |
| `facebook-cover.png` | Portada de la página de Facebook | 1640×624 |

Se generan con `SocialKit.tsx`:

```sh
cd marketing/ads
for id in social-avatar social-youtube-banner social-facebook-cover; do npx remotion still src/index.ts $id ../redes/${id#social-}.png; done
```

## Nombre

El mismo en todas las redes. Prueba en este orden y quédate con el primero que esté libre **en TikTok y en Instagram a la vez**:

1. `@rumi.app`
2. `@rumiapp.co`
3. `@rumifinanzas`
4. `@holarumi`

- **Nombre visible:** Rumi · Finanzas personales
- **Enlace:** `https://play.google.com/store/apps/details?id=com.sotico91.rumiapp` (cuando sea pública). Mientras tanto, `https://sotico91.github.io/RumiApp/`.

## Bios

- **TikTok** (máximo 80 caracteres): `Tu plata clara, sin conectar tu banco 🐜 Gratis en Google Play 👇`
- **Instagram** (máximo 150):
  ```
  Tu plata clara, sin conectar tu banco 🐜
  Anota en segundos · Pregúntale a Rumi · Metas de ahorro
  Gratis en Google Play 👇
  ```
- **YouTube y Facebook:**
  ```
  Rumi es una app de finanzas personales hecha en Colombia. Anotas un gasto en segundos, le pones topes a lo que quieres cuidar, cazas tus gastos hormiga, ahorras con metas y le preguntas a Rumi cosas como "¿me alcanza para unos tenis de 300 mil?". Sin cuenta, sin conectar tu banco: todo queda cifrado en tu teléfono. Gratis en Google Play; iPhone muy pronto.
  ```

## Abrir las cuentas (una mañana, en este orden)

1. **Correo de Rumi:** crea un Gmail nuevo solo para Rumi. Todas las cuentas se abren con él, y la verificación en dos pasos se activa en cada una.
2. **TikTok:** regístrate con ese correo, pon el nombre, la foto y la bio, y cámbiala a **cuenta de empresa** (Ajustes → Cuenta → Cambiar a cuenta de empresa; categoría: Aplicaciones o Servicios financieros). Con cuenta de empresa ves las estadísticas, y el enlace en la bio sale cuando TikTok lo habilita para tu cuenta.
3. **Instagram:** regístrate con el mismo correo y pásala a **cuenta profesional** (Ajustes → Tipo de cuenta → Empresa).
4. **Facebook:** desde tu Facebook personal, crea una **página** (Páginas → Crear) llamada "Rumi", con la categoría "Aplicación" y la portada `facebook-cover.png`. Después, en **Meta Business Suite**, conecta la página con el Instagram. Desde ahí se programa el mismo post en los dos, y desde ahí se paga la pauta más adelante.
5. **YouTube:** con el Gmail de Rumi, crea el canal "Rumi" y sube el banner y la foto. Los videos se suben como Shorts. El de lanzamiento, como video normal, porque su enlace va en la ficha de Play (Play Console → Ficha principal → Video).
6. **WhatsApp:** en tu WhatsApp, Novedades → Canales → Crear canal "Rumi". Ahí van las novedades de cada versión y el enlace a la ficha. Invita primero a los testers.
7. **Tu cuenta personal:** cuenta que estás construyendo Rumi y etiqueta a la cuenta nueva (lee "Tu historia" abajo).

## Texto para cada video

Pega el texto, y agrega los hashtags al final. Activa los subtítulos automáticos y revísalos antes de publicar.

**Hashtags base:** `#finanzaspersonales #ahorro #gastoshormiga #colombia #presupuesto #plata #app`

| Video | Texto |
|---|---|
| `rumi-lanzamiento-es` | ¡Ya estoy en Google Play! 🎉 Gracias a los testers que me probaron estas semanas. Anota tus gastos, ponles tope y pregúntame lo que quieras de tu plata. Sin cuenta y sin conectar tu banco. Gratis, enlace en la bio 👆 |
| `rumi-banco-es` | ¿Le darías la clave de tu banco a una app? 🔒 Yo no te la pido: todo queda cifrado en tu teléfono. #privacidad |
| `rumi-tintos-es` | ¿Cuánto te gastas en tintos al año? ☕ Haz la cuenta… 🐜 #tinto #cafe |
| `rumi-alcanza-es` | ¿Me alcanza para unos tenis de 300 mil? 👟 Déjame en comentarios qué quieres comprar y le pregunto a Rumi en el próximo video 👇 #blackfriday |
| `rumi-quincena-es` | La quincena llegó… y se fue 💸 ¿A ti también te pasa? #quincena |
| `rumi-metas-es` | ¿Para qué estás ahorrando? ✈️ Crea tu meta, y Rumi te dice cuánto apartar cada mes. Tu primera meta es gratis. #metas |
| `rumi-prima-es` | Llegó la prima 🎁 ¿Ya sabes en qué se te va a ir? Ponle un plan antes de que se esfume. #prima #diciembre |
| `rumi-reto-enero-es` | Reto enero: 31 días anotando todo 📅 ¿Te le mides? Comenta "me le mido" y empezamos juntos el 1 de enero. #propositos2027 #retoenero |
| `rumi-habla-es` / `rumi-habla-play-es` | ¿Sientes que la plata se te va y no sabes en qué? Hola, soy Rumi 👋 |
| `rumi-recuerda-play-es` | ¿Se te pasó pagar la luz otra vez? 💡 Yo te recuerdo, con el valor y un día antes de cada cuota. |

**Post fijado** (el primero que ve quien entra al perfil): el video de lanzamiento. En TikTok, fija también `rumi-banco-es` y `rumi-metas-es`.

## Tu historia (cuenta personal)

Primer post, para TikTok o Instagram (hablando a cámara, 30 a 45 s) o para LinkedIn (como texto):

> Llevo meses haciendo una app de finanzas personales en las noches, después del trabajo. Se llama Rumi. Nació porque yo llevaba mis gastos en Excel y nunca sabía en qué se me iba la plata. Quería algo que no me pidiera la clave del banco ni un correo, y que pudiera preguntarle "¿me alcanza?" como a una amiga. La probaron más de 12 personas durante dos semanas; me pidieron fechas, metas de ahorro y presupuesto por quincena, y ya están las dos primeras. Hoy está en Google Play, gratis. Si la pruebas, cuéntame qué le falta. 👉 @rumi.app

Cámbiale lo que no sea tuyo: es un borrador, y funciona mejor con tus palabras. Después, una vez por semana: qué se aprendió, cuántas descargas lleva, qué pidió la gente y qué viene.
