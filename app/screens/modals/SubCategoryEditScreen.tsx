import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../config/colors';
import { AppIcon, getIconNames } from '../../services/iconsService';
import { addNewSubcategory, updateSubcategory } from '../../services/categoriesService';
import type { DisplaySubcategory } from '../../model/Spendings';

type RouteParams = {
  sub?: DisplaySubcategory;
  expandedCategory: number;
};

const presetColors = ['#FF5722', '#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#00BCD4', '#795548', '#607D8B'];

export const SubCategoryEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { sub, expandedCategory } = (route.params as RouteParams) || { expandedCategory: -1 };

  const [icons, setIcons] = useState<AppIcon[]>([]);
  const [name, setName] = useState('Nowa podkategoria');
  const [selectedIcon, setSelectedIcon] =
    useState<keyof typeof MaterialCommunityIcons.glyphMap>('dots-horizontal-circle-outline');
  const [selectedIconId, setSelectedIconId] = useState<number>(12);
  const [selectedColor, setSelectedColor] = useState('#4CAF50');

  useEffect(() => {
    (async () => {
      const list = await getIconNames();
      setIcons(list);
    })();
  }, []);

  useEffect(() => {
    setName(sub ? sub.name : 'Nowa podkategoria');
    setSelectedIcon((sub ? sub.icon : 'dots-horizontal-circle-outline') as keyof typeof MaterialCommunityIcons.glyphMap);
    setSelectedIconId(sub ? sub.iconId : 12);
    setSelectedColor(sub ? sub.color : '#4CAF50');
  }, [sub]);

  const handleClose = () => navigation.goBack();

  const handleSave = async () => {
    if (sub && sub.id !== -1) {
      await updateSubcategory(name, selectedIconId, selectedColor, sub.categoryId, sub.id);
    } else {
      await addNewSubcategory(name, selectedIconId, selectedColor, expandedCategory);
    }
    handleClose();
  };

  return (
    <View style={styles.root}>
      {/* klik poza kartą zamyka */}
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
          <Text style={styles.label}>Nazwa podkategorii</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Kolor</Text>
          <View style={styles.colorRow}>
            {presetColors.map(color => (
              <TouchableOpacity
                key={color}
                style={[styles.colorCircle, { backgroundColor: color }, selectedColor === color && styles.selectedColor]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>

          <Text style={styles.label}>Ikona</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.iconScroll}
            contentContainerStyle={styles.iconScrollContent}
          >
            {icons.map(icon => (
              <TouchableOpacity
                key={icon.id}
                style={[styles.iconBox, selectedIcon === icon.name && styles.selectedIconBox]}
                onPress={() => {
                  setSelectedIcon(icon.name as keyof typeof MaterialCommunityIcons.glyphMap);
                  setSelectedIconId(icon.id);
                }}
              >
                <MaterialCommunityIcons name={icon.name as any} size={24} color="white" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.save}>✔</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancel}>✖</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,       // ponad ekranem pod spodem
    elevation: 1000, // Android
    paddingHorizontal: 16,
  },
  modal: {
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 12,
    width: '100%',
    maxHeight: '90%',
  },
  label: {
    color: colors.white,
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#2E2F36',
    color: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#2E2F36',
  },
  selectedColor: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  iconScroll: {
    marginVertical: 10,
    minHeight: 48, // gwarantuje miejsce na rząd ikon
  },
  iconScrollContent: {
    alignItems: 'center',
    paddingRight: 6,
  },
  iconBox: {
    backgroundColor: '#2E2F36',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  selectedIconBox: {
    backgroundColor: '#555',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  save: {
    fontSize: 24,
    color: 'green',
  },
  cancel: {
    fontSize: 24,
    color: 'red',
  },
});
