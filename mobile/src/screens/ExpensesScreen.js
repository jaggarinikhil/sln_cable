import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import SearchableDropdown from '../components/SearchableDropdown';
import { ACCOUNTS, getAccount } from '../utils/accounts';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

// ─── Categories ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',             label: 'All',             icon: 'grid-outline',         color: colors.accent },
  { key: 'worker_salary',   label: 'Worker Salary',   icon: 'people-outline',       color: colors.green,  auto: true },
  { key: 'equipment',       label: 'Equipment',       icon: 'hardware-chip-outline', color: colors.purple, requiresDescription: true },
  { key: 'utilities',       label: 'Utilities',       icon: 'flash-outline',        color: colors.yellow },
  { key: 'partner_lease',   label: 'Partner Lease',   icon: 'home-outline',         color: colors.cyan },
  { key: 'provider_recharge', label: 'Provider Recharge', icon: 'wifi-outline',     color: colors.blue },
  { key: 'misc',            label: 'Misc',            icon: 'ellipsis-horizontal',  color: colors.pink },
];

const ADDABLE_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'all' && !c.auto);

const fmt = (n) => {
  const num = Number(n) || 0;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return Math.round(num).toLocaleString('en-IN');
};
const fmtCurrency = (n) => `₹${fmt(n)}`;
const fmtFull = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const rgba = (c, a) => {
  const hex = c.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const getCategory = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

// ─── Main screen ───────────────────────────────────────────────────────────
export default function ExpensesScreen({ navigation }) {
  const { user } = useAuth();
  const { expenses, salary, addExpense, deleteExpense } = useData();

  const isOwner = user?.role === 'owner';
  const canManage = isOwner || user?.permissions?.manageExpenses;

  // Build unified expense list: manual entries + auto-derived from salary records
  const allExpenses = useMemo(() => {
    const manual = (expenses || [])
      .filter((e) => !e.deleted)
      .map((e) => ({
        id: e.id,
        category: e.category || 'misc',
        amount: Number(e.amount) || 0,
        date: e.date || e.createdAt,
        description: e.description || '',
        notes: e.notes || '',
        paymentMode: e.paymentMode,
        account: e.account || 'cash',
        addedBy: e.addedBy,
        source: 'manual',
      }));

    const fromSalary = (salary || [])
      .filter((s) => s.type !== 'advance')
      .map((s) => {
        const amt = (Number(s.cashAmount) || 0) + (Number(s.digitalAmount) || 0) + (Number(s.advanceDeduction) || 0);
        return {
          id: `salary_${s.id}`,
          category: 'worker_salary',
          amount: amt,
          date: s.paymentDate || s.createdAt,
          description: s.workerName || 'Worker',
          notes: s.month ? `Month: ${s.month}${s.notes ? ' · ' + s.notes : ''}` : (s.notes || ''),
          paymentMode:
            (Number(s.cashAmount) || 0) > 0 && (Number(s.digitalAmount) || 0) > 0 ? 'mixed'
            : (Number(s.cashAmount) || 0) > 0 ? 'cash'
            : (Number(s.digitalAmount) || 0) > 0 ? 'digital' : 'deduction',
          account: s.account || ((Number(s.cashAmount) || 0) > 0 && (Number(s.digitalAmount) || 0) === 0 ? 'cash' : 'cash'),
          addedBy: s.addedBy,
          source: 'salary',
          workerName: s.workerName,
        };
      })
      .filter((s) => s.amount > 0);

    return [...manual, ...fromSalary].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
    );
  }, [expenses, salary]);

  // Current month
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const monthExpenses = useMemo(
    () => allExpenses.filter((e) => (e.date || '').startsWith(currentYM)),
    [allExpenses, currentYM],
  );

  // Totals by category for current month
  const totalsByCategory = useMemo(() => {
    const t = {};
    CATEGORIES.forEach((c) => { t[c.key] = 0; });
    monthExpenses.forEach((e) => {
      t[e.category] = (t[e.category] || 0) + e.amount;
      t.all += e.amount;
    });
    return t;
  }, [monthExpenses]);

  const [filter, setFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    let list = allExpenses;
    if (filter !== 'all') list = list.filter((e) => e.category === filter);
    if (accountFilter !== 'all') list = list.filter((e) => (e.account || 'cash') === accountFilter);
    return list;
  }, [allExpenses, filter, accountFilter]);

  const handleDelete = (item) => {
    if (item.source === 'salary') {
      Alert.alert(
        'Auto-logged',
        'Worker salary expenses are derived from salary payments. Delete the salary record from the Salary screen instead.',
      );
      return;
    }
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteExpense(item.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>EXPENSES — {monthLabel.toUpperCase()}</Text>
            <Text style={styles.heroValue}>{fmtFull(totalsByCategory.all)}</Text>
            <Text style={styles.heroSub}>{monthExpenses.length} entries this month</Text>
          </View>
          <TouchableOpacity
            style={styles.heroIcon}
            onPress={() => navigation.navigate('ExpenseReport')}
            activeOpacity={0.7}
          >
            <Ionicons name="bar-chart" size={26} color={colors.red} />
            <Text style={styles.heroIconLabel}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* Category breakdown */}
        <Text style={styles.sectionLabel}>This Month by Category</Text>
        <View style={styles.breakdown}>
          {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => {
            const amt = totalsByCategory[cat.key] || 0;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.breakdownCard, { borderColor: rgba(cat.color, 0.3) }]}
                onPress={() => setFilter(cat.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.breakdownIcon, { backgroundColor: rgba(cat.color, 0.15) }]}>
                  <Ionicons name={cat.icon} size={18} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.breakdownLabel}>{cat.label}</Text>
                  <Text style={styles.breakdownAmount}>{fmtCurrency(amt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Account filter */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Account</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {[{ key: 'all', label: 'All Accounts', icon: 'wallet-outline', color: colors.accent }, ...ACCOUNTS].map((acc) => {
            const active = accountFilter === acc.key;
            return (
              <TouchableOpacity
                key={acc.key}
                style={[styles.chip, active && { backgroundColor: rgba(acc.color, 0.18), borderColor: acc.color }]}
                onPress={() => setAccountFilter(acc.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={acc.icon} size={14} color={active ? acc.color : colors.textSecondary} />
                <Text style={[styles.chipText, active && { color: acc.color, fontWeight: fontWeight.bold }]}>
                  {acc.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter chips */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>All Expenses</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {CATEGORIES.map((cat) => {
            const active = filter === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.chip,
                  active && { backgroundColor: rgba(cat.color, 0.18), borderColor: cat.color },
                ]}
                onPress={() => setFilter(cat.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={cat.icon} size={14} color={active ? cat.color : colors.textSecondary} />
                <Text style={[styles.chipText, active && { color: cat.color, fontWeight: fontWeight.bold }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Expense list */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyText}>No expenses found</Text>
          </View>
        ) : (
          filtered.map((e) => {
            const cat = getCategory(e.category);
            return (
              <TouchableOpacity
                key={e.id}
                style={[styles.row, { borderLeftColor: cat.color }]}
                onLongPress={() => canManage && handleDelete(e)}
                activeOpacity={0.8}
              >
                <View style={[styles.rowIcon, { backgroundColor: rgba(cat.color, 0.15) }]}>
                  <Ionicons name={cat.icon} size={18} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTopLine}>
                    <Text style={styles.rowDescription} numberOfLines={1}>
                      {e.description || cat.label}
                    </Text>
                    {e.source === 'salary' && (
                      <View style={styles.autoTag}>
                        <Text style={styles.autoTagText}>AUTO</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowMetaText}>{cat.label}</Text>
                    <Text style={styles.rowMetaDot}>·</Text>
                    <Text style={styles.rowMetaText}>{formatDate(e.date)}</Text>
                    {e.paymentMode ? (
                      <>
                        <Text style={styles.rowMetaDot}>·</Text>
                        <Text style={[styles.rowMetaText, { textTransform: 'capitalize' }]}>{e.paymentMode}</Text>
                      </>
                    ) : null}
                    {e.account ? (
                      <View style={[styles.acctBadge, { borderColor: rgba(getAccount(e.account).color, 0.4), backgroundColor: rgba(getAccount(e.account).color, 0.12) }]}>
                        <Text style={[styles.acctBadgeText, { color: getAccount(e.account).color }]}>
                          {getAccount(e.account).short}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {e.notes ? <Text style={styles.rowNotes} numberOfLines={2}>{e.notes}</Text> : null}
                </View>
                <Text style={[styles.rowAmount, { color: cat.color }]}>{fmtCurrency(e.amount)}</Text>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}

      <AddExpenseModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={async (data) => {
          await addExpense({ ...data, addedBy: user?.name || 'Owner' });
          setShowAdd(false);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Add Expense Modal ─────────────────────────────────────────────────────
function AddExpenseModal({ visible, onClose, onSave }) {
  const [category, setCategory] = useState('equipment');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [account, setAccount] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCategory('equipment');
    setAmount('');
    setDate(new Date());
    setDescription('');
    setPaymentMode('cash');
    setAccount('cash');
    setNotes('');
  };

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Missing amount', 'Please enter a valid amount.');
      return;
    }
    const cat = getCategory(category);
    if (cat.requiresDescription && !description.trim()) {
      Alert.alert('Missing description', `Please describe the ${cat.label.toLowerCase()} item.`);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        category,
        amount: amt,
        date: date.toISOString().slice(0, 10),
        description: description.trim(),
        paymentMode,
        account,
        notes: notes.trim(),
      });
      reset();
    } catch (e) {
      Alert.alert('Error', 'Could not save expense.');
    }
    setSaving(false);
  };

  const cat = getCategory(category);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Expense</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.formLabel}>Category</Text>
            <View style={styles.catGrid}>
              {ADDABLE_CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.catChip,
                      active && { backgroundColor: rgba(c.color, 0.18), borderColor: c.color },
                    ]}
                    onPress={() => setCategory(c.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={c.icon} size={14} color={active ? c.color : colors.textSecondary} />
                    <Text style={[styles.chipText, active && { color: c.color, fontWeight: fontWeight.bold }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.formLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={styles.formLabel}>
              {cat.requiresDescription ? `${cat.label} Item *` : 'Description'}
            </Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder={
                cat.key === 'equipment' ? 'e.g. Set-top box, wires, nodes…' :
                cat.key === 'partner_lease' ? 'Partner name' :
                cat.key === 'provider_recharge' ? 'Provider name' :
                cat.key === 'utilities' ? 'e.g. Electricity, Internet…' :
                'What was this for?'
              }
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.formLabel}>Date</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateBtn]}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.accent} />
              <Text style={styles.dateBtnText}>
                {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selected) => {
                  setShowPicker(Platform.OS === 'ios');
                  if (selected) setDate(selected);
                }}
              />
            )}

            <Text style={styles.formLabel}>Paid From</Text>
            <SearchableDropdown
              value={account}
              onChange={setAccount}
              options={ACCOUNTS}
              placeholder="Select account…"
              title="Select Account"
              searchPlaceholder="Search accounts…"
            />

            <Text style={styles.formLabel}>Payment Mode</Text>
            <View style={styles.modeRow}>
              {['cash', 'digital'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, paymentMode === m && styles.modeBtnActive]}
                  onPress={() => setPaymentMode(m)}
                >
                  <Text style={[styles.modeText, paymentMode === m && styles.modeTextActive]}>
                    {m === 'cash' ? 'Cash' : 'Digital'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional details…"
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                  <Text style={styles.saveBtnText}>Save Expense</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroLeft: { flex: 1 },
  heroLabel: {
    fontSize: 10, fontWeight: fontWeight.bold, color: colors.textSecondary,
    letterSpacing: 1.2, marginBottom: 6,
  },
  heroValue: {
    fontSize: 28, fontWeight: fontWeight.extrabold, color: colors.red, marginBottom: 4,
  },
  heroSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  heroIcon: {
    width: 64, height: 56, borderRadius: borderRadius.lg,
    backgroundColor: rgba(colors.red, 0.12),
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 4,
  },
  heroIconLabel: {
    fontSize: 9, fontWeight: fontWeight.bold, color: colors.red,
    letterSpacing: 0.6, marginTop: 2,
  },

  sectionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: spacing.sm,
  },

  breakdown: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
  },
  breakdownCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexBasis: '48%',
    flexGrow: 1,
  },
  breakdownIcon: {
    width: 32, height: 32, borderRadius: borderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  breakdownLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 2 },
  breakdownAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },

  chipsRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.pill,
  },
  chipText: { fontSize: fontSize.xs, color: colors.textSecondary },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: borderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTopLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  rowDescription: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  rowMetaText: { fontSize: fontSize.xs, color: colors.textSecondary },
  rowMetaDot: { fontSize: fontSize.xs, color: colors.textSecondary, opacity: 0.5 },
  rowNotes: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  rowAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

  autoTag: {
    backgroundColor: rgba(colors.green, 0.15),
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  autoTagText: {
    fontSize: 9, fontWeight: fontWeight.bold,
    color: colors.green, letterSpacing: 0.6,
  },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary },

  fab: {
    position: 'absolute',
    right: spacing.lg, bottom: spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
    paddingBottom: spacing.lg,
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4,
    backgroundColor: colors.border, borderRadius: 2,
    marginTop: 8, marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  modalBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  formLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 6, marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.bgDark,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.bgDark,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.pill,
  },

  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgDark,
  },
  modeBtnActive: { backgroundColor: rgba(colors.accent, 0.15), borderColor: colors.accent },
  modeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  modeTextActive: { color: colors.accent },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  saveBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateBtnText: { fontSize: fontSize.md, color: colors.textPrimary },
  acctBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 4,
  },
  acctBadgeText: { fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: 0.4 },
});
