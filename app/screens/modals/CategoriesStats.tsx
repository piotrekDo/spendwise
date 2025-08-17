import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { BarChart } from 'react-native-gifted-charts';
import { Header } from '../../components/category_stats/Header';
import { CatLite, monthLabels } from '../../components/home/CategoryYear';
import SwipeToDismissModal from '../../components/SwipeToDismissModal';
import { CategoryWithSubYearly, getCategoryStatsByYear } from '../../services/statService';

type RouteParams = { cats: CatLite[]; selectedCategoryId: number };

export const CategoriesStats = () => {
  const route = useRoute();
  const { cats, selectedCategoryId } = route.params as RouteParams;
  const [catId, setCatId] = useState<number>(selectedCategoryId);
  const [yearlyCategory, setYearlyCategory] = useState<CategoryWithSubYearly | undefined>();
  const [focusedBarIdxCat, setFocusedBarIdxCat] = useState<number | null>(null);
  const year = 2025;

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await getCategoryStatsByYear(catId, year);
      if (!alive) return;
      setYearlyCategory(data);
      setFocusedBarIdxCat(null);
    })();
    return () => { alive = false; };
  }, [catId, year]);

  const subRows = useMemo(() => {
    const subs = yearlyCategory?.subcategories ?? [];
    return subs.map(sub => {
      const data = (sub.sumsByMonth ?? Array(12).fill(0)).map((v, i) => ({ value: v, label: monthLabels[i] }));
      const total = data.reduce((a, d) => a + (d.value ?? 0), 0);
      const empty = data.every(d => (d.value ?? 0) === 0);
      return { sub, data, total, empty };
    });
  }, [yearlyCategory]);

  // (opcjonalnie) Możesz dalej trzymać scrollY do innych efektów, ale tutaj nie jest potrzebny do gestów.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: e => { scrollY.value = e.contentOffset.y; },
  });

  return (
    <SwipeToDismissModal>
      <Animated.FlatList
        contentContainerStyle={{ paddingBottom: 16 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // ⚙️ płynność
        bounces
        nestedScrollEnabled
        decelerationRate="normal"
        initialNumToRender={6}
        windowSize={7}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={16}
        removeClippedSubviews={false}

        data={subRows}
        keyExtractor={row => String(row.sub.subcategoryId)}
        ListHeaderComponent={
          <Header
            cats={cats}
            catId={catId}
            yearlyCategory={yearlyCategory}
            year={year}
            focusedBarIdxCat={focusedBarIdxCat}
            setCatId={setCatId}
            setFocusedBarIdxCat={setFocusedBarIdxCat}
          />
        }
        ListFooterComponent={<View style={{ height: 16 }} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const { sub, data, total, empty } = item;
          return (
            <View style={styles.subRow}>
              <View style={styles.subHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name={sub.icon as any} size={18} color={sub.color} />
                  <Text style={styles.subName}>{sub.name}</Text>
                </View>
                <Text style={styles.subTotal}>{total.toFixed(2)} zł</Text>
              </View>

              <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
                {empty ? (
                  <Text style={styles.loading}>Brak danych</Text>
                ) : (
                  <BarChart
                    data={data}
                    barWidth={14}
                    spacing={14}
                    noOfSections={4}
                    frontColor={sub.color}
                    rulesColor="#2E2F36"
                    xAxisLabelTextStyle={{ color: '#9aa' }}
                    yAxisTextStyle={{ color: '#9aa' }}
                    yAxisColor="transparent"
                    xAxisColor="transparent"
                  />
                )}
              </View>
            </View>
          );
        }}
      />
    </SwipeToDismissModal>
  );
};

const styles = StyleSheet.create({
  loading: { color: '#9aa', textAlign: 'center', paddingVertical: 12, fontSize: 14, fontWeight: '600' },
  subRow: { marginTop: 20, backgroundColor: '#20222a', borderRadius: 10, padding: 20, paddingBottom: 40 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  subName: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  subTotal: { color: '#fff', fontWeight: '700' },
});
