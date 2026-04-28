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
// Each can be an income or an expense; tag the typical direction for hint UX
const CATEGORIES = [
  { key: 'all',          label: 'All',          icon: 'grid-outline',           color: colors.accent },
  // ─── Money / Finance ───
  { key: 'chit',         label: 'Chit',         icon: 'people-circle-outline',  color: colors.purple },
  { key: 'loan_taken',   label: 'Loan Taken (bank)', icon: 'arrow-down-circle-outline', color: colors.green },
  { key: 'loan_emi',     label: 'Loan EMI',     icon: 'card-outline',           color: colors.red },
  { key: 'lent_to_friend', label: 'Lent to Friend', icon: 'hand-right-outline', color: colors.yellow },
  { key: 'friend_repaid_me', label: 'Friend Paid Back', icon: 'hand-left-outline', color: colors.green },
  { key: 'borrowed_friend', label: 'Borrowed from Friend', icon: 'arrow-down-outline', color: colors.cyan },
  { key: 'i_repaid_friend', label: 'Repaid Friend',  icon: 'arrow-up-outline',  color: colors.red },
  { key: 'investment',   label: 'Investment',   icon: 'trending-up-outline',    color: colors.green },
  { key: 'savings',      label: 'Savings',      icon: 'wallet-outline',         color: colors.cyan },
  { key: 'gold',         label: 'Gold / Jewellery', icon: 'diamond-outline',    color: colors.yellow },
  // ─── Property / Assets ───
  { key: 'rent_paid',    label: 'Rent Paid',    icon: 'home-outline',           color: colors.red },
  { key: 'rent_received', label: 'Rent In',     icon: 'business-outline',       color: colors.green },
  { key: 'property_buy', label: 'Property Buy', icon: 'business-outline',       color: colors.red },
  { key: 'property_sell', label: 'Property Sell', icon: 'business-outline',     color: colors.green },
  { key: 'house_bill',   label: 'House Bills',  icon: 'home-outline',           color: colors.yellow },
  { key: 'maintenance',  label: 'Maintenance',  icon: 'construct-outline',      color: colors.yellow },
  // ─── Vehicle ───
  { key: 'vehicle_emi',  label: 'Vehicle EMI',  icon: 'car-outline',            color: colors.red },
  { key: 'fuel',         label: 'Fuel',         icon: 'speedometer-outline',    color: colors.yellow },
  { key: 'vehicle_service', label: 'Vehicle Service', icon: 'build-outline',    color: colors.yellow },
  // ─── Insurance / Tax ───
  { key: 'insurance',    label: 'Insurance',    icon: 'shield-checkmark-outline', color: colors.blue },
  { key: 'tax',          label: 'Tax',          icon: 'document-text-outline',  color: colors.red },
  { key: 'utility',      label: 'Utility',      icon: 'flash-outline',          color: colors.yellow },
  // ─── Family / Personal ───
  { key: 'family',       label: 'Family',       icon: 'heart-outline',          color: colors.pink },
  { key: 'medical',      label: 'Medical',      icon: 'medkit-outline',         color: colors.red },
  { key: 'education',    label: 'Education',    icon: 'school-outline',         color: colors.blue },
  { key: 'gift_given',   label: 'Gift Given',   icon: 'gift-outline',           color: colors.pink },
  { key: 'gift_received', label: 'Gift Got',    icon: 'gift-outline',           color: colors.green },
  { key: 'celebration',  label: 'Party / Function', icon: 'sparkles-outline',   color: colors.purple },
  // ─── Lifestyle ───
  { key: 'groceries',    label: 'Groceries',    icon: 'basket-outline',         color: colors.green },
  { key: 'home_equipment', label: 'Home Equipment', icon: 'tv-outline',         color: colors.purple },
  { key: 'food',         label: 'Food / Dining', icon: 'restaurant-outline',    color: colors.yellow },
  { key: 'shopping',     label: 'Shopping',     icon: 'bag-outline',            color: colors.purple },
  { key: 'travel',       label: 'Travel',       icon: 'airplane-outline',       color: colors.cyan },
  { key: 'subscription', label: 'Subscriptions', icon: 'repeat-outline',        color: colors.cyan },
  // ─── Services & Bills ───
  { key: 'mobile_internet', label: 'Mobile / Internet', icon: 'phone-portrait-outline', color: colors.cyan },
  { key: 'donation',     label: 'Donation / Charity', icon: 'rose-outline',     color: colors.pink },
  { key: 'domestic_help', label: 'Domestic Help', icon: 'briefcase-outline',   color: colors.yellow },
  { key: 'pet',          label: 'Pets',         icon: 'paw-outline',           color: colors.purple },
  { key: 'repair',       label: 'Repair',       icon: 'hammer-outline',        color: colors.yellow },
  { key: 'professional', label: 'Lawyer / CA',  icon: 'briefcase-outline',     color: colors.blue },
  { key: 'emi_other',    label: 'EMI (Other)',  icon: 'card-outline',          color: colors.red },
  { key: 'credit_card',  label: 'Credit Card Payment', icon: 'card-outline',   color: colors.red },
  // ─── Income / Other ───
  { key: 'salary_in',    label: 'Salary In',    icon: 'cash-outline',           color: colors.green },
  { key: 'business_profit', label: 'Business Profit', icon: 'briefcase-outline', color: colors.green },
  { key: 'interest',     label: 'Interest / Dividend', icon: 'trending-up-outline', color: colors.green },
  { key: 'refund',       label: 'Refund',       icon: 'return-down-back-outline', color: colors.green },
  { key: 'asset_sale',   label: 'Asset Sale',   icon: 'pricetag-outline',      color: colors.green },
  { key: 'reimbursement', label: 'Reimbursement', icon: 'wallet-outline',      color: colors.green },
  { key: 'other',        label: 'Other',        icon: 'ellipsis-horizontal',    color: colors.textSecondary },
];

