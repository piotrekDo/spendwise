import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../config/colors';
import { DisplayCategory } from '../model/Spendings';
import { SubCategory } from './SubCategory';

interface Props {
  item: DisplayCategory;
  expanded: number[];
  toggleExpand: (id: number) => void;
  openAddModal: (subId: number) => void;
  openCategoryModal: (categoryId: number) => void;
}

export const Category = ({ item, expanded, toggleExpand, openAddModal, openCategoryModal }: Props) => {
  // defensywnie: limit może być null/undefined/0
  const hasLimit = useMemo(
    () => typeof item.limit === 'number' && isFinite(item.limit) && item.limit > 0,
    [item.limit]
  );

  const progress = useMemo(() => {
    if (!hasLimit) return 0;
    const p = item.sum / (item.limit as number);
    return Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
  }, [hasLimit, item.sum, item.limit]);

  const overLimit = hasLimit && item.sum > (item.limit as number);

  const progressColor = useMemo(() => {
    if (!hasLimit) return 'transparent';
    if (overLimit) return '#E53935'; // > 100% – czerwony
    if (progress >= 0.8) return '#FB8C00'; // 80–100% – pomarańczowy
    return '#43A047'; // < 80% – zielony
  }, [hasLimit, progress, overLimit]);

  return (
    <View key={item.id}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardLeft} onPress={() => openCategoryModal(item.id)} accessibilityRole='button'>
          <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardRight}
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.8}
          accessibilityRole='button'
        >
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardSum}>{item.sum.toFixed(2)} zł</Text>
        </TouchableOpacity>
      </View>

      {hasLimit && (
        <View style={[styles.limitWrap, overLimit && styles.limitWrapOver]}>
          <View style={styles.limitTrack}>
            <View style={[styles.limitFill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
          </View>
          <View style={styles.limitRow}>
            <Text style={styles.limitText}>
              {item.sum.toFixed(2)} / {(item.limit as number).toFixed(2)} zł
            </Text>
            <Text style={[styles.limitText, { opacity: 0.8 }]}>{Math.min(100, Math.round(progress * 100))}%</Text>
          </View>
        </View>
      )}

      {expanded.includes(item.id) && (
        <View style={styles.subList}>
          {item.subcategories.map(sub => (
            <SubCategory key={sub.id} sub={sub} openAddModal={openAddModal} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#22242B',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 64, // wyższa karta, żeby nie było ściśnięte
  },
  cardLeft: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRight: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 10,
  },
  cardName: {
    color: colors.white,
    fontSize: 16,
    marginRight: 12,
    flexShrink: 1,
  },
  cardSum: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // limit
  limitWrap: {
    paddingHorizontal: 6,
    paddingTop: 2,
    paddingBottom: 8,
    marginTop: -2,
    marginBottom: 8,
  },
  limitWrapOver: {
    // subtelne podbicie tła przy przekroczeniu
    backgroundColor: 'rgba(229, 57, 53, 0.08)',
    borderRadius: 8,
  },
  limitTrack: {
    backgroundColor: '#2E2F36',
    borderRadius: 6,
    height: 12,
    overflow: 'hidden',
  },
  limitFill: {
    height: '100%',
    borderRadius: 6,
  },
  limitRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  limitText: {
    color: colors.white,
    fontSize: 11,
  },

  subList: {
    backgroundColor: '#1F2128',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 10,
  },
});
