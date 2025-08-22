import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { CatLite } from '../../components/home/CategoryYear';
import colors from '../../config/colors';
import { CategoryWithSubMulti, CategoryWithSubYearly } from '../../services/statService';
import { Pressable, ScrollView } from 'react-native-gesture-handler';
import { fullMonths, viewIcons, ViewType } from './SubcategoryStats';
import { monthLabels } from '../../config/constants';

interface Props {
  cats: CatLite[];
  catId: number;
  yearlyCategory: CategoryWithSubMulti | undefined;
  year: number;
  focusedBarIdxCat: number | null;
  setFocusedBarIdxCat: React.Dispatch<React.SetStateAction<number | null>>;
  setCatId: React.Dispatch<React.SetStateAction<number>>;
}

export const Header = ({
  cats,
  yearlyCategory,
  year,
  focusedBarIdxCat,
  catId,
  setCatId,
  setFocusedBarIdxCat,
}: Props) => {
  const [view, setView] = useState<ViewType>('chart');

  const categoryYearData = useMemo(() => {
    const sums = yearlyCategory?.years[0].sumsByMonth ?? Array(12).fill(0);
    return sums.map((value, i) => ({
      value,
      label: monthLabels[i],
      onPress: () => setFocusedBarIdxCat(prev => (prev === i ? null : i)),
    }));
  }, [yearlyCategory]);

  const isCatEmpty = useMemo(() => categoryYearData.every(b => (b.value ?? 0) === 0), [categoryYearData]);

  const pieSourceMonth = focusedBarIdxCat;
  const pieSlices = useMemo(() => {
    const subs = yearlyCategory?.years[0].subcategories ?? [];
    const values = subs.map(sub => {
      if (pieSourceMonth == null) {
        const total = (sub.sumsByMonth ?? []).reduce((a, b) => a + (b || 0), 0);
        return { id: sub.subcategoryId, name: sub.name, color: sub.color, value: total };
      } else {
        const v = sub.sumsByMonth?.[pieSourceMonth] ?? 0;
        return { id: sub.subcategoryId, name: sub.name, color: sub.color, value: v };
      }
    });
    const nonZero = values.filter(v => (v.value ?? 0) > 0);
    const total = nonZero.reduce((a, v) => a + v.value, 0);
    const slices = nonZero
      .map(v => {
        const pct = total > 0 ? (v.value / total) * 100 : 0;
        const showText = pct >= 8;
        return { value: v.value, color: v.color, text: showText ? `${Math.round(pct)}%` : '' } as any;
      })
      .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));
    const legend = nonZero
      .sort((a, b) => b.value - a.value)
      .map(v => ({ id: v.id, name: v.name, pct: total ? (v.value / total) * 100 : 0, color: v.color, value: v.value }));
    return { slices, total, legend };
  }, [yearlyCategory, pieSourceMonth]);

  const handleHangeView = () => {
    setView(s => (s === 'chart' ? 'list' : 'chart'));
  };

  const fiveYearsSums = yearlyCategory?.years.map(y => y.sumsByMonth);
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 5, marginTop: 20 }}
      >
        {cats.map(c => {
          const selected = c.id === catId;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCatId(c.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[styles.chip, selected && { backgroundColor: c.color + '22', transform: [{ translateY: -4 }] }]}
            >
              <MaterialCommunityIcons name={c.icon as any} size={20} color={c.color} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tytuł */}
      <Pressable style={styles.cardHeader} onPress={handleHangeView}>
        <MaterialCommunityIcons
          name={viewIcons.get(view) as any}
          size={25}
          color={yearlyCategory?.color}
          style={{ marginRight: 10 }}
        />
        <Text style={styles.cardTitle}>
          {yearlyCategory?.name ?? 'Kategoria'} {year}
        </Text>
      </Pressable>

      {/* Słupki kategorii */}
      <View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}>
        {!yearlyCategory ? (
          <Text style={styles.loading}>Ładowanie…</Text>
        ) : isCatEmpty ? (
          <Text style={styles.loading}>Brak danych dla kategorii</Text>
        ) : view === 'chart' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} directionalLockEnabled nestedScrollEnabled>
            <BarChart
              data={categoryYearData}
              barWidth={16}
              spacing={16}
              noOfSections={4}
              frontColor={yearlyCategory.color}
              rulesColor='#2E2F36'
              xAxisLabelTextStyle={{ color: '#9aa' }}
              yAxisTextStyle={{ color: '#9aa' }}
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
              {/* <Text style={styles.listText}>Avg.</Text> */}
            </View>
            {monthLabels.map((_, index) => {
              const y0 = +fiveYearsSums![0][index].toFixed(2);
              const y1 = +fiveYearsSums![1][index].toFixed(2);
              const y2 = +fiveYearsSums![2][index].toFixed(2);
              const y3 = +fiveYearsSums![3][index].toFixed(2);
              const y4 = +fiveYearsSums![4][index].toFixed(2);
              const vals = [y0, y1, y2, y3, y4];
              const nonZero = vals.filter(v => v !== 0);
              // const avg = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
              return (
                <View key={index} style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.listText}>{monthLabels[index]}</Text>
                  <Text style={styles.listText}>{y0}</Text>
                  <Text style={styles.listText}>{y1}</Text>
                  <Text style={styles.listText}>{y2}</Text>
                  <Text style={styles.listText}>{y3}</Text>
                  <Text style={styles.listText}>{y4}</Text>
                  {/* <Text style={styles.listText}>{avg}</Text> */}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Pie bez interakcji */}
      <Text style={styles.subHeaderTitle}>
        Podział subkategorii {pieSourceMonth == null ? '(rok)' : `(miesiąc: ${monthLabels[pieSourceMonth]})`}
      </Text>

      <View style={styles.pieRow} pointerEvents='none'>
        {pieSlices.total <= 0 ? (
          <Text style={styles.loading}>Brak danych do podziału</Text>
        ) : (
          <>
            <PieChart radius={80} data={pieSlices.slices as any} showText textSize={11} textColor='#fff' />
            <View style={styles.pieLegend}>
              {pieSlices.legend.map(item => (
                <View key={item.id} style={{ marginVertical: 5 }}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text numberOfLines={1} style={styles.legendText}>
                      {item.name}
                    </Text>
                    <Text style={styles.legendPct}>{Math.round(item.pct)}%</Text>
                  </View>
                  <Text style={styles.legendVal}>{item.value.toFixed(2)} zł</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <Text style={[styles.subHeaderTitle, { marginTop: 8 }]}>Subkategorie</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A3D46',
    marginRight: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 6,
    paddingVertical: 6,
  },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  loading: { color: '#9aa', textAlign: 'center', paddingVertical: 12, fontSize: 14, fontWeight: '600' },
  subHeaderTitle: { color: colors.white, opacity: 0.9, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 6 },
  pieLegend: { flex: 1, paddingLeft: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#e5e7ec', flex: 1 },
  legendPct: { color: '#cfd3dc', fontVariant: ['tabular-nums'] },
  legendVal: { color: '#e5e7ec', fontWeight: 'bold', paddingLeft: 20, marginTop: -5 },
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
  listText: { flex: 1, color: '#fff', fontSize: 12 },
});
