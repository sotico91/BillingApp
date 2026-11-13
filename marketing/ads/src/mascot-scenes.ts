// "Rumi habla": the icon's coral bill as a character, talking straight to camera.
// Each scene is one voice line plus the card that shows it; voice/mascot.ts turns `say` into audio
// and a mouth envelope (src/mascot-voice.json). Numbers go in words in `say`.

export type SceneKind =
  | 'hello'
  | 'quick'
  | 'limit'
  | 'ants'
  | 'ask'
  | 'forecast'
  | 'privacy'
  | 'remindSetup'
  | 'debtDue'
  | 'push'
  | 'suggest'
  | 'needs'
  | 'steps'
  | 'play'
  | 'feedback'
  | 'iphone'
  | 'thanks'
  | 'features'
  | 'free'
  | 'store'
  | 'tinto'
  | 'tintoYear'
  | 'end';

export type Scene = { kind: SceneKind; title: string; say: string };

/** One mascot video: its scenes and the button on the closing card (with a QR when `qr` is set). */
export type MascotVideo = { scenes: Scene[]; cta: string; tagline: string; qr?: string; confetti?: boolean };

export const mascotScenes: Scene[] = [
  {
    kind: 'hello',
    title: '¿En qué se te va la plata?',
    say: '¡Hola! Soy Rumi. ¿Sientes que la plata se te va y no sabes en qué? Yo te ayudo.',
  },
  {
    kind: 'quick',
    title: 'Anota en segundos',
    say: 'Anotas un gasto en segundos: escribes «almuerzo», y yo lo pongo en su categoría.',
  },
  {
    kind: 'limit',
    title: 'Ponle un tope a cada gasto',
    say: 'Ponle un tope al mes a lo que quieras cuidar, y mira cuánto te queda antes de pasarte.',
  },
  {
    kind: 'ants',
    title: 'Caza los gastos hormiga',
    say: 'Te muestro tus gastos hormiga: esos cafecitos que, juntos, suman más de lo que crees.',
  },
  {
    kind: 'ask',
    title: 'Pregúntame como hablas',
    say: 'Pregúntame como le hablas a una amiga: ¿puedo comprar algo de doscientos mil? Te respondo con tus números.',
  },
  {
    kind: 'forecast',
    title: 'Mira cómo cierras el mes',
    say: 'Y te digo cómo vas a cerrar el mes, para que ajustes a tiempo y ahorres más.',
  },
  {
    kind: 'privacy',
    title: 'Tus datos, en tu teléfono',
    say: 'Todo se queda en tu teléfono. Sin cuentas, sin conectar tu banco.',
  },
  {
    kind: 'end',
    title: 'Rumi',
    say: 'Rumi. Cuentas claras, mente tranquila. ¡Te espero!',
  },
];

// "Rumi te recuerda": reminders for bills and loan installments. The notification texts are the
// app's own (reminder.pushTitle/pushBodyAmount and reminder.debtTitle/debtBodyAmount).
export const reminderScenes: Scene[] = [
  {
    kind: 'hello',
    title: '¿Se te pasó pagar un recibo?',
    say: '¡Hola! Soy Rumi. ¿Se te ha pasado pagar la luz, o la cuota del carro? Conmigo, ya no.',
  },
  {
    kind: 'remindSetup',
    title: 'Elige qué te recuerdo',
    say: 'En Plan eliges qué recibos te recuerdo, y el día y la hora en que los pagas.',
  },
  {
    kind: 'debtDue',
    title: 'Tus cuotas, también',
    say: 'Con tus créditos te aviso un día antes de cada vencimiento. Y si ya pagaste ese mes, no te molesto.',
  },
  {
    kind: 'push',
    title: 'Te aviso a tiempo',
    say: 'El aviso te llega con el valor. Lo tocas, y lo registras en un momento.',
  },
  {
    kind: 'suggest',
    title: 'Sugerencias para ti',
    say: 'Si pagas algo cada mes y no tiene recordatorio, yo te lo sugiero. Un toque, y listo.',
  },
  {
    kind: 'end',
    title: 'Rumi',
    say: 'Rumi. Para que ningún pago se te pase.',
  },
];

// "Pruébame": invites testers to Google Play's closed test (12 people, 14 days in a row) before
// production. The QR opens docs/probar.html, which has the group and the Play links.
export const testerScenes: Scene[] = [
  {
    kind: 'hello',
    title: '¡Ayúdame a llegar a Google Play!',
    say: '¡Hola! Soy Rumi, y estoy por llegar a Google Play. Para lograrlo, necesito que me pruebes.',
  },
  {
    kind: 'needs',
    title: 'Lo que necesitas',
    say: 'Solo necesitas un celular Android en Colombia o Estados Unidos, tu cuenta de Google, y quedarte conmigo catorce días.',
  },
  {
    kind: 'steps',
    title: 'Así te unes',
    say: 'Escanea el código y únete al grupo de testers. Luego acepta la invitación de Google Play: ese es el paso que cuenta. E instálame. Usa siempre la misma cuenta de Google.',
  },
  {
    kind: 'play',
    title: 'Reglas de Google Play',
    say: 'Cumplo lo que Google pide: mi política de privacidad es pública, y declaro que no recopilo tus datos. Sin anuncios, y todo cifrado en tu teléfono.',
  },
  {
    kind: 'feedback',
    title: 'Cuéntame qué falla',
    say: 'Si algo falla o no te gusta, cuéntamelo desde «Reportar un error», en Ajustes. Así mejoro para todos.',
  },
  {
    kind: 'iphone',
    title: '¿Tienes iPhone?',
    say: '¿Tienes iPhone? Muy pronto llego a la App Store.',
  },
  {
    kind: 'end',
    title: 'Rumi',
    say: 'Rumi. Cuentas claras, mente tranquila. ¡Escanea, y pruébame!',
  },
];

