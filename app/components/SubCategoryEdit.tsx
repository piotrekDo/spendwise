import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../config/colors';
import { DisplaySubcategory } from '../model/Spendings';
import * as Haptics from 'expo-haptics';

interface Props {
  sub: DisplaySubcategory;
  openSubCategoryEditModal: (sub: DisplaySubcategory) => void;
}

export const SubCategoryEdit = ({ sub, openSubCategoryEditModal }: Props) => {
  const handleOpenSubCategoryEditModal = async (item: DisplaySubcategory) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 150);
    openSubCategoryEditModal(item);
  };
  return (
    <TouchableOpacity onLongPress={() => handleOpenSubCategoryEditModal(sub)}>
      <View style={styles.subItem} key={sub.id}>
        <View style={styles.subLeft}>
          <MaterialCommunityIcons name={sub.icon} size={20} color={colors.textSecondary} />
          <Text style={styles.subName}>{sub.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
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
