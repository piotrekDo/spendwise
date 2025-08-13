import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { Entry, deleteEntry } from '../services/entriesService';
import colors from '../config/colors';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

interface Props {
  data: Entry[];
  onClose: () => void;
  onRefresh: (entryId: number) => void;
}

export const CategoryDetailsModal = ({ data, onClose, onRefresh }: Props) => {
  const renderRightActions = (entryId: number) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={async () => {
        await deleteEntry(entryId);
        onRefresh(entryId);
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
    >
      <Animated.View style={styles.entryItem}>
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
    <Modal visible={true} animationType='slide' onRequestClose={onClose} transparent>
      <GestureHandlerRootView style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Szczegóły kategorii</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name='close' size={24} color='#fff' />
            </TouchableOpacity>
          </View>

          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: Dimensions.get('window').height * 0.6,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  entryItem: {
    backgroundColor: '#2A2C33',
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
    gap: 5
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
