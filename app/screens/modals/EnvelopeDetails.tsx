import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../config/colors';
import { getEnvelopeDeposits, depositToEnvelope, getEnvelopeById } from '../../services/envelopesService';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Constants from 'expo-constants';
import { deleteEntry } from '../../services/entriesService';

type RouteParams = { envelopeId: number; year: number; month1: number };

export const EnvelopeDetails = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { envelopeId, year, month1 } = (route.params as RouteParams);

  const [envName, setEnvName] = useState('');
  const [envColor, setEnvColor] = useState('#4F7CAC');
  const [saldo, setSaldo] = useState(0);
  const [target, setTarget] = useState<number | null>(null);

  const [entries, setEntries] = useState<Array<{ id:number; date:string; amount:number; note:string }>>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const loadAll = async () => {
    const env = await getEnvelopeById(envelopeId);
    if (env) {
      setEnvName(env.name);
      setEnvColor(env.color ?? '#4F7CAC');
      setSaldo(Number(env.saldo ?? 0));
      setTarget(env.target != null ? Number(env.target) : null);
    }
    const list = await getEnvelopeDeposits(envelopeId);
    setEntries(list);
  };

  useEffect(() => { loadAll(); }, [envelopeId, year, month1]);

  // odśwież po powrocie na ekran
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  // REALNY progres (bez klampowania do 1.0)
  const rawProgress = useMemo(() => {
    if (target == null || !isFinite(target) || target <= 0) return 0;
    const p = saldo / target;
    return Number.isFinite(p) ? Math.max(0, p) : 0;
  }, [saldo, target]);

  const percentLabel = Math.round(rawProgress * 100);

  const addDeposit = async () => {
    const val = amount.trim() ? Number(amount.replace(',', '.')) : NaN;
    if (!Number.isFinite(val) || val <= 0) {
      Alert.alert('Błąd', 'Podaj poprawną kwotę > 0.');
      return;
    }
    try {
      await depositToEnvelope(envelopeId, val, { year, month1, note: note.trim() || 'Wpłata do koperty' });
      setAmount(''); setNote('');
      await loadAll();
    } catch (e:any) {
      Alert.alert('Błąd', e?.message || 'Nie udało się dodać wpłaty.');
    }
  };

  const removeEntry = async (id: number) => {
    try {
      await deleteEntry(id);
      await loadAll();
    } catch (e:any) {
      Alert.alert('Błąd', e?.message || 'Nie udało się usunąć wpisu.');
    }
  };

  const renderRight = (id:number) => (
    <TouchableOpacity style={styles.deleteBtn} onPress={() => removeEntry(id)}>
      <MaterialCommunityIcons name="trash-can-outline" size={24} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Własny pasek nawigacji */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button">
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPimary} />
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>{envName || 'Szczegóły koperty'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button">
          <MaterialCommunityIcons name="close" size={22} color={colors.textPimary} />
        </TouchableOpacity>
      </View>

      {/* Karta z zawartością */}
      <View style={styles.card}>
        {/* Header wewnątrz karty */}
        <View style={styles.headerRow}>
          <View style={[styles.iconBadge, { backgroundColor: envColor + '33', borderColor: envColor }]}>
            <MaterialCommunityIcons name="wallet-outline" size={22} color={envColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{envName}</Text>
            <Text style={styles.saldo}>
              Saldo: {saldo.toFixed(2)}{target != null ? ` / ${target.toFixed(2)}` : ''} zł
            </Text>
          </View>
          {target != null && (
            <Text style={styles.percent}>{percentLabel}%</Text>
          )}
        </View>

        {/* Pasek napełnienia (z nadmiarem) */}
        {target != null && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              {/* do 100% */}
              <View
                style={[
                  styles.progressFillBase,
                  { width: `${Math.min(rawProgress, 1) * 100}%`, backgroundColor: envColor },
                ]}
              />
            </View>
          </View>
        )}

        {/* Dodawanie wpłaty */}
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Kwota"
            placeholderTextColor="#8aa"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={[styles.input, { flex: 2, marginLeft: 8 }]}
            placeholder="Notatka"
            placeholderTextColor="#8aa"
            value={note}
            onChangeText={setNote}
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: envColor }]} onPress={addDeposit}>
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Dodaj</Text>
          </TouchableOpacity>
        </View>

        {/* Lista wpłat */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
          {entries.map(e => (
            <ReanimatedSwipeable key={e.id} renderRightActions={() => renderRight(e.id)}>
              <View style={styles.entryRow}>
                <View style={{ width: 96 }}>
                  <Text style={styles.entryDate}>{e.date}</Text>
                </View>
                <View style={{ width: 110 }}>
                  <Text style={styles.entryAmount}>{e.amount.toFixed(2)} zł</Text>
                </View>
                <Text style={styles.entryNote} numberOfLines={2}>{e.note}</Text>
              </View>
            </ReanimatedSwipeable>
          ))}
          {entries.length === 0 && <Text style={styles.empty}>Brak wpłat w tym miesiącu</Text>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const CARD_RADIUS = 14;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingTop: Constants.statusBarHeight + 10,
    paddingBottom: 12
  },

  // topbar
  topbar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  topbarTitle: {
    flex: 1, textAlign: 'center', color: colors.textPimary, fontSize: 16, fontWeight: '700', paddingHorizontal: 6,
  },

  // card container (żeby nie było full-bleed)
  card: {
    flex: 1,
    backgroundColor: '#1F2128',
    borderRadius: CARD_RADIUS,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBadge: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    marginRight: 10, borderWidth: 1,
  },
  title: { color: colors.textPimary, fontSize: 18, fontWeight: '700' },
  saldo: { color: colors.textSecondary, marginTop: 2 },
  percent: { color: colors.textPimary, fontWeight: '700' },

  // progress (realny % z nadmiarem)
  progressWrap: { marginTop: 6, marginBottom: 10 },
  progressTrack: {
    position: 'relative',
    backgroundColor: '#2E2F36',
    borderRadius: 8,
    height: 10,
    overflow: 'visible', // pozwól nadmiarowi wyjść poza tor
  },
  progressFillBase: {
    position: 'relative',
    height: '100%',
    borderRadius: 8,
  },

  // form
  addRow: { flexDirection:'row', alignItems:'center', marginBottom: 10 },
  input: {
    backgroundColor:'#182636', color:'#fff', borderRadius:10, paddingVertical:10, paddingHorizontal:10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)',
  },
  addBtn: {
    marginLeft:8, paddingVertical:10, paddingHorizontal:12, borderRadius:10, flexDirection:'row', alignItems:'center', gap:6,
  },
  addBtnText: { color:'#fff', fontWeight:'700' },

  // list
  entryRow: { flexDirection:'row', alignItems:'center', paddingVertical:10, borderBottomWidth:0.5, borderColor:'#2a3a4a' },
  entryDate: { color: colors.textSecondary },
  entryAmount: { color:'#9EE493', fontWeight:'700' },
  entryNote: { color: colors.textPimary, flex: 1, marginLeft: 8 },

  deleteBtn: { backgroundColor:'#C62828', justifyContent:'center', alignItems:'center', width:64, height:'100%' },
  empty: { color:'#8aa', textAlign:'center', marginTop: 12 },
});
