import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { EnvelopeCard } from '../components/EnvelopeCard';
import colors from '../config/colors';
import { Envelope, getAllEnvelopes } from '../services/envelopesService';

export const EnvelopesScreen = () => {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const today = new Date();
  const year = today.getFullYear();
  const month1 = today.getMonth() + 1;

  useFocusEffect(() => {
    getAllEnvelopes().then(envelopes => setEnvelopes(envelopes));
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingTop: Constants.statusBarHeight, gap: 20 }}
    >
      {envelopes.length > 0 &&
        envelopes.map(env => <EnvelopeCard key={env.id} env={env} year={year} month1={month1} />)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {},
});
