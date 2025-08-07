import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  PanResponder,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../config/colors';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import { getSpendingsForMonth } from '../services/spendingsService';
import { getCategorySkeleton } from '../services/categoriesService';
import { addEntry } from '../database/dbService';

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

  const [activeSub, setActiveSub] = useState<DisplaySubcategory | null>(null);
  const [quickAmount, setQuickAmount] = useState<string>('');

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

  const loadData = async () => {
    const spendings = await getSpendingsForMonth(currentYear, currentMonth + 1);
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

  useEffect(() => {
    getCategorySkeleton().then(setSkeleton);
  }, []);

  useEffect(() => {
    if (skeleton.length > 0) loadData();
  }, [monthOffset, skeleton]);

  const incomeCategory = data.find(c => c.name === 'Przychód');
  const saldo = incomeCategory
    ? incomeCategory.sum - data.filter(c => c.name !== 'Przychód').reduce((acc, curr) => acc + curr.sum, 0)
    : 0;

  const handleQuickAdd = async () => {
    const amount = parseFloat(quickAmount.replace(',', '.'));
    if (!isNaN(amount) && amount > 0 && activeSub) {
      const date = new Date().toISOString().split('T')[0];
      await addEntry(activeSub.id, amount, '', date);
      setQuickAmount('');
      setActiveSub(null);
      await loadData();
    }
  };

  const renderSubcategory = (sub: DisplaySubcategory) => (
    <View style={styles.subItem} key={sub.id}>
      <View style={styles.subLeft}>
        <MaterialCommunityIcons name={sub.icon} size={20} color={colors.textSecondary} />
        <Text style={styles.subName}>{sub.name}</Text>
      </View>
      <View style={styles.subRight}>
        <Text style={styles.subSum}>{sub.sum} zł</Text>
        <TouchableOpacity
          onPress={() => {
            setActiveSub(sub);
            setQuickAmount('');
          }}
        >
          <MaterialCommunityIcons name='plus-circle-outline' size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategory = ({ item }: { item: DisplayCategory }) => (
    <View key={item.id}>
      <TouchableOpacity style={styles.card} onPress={() => toggleExpand(item.id)} activeOpacity={0.8}>
        <View style={styles.cardLeft}>
          <MaterialCommunityIcons name={item.icon} size={28} color={colors.primary} />
          <Text style={styles.cardName}>{item.name}</Text>
        </View>
        <Text style={styles.cardSum}>{item.sum} zł</Text>
      </TouchableOpacity>
      {expanded.includes(item.id) && <View style={styles.subList}>{item.subcategories.map(renderSubcategory)}</View>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View {...panResponder.panHandlers} style={styles.monthHeader}>
        <Text style={styles.monthText}>
          {MONTHS[currentMonth]} {currentYear}
        </Text>
      </View>
      <View style={styles.saldoBox}>
        <Text style={styles.saldoLabel}>Saldo</Text>
        <Text style={styles.saldoValue}>{saldo.toFixed(2)} zł</Text>
      </View>
      <FlatList
        data={data}
        renderItem={renderCategory}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Quick Entry Modal */}
      <Modal visible={!!activeSub} transparent animationType='fade'>
        <TouchableWithoutFeedback onPress={() => setActiveSub(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>{activeSub?.name}</Text>
                <TextInput
                  placeholder='Kwota'
                  keyboardType='numeric'
                  value={quickAmount}
                  onChangeText={setQuickAmount}
                  style={styles.modalInput}
                  placeholderTextColor='#aaa'
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={handleQuickAdd}>
                    <MaterialCommunityIcons name='check' size={28} color='green' />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveSub(null)}>
                    <MaterialCommunityIcons name='close' size={28} color='red' />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      /* modal zaawansowany */
                    }}
                  >
                    <MaterialCommunityIcons name='pencil' size={28} color='#ccc' />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  monthHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  monthText: {
    fontSize: 18,
    color: colors.white,
    fontWeight: 'bold',
  },
  saldoBox: {
    padding: 15,
    backgroundColor: colors.secondary,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
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
  card: {
    backgroundColor: '#22242B',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    color: colors.white,
    fontSize: 16,
    marginLeft: 10,
  },
  cardSum: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  subList: {
    backgroundColor: '#1F2128',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  subItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    alignItems: 'center',
  },
  subLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subName: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
  subRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subSum: {
    color: colors.textSecondary,
    fontSize: 14,
    marginRight: 8,
  },
  addButton: {
    padding: 2,
  },
  input: {
    color: colors.white,
    backgroundColor: '#2E2F36',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 60,
    marginRight: 8,
    fontSize: 14,
  },
  amountInput: {
    backgroundColor: '#333',
    color: '#fff',
    width: 60,
    padding: 4,
    marginRight: 6,
    borderRadius: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#2a2b31',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: '#444',
    color: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    width: '100%',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
  },
});
