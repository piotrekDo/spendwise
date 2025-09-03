import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../config/colors';
import routes from '../navigation/routes';
import { Envelope } from '../services/envelopesService';
import * as Haptics from 'expo-haptics';
import { Entry, getEntryById } from '../services/entriesService';

interface Props {
  env: Envelope;
  year: number;
  month1: number;
}

export const EnvelopeCard = ({ env, year, month1 }: Props) => {
  const navigation = useNavigation<any>();
  const [finishedEntry, setFinishedEntry] = useState<Entry | undefined>(undefined);

  useEffect(() => {
    if (env.entryId) {
      getEntryById(env.entryId).then(entry => {
        console.log(entry);
        setFinishedEntry(entry);
      });
    }
  }, []);

  const saldo = Number(env.saldo ?? 0);
  const hasTarget = typeof env.target === 'number' && isFinite(env.target) && env.target > 0;
  const p = hasTarget ? saldo / (env.target as number) : 0;
  const progress = Math.max(0, Math.min(1, p));

  const renderSaldo = () => {
    return !env.closed && !env.finished ? (
      <Text style={styles.envelopeSaldo}>
        {saldo.toFixed(2)}
        {hasTarget ? ` / ${Number(env.target).toFixed(2)}` : ''} zł
      </Text>
    ) : env.finished ? (
      <Text style={[styles.envelopeSaldo, { color: colors.success }]}>Ukończona {env.finished}</Text>
    ) : (
      <Text style={[styles.envelopeSaldo, { color: colors.neutralBlue }]}>Zamknięta {env.closed}</Text>
    );
  };

  return (
    <TouchableOpacity
      key={env.id}
      style={[styles.envelopeCard, {backgroundColor: env.finished ? '' : ''}]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate(routes.ENVELOPE_DETAILS as any, { envelopeId: env.id, year, month1 })}
      onLongPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate(routes.ENVELOPE_EDIT as any, {
          envelopeId: env.id,
          initialName: env.name,
          initialColor: env.color,
        });
      }}
    >
      <View style={styles.envelopeRow}>
        <MaterialCommunityIcons
          name='wallet-outline'
          size={22}
          color={env.color || colors.textPimary}
          style={{ marginRight: 8 }}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.envelopeName} numberOfLines={1}>
              {env.name}
            </Text>
            {renderSaldo()}
          </View>

          {hasTarget && !env.finished && (
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: env.color || '#4CAF50' }]}
              />
            </View>
          )}
        </View>
      </View>
      {finishedEntry && (
        <View style={{ width: '100%' }}>
          <View style={[styles.flexRow]}>
            <Text style={[styles.entryText]}>{finishedEntry.amount.toFixed(2)} zł</Text>
            <Text style={[styles.entryText]}>{finishedEntry.date}</Text>
          </View>
          <View style={[styles.flexRow]}>
            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
              <MaterialCommunityIcons name={finishedEntry.subcategoryIcon as any} color={colors.textPimary} size={20} />
              <Text style={[styles.entryText]}>{finishedEntry.subcategoryName}</Text>
            </View>
            {finishedEntry.description && <Text style={[styles.entryText]}>{finishedEntry.description}</Text>}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  envelopeCard: {
    marginVertical: 5,
    padding: 5,
    borderRadius: 10,
  },
  flexRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  envelopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderColor: '#2a3a4a',
  },
  envelopeName: { fontSize: 14, fontWeight: '600', color: colors.textPimary, maxWidth: '60%' },
  envelopeSaldo: { fontSize: 13, color: colors.textSecondary },

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
  entryText: {
    color: colors.textPimary,
    fontSize: 12,
  },
});
