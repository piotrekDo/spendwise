import React, { useEffect, useMemo, useState } from 'react';
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
import { addNewCategory, updateCategory } from '../../services/categoriesService';
import type { DisplayCategory } from '../../model/Spendings';
import { upsertCategoryLimit } from '../../services/limitService';

type RouteParams = { cat?: DisplayCategory };
type LimitScope = 'global' | 'year' | 'month';

const presetColors = ['#FF5722', '#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#00BCD4', '#795548', '#607D8B'];

export const CategoryEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { cat } = (route.params as RouteParams) || {};

  const [icons, setIcons] = useState<AppIcon[]>([]);
  const [name, setName] = useState('Nowa kategoria');
  const [selectedIcon, setSelectedIcon] =
    useState<keyof typeof MaterialCommunityIcons.glyphMap>('dots-horizontal-circle-outline');
  const [selectedIconId, setSelectedIconId] = useState<number>(12);
  const [selectedColor, setSelectedColor] = useState('#4CAF50');

  // ---- LIMIT state ----
  const [limitScope, setLimitScope] = useState<LimitScope>('global');
  const [limitInput, setLimitInput] = useState<string>(''); // tekst, pozwala wpisać przecinek itd.
  const [limitYear, setLimitYear] = useState<number>(new Date().getFullYear());
  const [limitMonth, setLimitMonth] = useState<number>(new Date().getMonth() + 1);

  const parsedLimit = useMemo(() => {
    const normalized = limitInput.replace(',', '.').trim();
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }, [limitInput]);

  useEffect(() => {
    (async () => {
      const list = await getIconNames();
      setIcons(list);
    })();
  }, []);

  useEffect(() => {
    setName(cat ? cat.name : 'Nowa kategoria');
    setSelectedIcon((cat ? cat.icon : 'dots-horizontal-circle-outline') as keyof typeof MaterialCommunityIcons.glyphMap);
    setSelectedIconId(cat ? cat.iconId : 12);
    setSelectedColor(cat ? cat.color : '#4CAF50');

    // jeśli masz w DTO `cat.limit` jako efektywny limit – możesz nim zasilić input,
    // ale scope trzeba wybrać ręcznie (nie da się odgadnąć czy to stały/roczny/miesięczny).
    if (cat?.limit != null) {
      setLimitInput(String(cat.limit));
    }
  }, [cat]);

  const handleClose = () => navigation.goBack();

  const handleSave = async () => {
    let categoryId: number | undefined = cat?.id;

    if (cat) {
      await updateCategory(name, selectedIconId, selectedColor, cat.id);
      categoryId = cat.id;
    } else {
      // Uwaga: Twoje addNewCategory zwraca tylko boolean.
      // Jeśli chcesz ustawiać limit "od razu", przerób addNewCategory tak, by zwracało lastInsertRowId
      // i przypisz go do categoryId. Na teraz: zapisze tylko kategorię.
      await addNewCategory(name, selectedIconId, selectedColor);
    }

    // zapis limitu tylko gdy edytujemy istniejącą kategorię i limit jest poprawny
    if (categoryId && parsedLimit !== null) {
      await upsertCategoryLimit({
        categoryId,
        limit: parsedLimit,
        scope: limitScope,
        year: limitScope !== 'global' ? limitYear : undefined,
        month: limitScope === 'month' ? limitMonth : undefined,
      });
    }

    handleClose();
  };

  const changeYear = (delta: number) => setLimitYear(y => Math.max(2000, Math.min(2100, y + delta)));
  const changeMonth = (delta: number) =>
    setLimitMonth(m => {
      let next = m + delta;
      if (next < 1) next = 1;
      if (next > 12) next = 12;
      return next;
    });

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
          <Text style={styles.label}>Nazwa kategorii</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Kolor</Text>
          <View style={styles.colorRow}>
            {presetColors.map(color => (
              <TouchableOpacity
                key={color}
                style={[styles.colorCircle, { backgroundColor: color }, selectedColor === color && styles.selectedColor]}
                onPress={() => setSelectedColor(color)}
                accessibilityRole="button"
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
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name={icon.name as any} size={24} color="white" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ---- LIMITY ---- */}
          <Text style={[styles.label, { marginTop: 10 }]}>Limit</Text>
          <TextInput
            style={styles.input}
            placeholder="np. 1500"
            keyboardType="decimal-pad"
            value={limitInput}
            onChangeText={setLimitInput}
          />

          <View style={styles.chipsRow}>
            <Chip label="Stały" active={limitScope === 'global'} onPress={() => setLimitScope('global')} />
            <Chip label="Roczny" active={limitScope === 'year'} onPress={() => setLimitScope('year')} />
            <Chip label="Miesięczny" active={limitScope === 'month'} onPress={() => setLimitScope('month')} />
          </View>

          {limitScope !== 'global' && (
            <View style={styles.inlineRow}>
              <Text style={styles.smallLabel}>Rok</Text>
              <View style={styles.stepper}>
                <StepBtn onPress={() => changeYear(-1)} text="−" />
                <Text style={styles.stepVal}>{limitYear}</Text>
                <StepBtn onPress={() => changeYear(1)} text="＋" />
              </View>
            </View>
          )}

          {limitScope === 'month' && (
            <View style={styles.inlineRow}>
              <Text style={styles.smallLabel}>Miesiąc</Text>
              <View style={styles.stepper}>
                <StepBtn onPress={() => changeMonth(-1)} text="−" />
                <Text style={styles.stepVal}>{limitMonth}</Text>
                <StepBtn onPress={() => changeMonth(1)} text="＋" />
              </View>
            </View>
          )}

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

const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const StepBtn = ({ onPress, text }: { onPress: () => void; text: string }) => (
  <TouchableOpacity onPress={onPress} style={styles.stepBtn}>
    <Text style={styles.stepBtnText}>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1 },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 1000,
  },
  modal: {
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 12,
    width: '92%',
    maxHeight: '90%',
  },
  label: { color: colors.white, marginBottom: 6, fontSize: 14 },
  input: {
    backgroundColor: '#2E2F36',
    color: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#2E2F36',
  },
  selectedColor: { borderColor: '#fff', borderWidth: 3 },
  iconScroll: { marginVertical: 10, minHeight: 48 },
  iconScrollContent: { alignItems: 'center', paddingRight: 6 },
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
  selectedIconBox: { backgroundColor: '#555' },

  // limit
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A3D46',
    backgroundColor: 'transparent',
  },
  chipActive: { backgroundColor: 'rgba(76, 175, 80, 0.18)', borderColor: '#4CAF50' },
  chipText: { color: colors.white, fontSize: 12 },
  chipTextActive: { color: '#C8E6C9', fontWeight: '700' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  smallLabel: { color: colors.white, opacity: 0.85 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E2F36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: colors.white, fontSize: 18 },
  stepVal: { color: colors.white, minWidth: 36, textAlign: 'center' },

  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  save: { fontSize: 24, color: 'green' },
  cancel: { fontSize: 24, color: 'red' },
});
