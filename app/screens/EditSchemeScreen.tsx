import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CategoryEdit } from '../components/CategoryEdit';
import colors from '../config/colors';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import { RootStackParamList } from '../navigation/RootNavigator';
import routes from '../navigation/routes';
import {
  deleteSubcategoryById,
  getCategorySkeletonForSelectedmonth,
} from '../services/categoriesService';
import useModalState from '../state/useModalState';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const EditSchemeScreen = () => {
  const [skeleton, setSkeleton] = useState<DisplayCategory[]>([]);
  const { expandedCategory, setExpandedCategory } = useModalState();
  const navigation = useNavigation<Nav>();

  // stan modala usuwania
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const isDeleteModalVisible = deleteTargetId !== null;

  const refresh = useCallback(() => {
    return getCategorySkeletonForSelectedmonth().then(setSkeleton);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const openCategoryEditModal = (cat: DisplayCategory | undefined) => {
    navigation.navigate(routes.MODAL_CATEGORY_EDIT as any, { cat });
  };

  const openSubEditModal = (sub: DisplaySubcategory | undefined) => {
    navigation.navigate(routes.MODAL_SUBCATEGORY_EDIT as any, { sub, expandedCategory });
  };

  const handleDeleteSub = (id: number) => {
    setDeleteTargetId(id);
    void Haptics.selectionAsync(); 
  };

  const closeDeleteModal = () => {
    setDeleteTargetId(null);
  };

  const confirmDelete = async () => {
    if (deleteTargetId == null) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    await deleteSubcategoryById(deleteTargetId);
    setDeleteTargetId(null);
    await refresh();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => openCategoryEditModal(undefined)} accessibilityRole="button">
        <View style={styles.addCategoryBtn}>
          <MaterialCommunityIcons name={'plus'} size={30} color="white" />
        </View>
      </TouchableOpacity>

      <FlatList
        style={styles.list}
        data={skeleton}
        renderItem={({ item }) => (
          <CategoryEdit
            item={item}
            expandedCategory={expandedCategory}
            toggleExpand={setExpandedCategory}
            openCategoryEditModal={openCategoryEditModal}
            openSubEditModal={openSubEditModal}
            onDeleteSub={handleDeleteSub} 
          />
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {/* PROSTY MODAL POTWIERDZENIA USUNIĘCIA */}
      {isDeleteModalVisible && (
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeDeleteModal} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.white} />
              <Text style={styles.modalTitle}>Usunąć podkategorię?</Text>
            </View>
            <Text style={styles.modalText}>
              Podkategoria zostanie usunięta, a wszystkie jej wpisy zostaną przeniesione do kategorii{' '}
              <Text style={styles.modalTextStrong}>„Pozostałe”</Text>.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={closeDeleteModal}>
                <Text style={styles.btnGhostText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={confirmDelete}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#fff" />
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

  /* modal */
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
