import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../config/colors';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import { SubCategoryEdit } from './SubCategoryEdit';

interface Props {
  item: DisplayCategory;
  expandedCategory: number;
  toggleExpand: (id: number) => void;
  openCategoryEditModal: (cat: DisplayCategory) => void;
  openSubEditModal: (sub: DisplaySubcategory | undefined) => void;
}

export const CategoryEdit = ({
  item,
  expandedCategory,
  toggleExpand,
  openCategoryEditModal,
  openSubEditModal,
}: Props) => {
  return (
    <View key={item.id}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardLeft} onPress={() => toggleExpand(item.id)} activeOpacity={0.8}>
          <MaterialCommunityIcons name={item.icon} size={28} color={colors.primary} />
          <Text style={styles.cardName}>{item.name}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardRight} onPress={() => openCategoryEditModal(item)} activeOpacity={0.8}>
          <MaterialCommunityIcons name={'file-document-edit'} size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {expandedCategory === item.id && (
        <View style={styles.subList}>
          <TouchableOpacity onPress={() => openSubEditModal(undefined)}>
            <View style={styles.addSubButton}>
              <Text style={styles.addSubButtonText}>Nowa</Text>
              <MaterialCommunityIcons name={'plus'} size={20} color={colors.white} />
            </View>
          </TouchableOpacity>
          {item.subcategories.map(sub => (
            <SubCategoryEdit key={sub.id} sub={sub} openSubCategoryEditModal={openSubEditModal} />
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
    alignItems: 'center',
  },
  cardRight: {
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
  addSubButton: {
    left: -15,
    top: -5,
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '33%',
    padding: 5,
    paddingLeft: 15,
    borderBottomRightRadius: 15,
  },
  addSubButtonText: {
    color: colors.textPimary,
    fontSize: 16,
  },
});
