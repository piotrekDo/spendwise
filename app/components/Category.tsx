import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SubCategory } from './SubCategory';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import colors from '../config/colors';

interface Props {
  item: DisplayCategory;
  expanded: number[];
  toggleExpand: (id: number) => void;
  setActiveSub: React.Dispatch<React.SetStateAction<DisplaySubcategory | null>>;
  openAddModal: (subId: number) => void;
  openCategoryModal: (categoryId: number) => void;
}

export const Category = ({ item, expanded, toggleExpand, setActiveSub, openAddModal, openCategoryModal }: Props) => {
  return (
    <View key={item.id}>
      <View style={styles.card}>
        <TouchableOpacity onPress={() => openCategoryModal(item.id)}>
          <MaterialCommunityIcons name={item.icon} size={28} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardLeft} onPress={() => toggleExpand(item.id)} activeOpacity={0.8}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardSum}>{item.sum.toFixed(2)} zł</Text>
        </TouchableOpacity>
      </View>

      {expanded.includes(item.id) && (
        <View style={styles.subList}>
          {item.subcategories.map(sub => (
            <SubCategory key={sub.id} sub={sub} setActiveSub={setActiveSub} openAddModal={openAddModal} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#22242B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    color: colors.white,
    fontSize: 14,
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
});
