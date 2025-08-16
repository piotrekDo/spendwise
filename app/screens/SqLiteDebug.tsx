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

const LIMIT_CATEGORY_QUERY = `WITH per_cat AS (
  SELECT
    c.id,
    c.name,
    ai.name AS icon,
    c.color,
    (
      SELECT cl."limit"
      FROM category_limits cl
      WHERE cl.categoryId = c.id
        AND (
          (cl.year = ? AND cl.month = ?) OR      -- dokładny rok+miesiąc
          (cl.year IS NULL AND cl.month = ?) OR  -- powtarzalny co rok w danym miesiącu
          (cl.year = ? AND cl.month IS NULL) OR  -- roczny
          (cl.year IS NULL AND cl.month IS NULL) -- globalny
        )
      ORDER BY
        CASE
          WHEN cl.year = ? AND cl.month = ? THEN 1
          WHEN cl.year IS NULL AND cl.month = ? THEN 2
          WHEN cl.year = ? AND cl.month IS NULL THEN 3
          WHEN cl.year IS NULL AND cl.month IS NULL THEN 4
          ELSE 99
        END,
        cl.id
      LIMIT 1
    ) AS "limit",
    COALESCE((
      SELECT SUM(e.amount)
      FROM entries e
      JOIN subcategories s ON s.id = e.subcategoryId
      JOIN categories cc ON cc.id = s.categoryId
      WHERE s.categoryId = c.id
        AND cc.positive = 0
        AND e.isArchived = 0
        AND e.depositEnvelopeId IS NULL
        AND e.financedEnvelopeId IS NULL
        AND e.date BETWEEN ? AND ?
    ), 0) AS used
  FROM categories c
  LEFT JOIN app_icons ai ON ai.id = c.iconId
)
SELECT id, name, icon, color, "limit", used
FROM per_cat
WHERE "limit" IS NOT NULL
ORDER BY (CASE WHEN "limit" = 0 THEN 1e9 ELSE used * 1.0 / "limit" END) DESC, name;
`

const runDebugQuery = async() => {
const res = await db!.getAllAsync(LIMIT_CATEGORY_QUERY, [ 2025, 8, 8, 2025,   2025, 8, 8, 2025,   '2025-08-01', '2025-08-30' ]);
setResults(res as Row[]);

}

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
