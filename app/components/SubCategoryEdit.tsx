import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SubCategory } from './SubCategory';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import colors from '../config/colors';

interface Props {
  sub: DisplaySubcategory;
  openSubCategoryEditModal: (sub: DisplaySubcategory) => void;
}

export const SubCategoryEdit = ({ sub, openSubCategoryEditModal }: Props) => {
  return (
    <View style={styles.subItem} key={sub.id}>
      <View style={styles.subLeft}>
        <MaterialCommunityIcons name={sub.icon} size={20} color={colors.textSecondary} />
        <Text style={styles.subName}>{sub.name}</Text>
      </View>
      <View style={styles.subRight}>
        <TouchableOpacity onPress={() => openSubCategoryEditModal(sub)}>
          <MaterialCommunityIcons name='file-document-edit' size={26} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});
