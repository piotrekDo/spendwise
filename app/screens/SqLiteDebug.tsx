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
      // setQuery(finalQuery)
    } catch (err: any) {
      setError(err.message || 'Błąd zapytania');
      setResults([]);
    }
  };

  const DEBUG = `
    SELECT 
      s.id   AS subcategoryId,
      s.name AS name,
      s.color AS color,
      ai.name AS icon,
      CAST(substr(e.date,6,2) AS INTEGER) AS month,
      SUM(e.amount) AS sum
    FROM entries e
    JOIN subcategories s ON s.id = e.subcategoryId
    JOIN categories c ON c.id = s.categoryId
    LEFT JOIN app_icons ai ON ai.id = s.iconId
    WHERE c.id = 7
          AND c.positive = 0
      AND substr(e.date,1,4) = "2025"
      AND (e.depositEnvelopeId IS NULL)
      AND e.financedEnvelopeId IS NULL
    GROUP BY s.id, s.name, s.color, ai.name, month
    ORDER BY s.name, month;
    `;

  // const DEBUG = `
  // SELECT c.id, c.name, c.color, i.name as icon
  //   FROM categories c 
  //   JOIN app_icons i ON c.iconId = i.id
  //   WHERE c.id = 7
  // `


  const runDebugQuery = async () => {
    const res = await db!.getAllAsync(DEBUG);
    setResults(res as Row[]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 SQLite Debugger</Text>

      <View style={styles.buttonsRow}>
        <Button title='Kategorie' onPress={() => runQuery('SELECT * FROM categories')} />
        <Button title='Podkategorie' onPress={() => runQuery('SELECT * FROM subcategories')} />
        <Button title='Wpisy' onPress={() => runQuery('SELECT * FROM entries')} />
        <Button title='Limity' onPress={() => runQuery('SELECT * FROM category_limits')} />
        <Button title='Config' onPress={() => runQuery('SELECT * FROM config')} />
        <Button title='Ikony' onPress={() => runQuery('SELECT * FROM app_icons')} />
        <Button title='Koperty' onPress={() => runQuery('SELECT * FROM envelopes')} />
        <Button title='Sumy' onPress={() => runQuery('SELECT * FROM monthly_aggregates')} />
        <Button title='DEBUG' onPress={() => runDebugQuery()} />
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
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
});
