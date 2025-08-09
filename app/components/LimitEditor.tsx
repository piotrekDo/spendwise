import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../config/colors';

type Scope = 'global' | 'year' | 'month';

type Props = {
  initialLimit?: number | null;
  initialScope?: Scope;        // domyślny wybór przy starcie
  initialYear?: number;        // używane przy scope=year|month
  initialMonth?: number;       // 1..12, dla scope=month
  onChange?: (v: { limit: number | null; scope: Scope; year?: number; month?: number }) => void;
};

export const LimitEditor: React.FC<Props> = ({
  initialLimit = null,
  initialScope = 'global',
  initialYear = new Date().getFullYear(),
  initialMonth = new Date().getMonth() + 1,
  onChange,
}) => {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [limitStr, setLimitStr] = useState(initialLimit !== null ? String(initialLimit) : '');
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const parsedLimit = useMemo(() => {
    const normalized = limitStr.replace(',', '.').trim();
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }, [limitStr]);

  const handleScope = (s: Scope) => {
    setScope(s);
    onChange?.({ limit: parsedLimit, scope: s, year, month });
  };

  const handleLimit = (txt: string) => {
    setLimitStr(txt);
    const normalized = txt.replace(',', '.').trim();
    const n = Number(normalized);
    onChange?.({ limit: Number.isFinite(n) ? n : null, scope, year, month });
  };

  const dec = (setter: (n: number) => void, val: number, min: number, max: number) => {
    const next = Math.max(min, Math.min(max, val - 1));
    setter(next);
    onChange?.({ limit: parsedLimit, scope, year: scope === 'global' ? undefined : year, month: scope === 'month' ? next : month });
  };
  const inc = (setter: (n: number) => void, val: number, min: number, max: number) => {
    const next = Math.max(min, Math.min(max, val + 1));
    setter(next);
    onChange?.({ limit: parsedLimit, scope, year: scope === 'global' ? undefined : year, month: scope === 'month' ? next : month });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Limit</Text>

      <TextInput
        style={styles.input}
        placeholder="np. 1500"
        keyboardType="decimal-pad"
        value={limitStr}
        onChangeText={handleLimit}
      />

      <View style={styles.chipsRow}>
        <Chip label="Stały" active={scope === 'global'} onPress={() => handleScope('global')} />
        <Chip label="Roczny" active={scope === 'year'} onPress={() => handleScope('year')} />
        <Chip label="Miesięczny" active={scope === 'month'} onPress={() => handleScope('month')} />
      </View>

      {scope !== 'global' && (
        <View style={styles.row}>
          <Text style={styles.smallLabel}>Rok</Text>
          <Stepper value={year} min={2000} max={2100} onChange={v => { setYear(v); onChange?.({ limit: parsedLimit, scope, year: v, month }); }} />
        </View>
      )}
      {scope === 'month' && (
        <View style={styles.row}>
          <Text style={styles.smallLabel}>Miesiąc</Text>
          <Stepper value={month} min={1} max={12} onChange={v => { setMonth(v); onChange?.({ limit: parsedLimit, scope, year, month: v }); }} />
        </View>
      )}
    </View>
  );
};

const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const Stepper = ({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) => (
  <View style={styles.stepper}>
    <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn}>
      <Text style={styles.stepBtnText}>−</Text>
    </TouchableOpacity>
    <Text style={styles.stepVal}>{value}</Text>
    <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepBtn}>
      <Text style={styles.stepBtnText}>＋</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  sectionLabel: { color: colors.white, marginBottom: 6, fontSize: 14, opacity: 0.9 },
  input: {
    backgroundColor: '#2E2F36',
    color: '#fff',
    padding: 10,
    borderRadius: 6,
  },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A3D46',
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
    borderColor: '#4CAF50',
  },
  chipText: { color: colors.white, fontSize: 12 },
  chipTextActive: { color: '#C8E6C9', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  smallLabel: { color: colors.white, opacity: 0.8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2E2F36', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: colors.white, fontSize: 18 },
  stepVal: { color: colors.white, minWidth: 36, textAlign: 'center' },
});
