import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Header } from '../../components/category_stats/Header';
import { SubcategoryStats } from '../../components/category_stats/SubcategoryStats';
import { CatLite } from '../../components/home/CategoryYear';
import colors from '../../config/colors';
import {
  CategoryWithSubMulti,
  getCategoryStatsLastNYears,
  groupBySubcategory,
  SubcategoryMulti
} from '../../services/statService';

type RouteParams = { cats: CatLite[]; selectedCategoryId: number };

export const CategoriesStats = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { cats, selectedCategoryId } = route.params as RouteParams;

  const [catId, setCatId] = useState<number>(selectedCategoryId);
  const [yearlyCategory, setYearlyCategory] = useState<CategoryWithSubMulti | undefined>();
  const [groupedSubcategories, setGroupedSubcategories] = useState<SubcategoryMulti[]>([]);
  const [focusedBarIdxCat, setFocusedBarIdxCat] = useState<number | null>(null);
  const year = 2025;

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await getCategoryStatsLastNYears(catId, year, 5, 'allYears');
      // debugLog(data, 'Stats');
      if (!alive) return;
      setYearlyCategory(data);
      setFocusedBarIdxCat(null);
      setGroupedSubcategories(groupBySubcategory(data));
    })();
    return () => {
      alive = false;
    };
  }, [catId, year]);

  // --- BottomSheet Modal ---
  const sheetRef = useRef<BottomSheetModal>(null);

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
        data={groupedSubcategories}
        keyExtractor={sub => String(sub.subcategoryId)}
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
        renderItem={({ item }) => <SubcategoryStats sub={item} sheetRef={sheetRef} year={year} />}
      />
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({});
