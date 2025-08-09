import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../config/colors';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import { SubCategoryEdit } from './SubCategoryEdit';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Props {
  item: DisplayCategory;
  expandedCategory: number;
  toggleExpand: (id: number) => void;
  openCategoryEditModal: (cat: DisplayCategory) => void;
  openSubEditModal: (sub: DisplaySubcategory | undefined) => void;
  onDeleteSub: (id: number) => void;
}

export const CategoryEdit = ({
  item,
  expandedCategory,
  toggleExpand,
  openCategoryEditModal,
  openSubEditModal,
  onDeleteSub,
}: Props) => {
  const renderRightActions = (progress: Animated.SharedValue<number>, entryId: number) => {
    const animatedStyle = useAnimatedStyle(() => {
      const opacity = interpolate(progress.value, [1, 0], [1, 0.01]);
      return { opacity };
    });
    return (
      <Animated.View style={[styles.deleteButton, animatedStyle]}>
        <TouchableOpacity
          onPress={() => handleDelete(entryId)}
          accessibilityRole="button"
          accessibilityLabel="Usuń podkategorię"
        >
          <MaterialCommunityIcons name="trash-can-outline" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleDelete = (id: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    onDeleteSub(id);
    console.log('delete ' + id)
  };

  const handleSwipeOpen = (id: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, 80);
    onDeleteSub(id);
        console.log('delete ' + id)
  };

  const handleSwipeWillOpen = () => {
    // delikatny sygnał, że "zaraz puści"
    void Haptics.selectionAsync();
  };

  const handleOpenCategoryEditModal = async (cat: DisplayCategory) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 120);
    openCategoryEditModal(cat);
  };

  return (
    <View key={item.id}>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardLeft}
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.8}
          onLongPress={() => handleOpenCategoryEditModal(item)}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name={item.icon} size={28} color={colors.primary} />
          <Text style={styles.cardName}>{item.name}</Text>
        </TouchableOpacity>
      </View>

      {expandedCategory === item.id && (
        <View style={styles.subList}>
          <TouchableOpacity onPress={() => openSubEditModal(undefined)} accessibilityRole="button">
            <View style={styles.addSubButton}>
              <Text style={styles.addSubButtonText}>Nowa</Text>
              <MaterialCommunityIcons name={'plus'} size={20} color={colors.white} />
            </View>
          </TouchableOpacity>

          {item.subcategories.map(sub => (
            <Swipeable
              key={sub.id}
              renderRightActions={progress => renderRightActions(progress, sub.id)}
              containerStyle={{ marginBottom: 10 }}
              overshootRight={false}
              rightThreshold={40}                 // szybciej "zatrzaśnie" delete
              onSwipeableWillOpen={handleSwipeWillOpen}
              onSwipeableOpen={() => handleSwipeOpen(sub.id)}  // pełny swipe w lewo = usuń
            >
              <SubCategoryEdit sub={sub} openSubCategoryEditModal={openSubEditModal} />
            </Swipeable>
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
    color: colors.textPimary, // poprawiona literówka
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    borderRadius: 8,
    marginLeft: 8,
    height: '85%',
    alignSelf: 'center',
  },
});
