import { useFocusEffect } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import colors from '../../config/colors';
import { RADIUS } from '../../config/constants';
import { getYearSummary, YearMonthRow } from '../../services/statService';

const nf0 = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 6 }} />
    <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>{label}</Text>
  </View>
);

interface Props {
  year: number;
  month1: number;
}

export const Charts = ({ year, month1 }: Props) => {
  const [yearData, setYearData] = useState<YearMonthRow[]>([]);
  const [loadingYear, setLoadingYear] = useState(false);

  // Sticky focus
  const [focusedLineIndex, setFocusedLineIndex] = useState<number | null>(null);
  const [focusedBarIndex, setFocusedBarIndex] = useState<number | null>(null);

  const loadYear = async () => {
    setLoadingYear(true);
    try {
      const data = await getYearSummary(year);
      setYearData(Array.isArray(data) ? data : []);
      // po przeładowaniu roku czyścimy fokusy
      setFocusedLineIndex(null);
      setFocusedBarIndex(null);
    } finally {
      setLoadingYear(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadYear();
    }, [year, month1])
  );

  const monthLabels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  const lineIncome = useMemo(
    () =>
      yearData.map((r, i) => ({
        value: Number(r?.income) || 0,
        dataPointText: r.income.toString(),
      })),
    [yearData]
  );

  const lineExpense = useMemo(
    () =>
      yearData.map((r, i) => ({
        value: Number(r?.expense) || 0,
        dataPointText: r.expense.toString(),
      })),
    [yearData]
  );

  const barSavings = useMemo(
    () =>
      yearData.map((r, i) => ({
        value: Number(r?.totalSavings) || 0,
        dataPointText: r?.totalSavings.toString(),
      })),
    [yearData]
  );

  const maxLineVal = Math.max(...lineIncome.map(d => d.value), ...lineExpense.map(d => d.value), 0);
  const lineMaxValue = maxLineVal === 0 ? 100 : undefined;

  const isLineEmpty = lineIncome.every(d => d.value === 0) && lineExpense.every(d => d.value === 0);
  const isBarEmpty = barSavings.every(d => d.value === 0);

  const renderBarTooltip = (item: any, index: number) => {
    if (index !== focusedBarIndex) return null;
    return (
      <View
        style={{
          position: 'absolute',
          bottom: (item?.value ?? 0) + 26,
          paddingVertical: 6,
          paddingHorizontal: 10,
          backgroundColor: '#1f2229',
          borderRadius: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: '#2e2f36',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 12 }}>{nf2.format(item?.value ?? 0)} zł</Text>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Rok {year} — podsumowanie</Text>
        <Text style={styles.cardSubtitle}>{loadingYear ? 'Ładowanie…' : ''}</Text>
      </View>

      {isLineEmpty ? (
        <Text style={styles.empty}>Brak danych do wykresu liniowego</Text>
      ) : (
        <>
          <LineChart
            data={lineIncome}
            data2={lineExpense}
            // data3={barSavings}
            // wygląd
            thickness={2}
            areaChart
            startFillColor1='#4CAF50'
            endFillColor1='#4CAF50'
            textColor1='#4CAF50'
            startFillColor2='#E53935'
            endFillColor2='#E53935'
            textColor2='#E53935'
            startFillColor3='#FFC107'
            endFillColor3='#FFC107'
            textColor3='#FFC107'
            textFontSize1={12}
            textFontSize2={12}
            textFontSize3={12}
            startOpacity={0.12}
            endOpacity={0.02}
            color1='#4CAF50'
            color2='#E53935'
            // siatka/osy
            height={200}
            noOfSections={4}
            maxValue={lineMaxValue}
            rulesType='dashed'
            dashWidth={3}
            rulesColor='#2E2F36'
            showVerticalLines
            verticalLinesColor='#2E2F36'
            yAxisColor='transparent'
            xAxisColor='transparent'
            xAxisLabelTextStyle={{ color: '#9aa' }}
            yAxisTextStyle={{ color: '#9aa' }}
            adjustToWidth
            initialSpacing={12}
            spacing={24}
            formatYLabel={v => {
              const n = Number(v);
              return Number.isFinite(n) ? nf0.format(Math.round(n)) : '';
            }}
            // kropki pomocnicze (fokus i tak robimy sticky niżej)
            focusEnabled
            delayBeforeUnFocus={5000}
            showTextOnFocus
            dataPointsColor='#b0bec5'
            dataPointsWidth={6}
          />

          {/* STICKY tooltip dla linii */}
          {focusedLineIndex != null && (
            <View style={styles.stickyTooltip}>
              <Text style={styles.stickyTitle}>{monthLabels[focusedLineIndex]}</Text>
              <Text style={[styles.stickyRow, { color: '#4CAF50' }]}>
                Przychód: {nf2.format(lineIncome[focusedLineIndex]?.value ?? 0)} zł
              </Text>
              <Text style={[styles.stickyRow, { color: '#E53935' }]}>
                Wydatek: {nf2.format(lineExpense[focusedLineIndex]?.value ?? 0)} zł
              </Text>
            </View>
          )}
        </>
      )}

      <View style={{ height: 12 }} />

      {/* Legenda */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between',  marginTop: 8 }}>
        <LegendDot color='#4CAF50' label='Przychody' />
        <LegendDot color='#E53935' label='Wydatki' />
        <LegendDot color='#FFC107' label='Oszczędności łącznie' />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2128',
    borderRadius: RADIUS,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: colors.white, opacity: 0.6, fontSize: 12 },
  empty: { color: '#9aa', textAlign: 'center', paddingVertical: 12 },
  stickyTooltip: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1f2229',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2e2f36',
  },
  stickyTitle: { color: '#c7c9d1', fontWeight: '600', textAlign: 'center' },
  stickyRow: { marginTop: 4 },
});
