import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AddEnvelopeForm } from '../components/envelope/AddEnvelopeForm';
import { EnvelopeCard } from '../components/EnvelopeCard';
import colors from '../config/colors';
import { Envelope, getAllEnvelopes } from '../services/envelopesService';

export const EnvelopesScreen = () => {
  const [showAdd, setShowAdd] = useState(false);

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const today = new Date();
  const year = today.getFullYear();
  const month1 = today.getMonth() + 1;

  useFocusEffect(() => {
    getAllEnvelopes().then(envelopes => setEnvelopes(envelopes));
  });
  const handleAddEnvelope = () => setShowAdd(s => !s);
  return (
    <>
      {showAdd && <AddEnvelopeForm setShowAdd={setShowAdd} setEnvelopes={setEnvelopes} year={year} month1={month1!} />}

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, paddingTop: Constants.statusBarHeight, gap: 20 }}
      >
        {envelopes.length > 0 &&
          envelopes.map(env => (
            <View key={env.id} style={styles.cardContainer}>
              <EnvelopeCard env={env} year={year} month1={month1} />
            </View>
          ))}
        <TouchableOpacity style={styles.addButton} onPress={handleAddEnvelope}>
          <MaterialCommunityIcons name='plus-circle-outline' size={20} color={colors.textPimary} />
          <Text style={styles.addButtonText}>Dodaj</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.envelope,
    borderRadius: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 10,
    backgroundColor: colors.successStrong,
    paddingHorizontal: 2,
    paddingVertical: 5,
  },
  addButtonText: { marginLeft: 6, color: colors.textPimary, fontSize: 18, fontWeight: 'bold' },
});
