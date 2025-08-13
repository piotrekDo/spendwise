// screens/envelopes/EnvelopeEdit.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getEnvelopeById, updateEnvelope, deleteEnvelope } from '../../services/envelopesService';
import colors from '../../config/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

type RouteParams = { envelopeId:number; initialName?:string; initialColor?:string };

const COLOR_PRESETS = ['#4F7CAC', '#7C4DFF', '#2E7D32', '#1565C0', '#B28704', '#C62828', '#8E24AA', '#00897B', '#FF7043', '#00ACC1'];

const parseAmount = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

export const EnvelopeEdit = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { envelopeId, initialName, initialColor } = (route.params as RouteParams);

  const [name, setName] = useState(initialName ?? '');
  const [color, setColor] = useState(initialColor ?? '#4F7CAC');
  const [saldo, setSaldo] = useState<number>(0);

  const [targetEnabled, setTargetEnabled] = useState<boolean>(false);
  const [targetInput, setTargetInput] = useState<string>('');
  const targetValue = useMemo(() => parseAmount(targetInput), [targetInput]);

  const rawProgress = useMemo(() => {
    if (!targetEnabled || targetValue == null || !Number.isFinite(targetValue) || targetValue <= 0) return 0;
    const p = saldo / (targetValue as number);
    return Number.isFinite(p) ? Math.max(0, p) : 0;
  }, [saldo, targetEnabled, targetValue]);
  const percentLabel = Math.round(rawProgress * 100);

  const load = useCallback(async () => {
    const env = await getEnvelopeById(envelopeId);
    if (env) {
      setName(env.name);
      setColor(env.color ?? '#4F7CAC');
      setSaldo(Number(env.saldo ?? 0));
      if (env.target != null && Number.isFinite(Number(env.target))) {
        setTargetEnabled(true);
        setTargetInput(String(Number(env.target)));
      } else {
        setTargetEnabled(false);
        setTargetInput('');
      }
    }
  }, [envelopeId]);

  useEffect(() => { load(); }, [load]);

  const onSave = async () => {
    if (!name.trim()) { Alert.alert('Błąd', 'Podaj nazwę.'); return; }
    let finalTarget: number | null = null;
    if (targetEnabled) {
      const parsed = targetValue;
      if (!Number.isFinite(parsed as number) || (parsed as number) <= 0) {
        Alert.alert('Błąd', 'Cel musi być dodatnią liczbą.');
        return;
      }
      finalTarget = parsed as number;
    }
    await updateEnvelope(envelopeId, { name: name.trim(), color, target: finalTarget });
    navigation.goBack();
  };

  const onDelete = async () => {
    Alert.alert('Usuń kopertę', 'Na pewno chcesz usunąć tę kopertę?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          try { await deleteEnvelope(envelopeId); navigation.goBack(); }
          catch (e:any) { Alert.alert('Nie można usunąć', e?.message || 'Usuń najpierw powiązane wpisy.'); }
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={(Constants.statusBarHeight || 0) + 10}
    >
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button">
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPimary} />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Edycja koperty</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button">
          <MaterialCommunityIcons name="close" size={22} color={colors.textPimary} />
        </TouchableOpacity>
      </View>

      {/* Scroll całego ekranu, a karta ma auto-wysokość z maxHeight */}
      <ScrollView
        contentContainerStyle={styles.pageScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Nagłówek karty */}
          <View style={styles.headerRow}>
            <View style={[styles.iconBadge, { backgroundColor: color + '33', borderColor: color }]}>
              <MaterialCommunityIcons name="wallet-outline" size={22} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Nazwa koperty"
                placeholderTextColor="#8aa"
              />
              <Text style={styles.subtle}>Saldo: {saldo.toFixed(2)} zł</Text>
            </View>
          </View>

          {/* Kolory */}
          <Text style={styles.label}>Kolor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorsRow}>
            {COLOR_PRESETS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c, borderColor: color === c ? '#fff' : 'transparent' },
                ]}
              />
            ))}
          </ScrollView>

          {/* Cel */}
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Cel</Text>
            <TouchableOpacity onPress={() => setTargetEnabled(v => !v)} accessibilityRole="button">
              <View style={[styles.switchLike, targetEnabled && { backgroundColor: color }]}>
                <View style={[styles.switchHandle, targetEnabled && { transform: [{ translateX: 18 }] }]} />
              </View>
            </TouchableOpacity>
          </View>

          {targetEnabled && (
            <>
              <View style={styles.targetRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={targetInput}
                  onChangeText={setTargetInput}
                  keyboardType="decimal-pad"
                  placeholder="np. 5000"
                  placeholderTextColor="#8aa"
                />
                <TouchableOpacity onPress={() => setTargetInput('')} style={styles.clearBtn}>
                  <MaterialCommunityIcons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Pasek realnego % z nadmiarem */}
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFillBase,
                      { width: `${Math.min(rawProgress, 1) * 100}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={styles.percent}>{percentLabel}%</Text>
              </View>
            </>
          )}

          {/* Akcje */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => navigation.goBack()}>
              <Text style={styles.btnGhostText}>Anuluj</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={onDelete}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Usuń</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={onSave}>
              <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Zapisz</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const RADIUS = 14;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingTop: (Constants.statusBarHeight || 0) + 10,
    paddingBottom: 12,
  },

  // topbar
  topbar: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { color: colors.textPimary, fontSize: 16, fontWeight: '700' },

  // stronny scroll + centrowanie karty
  pageScroll: {
    paddingBottom: 16,
    alignItems: 'center',              // centruj kartę poziomo
  },

  // KARTA: auto-height + limit
  card: {
    width: '92%',
    backgroundColor: '#1F2128',
    borderRadius: RADIUS,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    maxHeight: '80%',                  // << klucz: nie na całą wysokość
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBadge: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    marginRight: 10, borderWidth: 1,
  },
  nameInput: {
    color: colors.white, fontSize: 18, fontWeight: '700',
    paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)',
  },
  subtle: { color: colors.textSecondary, marginTop: 2 },

  label: { color: colors.textPimary, marginTop: 10, marginBottom: 6, fontWeight: '600' },

  colorsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  colorDot: { width: 28, height: 28, borderRadius: 14, marginRight: 8, borderWidth: 2 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  switchLike: {
    width: 40, height: 22, backgroundColor: '#2e2f36', borderRadius: 12, padding: 2,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)',
  },
  switchHandle: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },

  targetRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor:'#182636', color:'#fff', borderRadius:10, paddingVertical:10, paddingHorizontal:10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)',
  },
  clearBtn: {
    marginLeft: 8, paddingHorizontal: 10, height: 44, borderRadius: 10, backgroundColor: '#35495e',
    alignItems: 'center', justifyContent: 'center',
  },

  // progress
  progressWrap: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, position: 'relative', backgroundColor: '#2E2F36', borderRadius: 8, height: 10, overflow: 'visible' },
  progressFillBase: { position: 'relative', height: '100%', borderRadius: 8 },
  progressFillOver: {
    position: 'absolute', top: 0, height: '100%',
    borderTopRightRadius: 8, borderBottomRightRadius: 8,
    backgroundColor: '#E53935',
    shadowColor: '#E53935', shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 2,
  },
  percent: { color: colors.textPimary, fontWeight: '700', width: 56, textAlign: 'right' },

  // akcje
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnDanger: { backgroundColor: '#C62828' },
  btnText: { color:'#fff', fontWeight:'700' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  btnGhostText: { color: colors.white, fontWeight: '700' },
});
