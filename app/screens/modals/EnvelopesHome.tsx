import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EnvelopeCard } from '../../components/EnvelopeCard';
import { AddEnvelopeForm } from '../../components/envelope/AddEnvelopeForm';
import colors from '../../config/colors';
import { Envelope, getActiveEnvelopes } from '../../services/envelopesService';

type RouteParams = { month1?: number; year: number };

export const EnvelopesHome = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { month1, year } = (route.params as RouteParams) || {};
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

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

  const handleAddEnvelope = () => setShowAdd(s => !s);

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
              <MaterialCommunityIcons name='plus-circle-outline' size={26} color={colors.primary} />
              <Text style={styles.addButtonText}>{showAdd ? 'Ukryj' : 'Dodaj'}</Text>
            </TouchableOpacity>
          </View>

          {showAdd && (
            <AddEnvelopeForm setShowAdd={setShowAdd} setEnvelopes={setEnvelopes} year={year} month1={month1!} />
          )}

          {loading ? (
            <Text style={styles.info}>Ładowanie...</Text>
          ) : envelopes.length === 0 ? (
            <Text style={styles.info}>Brak aktywnych kopert</Text>
          ) : (
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps='handled'>
              {envelopes.map(env => (
                <EnvelopeCard key={env.id} env={env} year={year} month1={month1!} />
              ))}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleClose} accessibilityRole='button'>
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
