import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import { getCategorySkeleton, updateCategory } from '../services/categoriesService';
import { Category } from '../components/Category';
import { CategoryEdit } from '../components/CategoryEdit';
import { CategoryEditModal } from '../components/CategoryEditModal';

export const EditSchemeScreen = () => {
  const [skeleton, setSkeleton] = useState<DisplayCategory[]>([]);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [activeSub, setActiveSub] = useState<DisplaySubcategory | null>(null);
  const [edittingCat, setEdditingCat] = useState<DisplayCategory | undefined>(undefined);

  useEffect(() => {
    getCategorySkeleton().then(setSkeleton);
  }, []);

  const toggleExpand = (id: number) => {
    setExpanded(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSaveChanges = async (cat: DisplayCategory) => {
    await updateCategory(cat.name, cat.iconId, cat.color, cat.id);
    await getCategorySkeleton().then(setSkeleton);
  };

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={skeleton}
          renderItem={({ item }) => (
            <CategoryEdit
              item={item}
              expanded={expanded}
              toggleExpand={toggleExpand}
              setActiveSub={setActiveSub}
              openAddModal={() => {}}
              openCategoryEditModal={setEdditingCat}
            />
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

      {edittingCat && (
        <CategoryEditModal cat={edittingCat} onClose={() => setEdditingCat(undefined)} onSave={handleSaveChanges} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {},
});