// "Ya estoy en Google Play": the launch video. Use it only once production is live on Play;
// the QR (public/qr-play.png) opens the listing.
export const launchScenes: Scene[] = [
  {
    kind: 'hello',
    title: '¡Ya estoy en Google Play!',
    say: '¡Hola! Soy Rumi, y tengo una gran noticia: ¡ya estoy en Google Play!',
  },
  {
    kind: 'thanks',
    title: 'Gracias a mis testers',
    say: 'Gracias a quienes me probaron estas semanas. Con sus ideas, mejoré para todos.',
  },
  {
    kind: 'features',
    title: 'Tu plata, clara',
    say: 'Anota tus gastos en segundos, ponles un tope, caza los gastos hormiga, y pregúntame lo que quieras de tu plata.',
  },
  {
    kind: 'privacy',
    title: 'Tus datos, en tu teléfono',
    say: 'Y todo se queda en tu teléfono: sin cuentas, y sin conectar tu banco.',
  },
  {
    kind: 'free',
    title: 'Gratis para empezar',
    say: 'Descárgame gratis. Y si quieres más, está Rumi Pro.',
  },
  {
    kind: 'store',
    title: 'Búscame en Google Play',
    say: 'Búscame como Rumi en Google Play, o escanea el código. ¿Tienes iPhone? Muy pronto llego a la App Store.',
  },
  {
    kind: 'end',
    title: 'Rumi',
    say: 'Rumi. Cuentas claras, mente tranquila. ¡Descárgame hoy!',
  },
];

// "Tintos": a short hook for Reels/TikTok. The daily coffee adds up to a month and a year,
// then the ant spends. Ends on Play, so publish it once the listing is public.
export const tintoScenes: Scene[] = [
  {
    kind: 'hello',
    title: '¿Cuánto te gastas en tintos?',
    say: '¿Un tintico de cuatro mil quinientos al día? Eso no es nada… ¿o sí?',
  },
  {
    kind: 'tinto',
    title: 'Haz la cuenta',
    say: 'Cuatro mil quinientos, por veintidós días de trabajo: noventa y nueve mil pesos al mes.',
  },
  {
    kind: 'tintoYear',
    title: 'Al año, más de un millón',
    say: 'Y al año, ¡más de un millón cien mil! Sin darte cuenta.',
  },
  {
    kind: 'ants',
    title: 'Caza tus gastos hormiga',
    say: 'Yo te muestro tus gastos hormiga, y tú decides cuáles valen la pena.',
  },
  {
    kind: 'end',
    title: 'Rumi',
    say: 'Rumi. Gratis en Google Play.',
  },
];

export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.sotico91.rumiapp';

export const TESTER_URL = 'https://sotico91.github.io/RumiApp/probar.html';

export const mascotVideos: Record<string, MascotVideo> = {
  'rumi-habla-es': { scenes: mascotScenes, cta: 'Muy pronto en tu tienda', tagline: 'Cuentas claras, mente tranquila.' },
  'rumi-recuerda-es': { scenes: reminderScenes, cta: 'Muy pronto en tu tienda', tagline: 'Para que ningún pago se te pase.' },
  'rumi-pruebame-es': {
    scenes: testerScenes,
    cta: 'Únete a la prueba',
    tagline: 'Escanea y sé de los primeros.',
    qr: 'qr-probar.png',
  },
  'rumi-lanzamiento-es': {
    scenes: launchScenes,
    cta: 'Ya en Google Play',
    tagline: 'Gratis para Android.',
    qr: 'qr-play.png',
    confetti: true,
  },
  'rumi-tintos-es': {
    scenes: tintoScenes,
    cta: 'Ya en Google Play',
    tagline: 'Cuentas claras, mente tranquila.',
    qr: 'qr-play.png',
  },
  // The first two videos with a Play ending, for when the store is live.
  'rumi-habla-play-es': {
    scenes: mascotScenes,
    cta: 'Ya en Google Play',
    tagline: 'Cuentas claras, mente tranquila.',
    qr: 'qr-play.png',
  },
  'rumi-recuerda-play-es': {
    scenes: reminderScenes,
    cta: 'Ya en Google Play',
    tagline: 'Para que ningún pago se te pase.',
    qr: 'qr-play.png',
  },
};
