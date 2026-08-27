import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';

/**
 * In-app privacy policy (no network). Public HTTPS URL for stores is separate
 * — enable GitHub Pages on /docs so PRIVACY_POLICY_URL resolves.
 */
export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { language, t } = useLanguage();
  const es = language === 'es';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 24) + 16 },
      ]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('about.privacyPolicy')}</Text>
        <Text style={styles.meta}>
          {es
            ? 'Última actualización: 27 de agosto de 2026 · Sotico91'
            : 'Last updated: August 27, 2026 · Sotico91'}
        </Text>

        {es ? (
          <>
            <Text style={styles.p}>
              Billing (“la App”) es una aplicación de finanzas personales. Esta política
              explica qué datos se manejan y cómo. Al usar la App aceptas estas prácticas.
            </Text>
            <Text style={styles.h}>1. Resumen</Text>
            <Text style={styles.p}>
              Tus movimientos, cuentas, presupuestos y ajustes se guardan en tu dispositivo.
              No operamos un servidor propio de cuentas financieras ni vendemos tus datos a
              terceros.
            </Text>
            <Text style={styles.h}>2. Datos que procesa la App</Text>
            <Text style={styles.p}>
              • Nombre que indiques en la App.{'\n'}
              • Movimientos (montos, conceptos, notas, métodos de pago).{'\n'}
              • Cuentas, deudas, presupuestos, recordatorios y preferencias.{'\n'}
              • Copias de respaldo que tú exportes o restaures (JSON/CSV).
            </Text>
            <Text style={styles.h}>3. Permisos del dispositivo</Text>
            <Text style={styles.p}>
              • Notificaciones — recordatorios y avisos (opcionales).{'\n'}
              • Face ID / biometría o código — solo si activas el bloqueo.{'\n'}
              • Archivos / compartir — solo al exportar o restaurar un respaldo.{'\n'}
              {'\n'}
              La App no solicita micrófono ni ubicación.
            </Text>
            <Text style={styles.h}>4. Servicios de terceros</Text>
            <Text style={styles.p}>
              No incluye analítica de publicidad ni seguimiento de usuarios. Las notificaciones
              locales se programan en el dispositivo. Apple y Google pueden procesar datos de
              instalación según sus políticas.
            </Text>
            <Text style={styles.h}>5. Menores</Text>
            <Text style={styles.p}>
              Billing no está dirigida a menores de 13 años.
            </Text>
            <Text style={styles.h}>6. Conservación y eliminación</Text>
            <Text style={styles.p}>
              Los datos permanecen en tu dispositivo hasta que los borres, restaures un
              respaldo o desinstales la App.
            </Text>
            <Text style={styles.h}>7. Seguridad</Text>
            <Text style={styles.p}>
              Recomendamos el bloqueo de la App en dispositivos compartidos. Protege los
              respaldos que exportes como información sensible.
            </Text>
            <Text style={styles.h}>8. Contacto</Text>
            <Text style={styles.p}>edavidvelascop@gmail.com</Text>
          </>
        ) : (
          <>
            <Text style={styles.p}>
              Billing (“the App”) is a personal finance app. This policy explains what data is
              handled and how. By using the App you accept these practices.
            </Text>
            <Text style={styles.h}>1. Summary</Text>
            <Text style={styles.p}>
              Your transactions, accounts, budgets and settings are stored on your device. We
              do not run a finance cloud account for this app or sell your data to third
              parties.
            </Text>
            <Text style={styles.h}>2. Data the App processes</Text>
            <Text style={styles.p}>
              • Name you enter in the App.{'\n'}
              • Movements (amounts, concepts, notes, payment methods).{'\n'}
              • Accounts, debts, budgets, reminders and preferences.{'\n'}
              • Backups you export or restore (JSON/CSV).
            </Text>
            <Text style={styles.h}>3. Device permissions</Text>
            <Text style={styles.p}>
              • Notifications — optional reminders and alerts.{'\n'}
              • Face ID / biometrics or passcode — only if you enable App Lock.{'\n'}
              • Files / sharing — only when you export or restore a backup.{'\n'}
              {'\n'}
              The App does not request microphone or location access.
            </Text>
            <Text style={styles.h}>4. Third parties</Text>
            <Text style={styles.p}>
              No ad analytics or user-tracking SDKs. Local notifications are scheduled on
              device. Apple and Google may process install data under their own policies.
            </Text>
            <Text style={styles.h}>5. Children</Text>
            <Text style={styles.p}>
              Billing is not directed at children under 13.
            </Text>
            <Text style={styles.h}>6. Retention</Text>
            <Text style={styles.p}>
              Data stays on your device until you delete it, restore a backup, or uninstall
              the App.
            </Text>
            <Text style={styles.h}>7. Security</Text>
            <Text style={styles.p}>
              We recommend enabling App Lock on shared devices. Treat exported backups as
              sensitive information.
            </Text>
            <Text style={styles.h}>8. Contact</Text>
            <Text style={styles.p}>edavidvelascop@gmail.com</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 24,
    color: palette.ink,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
    marginBottom: 8,
  },
  h: {
    marginTop: 12,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  p: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 21,
  },
});
