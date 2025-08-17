// screens/modals/CategoriesStats.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Header } from '../../components/category_stats/Header';
import { CatLite, monthLabels } from '../../components/home/CategoryYear';
import colors from '../../config/colors';
import { CategoryWithSubYearly, getCategoryStatsByYear } from '../../services/statService';
import { ScrollView } from 'react-native-gesture-handler';

type RouteParams = { cats: CatLite[]; selectedCategoryId: number };

export const CategoriesStats = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { cats, selectedCategoryId } = route.params as RouteParams;

  const [catId, setCatId] = useState<number>(selectedCategoryId);
  const [yearlyCategory, setYearlyCategory] = useState<CategoryWithSubYearly | undefined>();
  const [focusedBarIdxCat, setFocusedBarIdxCat] = useState<number | null>(null);
  const year = 2025;

  // --- dane ---
  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await getCategoryStatsByYear(catId, year);
      if (!alive) return;
      setYearlyCategory(data);
      setFocusedBarIdxCat(null);
    })();
    return () => {
      alive = false;
    };
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

  // --- BottomSheet Modal ---
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['60%', '92%'], []);

  const handleDismiss = useCallback(() => {
    // zamknij ekran po schowaniu bottom sheet
    navigation.goBack();
  }, [navigation]);

  // otwórz bottom sheet po zamontowaniu ekranu
  useEffect(() => {
    const id = requestAnimationFrame(() => sheetRef.current?.present());
    return () => cancelAnimationFrame(id);
  }, []);

  // Backdrop (kliknięcie zamyka)
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior='close' opacity={0.5} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['92%']}
      index={0}
      enableOverDrag={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.28)' }}
      handleStyle={{ paddingVertical: 6 }}
      backgroundStyle={{ backgroundColor: colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
      onDismiss={handleDismiss}
      keyboardBehavior='interactive'
      keyboardBlurBehavior='restore'
    >
      <BottomSheetFlatList
        contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 16 }}
        bounces
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
        ListFooterComponent={<View style={{ height: 12 }} />}
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

              <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                {empty ? (
                  <Text style={styles.loading}>Brak danych</Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    directionalLockEnabled
                    nestedScrollEnabled
                    simultaneousHandlers={sheetRef}
                  >
                    {/* szerokość > ekranu, żeby naprawdę było co przewijać */}
                    <View style={{}}>
                      <BarChart
                        data={data}
                        barWidth={15}
                        spacing={15}
                        noOfSections={4}
                        frontColor={sub.color}
                        rulesColor='#2E2F36'
                        xAxisLabelTextStyle={{ color: '#9aa' }}
                        yAxisTextStyle={{ color: '#9aa', fontSize: 10 }} // ⬅️ mniejsza czcionka
                        yAxisLabelWidth={25} // ⬅️ węższa kolumna legendy
                        yAxisTextNumberOfLines={1}
                        yAxisColor='transparent'
                        xAxisColor='transparent'
                      />
                    </View>
                  </ScrollView>
                )}
              </View>
            </View>
          );
        }}
      />
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  loading: { color: '#9aa', textAlign: 'center', paddingVertical: 12, fontSize: 14, fontWeight: '600' },
  subRow: { marginTop: 20, backgroundColor: '#20222a', borderRadius: 10, padding: 20, paddingBottom: 40 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  subName: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  subTotal: { color: '#fff', fontWeight: '700' },
});
