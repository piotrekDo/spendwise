import React, { useEffect, useState } from 'react';
import { FlatList, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Category } from '../components/Category';
import { NewEntryModal } from '../components/NewEntryModal';
import colors from '../config/colors';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import { getSelectedCategorySpendings, getSpendingsInRange, SpendingEntry } from '../services/spendingsService';
import { CategoryDetailsModal } from '../components/CategoryDetailsModal';
import { useFocusEffect } from '@react-navigation/native';
import { getCategorySkeletonForSelectedmonth } from '../services/categoriesService';

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

export const HomeScreen = () => {
  const [monthOffset, setMonthOffset] = useState(0);
  const [data, setData] = useState<DisplayCategory[]>([]);
  const [skeleton, setSkeleton] = useState<DisplayCategory[]>([]);
  const [expanded, setExpanded] = useState<number[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [modalSubId, setModalSubId] = useState<number | null>(null);

  const [categoryDetailsData, setCategoryDetailsData] = useState<SpendingEntry[]>([]);

  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth() + monthOffset);
  const currentMonth = current.getMonth();
  const currentYear = current.getFullYear();

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 20,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 50) setMonthOffset(prev => prev - 1);
      else if (gesture.dx < -50) setMonthOffset(prev => prev + 1);
    },
  });

  const toggleExpand = (id: number) => {
    setExpanded(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const getMonthDateRange = (year: number, month: number) => {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    return { start, end };
  };

  const loadData = async () => {
    const { start, end } = getMonthDateRange(currentYear, currentMonth + 1);
    const spendings: SpendingEntry[] = await getSpendingsInRange(start, end);

    const merged = skeleton.map(cat => {
      const updatedSub = cat.subcategories.map(sub => {
        const sum = spendings.filter(e => e.subcategoryId === sub.id).reduce((acc, e) => acc + e.amount, 0);
        return { ...sub, sum };
      });
      const sum = updatedSub.reduce((acc, s) => acc + s.sum, 0);
      return { ...cat, subcategories: updatedSub, sum };
    });

    setData(merged);
  };

useFocusEffect(
  React.useCallback(() => {
    const today = new Date();
    const current = new Date(today.getFullYear(), today.getMonth() + monthOffset);
    const currentMonth = current.getMonth() + 1;
    const currentYear = current.getFullYear();

    getCategorySkeletonForSelectedmonth(currentYear, currentMonth).then(setSkeleton);
  }, [monthOffset])
);

  useEffect(() => {
    if (skeleton.length > 0) loadData();
  }, [monthOffset, skeleton]);

  const positiveSum = data.filter(c => c.positive).reduce((acc, curr) => acc + curr.sum, 0);
  const negativeSum = data.filter(c => !c.positive).reduce((acc, curr) => acc + curr.sum, 0);
  const saldo = positiveSum - negativeSum;

  const openAddModal = (subId: number) => {
    setModalSubId(subId);
    setShowModal(true);
  };

  const openCategoryDetailsModal = async (categoryId: number) => {
    const { start, end } = getMonthDateRange(currentYear, currentMonth + 1);
    const entries = await getSelectedCategorySpendings(categoryId, start, end);
    setCategoryDetailsData(entries);
  };

  return (
    <View style={styles.container}>
      <View {...panResponder.panHandlers} style={styles.header}>
        <Text style={styles.monthText}>
          {MONTHS[currentMonth]} {currentYear}
        </Text>
        <View style={styles.saldoBox}>
          <Text style={styles.saldoLabel}>Saldo</Text>
          <Text style={styles.saldoValue}>{saldo.toFixed(2)} zł</Text>
        </View>
      </View>
      <FlatList
        data={data}
        renderItem={({ item }) => (
          <Category
            item={item}
            expanded={expanded}
            toggleExpand={toggleExpand}
            openAddModal={openAddModal}
            openCategoryModal={openCategoryDetailsModal}
          />
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {showModal && modalSubId !== null && (
        <NewEntryModal
          monthOffset={monthOffset}
          subcategoryId={modalSubId}
          onClose={() => setShowModal(false)}
          onSave={async () => {
            setShowModal(false);
            await loadData();
          }}
        />
      )}

      {categoryDetailsData.length > 0 && (
        <CategoryDetailsModal
          data={categoryDetailsData}
          onClose={() => setCategoryDetailsData([])}
          onRefresh={entryId => {
            loadData();
            setCategoryDetailsData(s => s.filter(c => c.id != entryId));
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 15,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  monthText: {
    fontSize: 25,
    color: colors.white,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  saldoBox: {
    padding: 10,
    backgroundColor: colors.secondary,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  saldoLabel: {
    color: colors.white,
    fontSize: 16,
    opacity: 0.8,
  },
  saldoValue: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
});
