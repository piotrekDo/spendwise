import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../config/colors';
import { RADIUS } from '../../config/constants';
import routes from '../../navigation/routes';
import { Envelope, getActiveEnvelopes } from '../../services/envelopesService';

interface Props {
  year: number;
  month1: number;
}

export const Envelopes = ({ year, month1 }: Props) => {
  const navigation = useNavigation<any>();
  const [activeEnvelopes, setActiveEnvelopes] = useState<Envelope[]>([]);
  const [loadingEnvelopes, setLoadingEnvelopes] = useState(false);

  const loadEnvelopes = async () => {
    setLoadingEnvelopes(true);
    try {
      const rows = await getActiveEnvelopes();
      setActiveEnvelopes(rows);
    } finally {
      setLoadingEnvelopes(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadEnvelopes();
    }, [year, month1])
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Aktywne koperty</Text>
        <Text style={styles.cardSubtitle}>
          {loadingEnvelopes ? 'Ładowanie…' : activeEnvelopes.length === 0 ? 'Brak aktywnych kopert' : ''}
        </Text>
      </View>

      {activeEnvelopes.map(env => {
        const saldo = Number(env.saldo ?? 0);
        const hasTarget = typeof env.target === 'number' && isFinite(env.target) && env.target > 0;
        const p = hasTarget ? saldo / (env.target as number) : 0;
        const progress = Math.max(0, Math.min(1, p));

        return (
          <TouchableOpacity
            key={env.id}
            style={styles.envelopeRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(routes.ENVELOPE_DETAILS as any, { envelopeId: env.id, year, month1 })}
          >
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
                <Text style={styles.envelopeSaldo}>
                  {saldo.toFixed(2)}
                  {hasTarget ? ` / ${Number(env.target).toFixed(2)}` : ''} zł
                </Text>
              </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2128',
    borderRadius: RADIUS,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: colors.white, opacity: 0.6, fontSize: 12 },
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
});
