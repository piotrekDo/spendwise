import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import colors from '../../config/colors'; // jeśli używasz
import { getLast12Months, MonthSummary } from '../../services/vaultService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { monthColors, monthColorsText, monthIcons, MONTHS_PL } from '../../config/constants';

export const Vault = () => {
  const navigation = useNavigation<any>();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [data, setData] = useState<MonthSummary[]>([]);

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior='close' opacity={0.5} />
    ),
    []
  );

  // PREZENTACJA OD RAZU PO MOUNTCIE (tak jak w CategoriesStats)
  useEffect(() => {
    const id = requestAnimationFrame(() => bottomSheetModalRef.current?.present());
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let alive = true;
    const today = new Date();
    (async () => {
      try {
        const data = await getLast12Months(today.getFullYear(), today.getMonth() + 1);
        if (alive) setData(data);
      } finally {
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const renderDetailsItem = useCallback(({ item }: { item: MonthSummary }) => {
    const monthIdex = item.month1 - 1;
    const saldo = item.incomeTotal - item.expenseTotal;
    const color = saldo > 0 ? '#43A047' : saldo < 0 ? '#E53935' : '#1E88E5';
    return (
      <View style={{ width: '100%', marginBottom: 15, justifyContent: 'center', paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 15 }}>
            {/* <MaterialCommunityIcons name={monthIcons[monthIdex] as any} color={colors.secondary} size={24} /> */}
            <Text style={{ color: monthColorsText[monthIdex], fontSize: 24 }}>{MONTHS_PL[monthIdex]}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* <MaterialCommunityIcons name='chart-line-variant' color={monthColorsText[monthIdex]} size={16} /> */}
            <Text style={{ color: color, fontSize: 24, fontWeight: '700' }}>{saldo.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ paddingLeft: 10, gap: 5, justifyContent: 'center', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
            <MaterialCommunityIcons name='bank-transfer-in' color={monthColorsText[monthIdex]} size={16} />
            <Text style={{ color: colors.white }}>{item.incomeTotal.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
            <MaterialCommunityIcons name='bank-transfer-out' color={monthColorsText[monthIdex]} size={16} />
            <Text style={{ color: colors.white }}>{item.expenseTotal.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  }, []);

  const renderHeader = () => {
    return (
      <View style={{ width: '100%', height: 300, marginBottom: 15, justifyContent: 'center', paddingHorizontal: 20 }}>
        {data.map((d, i, tab) => {
          const monthIdex = d.month1 - 1;
          const saldo = d.incomeTotal - d.expenseTotal;
          const color = saldo > 0 ? '#9EE493' : saldo < 0 ? '#FF7B7B' : '#1E88E5';
          

          return (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingRight: 20 }}>
              {/* <MaterialCommunityIcons name={monthIcons[monthIdex] as any} color={colors.secondary} size={16} /> */}
              <Text style={{ color: colors.textPimary, fontSize: 16, fontWeight: '700' }}>{MONTHS_PL[monthIdex]}</Text>
              <Text style={{ color: color, fontSize: 16, fontWeight: '700' }}>{saldo.toFixed(2)}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={['100%']}
      index={0}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255)' }}
      handleStyle={{ paddingVertical: 6 }}
      backgroundStyle={{
        backgroundColor: colors.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
      keyboardBehavior='interactive'
      keyboardBlurBehavior='restore'
    >
      <BottomSheetFlatList<MonthSummary>
        data={data}
        keyExtractor={i => i.month1.toString()}
        renderItem={renderDetailsItem}
        ListHeaderComponent={renderHeader}
      />
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 24,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
