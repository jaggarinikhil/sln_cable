import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { useData } from '../context/DataContext';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

const screenWidth = Dimensions.get('window').width;

const PERIODS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: '3m',         label: '3 Months' },
  { key: '6m',         label: '6 Months' },
  { key: '1y',         label: '1 Year' },
  { key: 'all',        label: 'All Time' },
];

const fmt = (n) => {
  const num = Number(n) || 0;
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return Math.round(num).toLocaleString('en-IN');
};
const fmtCurrency = (n) => `₹${fmt(n)}`;
const fmtFull = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

const rgba = (c, a) => {
  const hex = (c || '#94a3b8').replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

function getRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'this_month') return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: today };
  if (period === 'last_month') return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) };
  if (period === '3m') return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: today };
  if (period === '6m') return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: today };
  if (period === '1y') return { start: new Date(now.getFullYear() - 1, now.getMonth() + 1, 1), end: today };
  return { start: new Date(2000, 0, 1), end: today };
}

const inRange = (dateStr, range) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= range.start && d <= new Date(range.end.getTime() + 86400000);
};

export default function PersonalReportScreen() {
  const { personal } = useData();
  const [period, setPeriod] = useState('this_month');
  const [direction, setDirection] = useState('both'); // both | income | expense

  const entries = useMemo(
    () => (personal || []).filter((p) => !p.deleted),
    [personal],
  );

  const range = useMemo(() => getRange(period), [period]);
  const filtered = useMemo(
    () => entries.filter((e) => inRange(e.date || e.createdAt, range)),
    [entries, range],
  );

  const income = filtered.filter((e) => e.type === 'income').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const expense = filtered.filter((e) => e.type === 'expense').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const net = income - expense;

  // Per-category breakdown filtered by direction
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      if (direction !== 'both' && e.type !== direction) return;
      const key = e.category || 'other';
      if (!map[key]) map[key] = { key, amount: 0, type: e.type };
      map[key].amount += Number(e.amount) || 0;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [filtered, direction]);

  const categoryTotal = categoryBreakdown.reduce((s, c) => s + c.amount, 0);

  // Top parties (people you transact most with)
  const topParties = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      if (direction !== 'both' && e.type !== direction) return;
      const key = (e.party || '').trim();
      if (!key) return;
      if (!map[key]) map[key] = { name: key, in: 0, out: 0 };
      if (e.type === 'income') map[key].in += Number(e.amount) || 0;
      else map[key].out += Number(e.amount) || 0;
    });
    return Object.values(map)
      .map((p) => ({ ...p, net: p.in - p.out, total: p.in + p.out }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filtered, direction]);

  // Monthly trend — income vs expense
  const trend = useMemo(() => {
    const months = [];
    const now = new Date();
    let count = 6;
    if (period === '3m') count = 3;
    else if (period === '1y' || period === 'all') count = 12;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ ym, label: d.toLocaleString('default', { month: 'short' }), in: 0, out: 0 });
    }
    entries.forEach((e) => {
      const d = e.date || e.createdAt || '';
      const entry = months.find((m) => d.startsWith(m.ym));
      if (entry) {
        if (e.type === 'income') entry.in += Number(e.amount) || 0;
        else entry.out += Number(e.amount) || 0;
      }
    });
    return months;
  }, [entries, period]);

  const chartConfig = {
    backgroundGradientFrom: colors.bgCard,
    backgroundGradientTo: colors.bgCard,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99,102,241,${opacity})`,
    labelColor: () => colors.textSecondary,
    propsForLabels: { fontSize: 10 },
    barPercentage: 0.5,
  };

  const hasTrend = trend.some((m) => m.in > 0 || m.out > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {PERIODS.map((p) => {
            const active = period === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.chip, active && { backgroundColor: rgba(colors.accent, 0.18), borderColor: colors.accent }]}
                onPress={() => setPeriod(p.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && { color: colors.accent, fontWeight: fontWeight.bold }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Net hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>NET FOR PERIOD</Text>
          <Text style={[styles.heroValue, { color: net >= 0 ? colors.green : colors.red }]}>
            {net >= 0 ? '+' : '−'}{fmtFull(Math.abs(net))}
          </Text>
          <View style={styles.heroSplit}>
            <View style={[styles.heroChip, { borderColor: rgba(colors.green, 0.3) }]}>
              <Ionicons name="arrow-down-circle" size={14} color={colors.green} />
              <Text style={styles.heroChipLabel}>In</Text>
              <Text style={[styles.heroChipValue, { color: colors.green }]}>{fmtCurrency(income)}</Text>
            </View>
            <View style={[styles.heroChip, { borderColor: rgba(colors.red, 0.3) }]}>
              <Ionicons name="arrow-up-circle" size={14} color={colors.red} />
              <Text style={styles.heroChipLabel}>Out</Text>
              <Text style={[styles.heroChipValue, { color: colors.red }]}>{fmtCurrency(expense)}</Text>
            </View>
          </View>
        </View>

        {/* Trend */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Monthly Trend</Text>
          {hasTrend ? (
            <>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: colors.green }]} />
                  <Text style={styles.legendText}>In</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: colors.red }]} />
                  <Text style={styles.legendText}>Out</Text>
                </View>
                <Text style={styles.legendUnit}>(₹ in thousands)</Text>
              </View>
              <BarChart
                data={{
                  labels: trend.map((m) => m.label),
                  datasets: [
                    { data: trend.map((m) => Math.round(m.in / 1000)), color: () => colors.green },
                    { data: trend.map((m) => Math.round(m.out / 1000)), color: () => colors.red },
                  ],
                }}
                width={screenWidth - 48}
                height={200}
                chartConfig={chartConfig}
                fromZero
                withInnerLines={false}
                style={{ borderRadius: 12, marginLeft: -12 }}
              />
            </>
          ) : (
            <Text style={styles.empty}>No data in range</Text>
          )}
        </View>

        {/* Direction filter for breakdowns */}
        <View style={styles.directionRow}>
          {[
            { k: 'both',    l: 'Both' },
            { k: 'income',  l: 'Income only' },
            { k: 'expense', l: 'Expense only' },
          ].map((d) => {
            const active = direction === d.k;
            const c = d.k === 'income' ? colors.green : d.k === 'expense' ? colors.red : colors.accent;
            return (
              <TouchableOpacity
                key={d.k}
                style={[styles.dirBtn, active && { backgroundColor: rgba(c, 0.18), borderColor: c }]}
                onPress={() => setDirection(d.k)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dirText, active && { color: c, fontWeight: fontWeight.bold }]}>
                  {d.l}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Category breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>By Category</Text>
          {categoryBreakdown.length === 0 ? (
            <Text style={styles.empty}>No entries in range</Text>
          ) : (
            categoryBreakdown.map((c) => {
              const pct = categoryTotal > 0 ? (c.amount / categoryTotal) * 100 : 0;
              const color = c.type === 'income' ? colors.green : colors.red;
              return (
                <View key={c.key} style={styles.breakdownRow}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.breakdownLabel}>{c.key.replace(/_/g, ' ')}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.breakdownPct}>{pct.toFixed(0)}%</Text>
                  <Text style={[styles.breakdownAmount, { color }]}>{fmtCurrency(c.amount)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Top parties */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top People</Text>
          {topParties.length === 0 ? (
            <Text style={styles.empty}>No party data in range</Text>
          ) : (
            topParties.map((p) => (
              <View key={p.name} style={styles.partyRow}>
                <View style={styles.partyAvatar}>
                  <Text style={styles.partyInitial}>{p.name[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partyName}>{p.name}</Text>
                  <View style={styles.partyMeta}>
                    {p.in > 0 && <Text style={[styles.partyMetaText, { color: colors.green }]}>+{fmtCurrency(p.in)}</Text>}
                    {p.in > 0 && p.out > 0 && <Text style={styles.partyMetaText}>·</Text>}
                    {p.out > 0 && <Text style={[styles.partyMetaText, { color: colors.red }]}>−{fmtCurrency(p.out)}</Text>}
                  </View>
                </View>
                <Text style={[styles.partyNet, { color: p.net >= 0 ? colors.green : colors.red }]}>
                  {p.net >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(p.net))}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  chipsRow: { gap: spacing.sm, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.pill,
  },
  chipText: { fontSize: fontSize.xs, color: colors.textSecondary },

  hero: {
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroLabel: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.textSecondary, letterSpacing: 1.2, marginBottom: 6 },
  heroValue: { fontSize: 30, fontWeight: fontWeight.extrabold, marginBottom: spacing.md },
  heroSplit: { flexDirection: 'row', gap: spacing.sm },
  heroChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: colors.bgDark,
    borderWidth: 1, borderRadius: borderRadius.md,
  },
  heroChipLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  heroChipValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginLeft: 'auto' },

  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: fontSize.xs, color: colors.textSecondary },
  legendUnit: { fontSize: fontSize.xs, color: colors.textSecondary, fontStyle: 'italic', marginLeft: 'auto' },
  dot: { width: 10, height: 10, borderRadius: 5 },

  directionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  dirBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  dirText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  breakdownLabel: { fontSize: fontSize.sm, color: colors.textPrimary, textTransform: 'capitalize' },
  breakdownPct: { fontSize: fontSize.xs, color: colors.textSecondary, marginRight: spacing.sm, minWidth: 36, textAlign: 'right' },
  breakdownAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, minWidth: 70, textAlign: 'right' },

  partyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  partyAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  partyInitial: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.accent },
  partyName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  partyMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  partyMetaText: { fontSize: fontSize.xs, color: colors.textSecondary },
  partyNet: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

  empty: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },
});
