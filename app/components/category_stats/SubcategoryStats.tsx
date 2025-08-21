import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable, ScrollView } from 'react-native-gesture-handler';
import { BarChart } from 'react-native-gifted-charts';
import { getCategoryStatsLastNYears, SubcategoryMulti, SubCatYearly } from '../../services/statService';
import { debugLog, monthLabels } from '../../config/constants';

interface Props {
  sub: SubcategoryMulti;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  year: number;
}

export type ViewType = 'chart' | 'list';

export const fullMonths = [
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

export const viewIcons = new Map([
  ['chart', 'chart-areaspline'],
  ['list', 'clipboard-list'],
]);

export const SubcategoryStats = ({ sub, sheetRef , year}: Props) => {
  const [view, setView] = useState<ViewType>('chart');

  const handleHangeView = () => {
    setView(s => (s === 'chart' ? 'list' : 'chart'));
  };

  const total = 0;
  const empty = false;

  const chartData = () => {
    const sums = sub.years[0]?.sumsByMonth ?? Array(12).fill(0);
    return sums.map((value, i) => ({
      value,
      label: monthLabels[i],
    }));
  };

    const fiveYearsSums = sub?.years.map(y => y.sumsByMonth);

  return (
    <View style={styles.subRow}>
      <Pressable style={styles.subHeader} onPress={handleHangeView}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name={viewIcons.get(view) as any}
            size={25}
            color={sub.color}
            style={{ marginRight: 10 }}
          />
          <MaterialCommunityIcons name={sub.icon as any} size={18} color={sub.color} />
          <Text style={styles.subName}>{sub.name}</Text>
        </View>
        <Text style={styles.subTotal}>{total.toFixed(2)} zł</Text>
      </Pressable>

      <View style={{ justifyContent: 'center', alignItems: 'center', height: 230 }}>
        {empty ? (
          <Text style={styles.loading}>Brak danych</Text>
        ) : view === 'chart' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            directionalLockEnabled
            nestedScrollEnabled
            simultaneousHandlers={sheetRef}
          >
            <View style={{}}>
              <BarChart
                data={chartData()}
                barWidth={15}
                spacing={15}
                noOfSections={4}
                frontColor={sub.color}
                rulesColor='#2E2F36'
                xAxisLabelTextStyle={{ color: '#9aa' }}
                yAxisTextStyle={{ color: '#9aa', fontSize: 10 }}
                yAxisLabelWidth={25}
                yAxisTextNumberOfLines={1}
                yAxisColor='transparent'
                xAxisColor='transparent'
                renderTooltip={(item: any, index: number) => {
                  return (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipText}>
                        {item.label}: {Number(item.value).toFixed(2)} zł
                      </Text>
                    </View>
                  );
                }}
              />
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, width: '100%' }}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.listText}></Text>
              <Text style={styles.listText}>{year}</Text>
              <Text style={styles.listText}>{year - 1}</Text>
              <Text style={styles.listText}>{year - 2}</Text>
              <Text style={styles.listText}>{year - 3}</Text>
              <Text style={styles.listText}>{year - 4}</Text>
            </View>
            {monthLabels.map((_, index) => {
              return (
                <View key={index} style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.listText}>{monthLabels[index]}</Text>
                  <Text style={styles.listText}>{fiveYearsSums![0][index]}</Text>
                  <Text style={styles.listText}>{fiveYearsSums![1][index]}</Text>
                  <Text style={styles.listText}>{fiveYearsSums![2][index]}</Text>
                  <Text style={styles.listText}>{fiveYearsSums![3][index]}</Text>
                  <Text style={styles.listText}>{fiveYearsSums![4][index]}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  listViewContainer: {
    flex: 1,
    width: '100%',
    paddingVertical: 5,
    paddingHorizontal: 20,
  },
  listTextWrapper: {
    marginVertical: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loading: { color: '#9aa', textAlign: 'center', paddingVertical: 12, fontSize: 14, fontWeight: '600' },
  subRow: { marginTop: 20, backgroundColor: '#20222a', borderRadius: 10, paddingBottom: 40 },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  subName: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  subTotal: { color: '#fff', fontWeight: '700' },
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
  listText: { flex: 1, color: '#fff' },
});
