import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import colors from '../config/colors';
import { addEntry } from '../services/entriesService';

type Props = {
  monthOffset: number;
  subcategoryId: number;
  onClose: () => void;
  onSave: () => void;
};

export const NewEntryModal = ({ monthOffset, subcategoryId, onClose, onSave }: Props) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + monthOffset;
  let final;
  if (monthOffset === 0) {
    final = today;
  } else if (monthOffset < 0) {
    // ostatni dzień danego miesiąca
    final = new Date(year, month + 1, 0);
  } else {
    // pierwszy dzień danego miesiąca
    final = new Date(year, month, 1);
  }

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(final);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = async () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      const isoDate = date.toISOString().split('T')[0];
      await addEntry(subcategoryId, parsed, description, isoDate);
      onSave();
    }
  };

  return (
    <Modal transparent animationType='fade'>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.label}>Kwota</Text>
          <TextInput
            style={styles.input}
            keyboardType='numeric'
            placeholder='0.00'
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>Opis (opcjonalnie)</Text>
          <TextInput style={styles.input} placeholder='Np. Czynsz' value={description} onChangeText={setDescription} />

          <Text style={styles.label}>Data</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
            <Text style={styles.dateText}>{date.toLocaleDateString('pl-PL')}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode='date'
              display='spinner'
              locale='pl-PL'
              onChange={(event, selected) => {
                if (selected) setDate(selected);
                setShowDatePicker(false);
              }}
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleSubmit}>
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
    width: '80%',
  },
  label: {
    color: colors.white,
    marginBottom: 4,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#2E2F36',
    color: '#fff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  dateBtn: {
    padding: 10,
    backgroundColor: '#2E2F36',
    borderRadius: 6,
    marginBottom: 12,
  },
  dateText: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
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
