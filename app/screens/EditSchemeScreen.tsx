import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { CategoryEdit } from '../components/CategoryEdit';
import colors from '../config/colors';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import { RootStackParamList } from '../navigation/RootNavigator';
import routes from '../navigation/routes';
import {
  deleteSubcategoryById,
  deleteCategoryById,
  getCategorySkeletonForSelectedmonth,
} from '../services/categoriesService';
import useModalState from '../state/useModalState';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const EditSchemeScreen = () => {
  const [skeleton, setSkeleton] = useState<DisplayCategory[]>([]);
  const { expandedCategory, setExpandedCategory } = useModalState();
  const navigation = useNavigation<Nav>();

  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);
  const isDeleteCategoryModalVisible = deleteCategoryId !== null;

  const [deleteSubId, setDeleteSubId] = useState<number | null>(null);
  const isDeleteSubModalVisible = deleteSubId !== null;

    const getCurrentYearMonth = () => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth());
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  };

  const refresh = useCallback(async (y?: number, m?: number) => {
    const { year, month } = y && m ? { year: y, month: m } : getCurrentYearMonth();
    const data = await getCategorySkeletonForSelectedmonth(year, month);
    setSkeleton(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh(); 
      return () => {}; 
    }, [refresh])
  );

  const openCategoryEditModal = (cat: DisplayCategory | undefined) => {
    navigation.navigate(routes.MODAL_CATEGORY_EDIT as any, { cat });
  };

  const openSubEditModal = (sub: DisplaySubcategory | undefined) => {
    navigation.navigate(routes.MODAL_SUBCATEGORY_EDIT as any, { sub, expandedCategory });
  };

  // =======================
  // 🗑 Obsługa kategorii
  // =======================
  const renderRightActionsCat = (progress: Animated.SharedValue<number>, catId: number) => {
    const animatedStyle = useAnimatedStyle(() => {
      const opacity = interpolate(progress.value, [1, 0], [1, 0.01]);
      return { opacity };
    });
    return (
      <Animated.View style={[styles.deleteButton, animatedStyle]}>
        <TouchableOpacity onPress={() => handleDeleteCategory(catId)}>
          <MaterialCommunityIcons name='trash-can-outline' size={24} color='white' />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleDeleteCategory = (id: number) => {
    setDeleteCategoryId(id);
    void Haptics.selectionAsync();
  };

  const handleSwipeOpenCat = (id: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, 80);
    setDeleteCategoryId(id);
  };

  const handleSwipeWillOpenCat = () => {
    void Haptics.selectionAsync();
  };

  const closeDeleteCategoryModal = () => {
    setDeleteCategoryId(null);
  };

  const confirmDeleteCategory = async () => {
    if (deleteCategoryId == null) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    await deleteCategoryById(deleteCategoryId);
    setDeleteCategoryId(null);
    await refresh();
  };

  // =======================
  // 🗑 Obsługa podkategorii
  // =======================
  const handleDeleteSub = (id: number) => {
    setDeleteSubId(id);
    void Haptics.selectionAsync();
  };

  const closeDeleteSubModal = () => {
    setDeleteSubId(null);
  };

  const confirmDeleteSub = async () => {
    if (deleteSubId == null) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    await deleteSubcategoryById(deleteSubId);
    setDeleteSubId(null);
    await refresh();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => openCategoryEditModal(undefined)}>
        <View style={styles.addCategoryBtn}>
          <MaterialCommunityIcons name='plus' size={30} color='white' />
        </View>
      </TouchableOpacity>

      <FlatList
        style={styles.list}
        data={skeleton}
        renderItem={({ item }) => {
          const content = (
            <CategoryEdit
              item={item}
              expandedCategory={expandedCategory}
              toggleExpand={setExpandedCategory}
              openCategoryEditModal={openCategoryEditModal}
              openSubEditModal={openSubEditModal}
              onDeleteSub={handleDeleteSub}
            />
          );

          // Jeśli to kategoria bazowa, bez swipe
          if (item.isDefault) {
            return content;
          }

          // Jeśli można usuwać, wrap w Swipeable
          return (
            <Swipeable
              renderRightActions={progress => renderRightActionsCat(progress, item.id)}
              overshootRight={false}
              rightThreshold={40}
              onSwipeableWillOpen={handleSwipeWillOpenCat}
              onSwipeableOpen={() => handleSwipeOpenCat(item.id)}
            >
              {content}
            </Swipeable>
          );
        }}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      />

      {/* MODAL usuwania kategorii */}
      {isDeleteCategoryModalVisible && (
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeDeleteCategoryModal} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name='alert-circle-outline' size={22} color={colors.white} />
              <Text style={styles.modalTitle}>Usunąć kategorię?</Text>
            </View>
            <Text style={styles.modalText}>
              Kategoria zostanie usunięta, a wszystkie jej podkategorie i wpisy zostaną przeniesione do kategorii{' '}
              <Text style={styles.modalTextStrong}>„Pozostałe”</Text>.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={closeDeleteCategoryModal}>
                <Text style={styles.btnGhostText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={confirmDeleteCategory}>
                <MaterialCommunityIcons name='trash-can-outline' size={18} color='#fff' />
                <Text style={styles.btnDangerText}>Usuń</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* MODAL usuwania podkategorii */}
      {isDeleteSubModalVisible && (
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeDeleteSubModal} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name='alert-circle-outline' size={22} color={colors.white} />
              <Text style={styles.modalTitle}>Usunąć podkategorię?</Text>
            </View>
            <Text style={styles.modalText}>
              Podkategoria zostanie usunięta, a wszystkie jej wpisy zostaną przeniesione do kategorii{' '}
              <Text style={styles.modalTextStrong}>„Pozostałe”</Text>.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={closeDeleteSubModal}>
                <Text style={styles.btnGhostText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={confirmDeleteSub}>
                <MaterialCommunityIcons name='trash-can-outline' size={18} color='#fff' />
                <Text style={styles.btnDangerText}>Usuń</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 15,
    paddingTop: 40,
  },
  addCategoryBtn: {
    width: '80%',
    backgroundColor: colors.primary,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    padding: 5,
    marginVertical: 10,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
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
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    width: '88%',
    backgroundColor: '#23252C',
    borderRadius: 14,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalText: {
    color: colors.white,
    opacity: 0.9,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalTextStrong: {
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3A3D46',
  },
  btnGhostText: {
    color: colors.white,
    fontSize: 14,
  },
  btnDanger: {
    backgroundColor: '#D32F2F',
  },
  btnDangerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
