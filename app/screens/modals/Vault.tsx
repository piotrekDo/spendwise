import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../config/colors'; // jeśli używasz
import { monthColorsText, monthLabels, MONTHS_PL } from '../../config/constants';
import { getFullLast12Months, MonthWithDeps } from '../../services/vaultService';

type RouteParams = {
  year: number;
  month1: number;
};

export const Vault = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { year, month1 } = (route.params as RouteParams) || { expandedCategory: -1 };
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [data, setData] = useState<MonthWithDeps[]>([]);

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior='close' opacity={0.5} />
    ),
    []
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => bottomSheetModalRef.current?.present());
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getFullLast12Months(year, month1);
        data.forEach(d => console.log(d));
        if (alive) setData(data);
      } finally {
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const renderDetailsItem = useCallback(({ item }: { item: MonthWithDeps }) => {
    const monthIdex = item.month1 - 1;
    const saldo = item.saldo;
    const saldoAd = item.saldoAfterDep;
    const color = saldo > 0 ? '#43A047' : saldo < 0 ? '#E53935' : '#1E88E5';
    const saldoAfterDepColor = saldoAd > saldo ? '#558d58ff' : '#ac4745ff';
    return (
      <View style={{ width: '100%', marginVertical: 15, justifyContent: 'center', paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 15 }}>
            <Text style={{ color: monthColorsText[monthIdex], fontSize: 24 }}>{MONTHS_PL[monthIdex]}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: color, fontSize: 24, fontWeight: '700' }}>{saldo.toFixed(2)}</Text>
            {saldoAd !== saldo && (
              <Text
                style={{ color: saldoAfterDepColor, fontSize: 20, fontWeight: '700', alignSelf: 'baseline' }}
              >{`(${saldoAd.toFixed(2)})`}</Text>
            )}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 10,
            gap: 5,
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View style={{}}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
              <MaterialCommunityIcons name='bank-transfer-in' color='#558d58ff' size={16} />
              <Text style={{ color: colors.white }}>{item.incomeTotal.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
              <MaterialCommunityIcons name='bank-transfer-out' color='#ac4745ff' size={16} />
              <Text style={{ color: colors.white }}>{item.expenseTotal.toFixed(2)}</Text>
            </View>
          </View>
          <View>
            {item.depIn.map((dep, i) => {
              return (
                <View
                  key={i}
                  style={{ flexDirection: 'row', gap: 5, justifyContent: 'flex-end', alignItems: 'center' }}
                >
                  <MaterialCommunityIcons name='arrow-top-right' color='#558d58ff' size={16} />
                  <Text style={{ color: '#558d58ff' }}>{dep.value.toFixed(2)}</Text>
                  <Text style={{ color: '#558d58ff' }}>{monthLabels[dep.from.month1 - 1]}</Text>
                </View>
              );
            })}

            {item.depOut.map((dep, i) => {
              return (
                <View
                  key={i}
                  style={{ flexDirection: 'row', gap: 5, justifyContent: 'flex-end', alignItems: 'center' }}
                >
                  <MaterialCommunityIcons name='arrow-bottom-right' color='#ac4745ff' size={16} />
                  <Text style={{ color: '#ac4745ff' }}>{dep.value.toFixed(2)}</Text>
                  <Text style={{ color: '#ac4745ff' }}>{monthLabels[dep.to.month1 - 1]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  }, []);

  const renderHeader = () => {
    return (
      <View
        style={{
          width: '100%',
          height: 300,
          marginBottom: 50,
          marginTop: 50,
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingRight: 20, marginBottom: 5 }}>
          <Text style={{ color: 'wheat', fontSize: 16, fontWeight: '700' }}>SUMA</Text>
          <Text style={{ color: 'wheat', fontSize: 16, fontWeight: '700' }}>
            {data
              .map(d => d.saldo)
              .reduce((partialSum, a) => partialSum + a, 0)
              .toFixed(2)}
          </Text>
        </View>
        {data.map((d, i, tab) => {
          const isTotal = d.month1 === -1;
          const monthIdex = d.month1 - 1;
          const saldo = d.incomeTotal - d.expenseTotal;
          const color = saldo > 0 ? '#9EE493' : saldo < 0 ? '#FF7B7B' : '#1E88E5';
          const isSponsor = d.saldoAfterDep < d.saldo;
          return (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingRight: 20,
                marginTop: isTotal ? 10 : 0,
              }}
            >
              {/* <MaterialCommunityIcons name={monthIcons[monthIdex] as any} color={colors.secondary} size={16} /> */}
              <Text style={{ color: colors.textPimary, fontSize: 16, fontWeight: '700' }}>
                {isTotal ? 'Poprzednie miesiące' : MONTHS_PL[monthIdex]}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Text style={{ color: color, fontSize: isSponsor ? 14 : 16, fontWeight: '700', alignSelf: 'flex-end' }}>
                  {saldo.toFixed(2)}
                </Text>
                {isSponsor && (
                  <Text
                    style={{ color: color, fontSize: 16, fontWeight: '700', alignSelf: 'flex-end' }}
                  >{`(${d.saldoAfterDep.toFixed(2)})`}</Text>
                )}
              </View>
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
      <BottomSheetFlatList<MonthWithDeps>
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
