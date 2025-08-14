// screens/envelopes/EnvelopesHome.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../config/colors';
import { getActiveEnvelopes, Envelope, addEnvelope, depositToEnvelope } from '../../services/envelopesService';
import routes from '../../navigation/routes';

type RouteParams = { month1?: number; year: number };

const COLOR_PRESETS = ['#4F7CAC', '#7C4DFF', '#2E7D32', '#1565C0', '#B28704', '#C62828', '#8E24AA', '#00897B'];

export const EnvelopesHome = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { month1, year } = (route.params as RouteParams) || {};

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);

  // UI stanu dodawania
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState(''); // string -> parsujemy przy zapisie
  const [initialDeposit, setInitialDeposit] = useState(''); // jw.
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [saving, setSaving] = useState(false);

  const handleClose = () => navigation.goBack();

  const loadActiveEnvelopes = async () => {
    setLoading(true);
    const rows = await getActiveEnvelopes();
    setEnvelopes(rows);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadActiveEnvelopes();
    }, [])
  );

  const resetForm = () => {
    setNewName('');
    setNewTarget('');
    setInitialDeposit('');
    setSelectedColor(COLOR_PRESETS[0]);
  };

  const handleAddEnvelope = () => setShowAdd(s => !s);

  const handleSaveEnvelope = async () => {
    if (!newName.trim()) {
      Alert.alert('Brak nazwy', 'Podaj nazwę koperty.');
      return;
    }
    const targetNum = newTarget.trim() ? Number(newTarget.replace(',', '.')) : null;
    const depositNum = initialDeposit.trim() ? Number(initialDeposit.replace(',', '.')) : 0;

    if (Number.isNaN(targetNum as number)) {
      Alert.alert('Błędna kwota', 'Cel (target) musi być liczbą.');
      return;
    }
    if (Number.isNaN(depositNum)) {
      Alert.alert('Błędna kwota', 'Kwota startowa musi być liczbą.');
      return;
    }
    if (depositNum < 0) {
      Alert.alert('Błędna kwota', 'Kwota startowa nie może być ujemna.');
      return;
    }

    try {
      setSaving(true);
      const envelopeId = await addEnvelope(newName.trim(), selectedColor, targetNum ?? null);

      if (depositNum > 0) {
        // opis wpłaty generuje się automatycznie w serwisie
        await depositToEnvelope(envelopeId, depositNum, { year, month1 });
      }

      await loadActiveEnvelopes();
      resetForm();
      setShowAdd(false);
    } catch (e: any) {
      Alert.alert('Błąd', e?.message || 'Nie udało się dodać koperty.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Aktywne koperty</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddEnvelope}>
              <MaterialCommunityIcons name="plus-circle-outline" size={26} color={colors.primary} />
              <Text style={styles.addButtonText}>{showAdd ? 'Ukryj' : 'Dodaj'}</Text>
            </TouchableOpacity>
          </View>

          {/* Formularz dodawania */}
          {showAdd && (
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Nazwa *</Text>
              <TextInput
                style={styles.input}
                placeholder="np. Telewizor"
                placeholderTextColor="#8aa"
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.formLabel}>Cel (PLN)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="np. 5000"
                placeholderTextColor="#8aa"
                value={newTarget}
                onChangeText={setNewTarget}
              />

              <Text style={styles.formLabel}>Kwota startowa (PLN)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="np. 300"
                placeholderTextColor="#8aa"
                value={initialDeposit}
                onChangeText={setInitialDeposit}
              />
              <Text style={styles.hint}>Opis wpłaty generuje się automatycznie.</Text>

              <Text style={styles.formLabel}>Kolor</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorsRow}>
                {COLOR_PRESETS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setSelectedColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c, borderColor: selectedColor === c ? '#fff' : 'transparent' },
                    ]}
                  />
                ))}
              </ScrollView>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => {
                    resetForm();
                    setShowAdd(false);
                  }}
                >
                  <Text style={styles.btnText}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={saving}
                  style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.6 }]}
                  onPress={handleSaveEnvelope}
                >
                  <Text style={styles.btnText}>{saving ? 'Zapisywanie...' : 'Zapisz'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Lista kopert */}
          {loading ? (
            <Text style={styles.info}>Ładowanie...</Text>
          ) : envelopes.length === 0 ? (
            <Text style={styles.info}>Brak aktywnych kopert</Text>
          ) : (
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              {envelopes.map(env => {
                const saldo = Number(env.saldo ?? 0);
                const hasTarget = typeof env.target === 'number' && isFinite(env.target) && env.target > 0;
                const p = hasTarget ? saldo / (env.target as number) : 0;
                const progress = Math.max(0, Math.min(1, p)); // w liście klamrujemy do 100%

                return (
                  <TouchableOpacity
                    key={env.id}
                    style={styles.envelopeRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate(routes.ENVELOPE_DETAILS as any, { envelopeId: env.id, year, month1 })
                    }
                    onLongPress={() =>
                      navigation.navigate(routes.ENVELOPE_EDIT as any, {
                        envelopeId: env.id,
                        initialName: env.name,
                        initialColor: env.color,
                      })
                    }
                  >
                    <MaterialCommunityIcons
                      name="wallet-outline"
                      size={22}
                      color={env.color || colors.textPimary}
                      style={{ marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.envelopeName}>{env.name}</Text>
                      <Text style={styles.envelopeSaldo}>
                        Saldo: {saldo.toFixed(2)}
                        {hasTarget ? ` / ${Number(env.target).toFixed(2)}` : ''} zł
                      </Text>

                      {/* Pasek napełnienia */}
                      {hasTarget && (
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${progress * 100}%`, backgroundColor: env.color || '#4CAF50' },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleClose} accessibilityRole="button">
              <Text style={styles.cancel}>✖</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
};

const RADIUS = 12;

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1 },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 1000,
  },
  modal: {
    backgroundColor: colors.background,
    padding: 20, // mniejszy, żeby nie „puchło”
    borderRadius: 12,
    width: '92%',
    maxHeight: '90%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerText: { fontSize: 18, fontWeight: 'bold', color: colors.textPimary },
  addButton: { flexDirection: 'row', alignItems: 'center' },
  addButtonText: { marginLeft: 6, color: colors.primary, fontSize: 16 },
  info: { textAlign: 'center', paddingVertical: 16, color: colors.textSecondary },
  scroll: { marginBottom: 12 },

  formCard: {
    backgroundColor: '#203040',
    borderRadius: RADIUS,
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  formLabel: { color: colors.textPimary, marginTop: 8, marginBottom: 6, fontWeight: '600' },
  input: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#182636',
    color: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  hint: { color: '#8aa', fontSize: 12, marginTop: 4 },
  colorsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    borderWidth: 2,
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnCancel: { backgroundColor: '#35495e' },
  btnPrimary: { backgroundColor: colors.primary },
  btnText: { color: '#fff', fontWeight: '700' },

  envelopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderColor: '#2a3a4a',
  },
  envelopeName: { fontSize: 16, fontWeight: '500', color: colors.textPimary },
  envelopeSaldo: { fontSize: 13, color: colors.textSecondary },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancel: { fontSize: 24, color: 'red' },

  progressTrack: {
    backgroundColor: '#2E2F36',
    borderRadius: 6,
    height: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
});
