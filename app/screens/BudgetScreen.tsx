import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Category } from '../components/Category';
import colors from '../config/colors';
import { getMonthDateRange } from '../config/constants';
import { DisplayCategory } from '../model/Spendings';
import routes from '../navigation/routes';
import { getBalancesForMonth, getVaultBreakdown } from '../services/balancesService';
import { getCategorySkeletonForSelectedmonth } from '../services/categoriesService';
import { Entry, getSelectedCategorySpendings, getSpendingsInRange } from '../services/entriesService';

const MONTHS = [
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
const RADIUS = 12;

// --- progi gestu i animacji hintów ---
const MAX_PROGRESS = 120; // dystans do pełnego wypełnienia progressu hintu
const TRIGGER_PROGRESS = 0.75; // próg commit/hit (np. 75%)
const RELEASE_PROGRESS = 0.6; // histereza dla „odwołania” (np. 60%)

export const BudgetScreen = () => {
  const navigation = useNavigation<any>();
  const [monthOffset, setMonthOffset] = useState(0);
  const [skeleton, setSkeleton] = useState<DisplayCategory[]>([]);
  const [data, setData] = useState<DisplayCategory[]>([]);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [saldoMonth, setSaldoMonth] = useState(0);
  const [saldoVault, setSaldoVault] = useState(0);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [vaultItems, setVaultItems] = useState<Array<{ label: string; balance: number }>>([]);
  const [hintsOn, setHintsOn] = useState(false);

  const base = useMemo(() => new Date(), []);
  const current = useMemo(() => new Date(base.getFullYear(), base.getMonth() + monthOffset), [base, monthOffset]);
  const month0 = current.getMonth();
  const month1 = month0 + 1;
  const year = current.getFullYear();

  const loadBalances = async () => {
    const { month, vault, total } = await getBalancesForMonth(year, month1);
    setSaldoMonth(month);
    setSaldoVault(vault);
    setSaldoTotal(total);
  };

  const loadData = async () => {
    const { start, end } = getMonthDateRange(year, month0);

    const spendings: Entry[] = await getSpendingsInRange(start, end);
    const bySub = new Map<number, { normal: number; financed: number }>();
    for (const e of spendings) {
      const rec = bySub.get(e.subcategoryId) ?? { normal: 0, financed: 0 };
      if (e.financedEnvelopeId != null) {
        rec.financed += Number(e.amount) || 0;
      } else {
        rec.normal += Number(e.amount) || 0;
      }
      bySub.set(e.subcategoryId, rec);
    }

    const merged: DisplayCategory[] = skeleton.map(cat => {
      let catEnvelopeSum = 0;
      const updatedSub = cat.subcategories.map(sub => {
        const rec = bySub.get(sub.id) ?? { normal: 0, financed: 0 };
        catEnvelopeSum += rec.financed;
        return { ...sub, sum: rec.normal, envelopesSum: rec.financed };
      });
      const sum = updatedSub.reduce((acc, s) => acc + s.sum, 0);
      return { ...cat, subcategories: updatedSub, sum, envelopesSum: catEnvelopeSum };
    });
    setData(merged);
  };

  useFocusEffect(
    React.useCallback(() => {
      getCategorySkeletonForSelectedmonth(year, month1).then(setSkeleton);
      loadBalances();
    }, [year, month1])
  );

  useEffect(() => {
    if (skeleton.length > 0) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skeleton]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const openAddModal = (subcategoryId: number) => {
    navigation.navigate(routes.NEW_ENTRY_MODAL as any, { monthOffset, subcategoryId });
  };

  const openCategoryDetailsModal = async (cat: DisplayCategory) => {
    const { start, end } = getMonthDateRange(year, month0);
    const entries = await getSelectedCategorySpendings(cat.id, start, end);
    navigation.navigate(routes.CATEGORY_DETAILS, {
      data: entries,
      displayName: cat.name,
      displayIcon: cat.icon,
      displayColor: cat.color,
    });
  };

  const openEnvelopesModal = () => {
    navigation.navigate(routes.MODAL_ENVELOPES_HOME as any, { month1, year });
  };

  // --- stabilne callbacki do zmiany miesiąca ---
  const goPrev = useCallback(() => setMonthOffset(s => s - 1), []);
  const goNext = useCallback(() => setMonthOffset(s => s + 1), []);

  // --- shared values dla hintów ---
  const leftP = useSharedValue(0); // progres przesunięcia w prawo (plus z lewej)
  const rightP = useSharedValue(0); // progres przesunięcia w lewo (plus z prawej)
  const leftLatched = useSharedValue(0); // 0/1 – czy przekroczyliśmy próg w lewo→prawo
  const rightLatched = useSharedValue(0); // 0/1 – czy przekroczyliśmy próg w prawo→lewo

  const hapticHit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);
  const hapticRelease = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  // --- gest Pan z priorytetem dla scrolla pionowego ---
  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10]) // pozwala pionowemu scrollowi wygrać przy ruchu w pionie
    .cancelsTouchesInView(false)
    .onStart(() => {
      runOnJS(setHintsOn)(true);
      leftP.value = 0;
      rightP.value = 0;
      leftLatched.value = 0;
      rightLatched.value = 0;
    })
    .onUpdate(e => {
      const dx = e.translationX;

      if (dx > 0) {
        // przesuw w PRAWO → aktywny lewy hint
        const p = Math.min(dx / MAX_PROGRESS, 1);
        leftP.value = p;
        rightP.value = 0;

        // zmiana kierunku – wyczyść latch drugiej strony
        rightLatched.value = 0;

        // wejście ponad próg (hit)
        if (!leftLatched.value && p >= TRIGGER_PROGRESS) {
          leftLatched.value = 1;
          runOnJS(hapticHit)();
        }
        // zejście poniżej progu (release) – z histerezą
        else if (leftLatched.value && p <= RELEASE_PROGRESS) {
          leftLatched.value = 0;
          runOnJS(hapticRelease)();
        }
      } else {
        // przesuw w LEWO → aktywny prawy hint
        const p = Math.min(-dx / MAX_PROGRESS, 1);
        rightP.value = p;
        leftP.value = 0;

        leftLatched.value = 0;

        if (!rightLatched.value && p >= TRIGGER_PROGRESS) {
          rightLatched.value = 1;
          runOnJS(hapticHit)();
        } else if (rightLatched.value && p <= RELEASE_PROGRESS) {
          rightLatched.value = 0;
          runOnJS(hapticRelease)();
        }
      }
    })
    .onEnd(() => {
      // commit wg poziomu „wyjechania” plusa (nie prędkości)
      if (rightP.value >= TRIGGER_PROGRESS) {
        runOnJS(goNext)();
      } else if (leftP.value >= TRIGGER_PROGRESS) {
        runOnJS(goPrev)();
      }

      // schowaj hinty i zgaś latches
      leftLatched.value = 0;
      rightLatched.value = 0;
      leftP.value = withTiming(0, { duration: 140 });
      rightP.value = withTiming(0, { duration: 140 });
    })
    .onFinalize(() => runOnJS(setHintsOn)(false));

  // --- style animowane hintów ---
  const leftHintStyle = useAnimatedStyle(() => {
    const hit = leftP.value >= TRIGGER_PROGRESS;
    return {
      opacity: leftP.value,
      backgroundColor: hit ? 'rgba(46,125,50,0.25)' : 'rgba(255,255,255,0.12)',
      transform: [{ translateX: -40 * (1 - leftP.value) }, { scale: 0.9 + 0.1 * leftP.value }],
    };
  });
  const rightHintStyle = useAnimatedStyle(() => {
    const hit = rightP.value >= TRIGGER_PROGRESS;
    return {
      opacity: rightP.value,
      backgroundColor: hit ? 'rgba(46,125,50,0.25)' : 'rgba(255,255,255,0.12)',
      transform: [{ translateX: 40 * (1 - rightP.value) }, { scale: 0.9 + 0.1 * rightP.value }],
    };
  });
  const leftSymbolStyle = useAnimatedStyle(() => ({
    color: interpolateColor(leftP.value, [0, TRIGGER_PROGRESS, 1], ['#FFFFFF', '#FFFFFF', '#2e7d32']),
  }));
  const rightSymbolStyle = useAnimatedStyle(() => ({
    color: interpolateColor(rightP.value, [0, TRIGGER_PROGRESS, 1], ['#FFFFFF', '#FFFFFF', '#2e7d32']),
  }));
  // pozwól ScrollView działać równolegle z naszym panem
  const composed = Gesture.Simultaneous(pan);
  return (
    <GestureDetector gesture={composed}>
      <View style={{ flex: 1, paddingTop: Constants.statusBarHeight, backgroundColor: colors.background }}>
        <View>
          <View style={styles.navBar}>
            <Pressable onPress={() => setMonthOffset(o => o - 1)}>
              <Text style={styles.navArrow}>◀</Text>
            </Pressable>
            <Text style={styles.navTitle}>
              {MONTHS[month0]} {year}
            </Text>
            <Pressable onPress={() => setMonthOffset(o => o + 1)}>
              <Text style={styles.navArrow}>▶</Text>
            </Pressable>
          </View>

          <View style={styles.headerBar}>
            <Pressable
              onPress={() => {
                navigation.navigate(routes.MODAL_VAULT, {year, month1});
              }}
              style={[styles.smallCard, styles.vaultSmallCard]}
            >
              <Text style={styles.smallLabel}>Bufor</Text>
              <Text style={styles.smallValue}>{saldoVault.toFixed(2)} zł</Text>
              {/* <LottieView source={require('../../assets/Money.json')} autoPlay loop style={{ width: 160, height: 160 }} /> */}
            </Pressable>

            <View style={[styles.smallCard, styles.totalSmallCard, { alignItems: 'flex-end' }]}>
              <Text style={styles.smallLabel}>Całość</Text>
              <Text style={styles.smallValue}>{saldoTotal.toFixed(2)} zł</Text>
            </View>
          </View>

          {/* Miesiąc */}
          <View style={styles.largeMonthCard}>
            <Text style={styles.largeLabel}>Miesiąc</Text>
            <Text style={styles.largeValue}>{saldoMonth.toFixed(2)} zł</Text>
            <TouchableOpacity style={styles.envelopeButton} onPress={openEnvelopesModal}>
              <MaterialCommunityIcons name='email-outline' size={40} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}>
          {data.map(cat => (
            <Category
              key={cat.id}
              item={cat}
              expanded={expanded}
              toggleExpand={toggleExpand}
              openAddModal={openAddModal}
              openCategoryDetailsModal={() => openCategoryDetailsModal(cat)}
            />
          ))}
        </ScrollView>

        {/* HINTY – nie łapią dotyku */}
        {hintsOn && ( // możesz zostawić zawsze, albo sterować widocznością (patrz pkt 2)
          <View pointerEvents='box-none' style={StyleSheet.absoluteFill}>
            <Animated.View pointerEvents='none' style={[styles.hintBase, styles.hintLeft, leftHintStyle]}>
              <Animated.Text pointerEvents='none' style={[styles.hintText, styles.hintTextLeft, leftSymbolStyle]}>
                {month0 === 0 ? 'Grudzień' : MONTHS[month0 - 1]}
              </Animated.Text>
            </Animated.View>

            <Animated.View pointerEvents='none' style={[styles.hintBase, styles.hintRight, rightHintStyle]}>
              <Animated.Text pointerEvents='none' style={[styles.hintText, styles.hintTextRight, rightSymbolStyle]}>
                {month0 == 11 ? 'Styczeń' : MONTHS[month0 + 1]}
              </Animated.Text>
            </Animated.View>
          </View>
        )}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#1c2a38',
  },
  navArrow: { color: colors.white, fontSize: 20 },
  navTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 10, marginTop: 5 },
  smallCard: { flex: 1, width: 100, padding: 6, borderRadius: RADIUS, backgroundColor: '#23303d' },
  smallLabel: { color: colors.white, opacity: 0.85, fontSize: 11 },
  smallValue: { color: colors.white, fontSize: 12, fontWeight: '700', marginTop: 2 },
  vaultSmallCard: { backgroundColor: colors.envelope },
  totalSmallCard: { backgroundColor: '#b28704' },
  vaultDetails: {
    backgroundColor: '#0e2433',
    borderRadius: RADIUS,
    padding: 8,
    marginBottom: 10,
  },
  vaultItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  vaultItemLabel: { color: colors.white },
  vaultItemValue: { fontWeight: '700' },
  largeMonthCard: {
    backgroundColor: '#2e7d32',
    borderRadius: RADIUS,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  largeLabel: { color: colors.white, opacity: 0.85, fontSize: 12 },
  largeValue: { color: colors.white, fontSize: 20, fontWeight: '700', marginTop: 2 },
  envelopeButton: {
    backgroundColor: colors.envelope,
    width: 100,
    height: 100,
    borderRadius: 50, // RN: liczba, nie '50%'
    position: 'absolute',
    right: -10,
    bottom: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- hinty ---
  hintBase: {
    position: 'absolute',
    // top: '50%',
    // marginTop: -20,
    width: 200,
    height: '100%',
    borderRadius: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  hintLeft: { left: -85 },
  hintRight: { right: -85 },
  hintText: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.white,
    textAlign: 'center',
    includeFontPadding: false,
  },
  hintTextLeft: { transform: [{ rotate: '-90deg' }], left: 50 },
  hintTextRight: { transform: [{ rotate: '90deg' }], right: 50 },
});
