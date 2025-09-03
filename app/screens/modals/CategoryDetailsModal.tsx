import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetSectionList
} from '@gorhom/bottom-sheet';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';
import colors from '../../config/colors';
import { monthColors, monthIcons, MONTHS_PL } from '../../config/constants';
import { deleteEntry, Entry } from '../../services/entriesService';

type RouteParams = {
  data: Entry[];
  displayName: string;
  displayIcon: string;
  displayColor: string;
  fullScreen: boolean;
};

export const CategoryDetailsModal = () => {
  const navigation = useNavigation<any>();
  const sheetRef = useRef<BottomSheetModal>(null);
  const route = useRoute();
  const { data, displayName, displayIcon, displayColor, fullScreen } = route.params as RouteParams;

  const [entries, setEntries] = useState<Entry[]>(data || []);

  useEffect(() => {
    const id = requestAnimationFrame(() => sheetRef.current?.present());
    return () => cancelAnimationFrame(id);
  }, []);

  type Section = { monthIdx: number; title: string; data: Entry[] };

  function toSections(entries: Entry[]): Section[] {
    const byMonth = new Map<number, Entry[]>();
    for (const e of entries) {
      const m = new Date(e.date).getMonth();
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m)!.push(e);
    }
    // ⬇️ bez sort()
    return [...byMonth.entries()].map(([m, list]) => ({
      monthIdx: m,
      title: MONTHS_PL[m],
      data: list,
    }));
  }

  const sections = useMemo(() => toSections(entries), [entries]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior='close' opacity={0.5} />
    ),
    []
  );

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderRightActions = (entryId: number) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={async () => {
        await deleteEntry(entryId);
        setEntries(prev => prev.filter(e => e.id !== entryId));
      }}
    >
      <MaterialCommunityIcons name='trash-can-outline' size={24} color='white' />
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Entry }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
      containerStyle={{ marginBottom: 10 }}
      overshootRight={false}
      rightThreshold={20} // było domyślne ~64 – ustaw np. 16–24
      friction={1} // 0.8–1.2 jest zwykle „miękko”
      activeOffsetX={[-10, 10]} // trzeba ruszyć w bok co najmniej 10 px
      activeOffsetY={[-50, 50]} // pozwala na drobne „drżenie” w pionie (max 10 px)
    >
      <Animated.View
        style={[styles.entryItem, { backgroundColor: !item.financedEnvelopeId ? '#2A2C33' : colors.envelope }]}
      >
        <View>
          <Text style={styles.amount}>{item.amount.toFixed(2)} zł</Text>
          <View style={styles.subcategory}>
            <MaterialCommunityIcons name={item.subcategoryIcon as any} size={16} color='white' />
            <Text style={styles.description}>{item.subcategoryName}</Text>
          </View>
          {!!item.description?.trim() && <Text style={styles.description}>{item.description}</Text>}
        </View>
        <Text style={styles.date}>{item.date}</Text>
      </Animated.View>
    </Swipeable>
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={[fullScreen ? '92%' : '60%']}
      index={0}
      enableDynamicSizing={false}
      enableOverDrag={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.28)' }}
      handleStyle={{ paddingVertical: 6 }}
      backgroundStyle={{ backgroundColor: colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
      onDismiss={handleDismiss}
      keyboardBehavior='interactive'
      keyboardBlurBehavior='restore'
    >
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <MaterialCommunityIcons name={displayIcon as any} size={28} color={displayColor} />
          <Text style={[styles.title, { color: displayColor }]}>{displayName}</Text>
        </View>

        <BottomSheetSectionList
          sections={sections}
          keyExtractor={item => String(item.id)}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: monthColors[section.monthIdx],
                borderRadius: 8,
                marginHorizontal: 12,
                marginTop: 10,
              }}
            >
              <MaterialCommunityIcons name={monthIcons[section.monthIdx] as any} size={18} color='#fff' />
              <Text style={{ color: '#fff', fontWeight: '700' }}>{section.title}</Text>
            </View>
          )}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  entryItem: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subcategory: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 5,
  },
  description: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 2,
  },
  date: {
    color: '#aaa',
    fontSize: 13,
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
