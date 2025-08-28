import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Charts } from '../components/home/Charts';
import { Envelopes } from '../components/home/Envelopes';
import { Limits } from '../components/home/Limits';
import colors from '../config/colors';
import { debugLog, RADIUS } from '../config/constants';
import { getBalancesForMonth } from '../services/balancesService';
import { CategoryYear } from '../components/home/CategoryYear';
import routes from '../navigation/routes';
import { getLast12Months } from '../services/vaultService';

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [monthOffset, setMonthOffset] = useState(0);

  const [saldoMonth, setSaldoMonth] = useState(0);
  const [saldoVault, setSaldoVault] = useState(0);
  const [saldoTotal, setSaldoTotal] = useState(0);

  const base = useMemo(() => new Date(), []);
  const current = useMemo(() => new Date(base.getFullYear(), base.getMonth() + monthOffset), [base, monthOffset]);
  const month0 = current.getMonth();
  const month1 = month0 + 1;
  const year = current.getFullYear();

  // --- LOADERS ---
  const loadBalances = async () => {
    const { month, vault, total } = await getBalancesForMonth(year, month1);
    setSaldoMonth(month);
    setSaldoVault(vault);
    setSaldoTotal(total);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadBalances();
    }, [year, month1])
  );

 return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 10, paddingTop: Constants.statusBarHeight, gap: 10 }}
      >
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => {
              navigation.navigate(routes.MODAL_VAULT, {});
            }}
            style={[styles.smallCard, styles.vaultSmallCard]}
          >
            <Text style={styles.smallLabel}>Bufor</Text>
            <Text style={styles.smallValue}>{saldoVault.toFixed(2)} zł</Text>
          </Pressable>

          <View style={[styles.smallCard, styles.totalSmallCard, { alignItems: 'flex-end' }]}>
            <Text style={styles.smallLabel}>Całość</Text>
            <Text style={styles.smallValue}>{saldoTotal.toFixed(2)} zł</Text>
          </View>
        </View>

        <View style={styles.largeMonthCard}>
          <Text style={styles.largeLabel}>
            {current.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
          </Text>
          <Text style={styles.largeValue}>{saldoMonth.toFixed(2)} zł</Text>
        </View>
        <Limits year={year} month0={month0} />
        <Envelopes year={year} month1={month1} />
        <Charts year={year} month1={month1} />
        <CategoryYear year={year} />
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 5 },
  smallCard: {
    flex: 1,
    padding: 6,
    borderRadius: RADIUS,
    backgroundColor: '#23303d',
  },
  smallLabel: { color: colors.white, opacity: 0.85, fontSize: 11 },
  smallValue: { color: colors.white, fontSize: 12, fontWeight: '700', marginTop: 2 },
  vaultSmallCard: { backgroundColor: colors.envelope },
  totalSmallCard: { backgroundColor: '#b28704' },

  largeMonthCard: {
    backgroundColor: '#2e7d32',
    borderRadius: RADIUS,
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  largeLabel: { color: colors.white, opacity: 0.85, fontSize: 12 },
  largeValue: { color: colors.white, fontSize: 20, fontWeight: '700', marginTop: 2 },

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
});
