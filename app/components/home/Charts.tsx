import { useFocusEffect } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import colors from '../../config/colors';
import { RADIUS } from '../../config/constants';
import { getYearSummary, YearMonthRow } from '../../services/statService';

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

  const loadYear = async () => {
    setLoadingYear(true);
    try {
      const data = await getYearSummary(year);
      setYearData(data);
    } finally {
      setLoadingYear(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadYear();
    }, [year, month1])
  );

  // Focus (dla tooltipów)
  const [focusedBarIndex, setFocusedBarIndex] = useState<number | null>(null);
  // --- CHART DATA ---
  const monthLabels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  const lineIncome = useMemo(
    () => yearData.map((r, i) => ({ value: Number(r.income) || 0, label: monthLabels[i] })),
    [yearData]
  );
  const lineExpense = useMemo(
    () => yearData.map((r, i) => ({ value: Number(r.expense) || 0, label: monthLabels[i] })),
    [yearData]
  );
  const barSavings = useMemo(
    () =>
      yearData.map((r, i) => ({
        value: Number(r.totalSavings) || 0,
        label: monthLabels[i],
        onPress: () => setFocusedBarIndex(i),
      })),
    [yearData]
  );

  const maxLineVal = Math.max(...lineIncome.map(d => d.value), ...lineExpense.map(d => d.value), 0);
  const lineMaxValue = maxLineVal === 0 ? 100 : undefined;

  const isLineEmpty = lineIncome.every(d => d.value === 0) && lineExpense.every(d => d.value === 0);
  const isBarEmpty = barSavings.every(d => d.value === 0);

  // Tooltip dla słupków
  const renderBarTooltip = (item: any, index: number) => {
    if (index !== focusedBarIndex) return null;
    return (
      <View
        style={{
          position: 'absolute',
          bottom: item.value + 30,
          paddingVertical: 4,
          paddingHorizontal: 8,
          backgroundColor: '#2A2C33',
          borderRadius: 6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: '#444',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 12 }}>{item.value.toFixed(2)} zł</Text>
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
        <Text style={{ color: '#9aa', textAlign: 'center', paddingVertical: 12 }}>
          Brak danych do wykresu liniowego
        </Text>
      ) : (
        <LineChart
          data={lineIncome}
          data2={lineExpense}
          thickness={2}
          curved
          isAnimated
          noOfSections={4}
          height={180}
          adjustToWidth
          initialSpacing={10}
          spacing={22}
          color1='#4CAF50' // przychody
          color2='#E53935' // wydatki
          rulesColor='#2E2F36'
          showVerticalLines
          verticalLinesColor='#2E2F36'
          xAxisLabelTextStyle={{ color: '#9aa' }}
          yAxisTextStyle={{ color: '#9aa' }}
          yAxisColor='transparent'
          xAxisColor='transparent'
          maxValue={lineMaxValue}
          formatYLabel={v => {
            const n = Number(v);
            return Number.isFinite(n) ? `${Math.round(n)}` : '';
          }}
          // 🔽 interakcja
          focusEnabled
          showStripOnFocus
          stripColor='#3a3d46'
          stripWidth={1}
          showDataPointOnFocus
          showTextOnFocus
          dataPointsColor='#b0bec5'
          dataPointsWidth={6}
        />
      )}

      <View style={{ height: 12 }} />

      {isBarEmpty ? (
        <Text style={{ color: '#9aa', textAlign: 'center', paddingVertical: 12 }}>Brak danych o oszczędnościach</Text>
      ) : (
        <BarChart
          data={barSavings}
          barWidth={14}
          spacing={22}
          height={160}
          noOfSections={4}
          isAnimated
          frontColor='#FFC107'
          rulesColor='#2E2F36'
          xAxisLabelTextStyle={{ color: '#9aa' }}
          yAxisTextStyle={{ color: '#9aa' }}
          yAxisColor='transparent'
          xAxisColor='transparent'
          renderTooltip={renderBarTooltip}
        />
      )}

      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
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
});
