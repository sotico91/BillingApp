import { Pressable, Text, TextInput, View } from 'react-native';

import { OptionChips } from '@/src/components/wealth/OptionChips';
import { styles } from '@/src/components/wealth/styles';
import type { DebtFormState } from '@/src/components/wealth/useDebtForm';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

/** Add / edit form for a card or loan; state lives in useDebtForm. */
export function DebtForm({ form }: { form: DebtFormState }) {
  const { t } = useLanguage();
  const {
    kind,
    editingId,
    saving,
    fields: { name, balance, installment, rate, payDay, product, creditLimit, drawable },
    setName,
    setBalance,
    setInstallment,
    setRate,
    setPayDay,
    setProduct,
    setCreditLimit,
    setDrawable,
    resetForm,
    handleSaveDebt,
  } = form;
  const revolving = kind === 'revolving';
  return (
    <View style={styles.form}>
      {editingId ? (
        <Text style={styles.formTitle}>{t('wealth.debtEditing')}</Text>
      ) : null}
      {revolving ? (
        <>
          <Text style={styles.label}>{t('wealth.productLabel')}</Text>
          <OptionChips
            value={product}
            onChange={setProduct}
            options={[
              { id: 'card', label: t('wealth.productCard') },
              { id: 'credicheque', label: t('wealth.productCredicheque') },
              { id: 'line', label: t('wealth.productLine') },
            ]}
          />
        </>
      ) : null}
      <Text style={styles.label}>{t('wealth.debtName')}</Text>
      <TextInput
        testID="debt-name"
        value={name}
        onChangeText={setName}
        placeholder={
          revolving
            ? t('wealth.debtNamePlaceholderRevolving')
            : t('wealth.debtNamePlaceholder')
        }
        placeholderTextColor={palette.inkSoft}
        style={styles.input}
      />
      {!revolving ? (
        <>
          <Text style={styles.label}>{t('wealth.drawableLabel')}</Text>
          <OptionChips
            value={drawable ? 'yes' : 'no'}
            onChange={(id) => setDrawable(id === 'yes')}
            options={[
              { id: 'no', label: t('wealth.drawableNo') },
              { id: 'yes', label: t('wealth.drawableYes') },
            ]}
          />
          {drawable ? <Text style={styles.copyHint}>{t('wealth.drawableHint')}</Text> : null}
        </>
      ) : null}
      {revolving || drawable ? (
        <>
          <Text style={styles.label}>{t('wealth.debtLimit')}</Text>
          <TextInput
            testID="debt-limit"
            value={creditLimit}
            onChangeText={setCreditLimit}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={palette.inkSoft}
            style={styles.input}
          />
        </>
      ) : null}
      <Text style={styles.label}>
        {revolving ? t('wealth.debtUsed') : t('wealth.debtBalance')}
      </Text>
      <TextInput
        testID="debt-balance"
        value={balance}
        onChangeText={setBalance}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={palette.inkSoft}
        style={styles.input}
      />
      <Text style={styles.label}>
        {revolving ? t('wealth.debtMonthPay') : t('wealth.debtInstallment')}
      </Text>
      <TextInput
        value={installment}
        onChangeText={setInstallment}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={palette.inkSoft}
        style={styles.input}
      />
      <Text style={styles.label}>{t('wealth.debtRate')}</Text>
      <TextInput
        testID="debt-rate"
        value={rate}
        onChangeText={setRate}
        keyboardType="default"
        placeholder={t('wealth.debtRatePlaceholder')}
        placeholderTextColor={palette.inkSoft}
        style={styles.input}
      />
      <Text style={styles.copyHint}>{t('wealth.debtRateHint')}</Text>
      <Text style={styles.label}>{t('wealth.debtPayDay')}</Text>
      <TextInput
        value={payDay}
        onChangeText={setPayDay}
        keyboardType="number-pad"
        placeholder="1"
        placeholderTextColor={palette.inkSoft}
        style={styles.input}
      />
      <Text style={styles.copyHint}>{t('wealth.debtPayDayHint')}</Text>
      <View style={styles.formActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            tapFeedback();
            resetForm();
          }}
          style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>{t('wealth.debtCancel')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSaveDebt()}
          disabled={saving}
          style={[styles.saveBtn, styles.saveBtnFlex]}>
          <Text style={styles.saveBtnText}>
            {saving
              ? t('add.saving')
              : editingId
                ? t('wealth.debtUpdate')
                : t('wealth.debtSave')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
