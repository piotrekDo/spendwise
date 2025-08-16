import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView,
  Platform, Pressable
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../config/colors';
import { RADIUS } from '../../config/constants';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { getCategoryWithSubsYear, CatMonthRow, SubSeries } from '../../services/statService';

type RouteParams = {
  initialYear: number;
  category: { id: number; name: string; color: string; icon: string };
  initialSeries: CatMonthRow[]; // 12 wartości (sumy kategorii per miesiąc)
};
const monthLabels = ['Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru'];
const memCache = new Map<string, { catMonthly: number[]; subs: SubSeries[] }>();
const cacheKey = (y: number, catId: number, includeFinanced: boolean) =>
  `cat:${catId}:y:${y}:fin:${includeFinanced ? 1 : 0}`;

export const CategoriesStats = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { initialYear, category, initialSeries } = (route.params as RouteParams);

  const [year, setYear] = useState(initialYear);
  const [includeFinanced, setIncludeFinanced] = useState(false);

  // stan danych
  const [catMonthly, setCatMonthly] = useState<number[]>(
    // użyj od razu przekazanych (żeby UI był natychmiast)
    initialSeries?.length === 12 ? initialSeries.map(r => r.sum) : Array(12).fill(0)
  );
  const [subs, setSubs] = useState<SubSeries[]>([]);
  const [loading, setLoading] = useState(false);

  // czy dane kategorii od razu są zgodne z przełącznikiem?
  // initialSeries zazwyczaj liczone bez finansowanych kopertą — więc przy includeFinanced=false są OK.
  // Po zmianie roku / toggla zawsze dociągniemy.
  const firstLoadDoneRef = useRef(false);

  const loadData = async (y: number, catId: number, incFin: boolean) => {
    const key = cacheKey(y, catId, incFin);
    if (memCache.has(key)) {
      const hit = memCache.get(key)!;
      setCatMonthly(hit.catMonthly);
      setSubs(hit.subs);
      return;
    }

    setLoading(true);
    try {
      const { catMonthly, subs } = await getCategoryWithSubsYear(y, catId, { includeFinanced: incFin });
      memCache.set(key, { catMonthly, subs });
      setCatMonthly(catMonthly);
      setSubs(subs);
    } finally {
      setLoading(false);
    }
  };

  // Pierwszy render: dograj same SUBY dla bieżącego roku (catMonthly już mamy z propsów)
  useEffect(() => {
    if (firstLoadDoneRef.current) return;
    firstLoadDoneRef.current = true;

    // przy includeFinanced = false: catMonthly mamy; dociągnij tylko suby
    (async () => {
      const key = cacheKey(year, category.id, includeFinanced);
      if (memCache.has(key)) {
        const hit = memCache.get(key)!;
        // zachowaj catMonthly z propsów, ale suby z cache
        setSubs(hit.subs);
      } else {
        setLoading(true);
        try {
          const { subs } = await getCategoryWithSubsYear(year, category.id, { includeFinanced });
          // zcache’uj z catMonthly z propsów
          memCache.set(key, { catMonthly: catMonthly, subs });
          setSubs(subs);
        } finally {
          setLoading(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zmiana roku lub toggla → pełne dociągnięcie (cat + sub)
  useEffect(() => {
    // jeśli zmieniliśmy rok lub przełącznik, to ładujemy kompletnie
    // wyjątek: jeżeli to wciąż initialYear + includeFinanced=false i mamy już dane z propsów + suby w cache — jesteśmy gotowi
    const isInitialCombo = (year === initialYear && includeFinanced === false);
    if (isInitialCombo && subs.length) return;

    loadData(year, category.id, includeFinanced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, includeFinanced]);

  const total = useMemo(() => catMonthly.reduce((a, v) => a + v, 0), [catMonthly]);
  const barData = catMonthly.map((v, i) => ({ value: v, label: monthLabels[i] }));

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
          {/* Nagłówek */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name={category.icon as any} size={20} color={category.color} />
              <Text style={styles.headerTitle}>{category.name}</Text>
            </View>

            {/* Rok +/- */}
            <View style={styles.yearStepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setYear(y => y - 1)}>
                <Text style={styles.stepText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.yearText}>{year}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setYear(y => y + 1)}>
                <Text style={styles.stepText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Przełączniki */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setIncludeFinanced(v => !v)}
              style={[styles.chip, includeFinanced && styles.chipActive]}
            >
              <Text style={[styles.chipText, includeFinanced && styles.chipTextActive]}>
                Uwzględnij zakupy finansowane kopertą
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: '80%' }}
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* SUMA kategorii – wykres roczny */}
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Suma kategorii w roku</Text>
              <View style={{ height: 220, justifyContent: 'center' }}>
                {loading && !subs.length ? (
                  <Text style={styles.loading}>Ładowanie…</Text>
                ) : (
                  <BarChart
                    data={barData}
                    barWidth={16}
                    spacing={22}
                    noOfSections={4}
                    frontColor={category.color}
                    rulesColor="#2E2F36"
                    xAxisLabelTextStyle={{ color: '#9aa' }}
                    yAxisTextStyle={{ color: '#9aa' }}
                    yAxisColor="transparent"
                    xAxisColor="transparent"
                  />
                )}
              </View>
              <Text style={styles.blockFooter}>Razem: {total.toFixed(2)} zł</Text>
            </View>

            {/* Podkategorie – ranking + minimapy */}
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Podkategorie</Text>
              {loading && !subs.length ? (
                <Text style={styles.loading}>Ładowanie…</Text>
              ) : subs.length === 0 ? (
                <Text style={styles.loading}>Brak danych</Text>
              ) : (
                subs
                  .slice()
                  .sort((a, b) => b.total - a.total)
                  .map(su => {
                    const miniData = su.monthly.map((v, i) => ({ value: v, label: monthLabels[i] }));
                    return (
                      <View key={su.subcategoryId} style={styles.subRow}>
                        <View style={styles.subHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name={su.icon as any} size={18} color={su.color} />
                            <Text style={styles.subName}>{su.name}</Text>
                          </View>
                          <Text style={styles.subTotal}>{su.total.toFixed(2)} zł</Text>
                        </View>
                        <LineChart
                          data={miniData}
                          curved
                          thickness={2}
                          hideDataPoints
                          isAnimated
                          noOfSections={2}
                          height={90}
                          color={su.color}
                          rulesColor="#2E2F36"
                          yAxisColor="transparent"
                          xAxisColor="transparent"
                          yAxisTextStyle={{ color: '#9aa', fontSize: 10 }}
                          xAxisLabelTextStyle={{ color: '#9aa', fontSize: 10 }}
                        />
                      </View>
                    );
                  })
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.close}>✖</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1 },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  modal: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    width: '92%',
    maxHeight: '90%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginLeft: 8 },
  yearStepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2E2F36', alignItems: 'center', justifyContent: 'center' },
  stepText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  yearText: { color: '#fff', fontSize: 16, fontWeight: '700', minWidth: 64, textAlign: 'center' },

  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#3A3D46' },
  chipActive: { backgroundColor: 'rgba(76, 175, 80, 0.18)', borderColor: '#4CAF50' },
  chipText: { color: colors.white, fontSize: 12 },
  chipTextActive: { color: '#C8E6C9', fontWeight: '700' },

  block: { backgroundColor: '#1F2128', borderRadius: 10, padding: 10, marginTop: 8 },
  blockTitle: { color: colors.white, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  blockFooter: { color: colors.white, opacity: 0.8, fontSize: 12, marginTop: 6, textAlign: 'right' },

  loading: { color: '#9aa', textAlign: 'center', paddingVertical: 12, fontSize: 16, fontWeight: 'bold' },

  subRow: { marginTop: 8, backgroundColor: '#20222a', borderRadius: 10, padding: 10 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subName: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  subTotal: { color: '#fff', fontWeight: '700' },

  actions: { marginTop: 10, alignItems: 'flex-end' },
  close: { fontSize: 24, color: 'red' },
});