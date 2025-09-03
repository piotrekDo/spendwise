import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import colors from '../../config/colors';
import { getMonthDateRange, monthLabels, RADIUS } from '../../config/constants';
import routes from '../../navigation/routes';
import { getSelectedCategorySpendings } from '../../services/entriesService';
import { getExpenseCategoriesLite } from '../../services/statService';
import useMonthCategoryStats from '../../state/useMonthCategoryStats';

type Props = { year: number };

export type CatLite = { id: number; name: string; color: string; icon: string };

export const CategoryYear = ({ year }: Props) => {
  const navigation = useNavigation<any>();

  const [cats, setCats] = useState<CatLite[]>([]);
  const { selectedCategory, setSelectedCategory, setYear, isDataloading, series, total, avg, maxIdx, minNonZeroIdx, barData } =
    useMonthCategoryStats();

  useEffect(() => {
    (async () => {
      const list = await getExpenseCategoriesLite();
      setCats(list);
      setSelectedCategory(list[0])
      if (list.length && selectedCategory?.id === null) setSelectedCategory(list[0]);
    })();
  }, []);

  useEffect(() => {
    setYear(year);
  }, [year]);

  const isEmpty = barData && barData.every(b => b.value === 0);
  const active = cats.find(c => c.id === selectedCategory?.id);

  const navigateToStats = () => {
    navigation.navigate(routes.CATEGORIES_STATS, {
      cats: cats,
      selectedCategoryId: selectedCategory?.id,
    });
  };

  const handleOpenEntryDetailsModal = async (month0: number) => {
    const { start, end } = getMonthDateRange(year, month0);
    const entries = await getSelectedCategorySpendings(selectedCategory?.id!, start, end);
    navigation.navigate(routes.CATEGORY_DETAILS, {
      data: entries,
      displayName: selectedCategory?.name,
      displayIcon: selectedCategory?.icon,
      displayColor: selectedCategory?.color,
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
          const selected = c.id === selectedCategory?.id;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedCategory(c)}
              style={[styles.chip, { borderColor: c.color }, selected && { backgroundColor: c.color + '22' }]}
            >
              <MaterialCommunityIcons name={c.icon as any} size={20} color={c.color} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}>
        {isDataloading ? (
          <LottieView
            style={{
              width: 200,
              height: 200,
            }}
            autoPlay
            loop
            source={require('../../../assets/Money.json')}
          />
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
    backgroundColor: colors.background2,
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
