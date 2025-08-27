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
WITH RECURSIVE months(m) AS (
  SELECT 1
  UNION ALL
  SELECT m + 1 FROM months WHERE m < 12
),
sums AS (
  SELECT CAST(strftime('%m', e.date) AS INTEGER) AS m,
         SUM(e.amount) AS sum
  FROM entries e
  JOIN subcategories s ON s.id = e.subcategoryId
  JOIN categories c   ON c.id = s.categoryId
  WHERE c.id = 11                      -- id kategorii (np. 7)
    AND c.positive = 0
    AND e.isArchived = 0
    AND e.financedEnvelopeId IS NULL
    AND e.date >= '2025-01-01' AND e.date < '2026-01-01'    -- np. '2025-01-01', '2026-01-01'
  GROUP BY m
)
SELECT
  CASE
    WHEN COALESCE(ma.income_total,0) = 0
     AND COALESCE(ma.expense_total,0) = 0
      THEN NULL
    ELSE COALESCE(s.sum, 0)
  END AS sum
FROM months m12
LEFT JOIN monthly_aggregates ma
       ON ma.month = m12.m AND ma.year = 2025   -- np. 2025
LEFT JOIN sums s
       ON s.m = m12.m
ORDER BY m12.m;
    `;

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
