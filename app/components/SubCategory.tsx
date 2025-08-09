import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../config/colors';
import { DisplaySubcategory } from '../model/Spendings';

interface Props {
  sub: DisplaySubcategory;
  openAddModal: (subId: number) => void
}

export const SubCategory = ({ sub, openAddModal }: Props) => {
  return (
    <View style={styles.subItem} key={sub.id}>
      <View style={styles.subLeft}>
        <MaterialCommunityIcons name={sub.icon} size={20} color={sub.color} />
        <Text style={styles.subName}>{sub.name}</Text>
      </View>
      <View style={styles.subRight}>
        <Text style={styles.subSum}>{sub.sum} zł</Text>
        <TouchableOpacity
          onPress={() => {
            openAddModal(sub.id);
          }}
        >
          <MaterialCommunityIcons name='plus-circle-outline' size={26} color={colors.primary} />
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
