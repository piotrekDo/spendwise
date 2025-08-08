import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../config/colors';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';
import { AppIcon, getIconNames } from '../services/iconsService';
import { SaveType } from './CategoryEditModal';

interface Props {
  visible: boolean;
  expandedCategory: number;
  sub?: DisplaySubcategory;
  onSave: (type: SaveType, updated: DisplaySubcategory) => void;
  onClose: () => void;
}

const presetColors = ['#FF5722', '#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#00BCD4', '#795548', '#607D8B'];

export const SubCategoryEditModal = ({ visible, sub, expandedCategory, onSave, onClose }: Props) => {
  const [icons, setIcons] = useState<AppIcon[]>([]);

  const [name, setName] = useState(sub ? sub.name : 'Nowa podkategoria');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof MaterialCommunityIcons.glyphMap>(
    sub ? sub.icon : 'dots-horizontal-circle-outline'
  );
  const [selectedIconId, setSelectedIconId] = useState<number>(sub ? sub.iconId : 12);
  const [selectedColor, setSelectedColor] = useState(sub ? sub.color : '#4CAF50');

  const handleSave = () => {
    const subCategory: DisplaySubcategory = sub
      ? {
          ...sub,
          name,
          iconId: selectedIconId,
          icon: selectedIcon,
          color: selectedColor,
        }
      : {
          id: -1,
          categoryId: expandedCategory,
          name: name,
          iconId: selectedIconId,
          icon: selectedIcon,
          color: selectedColor,
          isDefault: false,
          sum: 0,
        };
    onSave(sub ? 'update' : 'save', subCategory);
    onClose();
  };

  useEffect(() => {
    getIconNames().then(setIcons);
  }, []);

  return (
    <Modal transparent animationType='fade' visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.label}>Nazwa podkategorii </Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Kolor</Text>
          <View style={styles.colorRow}>
            {presetColors.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColor,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>

          <Text style={styles.label}>Ikona</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
            {icons.map(icon => (
              <TouchableOpacity
                key={icon.id}
                style={[styles.iconBox, selectedIcon === icon.name && styles.selectedIconBox]}
                onPress={() => {
                  setSelectedIcon(icon.name);
                  setSelectedIconId(icon.id);
                }}
              >
                <MaterialCommunityIcons name={icon.name} size={24} color='white' />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.save}>✔</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>✖</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0008',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 12,
    width: '90%',
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
  },
  iconBox: {
    backgroundColor: '#2E2F36',
    padding: 8,
    borderRadius: 6,
    marginRight: 10,
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
