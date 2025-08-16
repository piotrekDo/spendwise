import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../config/colors';
import { RADIUS } from '../../config/constants';
import { getMonthLimits, LimitItem } from '../../services/statService';

interface Props {
  year: number;
  month0: number;
}

export const Limits = ({ year, month0 }: Props) => {
  const [limits, setLimits] = useState<LimitItem[]>([]);
  const [loadingLimits, setLoadingLimits] = useState(false);

  const loadLimits = async () => {
    setLoadingLimits(true);
    try {
      setLimits(await getMonthLimits(year, month0));
    } finally {
      setLoadingLimits(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadLimits();
    }, [year, month0])
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Limity (miesiąc)</Text>
        <Text style={styles.cardSubtitle}>
          {loadingLimits ? 'Ładowanie…' : limits.length === 0 ? 'Brak zdefiniowanych limitów' : ''}
        </Text>
      </View>

      {limits.map(item => {
        const pct = Math.max(0, item.percent);
        const barPct = Math.min(100, pct);
        const barColor = pct > 100 ? '#E53935' : pct >= 80 ? '#FB8C00' : '#43A047';

        return (
          <View key={item.id} style={styles.limitRow}>
            <View style={styles.limitLeft}>
              <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.limitName}>{item.name}</Text>
                <Text style={styles.limitAmounts}>
                  {item.used.toFixed(2)} / {item.limit.toFixed(2)} zł
                </Text>
              </View>
            </View>

            <View style={styles.limitRight}>
              <Text style={[styles.limitPercent, pct > 100 && { color: '#E53935' }]}>{Math.round(pct)}%</Text>
            </View>

            <View style={styles.limitTrack}>
              <View style={[styles.limitFill, { width: `${barPct}%`, backgroundColor: barColor }]} />
            </View>

            <View style={styles.limitFooter}>
              <Text style={styles.limitLeftText}>
                {item.left >= 0
                  ? `Pozostało ${item.left.toFixed(2)} zł`
                  : `Przekroczono ${Math.abs(item.left).toFixed(2)} zł`}
              </Text>
            </View>
          </View>
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

  // limity
  limitRow: { marginBottom: 10 },
  limitLeft: { flexDirection: 'row', alignItems: 'center', paddingRight: 56 },
  limitName: { color: colors.white, fontSize: 14, fontWeight: '600' },
  limitAmounts: { color: colors.white, opacity: 0.7, fontSize: 12, marginTop: 2 },
  limitRight: { position: 'absolute', right: 0, top: 0 },
  limitPercent: { color: colors.white, fontWeight: '700' },
  limitTrack: { marginTop: 6, backgroundColor: '#2E2F36', borderRadius: 8, height: 10, overflow: 'hidden' },
  limitFill: { height: '100%', borderRadius: 8 },
  limitFooter: { marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' },
  limitLeftText: { color: colors.white, opacity: 0.8, fontSize: 11 },
});
