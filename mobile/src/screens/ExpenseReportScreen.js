import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useData } from '../context/DataContext';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

const screenWidth = Dimensions.get('window').width;

const CATEGORIES = [
  { key: 'worker_salary',     label: 'Worker Salary',    icon: 'people-outline',         color: colors.green },
  { key: 'equipment',         label: 'Equipment',        icon: 'hardware-chip-outline',  color: colors.purple },
  { key: 'utilities',         label: 'Utilities',        icon: 'flash-outline',          color: colors.yellow },
  { key: 'partner_lease',     label: 'Partner Lease',    icon: 'home-outline',           color: colors.cyan },
  { key: 'provider_recharge', label: 'Provider Recharge', icon: 'wifi-outline',          color: colors.blue },
  { key: 'misc',              label: 'Misc',             icon: 'ellipsis-horizontal',    color: colors.pink },
];

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

export default function ExpenseReportScreen() {
  const { expenses, salary } = useData();
  const [period, setPeriod] = useState('this_month');

  // Combine manual + auto-from-salary, same as Expenses screen
  const allExpenses = useMemo(() => {
    const manual = (expenses || []).filter((e) => !e.deleted).map((e) => ({
      category: e.category || 'misc',
      amount: Number(e.amount) || 0,
      date: e.date || e.createdAt,
    }));
    const fromSalary = (salary || [])
      .filter((s) => s.type !== 'advance')
      .map((s) => ({
        category: 'worker_salary',
        amount: (Number(s.cashAmount) || 0) + (Number(s.digitalAmount) || 0) + (Number(s.advanceDeduction) || 0),
        date: s.paymentDate || s.createdAt,
      }))
      .filter((s) => s.amount > 0);
    return [...manual, ...fromSalary];
  }, [expenses, salary]);

  const range = useMemo(() => getRange(period), [period]);
  const filtered = useMemo(() => allExpenses.filter((e) => inRange(e.date, range)), [allExpenses, range]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  // Breakdown by category
  const breakdown = useMemo(() => {
    const map = {};
    filtered.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return CATEGORIES
      .map((c) => ({ ...c, amount: map[c.key] || 0 }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  // Monthly trend
  const trend = useMemo(() => {
    const months = [];
    const now = new Date();
    let count = 6;
    if (period === 'this_month' || period === 'last_month') count = 6;
    else if (period === '3m') count = 3;
    else if (period === '1y') count = 12;
    else if (period === 'all') count = 12;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ ym, label: d.toLocaleString('default', { month: 'short' }), amount: 0 });
    }
    allExpenses.forEach((e) => {
      const entry = months.find((m) => (e.date || '').startsWith(m.ym));
      if (entry) entry.amount += e.amount;
    });
    return months;
  }, [allExpenses, period]);

  const chartConfig = {
    backgroundGradientFrom: colors.bgCard,
    backgroundGradientTo: colors.bgCard,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99,102,241,${opacity})`,
    labelColor: () => colors.textSecondary,
    propsForLabels: { fontSize: 10 },
    barPercentage: 0.6,
  };

  const hasTrend = trend.some((m) => m.amount > 0);

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

        {/* Total */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TOTAL EXPENSES</Text>
          <Text style={styles.heroValue}>{fmtFull(total)}</Text>
          <Text style={styles.heroSub}>{filtered.length} entries · avg {fmtCurrency(filtered.length ? total / filtered.length : 0)}</Text>
        </View>

        {/* Trend chart */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Monthly Trend</Text>
          {hasTrend ? (
            <BarChart
              data={{
                labels: trend.map((m) => m.label),
                datasets: [{ data: trend.map((m) => Math.round(m.amount / 1000)) }],
              }}
              width={screenWidth - 48}
              height={200}
              chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(248,113,113,${o})` }}
              fromZero
              withInnerLines={false}
              showValuesOnTopOfBars
              style={{ borderRadius: 12, marginLeft: -12 }}
            />
          ) : (
            <Text style={styles.empty}>No data in range</Text>
          )}
          <Text style={styles.legendUnit}>(₹ in thousands)</Text>
        </View>

        {/* Pie + breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>By Category</Text>
          {breakdown.length === 0 ? (
            <Text style={styles.empty}>No expenses in range</Text>
          ) : (
            <>
              <PieChart
                data={breakdown.map((b) => ({
                  name: b.label,
                  population: b.amount,
                  color: b.color,
                  legendFontColor: colors.textSecondary,
                  legendFontSize: 11,
                }))}
                width={screenWidth - 48}
                height={180}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute
              />
              <View style={{ marginTop: spacing.md }}>
                {breakdown.map((b) => {
                  const pct = total > 0 ? (b.amount / total) * 100 : 0;
                  return (
                    <View key={b.key} style={styles.breakdownRow}>
                      <View style={[styles.dot, { backgroundColor: b.color }]} />
                      <Text style={styles.breakdownLabel}>{b.label}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.breakdownPct}>{pct.toFixed(0)}%</Text>
                      <Text style={styles.breakdownAmount}>{fmtCurrency(b.amount)}</Text>
                    </View>
                  );
                })}
              </View>
            </>
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
  heroValue: { fontSize: 30, fontWeight: fontWeight.extrabold, color: colors.red, marginBottom: 4 },
  heroSub: { fontSize: fontSize.sm, color: colors.textSecondary },

  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  legendUnit: { fontSize: fontSize.xs, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: { fontSize: fontSize.sm, color: colors.textPrimary },
  breakdownPct: { fontSize: fontSize.xs, color: colors.textSecondary, marginRight: spacing.sm, minWidth: 36, textAlign: 'right' },
  breakdownAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary, minWidth: 70, textAlign: 'right' },

  empty: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },
});
