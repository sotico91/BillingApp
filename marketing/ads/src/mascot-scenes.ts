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
  | 'payday'
  | 'chat'
  | 'lock'
  | 'prima'
  | 'goal'
  | 'streak'
  | 'comment'
  | 'goalForm'
  | 'goalPlan'
  | 'goalAdd'
  | 'goalDone'
  | 'goalPro'
  | 'end';

/** `chat`: the question and Rumi's answer (copy the app's real answer text). `bars`: limits for `limit`. */
export type Scene = {
  kind: SceneKind;
  title: string;
  say: string;
  chat?: [string, string];
  bars?: [string, number, number][];
};

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

// Short hooks for Reels/TikTok (see marketing/ESTRATEGIA.md). All end on Play.
// Rumi's answers in `chat` are the app's own texts (search.answerProjection*, search.answerAffordYes).
export const quincenaScenes: Scene[] = [
  {
    kind: 'hello',
    title: 'La quincena llegó… y se fue',
    say: '¿Te pagaron el quince, y el veintidós ya no queda nada? Te entiendo.',
  },
  {
    kind: 'payday',
    title: 'Se esfuma en una semana',
    say: 'Entre el arriendo, el mercado y los domicilios, la quincena se va en una semana.',
  },
  {
    kind: 'chat',
    title: 'Pregúntame cómo vas',
    say: 'Pregúntame cómo vas a cerrar el mes, y te respondo con tus números, a tiempo para ajustar.',
    chat: [
      '¿Cómo voy a cerrar el mes?',
      'A este ritmo gastarías cerca de $2.150.000 al cierre del mes. Con $2.000.000 de ingresos registrados, te faltarían unos $150.000.',
    ],
  },
  {
    kind: 'limit',
    title: 'Ponle tope a lo que se va',
    say: 'Ponle un tope a los domicilios y a las salidas, y llega tranquilo a la otra quincena.',
    bars: [
      ['Domicilios', 118000, 150000],
      ['Salidas', 96000, 200000],
    ],
  },
  { kind: 'end', title: 'Rumi', say: 'Rumi. Gratis en Google Play.' },
];

export const alcanzaScenes: Scene[] = [
  {
    kind: 'hello',
    title: '¿Me alcanza para unos tenis?',
    say: 'Le pregunté a Rumi si me alcanza para unos tenis de trescientos mil. Mira lo que me dijo.',
  },
  {
    kind: 'chat',
    title: 'Le pregunté a Rumi',
    say: 'Revisa cómo voy este mes, y me dice con cuánto cerraría si los compro. Así decido sin culpa.',
    chat: [
      '¿Me alcanza para unos tenis de 300 mil?',
      'Si compras algo de $300.000, a tu ritmo actual cerrarías el mes con unos $180.000 a favor.',
    ],
  },
  {
    kind: 'comment',
    title: '¿Y tú qué quieres comprar?',
    say: '¿Y tú qué quieres comprar? Déjamelo en los comentarios, y en el próximo video le pregunto a Rumi.',
  },
  { kind: 'end', title: 'Rumi', say: 'Rumi. Gratis en Google Play.' },
];

export const bancoScenes: Scene[] = [
  {
    kind: 'hello',
    title: '¿Tu clave del banco a una app?',
    say: '¿Le darías la clave de tu banco a una app? Yo tampoco te la pido.',
  },
  {
    kind: 'privacy',
    title: 'Tus datos, en tu teléfono',
    say: 'Sin cuenta, sin correo y sin conectar tu banco. Tus datos se quedan cifrados en tu teléfono.',
  },
  {
    kind: 'lock',
    title: 'Solo tú entras',
    say: 'Me bloqueas con tu huella. Y no tengo anuncios, ni le vendo tus datos a nadie.',
  },
  { kind: 'end', title: 'Rumi', say: 'Rumi. Tu plata clara, y solo para ti. Gratis en Google Play.' },
];

export const primaScenes: Scene[] = [
  {
    kind: 'hello',
    title: '¿En qué se te va la prima?',
    say: 'Llegó la prima de diciembre. ¿Ya sabes en qué se te va a ir?',
  },
  {
    kind: 'prima',
    title: 'Dale un plan a la prima',
    say: 'Anótala como ingreso, y ponle un tope a los regalos y a las salidas de diciembre.',
  },
  {
    kind: 'goal',
    title: 'Y aparta para enero',
    say: 'Aparta una parte en una meta de ahorro, para que enero no te coja en rojo.',
  },
  { kind: 'end', title: 'Rumi', say: 'Rumi. Gratis en Google Play.' },
];

