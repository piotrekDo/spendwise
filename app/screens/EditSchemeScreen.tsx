import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { CategoryEdit } from '../components/CategoryEdit';
import { CategoryEditModal, SaveType } from '../components/CategoryEditModal';
import colors from '../config/colors';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import {
  addNewCategory,
  addNewSubcategory,
  getCategorySkeletonForSelectedmonth,
  updateCategory,
  updateSubcategory,
} from '../services/categoriesService';
import { SubCategoryEditModal } from '../components/SubCategoryEditModal';

export const EditSchemeScreen = () => {
  const [skeleton, setSkeleton] = useState<DisplayCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<number>(-1);
  const [editCatModalVisibe, setEditCatModalVisible] = useState(false);
  const [edittingCat, setEdditingCat] = useState<DisplayCategory | undefined>(undefined);

  const [editSubMocalVisible, setEditSubModalVisible] = useState(false);
  const [edditingSub, setEdditingSub] = useState<DisplaySubcategory | undefined>(undefined);

  useEffect(() => {
    getCategorySkeletonForSelectedmonth().then(setSkeleton);
  }, []);

  const toggleExpandCategory = (id: number) => {
    setExpandedCategory(currentlyExpanded => (currentlyExpanded === id ? -1 : id));
  };

  const handleOpenCategoryEditModal = (cat: DisplayCategory) => {
    setEdditingCat(cat);
    setEditCatModalVisible(true);
  };

  const handleCloseCategoryEditmodal = () => {
    setEdditingCat(undefined);
    setEditCatModalVisible(false);
  };

  const handleSaveCategoryChanges = async (type: SaveType, cat: DisplayCategory) => {
    if (type === 'update') {
      await updateCategory(cat.name, cat.iconId, cat.color, cat.id);
    } else if (type === 'save') {
      await addNewCategory(cat.name, cat.iconId, cat.color);
    }
    await getCategorySkeletonForSelectedmonth().then(setSkeleton);
  };

  const handleOpenSubEditModal = (sub: DisplaySubcategory | undefined) => {
    setEdditingSub(sub);
    setEditSubModalVisible(true);
  };

  const handleCloseSubEditModal = () => {
    setEdditingSub(undefined);
    setEditSubModalVisible(false);
  };

  const handleSaveSubCategoryChanges = async (type: SaveType, sub: DisplaySubcategory) => {
    if (type === 'update') {
      await updateSubcategory(sub.name, sub.iconId, sub.color, sub.categoryId, sub.id);
    } else if (type === 'save') {
      await addNewSubcategory(sub.name, sub.iconId, sub.color, sub.categoryId);
    }

    await getCategorySkeletonForSelectedmonth().then(setSkeleton);
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setEditCatModalVisible(true)}>
          <View style={styles.addCategoryBtn}>
            <MaterialCommunityIcons name={'plus'} size={30} color='white' />
          </View>
        </TouchableOpacity>
        <FlatList
          data={skeleton}
          renderItem={({ item }) => (
            <CategoryEdit
              item={item}
              expandedCategory={expandedCategory}
              toggleExpand={toggleExpandCategory}
              openCategoryEditModal={handleOpenCategoryEditModal}
              openSubEditModal={handleOpenSubEditModal}
            />
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

      {editCatModalVisibe && (
        <CategoryEditModal
          visible={editCatModalVisibe}
          cat={edittingCat}
          onClose={handleCloseCategoryEditmodal}
          onSave={handleSaveCategoryChanges}
        />
      )}

      {editSubMocalVisible && (
        <SubCategoryEditModal
          visible={editSubMocalVisible}
          sub={edditingSub}
          expandedCategory={expandedCategory}
          onClose={handleCloseSubEditModal}
          onSave={handleSaveSubCategoryChanges}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {},
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
});
