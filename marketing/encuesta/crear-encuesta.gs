/**
 * Encuesta para los testers de Rumi.
 *
 * Cómo usarlo:
 * 1. Abre https://script.google.com con tu cuenta de Google → "Nuevo proyecto".
 * 2. Borra lo que hay, pega este archivo completo y guarda.
 * 3. Elige la función `crearEncuesta` y dale "Ejecutar". Acepta los permisos (Forms y Sheets).
 * 4. En "Registro de ejecución" salen tres enlaces: el formulario para editar,
 *    el enlace para compartir con los testers y la hoja donde caen las respuestas.
 *
 * Si lo corres dos veces crea dos formularios; borra el que sobre en Drive.
 */
function crearEncuesta() {
  var form = FormApp.create('Rumi: ¿cómo te fue?');
  form.setDescription(
    'Gracias por probar Rumi 🐜. Son 3 minutos y nos ayudan a decidir qué mejorar antes de abrirla a todos. ' +
      'Todas las preguntas son opcionales salvo las primeras; responde con lo que viviste, aunque la hayas usado poco.'
  );
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setConfirmationMessage('¡Gracias! Leemos cada respuesta. 🐜');

  // --- Página 1: experiencia ---
  form
    .addScaleItem()
    .setTitle('¿Qué tanto te gustó Rumi?')
    .setBounds(1, 5)
    .setLabels('Nada', 'Me encantó')
    .setRequired(true);

  form
    .addScaleItem()
    .setTitle('¿Qué tan fácil fue anotar un gasto?')
    .setBounds(1, 5)
    .setLabels('Muy difícil', 'Muy fácil')
    .setRequired(true);

  form
    .addScaleItem()
    .setTitle('¿Qué tan fácil fue entender tu mes (cuánto llevas gastado y cuánto te queda)?')
    .setBounds(1, 5)
    .setLabels('Muy difícil', 'Muy fácil');

  form
    .addMultipleChoiceItem()
    .setTitle('¿Cada cuánto la usaste durante la prueba?')
    .setChoiceValues([
      'Casi todos los días',
      'Varias veces por semana',
      'Una vez por semana',
      'La abrí pocas veces',
      'No alcancé a usarla',
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle('¿Qué fue lo que más te sirvió?')
    .setHelpText('Marca todas las que apliquen.')
    .setChoiceValues([
      'Anotar un gasto rápido',
      'Dictar el gasto por voz',
      'Que clasifique sola la categoría',
      'Ver el resumen del mes en Inicio',
      'Pregúntale a Rumi (preguntas como "¿cuánto gasté en domicilios?")',
      'Topes por categoría (Plan)',
      'Recordatorios de pagos y cuotas',
      'Deudas y plan para salir de ellas',
      'Patrimonio (cuentas, ahorros, lo que tengo)',
      'Exportar a Excel o respaldo',
    ])
    .showOtherOption(true);

  form
    .addCheckboxItem()
    .setTitle('¿Dónde te enredaste o qué te costó?')
    .setHelpText('Marca todas las que apliquen.')
    .setChoiceValues([
      'Nada, todo fue claro',
      'Configurar Rumi al principio',
      'Elegir o encontrar la categoría',
      'Cuentas y mover plata entre ellas',
      'Registrar un ingreso',
      'Registrar una deuda o un crédito',
      'Pregúntale a Rumi no entendió mi pregunta',
      'Encontrar dónde estaba cada cosa',
      'Los textos o números eran pequeños o difíciles de leer',
      'La app se cerró o tuvo un error',
    ])
    .showOtherOption(true);

  form
    .addParagraphTextItem()
    .setTitle('Si pudieras cambiar o mejorar una sola cosa de Rumi, ¿cuál sería?');

  // --- Página 2: lo que falta ---
  form.addPageBreakItem().setTitle('Lo que le falta');

  form
    .addCheckboxItem()
    .setTitle('¿Qué te gustaría que Rumi tuviera?')
    .setHelpText('Marca hasta 3.')
    .setChoiceValues([
      'Leer los gastos de las notificaciones del banco o Nequi',
      'Metas de ahorro',
      'Compartir las finanzas con mi pareja o familia',
      'Usarla en varios teléfonos o en el computador',
      'Widget en la pantalla de inicio',
      'Presupuesto por quincena',
      'Más gráficas y comparaciones entre meses',
      'Varias monedas a la vez',
    ])
    .showOtherOption(true);

  form
    .addMultipleChoiceItem()
    .setTitle('¿Vas a seguir usando Rumi después de la prueba?')
    .setChoiceValues(['Sí, seguro', 'Probablemente sí', 'No sé', 'Probablemente no', 'No']);

  form
    .addScaleItem()
    .setTitle('¿Qué tan probable es que le recomiendes Rumi a un amigo o familiar?')
    .setBounds(0, 10)
    .setLabels('Nada probable', 'Muy probable');

  form
    .addMultipleChoiceItem()
    .setTitle('Antes de Rumi, ¿cómo llevabas tus gastos?')
    .setChoiceValues([
      'No los llevaba',
      'En la cabeza',
      'En una hoja de cálculo (Excel, Sheets)',
      'En una libreta o notas del celular',
      'Con otra app',
      'Con la app de mi banco',
    ])
    .showOtherOption(true);

  // --- Página 3: Rumi Pro ---
  form
    .addPageBreakItem()
    .setTitle('Rumi Pro')
    .setHelpText(
      'Rumi seguirá siendo gratis para anotar gastos, ver tu mes, cuentas y bloqueo con huella. ' +
        'Rumi Pro agrega: preguntas ilimitadas a Rumi (gratis son 5 al mes), topes y recordatorios ilimitados (gratis son 3), ' +
        'plan para salir de deudas con abonos extra, "¿me alcanza?" para meses futuros, exportar a Excel, CSV y respaldo, ' +
        'y las funciones nuevas que vengan. Si eres tester, ya tienes Pro gratis para siempre: estas preguntas son para saber qué haría alguien nuevo.'
    );

  form
    .addMultipleChoiceItem()
    .setTitle('Si no tuvieras Pro gratis, ¿pagarías por Rumi Pro?')
    .setChoiceValues([
      'Sí, el plan anual (COP 69.900 al año, unos COP 5.800 al mes)',
      'Sí, el plan mensual (COP 9.900 al mes)',
      'Sí, pero solo si costara menos',
      'No, con la versión gratis me basta',
      'No, no pago por apps',
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('¿Cuánto es lo máximo que pagarías al año por Rumi Pro?')
    .setChoiceValues([
      'Nada',
      'Menos de COP 30.000',
      'COP 30.000 – 50.000',
      'COP 50.000 – 70.000',
      'COP 70.000 – 100.000',
      'Más de COP 100.000',
    ]);

  form
    .addCheckboxItem()
    .setTitle('¿Qué te haría pagar Pro?')
    .setHelpText('Marca todas las que apliquen.')
    .setChoiceValues([
      'Preguntarle a Rumi sin límite',
      'Topes y recordatorios sin límite',
      'Plan para salir de deudas',
      '"¿Me alcanza?" para meses futuros',
      'Exportar a Excel, CSV o respaldo',
      'Apoyar a que la app siga mejorando',
      'Nada de esto',
    ])
    .showOtherOption(true);

  // --- Página 4: sobre ti ---
  form.addPageBreakItem().setTitle('Para terminar');

  form
    .addMultipleChoiceItem()
    .setTitle('¿En qué teléfono la usaste?')
    .setChoiceValues(['Android', 'iPhone']);

  form
    .addParagraphTextItem()
    .setTitle('¿Algo más que nos quieras contar?');

  form
    .addTextItem()
    .setTitle('Si quieres que te escribamos para contarte de lo que cambie, deja tu correo o WhatsApp (opcional)');

  // Hoja de respuestas
  var hoja = SpreadsheetApp.create('Rumi: respuestas encuesta testers');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, hoja.getId());

  Logger.log('Editar formulario: ' + form.getEditUrl());
  Logger.log('Compartir con testers: ' + form.getPublishedUrl());
  Logger.log('Respuestas (Sheets): ' + hoja.getUrl());
}
