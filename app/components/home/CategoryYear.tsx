// components/home/CategoryYear.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import colors from '../../config/colors';
import { getMonthDateRange, monthLabels, RADIUS } from '../../config/constants';
import routes from '../../navigation/routes';
import { getSelectedCategorySpendings } from '../../services/entriesService';
import { getCategoryYearSeries, getExpenseCategoriesLite } from '../../services/statService';

type Props = { year: number };

export type CatLite = { id: number; name: string; color: string; icon: string };

export const CategoryYear = ({ year }: Props) => {
  const navigation = useNavigation<any>();

  const [cats, setCats] = useState<CatLite[]>([]);
  const [selectedCat, setSelectedCat] = useState<CatLite | null>(cats[0]);
  const [series, setSeries] = useState<(number | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await getExpenseCategoriesLite();
      setCats(list);
      if (list.length && selectedCat?.id === null) setSelectedCat(list[0]);
    })();
  }, []);

  useEffect(() => {
    if (!selectedCat) return;
    (async () => {
      setLoading(true);
      try {
        const rows = await getCategoryYearSeries(year, selectedCat.id);
        console.log(rows);
        setSeries(rows);
        setFocusedIndex(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [year, selectedCat]);

  const total = useMemo(() => series.filter((v): v is number => v != null).reduce((a, r) => a + r, 0), [series]);
  const avg = useMemo(() => {
    const nonNullSeries = series.filter(s => s !== null);
    return nonNullSeries.length ? total / nonNullSeries.length : 0;
  }, [series, total]);

  const maxIdx = useMemo(() => {
    let idx = -1;
    let max = -Infinity;

    for (let i = 0; i < series.length; i++) {
      const v = series[i];
      if (v == null) continue; 
      const n = typeof v === 'number' ? v : Number(v); 
      if (!Number.isFinite(n)) continue; 
      if (n > max) {
        max = n;
        idx = i;
      }
    }
    return idx;
  }, [series]);

  const minNonZeroIdx = useMemo(() => {
    if (!series.length) return -1;

    let idx = -1;
    let min = Infinity;

    for (let i = 0; i < series.length; i++) {
      const v = series[i];
      if (v != null && v > 0 && v < min) {
        min = v;
        idx = i;
      }
    }
    return idx;
  }, [series]);

  const barData = series.map((r, i) => ({
    value: r || 0,
    label: monthLabels[i],
    month: i,
    onPress: () => setFocusedIndex(i),
  }));

  const isEmpty = barData.every(b => b.value === 0);
  const active = cats.find(c => c.id === selectedCat?.id);

  const navigateToStats = () => {
    navigation.navigate(routes.CATEGORIES_STATS, {
      cats: cats,
      selectedCategoryId: selectedCat?.id,
    });
  };

  const handleOpenEntryDetailsModal = async (month0: number) => {
    const { start, end } = getMonthDateRange(year, month0);
    const entries = await getSelectedCategorySpendings(selectedCat?.id!, start, end);
    navigation.navigate(routes.CATEGORY_DETAILS, {
      data: entries,
      displayName: selectedCat?.name,
      displayIcon: selectedCat?.icon,
      displayColor: selectedCat?.color,
    });
  };

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHeader} onPress={navigateToStats}>
        <Text style={styles.cardTitle}>Rok {year} kategorie</Text>
        {!!active && <Text style={styles.cardSubtitle}>{active.name}</Text>}
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 8 }}
      >
        {cats.map((c, idx) => {
          const selected = c.id === selectedCat?.id;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedCat(c)}
              style={[styles.chip, { borderColor: c.color }, selected && { backgroundColor: c.color + '22' }]}
            >
              <MaterialCommunityIcons name={c.icon as any} size={20} color={c.color} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Wykres */}
      <View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}>
        {loading ? (
          <Text style={styles.loading}>Ładowanie…</Text>
        ) : isEmpty ? (
          <Text style={styles.loading}>Brak danych dla tej kategorii</Text>
        ) : (
          <BarChart
            data={barData}
            barWidth={16}
            spacing={16}
            noOfSections={4}
            frontColor={active?.color ?? '#90CAF9'}
            rulesColor='#2E2F36'
            xAxisLabelTextStyle={{ color: '#9aa' }}
            yAxisTextStyle={{ color: '#9aa' }}
            yAxisColor='transparent'
            xAxisColor='transparent'
            onLongPress={(item: any) => {
              handleOpenEntryDetailsModal(item.month);
            }}
            renderTooltip={(item: any, index: number) => {
              if (index !== focusedIndex) return null;
              return (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>
                    {monthLabels[index]}: {Number(item.value).toFixed(2)} zł
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>Suma: {total ? total.toFixed(2) : 0} zł</Text>
        <Text style={styles.summaryText}>Śr.: {avg ? avg.toFixed(2) : 0} zł</Text>
      </View>

      <View style={styles.summaryRow}>
        {maxIdx >= 0 ? (
          <Text style={styles.summaryText}>
            Max: {monthLabels[maxIdx]} ({series[maxIdx] ? series[maxIdx].toFixed(2) : 0} zł)
          </Text>
        ) : (
          <Text style={styles.summaryText}>Max: n/d</Text>
        )}

        {minNonZeroIdx >= 0 ? (
          <Text style={styles.summaryText}>
            Min: {monthLabels[minNonZeroIdx]} ({series[minNonZeroIdx] ? series[minNonZeroIdx].toFixed(2) : 0} zł)
          </Text>
        ) : (
          <Text style={styles.summaryText}>Min: n/d</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2128',
    borderRadius: RADIUS,
    padding: 12,
    paddingTop: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
    paddingVertical: 15,
  },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: colors.white, opacity: 0.7, fontSize: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: { marginLeft: 6, maxWidth: 160 },
  loading: {
    color: '#9aa',
    textAlign: 'center',
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  summaryText: { color: colors.white, opacity: 0.85, fontSize: 12 },
  tooltip: {
    position: 'absolute',
    top: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#2A2C33',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#444',
  },
  tooltipText: { color: '#fff', fontSize: 12 },
});