const ADDABLE_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'all');

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
  const hex = (c || '#94a3b8').replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const getCategory = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function PersonalScreen({ navigation }) {
  const { user } = useAuth();
  const { personal, addPersonal, deletePersonal } = useData();

  const isOwner = user?.role === 'owner';

  const entries = useMemo(
    () =>
      (personal || [])
        .filter((p) => !p.deleted)
        .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)),
    [personal],
  );

  // Current month
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const monthEntries = useMemo(
    () => entries.filter((e) => (e.date || e.createdAt || '').startsWith(currentYM)),
    [entries, currentYM],
  );

  const monthIncome = monthEntries
    .filter((e) => e.type === 'income')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const monthExpense = monthEntries
    .filter((e) => e.type === 'expense')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const net = monthIncome - monthExpense;

  // Lifetime tracker
  const totalIncome = entries.filter((e) => e.type === 'income').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalExpense = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const [filter, setFilter] = useState('all'); // all | income | expense | <category>
  const [accountFilter, setAccountFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    let list = entries;
    if (filter === 'income') list = list.filter((e) => e.type === 'income');
    else if (filter === 'expense') list = list.filter((e) => e.type === 'expense');
    else if (filter !== 'all') list = list.filter((e) => e.category === filter);
    if (accountFilter !== 'all') list = list.filter((e) => (e.account || 'cash') === accountFilter);
    return list;
  }, [entries, filter, accountFilter]);

  // Per-account totals (this month) for the account picker chips
  const accountTotals = useMemo(() => {
    const t = { all: { in: 0, out: 0 } };
    monthEntries.forEach((e) => {
      const k = e.account || 'cash';
      if (!t[k]) t[k] = { in: 0, out: 0 };
      if (e.type === 'income') { t[k].in += Number(e.amount) || 0; t.all.in += Number(e.amount) || 0; }
      else { t[k].out += Number(e.amount) || 0; t.all.out += Number(e.amount) || 0; }
    });
    return t;
  }, [monthEntries]);

  const handleDelete = (item) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePersonal(item.id) },
    ]);
  };

  if (!isOwner) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }} edges={['bottom']}>
        <View style={styles.empty}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Owner only</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>{monthLabel.toUpperCase()} · NET</Text>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => navigation.navigate('PersonalReport')}
              activeOpacity={0.7}
            >
              <Ionicons name="bar-chart" size={14} color={colors.accent} />
              <Text style={styles.reportBtnText}>Report</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.heroValue, { color: net >= 0 ? colors.green : colors.red }]}>
            {net >= 0 ? '+' : '−'}{fmtFull(Math.abs(net))}
          </Text>
          <View style={styles.heroSplit}>
            <View style={[styles.heroChip, { borderColor: rgba(colors.green, 0.3) }]}>
              <Ionicons name="arrow-down-circle" size={14} color={colors.green} />
              <Text style={styles.heroChipLabel}>In</Text>
              <Text style={[styles.heroChipValue, { color: colors.green }]}>{fmtCurrency(monthIncome)}</Text>
            </View>
            <View style={[styles.heroChip, { borderColor: rgba(colors.red, 0.3) }]}>
              <Ionicons name="arrow-up-circle" size={14} color={colors.red} />
              <Text style={styles.heroChipLabel}>Out</Text>
              <Text style={[styles.heroChipValue, { color: colors.red }]}>{fmtCurrency(monthExpense)}</Text>
            </View>
          </View>
        </View>

        {/* Lifetime totals */}
        <View style={styles.lifetimeRow}>
          <View style={styles.lifetimeCard}>
            <Text style={styles.lifetimeLabel}>Total Income</Text>
            <Text style={[styles.lifetimeValue, { color: colors.green }]}>{fmtCurrency(totalIncome)}</Text>
          </View>
          <View style={styles.lifetimeCard}>
            <Text style={styles.lifetimeLabel}>Total Expense</Text>
            <Text style={[styles.lifetimeValue, { color: colors.red }]}>{fmtCurrency(totalExpense)}</Text>
          </View>
          <View style={styles.lifetimeCard}>
            <Text style={styles.lifetimeLabel}>Net</Text>
            <Text style={[styles.lifetimeValue, { color: totalIncome - totalExpense >= 0 ? colors.green : colors.red }]}>
              {fmtCurrency(totalIncome - totalExpense)}
            </Text>
          </View>
        </View>

        {/* Account filter */}
        <Text style={styles.sectionLabel}>Account</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {[{ key: 'all', label: 'All Accounts', short: 'All', icon: 'wallet-outline', color: colors.accent }, ...ACCOUNTS].map((acc) => {
            const active = accountFilter === acc.key;
            const t = accountTotals[acc.key] || { in: 0, out: 0 };
            return (
              <TouchableOpacity
                key={acc.key}
                style={[
                  styles.chip,
                  active && { backgroundColor: rgba(acc.color, 0.18), borderColor: acc.color },
                ]}
                onPress={() => setAccountFilter(acc.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={acc.icon} size={14} color={active ? acc.color : colors.textSecondary} />
                <Text style={[styles.chipText, active && { color: acc.color, fontWeight: fontWeight.bold }]}>
                  {acc.label}
                </Text>
                {(t.in - t.out !== 0) && (
                  <Text style={[styles.chipSubText, { color: t.in - t.out >= 0 ? colors.green : colors.red }]}>
                    {t.in - t.out >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(t.in - t.out))}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter chips */}
        <Text style={styles.sectionLabel}>Entries</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {[
            { key: 'all', label: 'All', icon: 'grid-outline', color: colors.accent },
            { key: 'income', label: 'Income', icon: 'arrow-down-circle-outline', color: colors.green },
            { key: 'expense', label: 'Expense', icon: 'arrow-up-circle-outline', color: colors.red },
            ...CATEGORIES.filter((c) => c.key !== 'all'),
          ].map((cat) => {
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

        {/* Entry list */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyText}>No entries yet</Text>
            <Text style={[styles.emptyText, { fontSize: fontSize.xs }]}>Tap + to add your first one</Text>
          </View>
        ) : (
          filtered.map((e) => {
            const cat = getCategory(e.category);
            const isIncome = e.type === 'income';
            const sign = isIncome ? '+' : '−';
            const sideColor = isIncome ? colors.green : colors.red;
            return (
              <TouchableOpacity
                key={e.id}
                style={[styles.row, { borderLeftColor: sideColor }]}
                onLongPress={() => handleDelete(e)}
                activeOpacity={0.85}
              >
                <View style={[styles.rowIcon, { backgroundColor: rgba(cat.color, 0.15) }]}>
                  <Ionicons name={cat.icon} size={18} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTopLine}>
                    <Text style={styles.rowDescription} numberOfLines={1}>
                      {e.description || cat.label}
                    </Text>
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowMetaText}>{cat.label}</Text>
                    {e.party ? (
                      <>
                        <Text style={styles.rowMetaDot}>·</Text>
                        <Text style={styles.rowMetaText} numberOfLines={1}>
                          {isIncome ? 'from' : 'to'} {e.party}
                        </Text>
                      </>
                    ) : null}
                    <Text style={styles.rowMetaDot}>·</Text>
                    <Text style={styles.rowMetaText}>{formatDate(e.date || e.createdAt)}</Text>
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
                <Text style={[styles.rowAmount, { color: sideColor }]}>
                  {sign}{fmtCurrency(e.amount)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <AddPersonalModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={async (data) => {
          await addPersonal({ ...data, addedBy: user?.name || 'Owner' });
          setShowAdd(false);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Add Modal ─────────────────────────────────────────────────────────────
function AddPersonalModal({ visible, onClose, onSave }) {
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('chit');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [party, setParty] = useState('');
  const [account, setAccount] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setType('expense');
    setCategory('chit');
    setAmount('');
    setDate(new Date());
    setDescription('');
    setParty('');
    setAccount('cash');
    setNotes('');
  };

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Missing amount', 'Please enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        type,
        category,
        amount: amt,
        date: date.toISOString().slice(0, 10),
        description: description.trim(),
        party: party.trim(),
        account,
        notes: notes.trim(),
      });
      reset();
    } catch (e) {
      Alert.alert('Error', 'Could not save entry.');
    }
    setSaving(false);
  };

  const partyLabel = type === 'income' ? 'From (optional)' : 'To (optional)';
  const partyPlaceholder = type === 'income' ? 'Who are you receiving from?' : 'Who are you paying?';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Entry</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Income / Expense toggle */}
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  type === 'income' && { backgroundColor: rgba(colors.green, 0.18), borderColor: colors.green },
                ]}
                onPress={() => setType('income')}
              >
                <Ionicons name="arrow-down-circle" size={18} color={type === 'income' ? colors.green : colors.textSecondary} />
                <Text style={[styles.typeText, type === 'income' && { color: colors.green }]}>Money In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  type === 'expense' && { backgroundColor: rgba(colors.red, 0.18), borderColor: colors.red },
                ]}
                onPress={() => setType('expense')}
              >
                <Ionicons name="arrow-up-circle" size={18} color={type === 'expense' ? colors.red : colors.textSecondary} />
                <Text style={[styles.typeText, type === 'expense' && { color: colors.red }]}>Money Out</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Category</Text>
            <SearchableDropdown
              value={category}
              onChange={setCategory}
              options={ADDABLE_CATEGORIES}
              placeholder="Select category…"
              title="Select Category"
              searchPlaceholder="Search categories…"
            />

            <Text style={styles.formLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={styles.formLabel}>Description (optional)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Monthly chit, House tax, Loan repayment…"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.formLabel}>{partyLabel}</Text>
            <TextInput
              style={styles.input}
              value={party}
              onChangeText={setParty}
              placeholder={partyPlaceholder}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.formLabel}>Paid From / Received In</Text>
            <SearchableDropdown
              value={account}
              onChange={setAccount}
              options={ACCOUNTS}
              placeholder="Select account…"
              title="Select Account"
              searchPlaceholder="Search accounts…"
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

            <Text style={styles.formLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any extra details…"
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
                  <Text style={styles.saveBtnText}>Save Entry</Text>
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
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: rgba(colors.accent, 0.15),
    borderRadius: borderRadius.pill,
  },
  reportBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.accent },
  heroLabel: {
    fontSize: 10, fontWeight: fontWeight.bold,
    color: colors.textSecondary, letterSpacing: 1.2,
  },
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

  lifetimeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  lifetimeCard: {
    flex: 1, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  lifetimeLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 2 },
  lifetimeValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

  sectionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.6, marginTop: spacing.md, marginBottom: spacing.sm,
  },

  chipsRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.pill,
  },
  chipText: { fontSize: fontSize.xs, color: colors.textSecondary },
  chipSubText: { fontSize: 10, fontWeight: fontWeight.bold, marginLeft: 4 },
  acctBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 4,
  },
  acctBadgeText: { fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: 0.4 },

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
  rowTopLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  rowDescription: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  rowMetaText: { fontSize: fontSize.xs, color: colors.textSecondary },
  rowMetaDot: { fontSize: fontSize.xs, color: colors.textSecondary, opacity: 0.5 },
  rowNotes: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  rowAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateBtnText: { fontSize: fontSize.md, color: colors.textPrimary },

  dropdownBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dropdownIcon: {
    width: 28, height: 28, borderRadius: borderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  dropdownText: { fontSize: fontSize.md, color: colors.textPrimary },
  dropdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownRowText: { fontSize: fontSize.md, color: colors.textPrimary },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgDark,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1, fontSize: fontSize.md, color: colors.textPrimary,
    padding: 0,
  },

  empty: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm, flex: 1,
  },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary },

  fab: {
    position: 'absolute', right: spacing.lg, bottom: spacing.lg,
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

  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgDark,
  },
  typeText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary },

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

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  saveBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
