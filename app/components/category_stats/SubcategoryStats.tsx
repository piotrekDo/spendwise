import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable, ScrollView } from 'react-native-gesture-handler';
import { BarChart } from 'react-native-gifted-charts';
import { getMonthDateRange, monthLabels } from '../../config/constants';
import { SubcategoryMulti } from '../../services/statService';
import { useNavigation } from '@react-navigation/native';
import routes from '../../navigation/routes';
import { getAllSubCatEntries, getSelectedSubCategorySpendings } from '../../services/entriesService';
import { StackActions } from '@react-navigation/native';
import { Moneyloader } from '../Moneyloader';
import colors from '../../config/colors';
interface Props {
  sub: SubcategoryMulti;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  year: number;
  isLoading: boolean;
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

export const SubcategoryStats = ({ sub, sheetRef, year, isLoading }: Props) => {
  const navigation = useNavigation<any>();
  const [view, setView] = useState<ViewType>('chart');

  const handleHangeView = () => {
    setView(s => (s === 'chart' ? 'list' : 'chart'));
  };

  const handleOpenDetails = async () => {
    const entries = await getAllSubCatEntries(sub.subcategoryId);
    requestAnimationFrame(() => {
      navigation.navigate(routes.CATEGORY_DETAILS, {
        data: entries,
        displayName: sub.name,
        displayIcon: sub.icon,
        displayColor: sub.color,
        fullScreen: true,
      });
    });
  };

  const total = sub.years[0].sumsByMonth.reduce((a, v) => a + v, 0);
  const empty = false;

  const chartData = () => {
    const sums = sub.years[0]?.sumsByMonth ?? Array(12).fill(0);
    return sums.map((value, i) => ({
      value,
      label: monthLabels[i],
      month: i,
    }));
  };

  const fiveYearsSums = sub?.years.map(y => y.sumsByMonth);

  if (isLoading) {
    return null;
  }

  const handleOpenEntryDetailsModal = async (month0: number) => {
    const { start, end } = getMonthDateRange(year, month0);
    const entries = await getSelectedSubCategorySpendings(sub.subcategoryId, start, end);
    navigation.navigate(routes.CATEGORY_DETAILS, {
      data: entries,
      displayName: sub?.name,
      displayIcon: sub?.icon,
      displayColor: sub?.color,
    });
  };

  return (
    <View style={styles.subRow}>
      <View style={styles.subHeader}>
        <Pressable onPress={handleHangeView}>
          <View style={styles.listButton}>
            <MaterialCommunityIcons
              name={viewIcons.get(view) as any}
              size={25}
              color={sub.color}
              style={{ marginRight: 10 }}
            />
            <MaterialCommunityIcons name={sub.icon as any} size={18} color={sub.color} />
            <Text style={styles.subName}>{sub.name}</Text>
          </View>
        </Pressable>

        <View style={styles.listButton}>
          <Text style={styles.subName}>{total.toFixed(2)} zł</Text>
          <Pressable onPress={handleOpenDetails}>
            <MaterialCommunityIcons
              name={'format-list-bulleted'}
              size={25}
              color={sub.color}
              style={{ marginLeft: 10 }}
            />
          </Pressable>
        </View>
      </View>
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
                onLongPress={(item: any) => {
                  handleOpenEntryDetailsModal(item.month);
                }}
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
              const y0 = +fiveYearsSums![0][index].toFixed(2);
              const y1 = +fiveYearsSums![1][index].toFixed(2);
              const y2 = +fiveYearsSums![2][index].toFixed(2);
              const y3 = +fiveYearsSums![3][index].toFixed(2);
              const y4 = +fiveYearsSums![4][index].toFixed(2);

              return (
                <View key={index} style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.listText}>{monthLabels[index]}</Text>
                  <Text style={styles.listText}>{y0 > 0 && y0}</Text>
                  <Text style={styles.listText}>{y1 > 0 && y1}</Text>
                  <Text style={styles.listText}>{y2 > 0 && y2}</Text>
                  <Text style={styles.listText}>{y3 > 0 && y3}</Text>
                  <Text style={styles.listText}>{y4 > 0 && y4}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
      {/* <View style={{ width: '100%' }}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Suma: {total ? total.toFixed(2) : 0} zł</Text>
          <Text style={styles.summaryText}>Śr.:  zł</Text>
        </View>
        <View style={styles.summaryRow}>
          {true ? <Text style={styles.summaryText}>Max: zł)</Text> : <Text style={styles.summaryText}>Max: n/d</Text>}

          {1 >= 0 ? <Text style={styles.summaryText}>Min:</Text> : <Text style={styles.summaryText}>Min: n/d</Text>}
        </View>
      </View> */}
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
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  summaryText: { color: colors.white, opacity: 0.85, fontSize: 12 },
});
