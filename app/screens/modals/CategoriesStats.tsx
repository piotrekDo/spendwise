import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Header } from '../../components/category_stats/Header';
import { SubcategoryStats } from '../../components/category_stats/SubcategoryStats';
import { CatLite } from '../../components/home/CategoryYear';
import colors from '../../config/colors';
import {
  CategoryWithSubMulti,
  getCategoryStatsLastNYears,
  groupBySubcategory,
  SubcategoryMulti,
} from '../../services/statService';
import useMonthCategoryStats from '../../state/useMonthCategoryStats';

type RouteParams = { cats: CatLite[] };

type LocalState = {
  isNYearsLoading: boolean;
  yearlyCategory?: CategoryWithSubMulti;
  groupedSubcategories: SubcategoryMulti[];
  focusedBarIdxCat: number | null;
};

const initialLocal: LocalState = {
  isNYearsLoading: false,
  yearlyCategory: undefined,
  groupedSubcategories: [],
  focusedBarIdxCat: null,
};

function reducer(state: LocalState, patch: Partial<LocalState>) {
  return { ...state, ...patch };
}

export const CategoriesStats = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { cats } = route.params as RouteParams;
  const year = useMonthCategoryStats(s => s.year);
  const selectedCategory = useMonthCategoryStats(s => s.selectedCategory);
  const isDataloading = useMonthCategoryStats(s => s.isDataloading);
  const [local, setLocal] = useReducer(reducer, initialLocal);

  const isUiLoading = isDataloading || local.isNYearsLoading;

  useEffect(() => {
    if (!selectedCategory) return;
    setLocal({ isNYearsLoading: true });
    let alive = true;
    (async () => {
      const data = await getCategoryStatsLastNYears(selectedCategory.id, year, 5, 'allYears');
      // debugLog(data, 'Stats');
      setLocal({ isNYearsLoading: false });
      if (!alive) return;
        setLocal({
          isNYearsLoading: false,
          yearlyCategory: data,
          focusedBarIdxCat: null,
          groupedSubcategories: groupBySubcategory(data),
        });
    })();
    return () => {
      alive = false;
    };
  }, [selectedCategory, year]);

  const sheetRef = useRef<BottomSheetModal>(null);

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    const id = requestAnimationFrame(() => sheetRef.current?.present());
    return () => cancelAnimationFrame(id);
  }, []);

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
          data={local.groupedSubcategories}
          keyExtractor={sub => String(sub.subcategoryId)}
          ListHeaderComponent={
            <Header
              cats={cats}
              yearlyCategory={local.yearlyCategory}
              focusedBarIdxCat={local.focusedBarIdxCat}
              setFocusedBarIdxCat={(i: number | null) => setLocal({ focusedBarIdxCat: i })}
              isLoading={isUiLoading} 
            />
          }
          ListFooterComponent={<View style={{ height: 12 }} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => <SubcategoryStats sub={item} sheetRef={sheetRef} year={year} isLoading={isUiLoading} />}
        />
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({});