export const retoScenes: Scene[] = [
  {
    kind: 'hello',
    title: 'Reto enero: 31 días anotando todo',
    say: '¿Tu propósito de año nuevo es ordenar la plata? Hagamos un reto: treinta y un días anotando todo.',
  },
  {
    kind: 'quick',
    title: 'Cada gasto, en segundos',
    say: 'Cada gasto, en segundos: escribes «almuerzo», y yo lo pongo en su categoría.',
  },
  {
    kind: 'streak',
    title: 'Un día a la vez',
    say: 'Un día a la vez. Al terminar enero, vas a ver en qué se te va la plata como nunca.',
  },
  {
    kind: 'ants',
    title: 'Y cazas tus gastos hormiga',
    say: 'Y de paso, cazas tus gastos hormiga: esos que suman sin que te des cuenta.',
  },
  { kind: 'end', title: 'Rumi', say: 'Rumi. ¿Te le mides? Empieza el primero de enero.' },
];

// "Metas de ahorro": the real flow in Patrimonio (src/components/wealth/SavingsGoalsCard.tsx):
// + Meta → what for, how much, by when (no date, 3, 6, 12, 24 months) and the pocket → the card says
// how much to put aside a month → Aportar opens Mover into the pocket → "¡Meta cumplida! 🎉".
// The first goal is free; Pro has no limit.
export const metasScenes: Scene[] = [
  {
    kind: 'hello',
    title: '¿Para qué estás ahorrando?',
    say: '¿Un viaje, un celular nuevo, o un fondo para emergencias? Te ayudo a llegar.',
  },
  {
    kind: 'goalForm',
    title: 'Crea tu meta',
    say: 'En Patrimonio, toca «más Meta». Dime para qué ahorras, cuánto necesitas y para cuándo. Y yo le creo su propio bolsillo.',
  },
  {
    kind: 'goalPlan',
    title: 'Te digo cuánto apartar',
    say: 'Yo hago la cuenta: aparta doscientos mil al mes, y llegas a tiempo.',
  },
  {
    kind: 'goalAdd',
    title: 'Aporta cuando te paguen',
    say: 'Cuando te paguen, toca «Aportar», y mueve la plata a su bolsillo. La meta avanza sola.',
  },
  {
    kind: 'goalDone',
    title: '¡Meta cumplida!',
    say: 'Mes a mes la ves crecer, hasta que llegas. ¡Meta cumplida!',
  },
  {
    kind: 'goalPro',
    title: 'Tu primera meta, gratis',
    say: 'Tu primera meta es gratis. Con Rumi Pro, todas las que quieras.',
  },
  { kind: 'end', title: 'Rumi', say: 'Rumi. Ahorra para lo que quieres. Gratis en Google Play.' },
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
  'rumi-quincena-es': {
    scenes: quincenaScenes,
    cta: 'Ya en Google Play',
    tagline: 'Cuentas claras, mente tranquila.',
    qr: 'qr-play.png',
  },
  'rumi-alcanza-es': {
    scenes: alcanzaScenes,
    cta: 'Ya en Google Play',
    tagline: 'Cuentas claras, mente tranquila.',
    qr: 'qr-play.png',
  },
  'rumi-banco-es': {
    scenes: bancoScenes,
    cta: 'Ya en Google Play',
    tagline: 'Cuentas claras, mente tranquila.',
    qr: 'qr-play.png',
  },
  'rumi-prima-es': {
    scenes: primaScenes,
    cta: 'Ya en Google Play',
    tagline: 'Cuentas claras, mente tranquila.',
    qr: 'qr-play.png',
  },
  'rumi-reto-enero-es': {
    scenes: retoScenes,
    cta: 'Ya en Google Play',
    tagline: 'Cuentas claras, mente tranquila.',
    qr: 'qr-play.png',
  },
  'rumi-metas-es': {
    scenes: metasScenes,
    cta: 'Ya en Google Play',
    tagline: 'Ahorra para lo que quieres.',
    qr: 'qr-play.png',
    confetti: true,
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
