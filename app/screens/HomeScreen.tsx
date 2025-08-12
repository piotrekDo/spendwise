import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import colors from '../config/colors';
import { Category } from '../components/Category';
import { CategoryDetailsModal } from '../components/CategoryDetailsModal';
import { NewEntryModal } from '../components/NewEntryModal';
import { DisplayCategory } from '../model/Spendings';
import { getCategorySkeletonForSelectedmonth } from '../services/categoriesService';
import { getSelectedCategorySpendings, getSpendingsInRange, SpendingEntry } from '../services/spendingsService';
import { getBalancesForMonth, getVaultBreakdown } from '../services/balancesService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import routes from '../navigation/routes';

const MONTHS = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];
const RADIUS = 12;

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [monthOffset, setMonthOffset] = useState(0);
  const [skeleton, setSkeleton] = useState<DisplayCategory[]>([]);
  const [data, setData] = useState<DisplayCategory[]>([]);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalSubId, setModalSubId] = useState<number | null>(null);
  const [categoryDetailsData, setCategoryDetailsData] = useState<SpendingEntry[]>([]);
  const [saldoMonth, setSaldoMonth] = useState(0);
  const [saldoVault, setSaldoVault] = useState(0);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultItems, setVaultItems] = useState<Array<{ label: string; balance: number }>>([]);

  const base = useMemo(() => new Date(), []);
  const current = useMemo(() => new Date(base.getFullYear(), base.getMonth() + monthOffset), [base, monthOffset]);
  const month0 = current.getMonth();
  const month1 = month0 + 1;
  const year = current.getFullYear();

  const getMonthDateRange = (y: number, m0: number) => {
    const m = m0 + 1;
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const last = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${last}`;
    return { start, end };
  };

  const loadBalances = async () => {
    const { month, vault, total } = await getBalancesForMonth(year, month1);
    setSaldoMonth(month);
    setSaldoVault(vault);
    setSaldoTotal(total);
  };

  const loadVaultBreakdown = async () => {
    const items = await getVaultBreakdown(year, month1, 12);
    setVaultItems(items.map(i => ({ label: i.label, balance: i.balance })));
  };

  const loadData = async () => {
    const { start, end } = getMonthDateRange(year, month0);
    const spendings: SpendingEntry[] = await getSpendingsInRange(start, end);

    const merged = skeleton.map(cat => {
      const updatedSub = cat.subcategories.map(sub => {
        const sum = spendings.filter(e => e.subcategoryId === sub.id).reduce((acc, e) => acc + e.amount, 0);
        return { ...sub, sum };
      });
      const sum = updatedSub.reduce((acc, s) => acc + s.sum, 0);
      return { ...cat, subcategories: updatedSub, sum };
    });

    setData(merged);
  };

  useFocusEffect(
    React.useCallback(() => {
      getCategorySkeletonForSelectedmonth(year, month1).then(setSkeleton);
      loadBalances();
      setVaultOpen(false);
    }, [year, month1])
  );

  useEffect(() => {
    if (skeleton.length > 0) loadData();
  }, [skeleton]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const openAddModal = (subId: number) => {
    setModalSubId(subId);
    setShowModal(true);
  };

  const openCategoryDetailsModal = async (categoryId: number) => {
    const { start, end } = getMonthDateRange(year, month0);
    const entries = await getSelectedCategorySpendings(categoryId, start, end);
    setCategoryDetailsData(entries);
  };

  const openEnvelopesModal = () => {
    navigation.navigate(routes.MODAL_ENVELOPES_HOME as any, { month1, year });
  };

  return (
    <View style={{ flex: 1, paddingTop: Constants.statusBarHeight, backgroundColor: colors.background }}>
      {/* Pasek nawigacji po miesiącach */}
      <View style={styles.navBar}>
        <Pressable onPress={() => setMonthOffset(o => o - 1)}>
          <Text style={styles.navArrow}>◀</Text>
        </Pressable>
        <Text style={styles.navTitle}>
          {MONTHS[month0]} {year}
        </Text>
        <Pressable onPress={() => setMonthOffset(o => o + 1)}>
          <Text style={styles.navArrow}>▶</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}>
        {/* Bufor i Całość */}
        <View style={styles.headerBar}>
          <Pressable
            onPress={async () => {
              const willOpen = !vaultOpen;
              setVaultOpen(willOpen);
              if (willOpen) await loadVaultBreakdown();
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

        {vaultOpen && (
          <View style={styles.vaultDetails}>
            {vaultItems.map((it, idx) => (
              <View key={`${it.label}-${idx}`} style={styles.vaultItem}>
                <Text style={styles.vaultItemLabel}>{it.label}</Text>
                <Text style={[styles.vaultItemValue, { color: it.balance >= 0 ? '#9EE493' : '#FF7B7B' }]}>
                  {it.balance.toFixed(2)} zł
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Miesiąc */}
        <View style={styles.largeMonthCard}>
          <Text style={styles.largeLabel}>Miesiąc</Text>
          <Text style={styles.largeValue}>{saldoMonth.toFixed(2)} zł</Text>
          <TouchableOpacity style={styles.envelopeButton} onPress={openEnvelopesModal}>
            <MaterialCommunityIcons name='email-outline' size={40} color={colors.white} />
          </TouchableOpacity>
        </View>

        {data.map(cat => (
          <Category
            key={cat.id}
            item={cat}
            expanded={expanded}
            toggleExpand={toggleExpand}
            openAddModal={openAddModal}
            openCategoryModal={() => openCategoryDetailsModal(cat.id)}
          />
        ))}
      </ScrollView>

      {showModal && modalSubId !== null && (
        <NewEntryModal
          monthOffset={monthOffset}
          subcategoryId={modalSubId}
          onClose={() => setShowModal(false)}
          onSave={async () => {
            setShowModal(false);
            await loadData();
            await loadBalances();
            if (vaultOpen) await loadVaultBreakdown();
          }}
        />
      )}

      {categoryDetailsData.length > 0 && (
        <CategoryDetailsModal
          data={categoryDetailsData}
          onClose={() => setCategoryDetailsData([])}
          onRefresh={async entryId => {
            await loadData();
            await loadBalances();
            if (vaultOpen) await loadVaultBreakdown();
            setCategoryDetailsData(s => s.filter(c => c.id !== entryId));
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#1c2a38',
  },
  navArrow: { color: colors.white, fontSize: 20 },
  navTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 10, marginTop: 5 },
  smallCard: {
    flex: 1,
    width: 100,
    padding: 6,
    borderRadius: RADIUS,
    backgroundColor: '#23303d',
  },
  smallLabel: { color: colors.white, opacity: 0.85, fontSize: 11 },
  smallValue: { color: colors.white, fontSize: 12, fontWeight: '700', marginTop: 2 },
  vaultSmallCard: { backgroundColor: '#1565c0' },
  totalSmallCard: { backgroundColor: '#b28704' },
  vaultDetails: {
    backgroundColor: '#0e2433',
    borderRadius: RADIUS,
    padding: 8,
    marginBottom: 10,
  },
  vaultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  vaultItemLabel: { color: colors.white },
  vaultItemValue: { fontWeight: '700' },
  largeMonthCard: {
    backgroundColor: '#2e7d32',
    borderRadius: RADIUS,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  largeLabel: { color: colors.white, opacity: 0.85, fontSize: 12 },
  largeValue: { color: colors.white, fontSize: 20, fontWeight: '700', marginTop: 2 },
  envelopeButton: {
    backgroundColor: '#1565c0',
    width: 100,
    height: 100,
    borderRadius: '50%',
    position: 'absolute',
    right: -10,
    bottom: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
