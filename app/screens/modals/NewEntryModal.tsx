import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import colors from '../../config/colors';
import { getDb } from '../../database/db';
import { addEntry } from '../../services/entriesService';
import { depositToEnvelope, Envelope, getActiveEnvelopes, spendFromEnvelope } from '../../services/envelopesService';

const dateToYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

type RouteParams = { monthOffset: number; subcategoryId: number };

export const NewEntryModal = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { monthOffset, subcategoryId } = route.params as RouteParams;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + monthOffset;

  // domyślna data zależnie od monthOffset – zawsze godz. 12:00 (bez problemów z DST/UTC)
  let final: Date;
  if (monthOffset === 0) {
    final = new Date(year, today.getMonth(), today.getDate(), 12, 0, 0, 0);
  } else if (monthOffset < 0) {
    final = new Date(year, month + 1, 0, 12, 0, 0, 0);
  } else {
    final = new Date(year, month, 1, 12, 0, 0, 0);
  }

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(final);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // finansowanie kopertą (tylko dla WYDATKU)
  const [isExpense, setIsExpense] = useState<boolean>(false);
  const [financeWithEnvelope, setFinanceWithEnvelope] = useState<boolean>(false);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<number | null>(null);

  // dopłata (gdy zakup > saldo koperty)
  const [autoTopUp, setAutoTopUp] = useState<boolean>(false);

  // sprawdź czy subcategoryId to wydatek
  useEffect(() => {
    (async () => {
      const db = getDb();
      const row = await db.getFirstAsync(
        `SELECT c.positive AS pos
         FROM subcategories s JOIN categories c ON c.id = s.categoryId
         WHERE s.id = ?`,
        [subcategoryId]
      );
      setIsExpense((row?.pos ?? 0) === 0);
    })();
  }, [subcategoryId]);

  // załaduj koperty gdy to wydatek
  useEffect(() => {
    if (!isExpense) return;
    (async () => {
      const rows = await getActiveEnvelopes();
      setEnvelopes(rows);
    })();
  }, [isExpense]);

  const selectedEnvelope = useMemo(
    () => envelopes.find(e => e.id === selectedEnvelopeId) || null,
    [selectedEnvelopeId, envelopes]
  );

  const parsedAmount = useMemo(() => {
    const p = parseFloat((amount || '').replace(',', '.'));
    return Number.isFinite(p) && p > 0 ? p : NaN;
  }, [amount]);

  // wyliczenia: reszta / brakująca kwota (tylko gdy finansowanie kopertą)
  const { shortage, leftover } = useMemo(() => {
    if (!financeWithEnvelope || !selectedEnvelope || !Number.isFinite(parsedAmount)) {
      return { shortage: 0, leftover: 0 };
    }
    const saldo = Number(selectedEnvelope.saldo ?? 0);
    if (parsedAmount > saldo) return { shortage: parsedAmount - saldo, leftover: 0 };
    if (parsedAmount < saldo) return { shortage: 0, leftover: saldo - parsedAmount };
    return { shortage: 0, leftover: 0 };
  }, [financeWithEnvelope, selectedEnvelope, parsedAmount]);

  // auto wyłącz/ włącz dopłatę zależnie od sytuacji
  useEffect(() => {
    if (shortage <= 0 && autoTopUp) setAutoTopUp(false);
  }, [shortage, autoTopUp]);

  const handleSubmit = async () => {
    const amt = parsedAmount;
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('Błąd', 'Podaj poprawną kwotę > 0.');
      return;
    }
    const isoDate = dateToYMD(date);

    try {
      if (isExpense && financeWithEnvelope) {
        if (!selectedEnvelopeId) {
          Alert.alert('Koperta', 'Wybierz kopertę do sfinansowania wydatku.');
          return;
        }

        // jeśli brakuje środków i wybrano dopłatę → zasil kopertę brakującą kwotą (w tym samym miesiącu)
        if (shortage > 0) {
          if (!autoTopUp) {
            Alert.alert(
              'Brak środków',
              'W kopercie brakuje środków na ten zakup. Włącz „Dopłać brakującą kwotę” lub zmniejsz kwotę.'
            );
            return;
          }
          await depositToEnvelope(selectedEnvelopeId, shortage, { date: isoDate });
        }

        // teraz kupno z koperty (nie wpływa na agregaty)
        await spendFromEnvelope({
          envelopeId: selectedEnvelopeId,
          subcategoryId,
          amount: amt,
          date: isoDate,
          description: description?.trim() || 'Zakup finansowany kopertą',
        });
      } else {
        // zwykły wpis (dochód/wydatek)
        await addEntry(subcategoryId, amt, description, isoDate);
      }
    } catch (e: any) {
      Alert.alert('Błąd', e?.message || 'Nie udało się zapisać wpisu.');
    }

    navigation.goBack();
  };

  return (
    <Modal transparent animationType='fade'>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.label}>Kwota</Text>
          <TextInput
            style={styles.input}
            keyboardType='numeric'
            placeholder='0.00'
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>Opis (opcjonalnie)</Text>
          <TextInput
            style={styles.input}
            placeholder='Np. Czynsz / Telewizor'
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>Data</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
            <Text style={styles.dateText}>{date.toLocaleDateString('pl-PL')}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode='date'
              display='compact'
              locale='pl-PL'
              onChange={(event, selected) => {
                if (selected) {
                  const d = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 12, 0, 0, 0);
                  setDate(d);
                }
                setShowDatePicker(false);
              }}
            />
          )}

          {/* Finansowanie kopertą – tylko dla wydatku */}
          {isExpense && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Sfinansuj z koperty</Text>
                <TouchableOpacity
                  onPress={() => setFinanceWithEnvelope(v => !v)}
                  style={[styles.switchLike, financeWithEnvelope && { backgroundColor: colors.primary }]}
                  accessibilityRole='switch'
                  accessibilityState={{ checked: financeWithEnvelope }}
                >
                  <View style={[styles.switchKnob, financeWithEnvelope && { transform: [{ translateX: 18 }] }]} />
                </TouchableOpacity>
              </View>

              {financeWithEnvelope && (
                <>
                  <Text style={[styles.label, { marginTop: 8 }]}>Wybierz kopertę</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.envelopesRow}
                  >
                    {envelopes.map(e => {
                      const selected = selectedEnvelopeId === e.id;
                      return (
                        <TouchableOpacity
                          key={e.id}
                          style={[
                            styles.envChip,
                            { borderColor: selected ? '#fff' : e.color },
                            selected && { backgroundColor: e.color + '33' },
                            selected && styles.envChipSelected,
                          ]}
                          onPress={() => setSelectedEnvelopeId(e.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.envDot, { backgroundColor: e.color }]} />
                          <View style={{ maxWidth: 180 }}>
                            <Text style={[styles.envText, selected && { fontWeight: '700' }]} numberOfLines={1}>
                              {e.name}
                            </Text>
                            <Text style={styles.envSub} numberOfLines={1}>
                              Saldo: {Number(e.saldo ?? 0).toFixed(2)}
                              {typeof e.target === 'number' ? ` / ${Number(e.target).toFixed(2)}` : ''} zł
                            </Text>
                          </View>
                          {selected && (
                            <MaterialCommunityIcons
                              name='check-circle'
                              size={18}
                              color='#fff'
                              style={{ marginLeft: 6 }}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Pasek informacji: reszta / brakująca kwota */}
                  {selectedEnvelope && Number.isFinite(parsedAmount) && (
                    <View style={styles.infoPanel}>
                      {shortage > 0 ? (
                        <Text style={styles.infoText}>
                          Brakuje <Text style={styles.bold}>{shortage.toFixed(2)} zł</Text>. Możesz włączyć{' '}
                          <Text style={styles.bold}>dopłatę</Text> w tym miesiącu.
                        </Text>
                      ) : leftover > 0 ? (
                        <Text style={styles.infoText}>
                          Zostanie <Text style={styles.bold}>{leftover.toFixed(2)} zł</Text> reszty z koperty.
                        </Text>
                      ) : (
                        <Text style={styles.infoText}>Kwota idealnie pokrywa środki z koperty.</Text>
                      )}
                    </View>
                  )}

                  {/* Przełącznik „Dopłać brakującą kwotę” – pokazuj tylko, gdy brakuje */}
                  {shortage > 0 && (
                    <View style={[styles.row, { marginTop: 6 }]}>
                      <Text style={styles.label}>Dopłać brakującą kwotę</Text>
                      <TouchableOpacity
                        onPress={() => setAutoTopUp(v => !v)}
                        style={[styles.switchLike, autoTopUp && { backgroundColor: colors.primary }]}
                        accessibilityRole='switch'
                        accessibilityState={{ checked: autoTopUp }}
                      >
                        <View style={[styles.switchKnob, autoTopUp && { transform: [{ translateX: 18 }] }]} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </>
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleSubmit}>
              <Text style={styles.save}>✔</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.cancel}>✖</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.background, padding: 20, borderRadius: 12, width: '90%' },
  label: { color: colors.white, marginBottom: 4, fontSize: 14 },
  input: { backgroundColor: '#2E2F36', color: '#fff', padding: 10, borderRadius: 8, marginBottom: 12 },
  dateBtn: { padding: 10, backgroundColor: '#2E2F36', borderRadius: 8, marginBottom: 12 },
  dateText: { color: '#fff' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  switchLike: { width: 40, height: 22, backgroundColor: '#2e2f36', borderRadius: 12, padding: 2 },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },

  envelopesRow: { paddingVertical: 6, gap: 8 },
  envChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
  },
  envChipSelected: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  envDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  envText: { color: colors.white, maxWidth: 200 },
  envSub: { color: colors.textSecondary, fontSize: 12 },

  infoPanel: {
    backgroundColor: '#2E2F36',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  infoText: { color: colors.white },
  bold: { fontWeight: '700' },

  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  save: { fontSize: 24, color: 'green' },
  cancel: { fontSize: 24, color: 'red' },
});
