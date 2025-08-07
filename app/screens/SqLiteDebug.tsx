import React, { useEffect, useState } from 'react';
import { View, TextInput, Button, Text, ScrollView, StyleSheet } from 'react-native';
import * as SQLite from 'expo-sqlite';

import colors from '../config/colors';
import { getDb } from '../database/db'; // zakładam, że masz getDb() w db.js

type Row = Record<string, any>;

export const SQLiteDebug: React.FC = () => {
  const [query, setQuery] = useState('SELECT * FROM entries');
  const [results, setResults] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  useEffect(() => {
    const loadDb = async () => {
      const database = await getDb();
      setDb(database);
    };
    loadDb();
  }, []);

const runQuery = async (customQuery?: string) => {
  const finalQuery = customQuery || query;

  try {
    const res = await db!.getAllAsync(finalQuery);
    setResults(res as Row[]);
    setError(null);
  } catch (err: any) {
    setError(err.message || 'Błąd zapytania');
    setResults([]);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 SQLite Debugger</Text>

      <View style={styles.buttonsRow}>
        <Button title='Kategorie' onPress={() => runQuery('SELECT * FROM categories')} />
        <Button title='Podkategorie' onPress={() => runQuery('SELECT * FROM subcategories')} />
        <Button title='Wpisy' onPress={() => runQuery('SELECT * FROM entries')} />
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        style={styles.input}
        placeholder='Wpisz SELECT...'
        placeholderTextColor='#aaa'
      />
      <Button title='Wykonaj zapytanie' onPress={() => runQuery()} color={colors.primary} />

      {error && <Text style={styles.error}>❌ {error}</Text>}

      <ScrollView style={styles.resultContainer}>
        {results.map((row, index) => (
          <View key={index} style={styles.row}>
            {Object.entries(row).map(([key, value]) => (
              <Text key={key} style={styles.cell}>
                <Text style={styles.bold}>{key}:</Text> {String(value)}
              </Text>
            ))}
            <View style={styles.separator} />
          </View>
        ))}
        {results.length === 0 && <Text style={{ color: '#aaa' }}>Brak wyników</Text>}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.white, marginBottom: 10 },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    marginTop: 10,
  },
  error: { color: 'red', marginTop: 8 },
  resultContainer: { marginTop: 16 },
  row: { marginBottom: 12 },
  cell: { color: colors.textPimary },
  bold: { fontWeight: 'bold', color: colors.white },
  separator: {
    height: 1,
    backgroundColor: '#444',
    marginTop: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 6,
  },
});
