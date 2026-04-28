import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEFAULT_SALARY_START_DAY = 1;

const WORKER_PALETTE = [
  colors.accent,
  colors.cyan,
  colors.green,
  colors.purple,
  colors.pink,
  colors.yellow,
  colors.blue,
];

// ---------------------------------------------------------------------------
// Cycle helpers
// ---------------------------------------------------------------------------
function getCycleStart(salaryStartDay = DEFAULT_SALARY_START_DAY) {
  const today = new Date();
  if (today.getDate() >= salaryStartDay) {
    return new Date(today.getFullYear(), today.getMonth(), salaryStartDay);
  }
  return new Date(today.getFullYear(), today.getMonth() - 1, salaryStartDay);
}

function getCycleEnd(start, salaryStartDay = DEFAULT_SALARY_START_DAY) {
  return new Date(start.getFullYear(), start.getMonth() + 1, salaryStartDay - 1);
}

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function formatCurrency(n) {
  const num = Number(n) || 0;
  return '\u20B9' + num.toLocaleString('en-IN');
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

/**
 * Migrate old salary records: if cashAmount is undefined and type is not advance,
 * convert amount to cash/digital based on paymentMode.
 */
function migrateRecord(r) {
  if (r.cashAmount !== undefined) return r;
  if (r.type === 'advance') return r;
  // Old format: amount + paymentMode
  const amt = Number(r.amount) || 0;
  const mode = (r.paymentMode || '').toLowerCase();
  if (mode === 'cash') {
    return { ...r, cashAmount: amt, digitalAmount: 0 };
  }
  return { ...r, cashAmount: 0, digitalAmount: amt };
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function SalaryScreen() {
  const { user } = useAuth();
  const { salary, addSalary, users, workHours } = useData();

  const isOwner = user?.role === 'owner';

  const workers = useMemo(
    () =>
      isOwner
        ? users.filter((u) => u.role === 'worker' && u.active !== false)
        : users.filter((u) => u.id === user?.userId),
    [users, isOwner, user],
  );

  if (!isOwner) {
    // Worker view
    const w = workers[0];
    const startDay = w?.salaryStartDay || DEFAULT_SALARY_START_DAY;
    const cycleStart = getCycleStart(startDay);
    const cycleEnd = getCycleEnd(cycleStart, startDay);
    const cycleStartStr = dateStr(cycleStart);
    return (
      <WorkerSalaryView
        worker={w}
        salary={salary}
        cycleStartStr={cycleStartStr}
        cycleStart={cycleStart}
        cycleEnd={cycleEnd}
      />
    );
  }

  // Owner view
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Salary Management</Text>

      {workers.map((w, idx) => (
        <OwnerWorkerCard
          key={w.id}
          worker={w}
          salary={salary}
          addSalary={addSalary}
          colorIdx={idx}
          userName={user?.name || 'Owner'}
        />
      ))}

      {workers.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>No workers found</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Worker Salary View (non-owner)
// ---------------------------------------------------------------------------
function WorkerSalaryView({ worker, salary, cycleStartStr, cycleStart, cycleEnd }) {
  if (!worker) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.emptyText}>No salary data found</Text>
      </View>
    );
  }

  const records = useMemo(
    () =>
      salary
        .filter((r) => r.workerId === worker.id)
        .map(migrateRecord)
        .sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt)),
    [salary, worker.id],
  );

  const monthlySalary = Number(worker.monthlySalary) || 0;

  const paidThisCycle = useMemo(
    () =>
      records
        .filter(
          (r) =>
            r.type !== 'advance' &&
            (r.paymentDate || r.createdAt) >= cycleStartStr,
        )
        .reduce(
          (sum, r) =>
            sum +
            (Number(r.cashAmount) || 0) +
            (Number(r.digitalAmount) || 0) +
            (Number(r.advanceDeduction) || 0),
          0,
        ),
    [records, cycleStartStr],
  );

  const outstandingAdvance = useMemo(() => {
    const totalAdvance = records
      .filter((r) => r.type === 'advance')
      .reduce((sum, r) => sum + (Number(r.advanceAmount) || Number(r.amount) || 0), 0);
    const totalDeduction = records
      .filter((r) => r.type === 'salary' || r.type !== 'advance')
      .reduce((sum, r) => sum + (Number(r.advanceDeduction) || 0), 0);
    return totalAdvance - totalDeduction;
  }, [records]);

  const balanceDue = monthlySalary - paidThisCycle;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>My Salary</Text>
      <Text style={styles.cycleInfo}>
        Cycle: {formatDate(cycleStart)} - {formatDate(cycleEnd)}
      </Text>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <SummaryCard label="Monthly Salary" value={formatCurrency(monthlySalary)} color={colors.accent} icon="wallet" />
        <SummaryCard label="Paid This Cycle" value={formatCurrency(paidThisCycle)} color={colors.green} icon="checkmark-circle" />
      </View>
      <View style={styles.summaryRow}>
        <SummaryCard label="Balance Due" value={formatCurrency(balanceDue)} color={balanceDue > 0 ? colors.yellow : colors.green} icon="cash" />
        <SummaryCard label="Advance Outstanding" value={formatCurrency(Math.max(0, outstandingAdvance))} color={outstandingAdvance > 0 ? colors.red : colors.green} icon="trending-up" />
      </View>

      {/* Payment history */}
      <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Payment History</Text>
      {records.length === 0 && (
        <Text style={styles.noRecords}>No salary records yet</Text>
      )}
      {records.map((r) => (
        <View key={r.id} style={styles.recordRow}>
          <View style={styles.recordLeft}>
            <View
              style={[
                styles.recordDot,
                { backgroundColor: r.type === 'advance' ? colors.yellow : colors.green },
              ]}
            />
            <View>
              <Text style={styles.recordType}>
                {r.type === 'advance' ? 'Advance' : 'Salary'}
              </Text>
              <Text style={styles.recordDate}>
                {formatDate(r.paymentDate || r.createdAt)}
                {r.month ? ` (${r.month})` : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.recordAmount}>
            {r.type === 'advance'
              ? formatCurrency(r.advanceAmount || r.amount || 0)
              : formatCurrency((Number(r.cashAmount) || 0) + (Number(r.digitalAmount) || 0))}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard
// ---------------------------------------------------------------------------
function SummaryCard({ label, value, color, icon }) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color }]}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// OwnerWorkerCard (collapsible, with inline payment form)
// ---------------------------------------------------------------------------
function OwnerWorkerCard({ worker, salary, addSalary, colorIdx, userName }) {
  const accent = WORKER_PALETTE[colorIdx % WORKER_PALETTE.length];
  const [expanded, setExpanded] = useState(false);

  const startDay = worker.salaryStartDay || DEFAULT_SALARY_START_DAY;
  const cycleStart = useMemo(() => getCycleStart(startDay), [startDay]);
  const cycleEnd = useMemo(() => getCycleEnd(cycleStart, startDay), [cycleStart, startDay]);
  const cycleStartStr = dateStr(cycleStart);

  const records = useMemo(
    () =>
      salary
        .filter((r) => r.workerId === worker.id)
        .map(migrateRecord)
        .sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt)),
    [salary, worker.id],
  );

  const monthlySalary = Number(worker.monthlySalary) || 0;

  const paidThisCycle = useMemo(
    () =>
      records
        .filter(
          (r) =>
            r.type !== 'advance' &&
            (r.paymentDate || r.createdAt) >= cycleStartStr,
        )
        .reduce(
          (sum, r) =>
            sum +
            (Number(r.cashAmount) || 0) +
            (Number(r.digitalAmount) || 0) +
            (Number(r.advanceDeduction) || 0),
          0,
        ),
    [records, cycleStartStr],
  );

  const outstandingAdvance = useMemo(() => {
    const totalAdvance = records
      .filter((r) => r.type === 'advance')
      .reduce((sum, r) => sum + (Number(r.advanceAmount) || Number(r.amount) || 0), 0);
    const totalDeduction = records
      .filter((r) => r.type !== 'advance')
      .reduce((sum, r) => sum + (Number(r.advanceDeduction) || 0), 0);
    return totalAdvance - totalDeduction;
  }, [records]);

  const balance = monthlySalary - paidThisCycle;

  // Payment form state
  const [payType, setPayType] = useState('salary');
  const [month, setMonth] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashAmount, setCashAmount] = useState('');
  const [digitalAmount, setDigitalAmount] = useState('');
  const [advanceDeduction, setAdvanceDeduction] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Pagination for records table
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);
  const pagedRecords = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(records.length / PAGE_SIZE);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (payType === 'salary') {
        await addSalary({
          workerId: worker.id,
          workerName: worker.name,
          type: 'salary',
          month: month || undefined,
          paymentDate,
          cashAmount: Number(cashAmount) || 0,
          digitalAmount: Number(digitalAmount) || 0,
          advanceDeduction: Number(advanceDeduction) || 0,
          notes: formNotes.trim(),
          addedBy: userName,
        });
      } else {
        await addSalary({
          workerId: worker.id,
          workerName: worker.name,
          type: 'advance',
          month: month || undefined,
          paymentDate,
          advanceAmount: Number(advanceAmount) || 0,
          notes: formNotes.trim(),
          addedBy: userName,
        });
      }
      // Reset form
      setCashAmount('');
      setDigitalAmount('');
      setAdvanceDeduction('');
      setAdvanceAmount('');
      setFormNotes('');
      Alert.alert('Saved', 'Payment recorded successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to save payment');
    }
    setSaving(false);
  };

  return (
    <View style={[styles.ownerCard, { borderLeftColor: accent }]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.ownerCardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={[styles.ownerAvatar, { backgroundColor: `${accent}22` }]}>
          <Text style={[styles.ownerInitial, { color: accent }]}>
            {(worker.name || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ownerName}>{worker.name}</Text>
          <Text style={styles.ownerMeta}>
            {formatCurrency(monthlySalary)}/mo | Paid: {formatCurrency(paidThisCycle)} | Bal: {formatCurrency(balance)}
          </Text>
          <Text style={styles.ownerMeta}>
            Cycle: {formatDate(cycleStart)} - {formatDate(cycleEnd)}
          </Text>
          {outstandingAdvance > 0 && (
            <Text style={[styles.ownerMeta, { color: colors.red }]}>
              Advance: {formatCurrency(outstandingAdvance)}
            </Text>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.ownerCardBody}>
          {/* Payment type toggle */}
          <View style={styles.payTypeRow}>
            <TouchableOpacity
              style={[styles.payTypeBtn, payType === 'salary' && { backgroundColor: `${colors.green}22`, borderColor: colors.green }]}
              onPress={() => setPayType('salary')}
            >
              <Text style={[styles.payTypeBtnText, payType === 'salary' && { color: colors.green }]}>Salary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.payTypeBtn, payType === 'advance' && { backgroundColor: `${colors.yellow}22`, borderColor: colors.yellow }]}
              onPress={() => setPayType('advance')}
            >
              <Text style={[styles.payTypeBtnText, payType === 'advance' && { color: colors.yellow }]}>Advance</Text>
            </TouchableOpacity>
          </View>

          {/* Month */}
          <Text style={styles.formLabel}>Month (optional)</Text>
          <TextInput
            style={styles.formInput}
            value={month}
            onChangeText={setMonth}
            placeholder="e.g. Apr 2026"
            placeholderTextColor={colors.textSecondary}
          />

          {/* Payment date */}
          <Text style={styles.formLabel}>Payment Date</Text>
          <TextInput
            style={styles.formInput}
            value={paymentDate}
            onChangeText={setPaymentDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
          />

          {payType === 'salary' ? (
            <>
              <View style={styles.amtRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Cash Amount</Text>
                  <TextInput
                    style={styles.formInput}
                    value={cashAmount}
                    onChangeText={setCashAmount}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Digital Amount</Text>
                  <TextInput
                    style={styles.formInput}
                    value={digitalAmount}
                    onChangeText={setDigitalAmount}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.formLabel}>Advance Deduction</Text>
              <TextInput
                style={styles.formInput}
                value={advanceDeduction}
                onChangeText={setAdvanceDeduction}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </>
          ) : (
            <>
              <Text style={styles.formLabel}>Advance Amount</Text>
              <TextInput
                style={styles.formInput}
                value={advanceAmount}
                onChangeText={setAdvanceAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </>
          )}

          {/* Notes */}
          <Text style={styles.formLabel}>Notes</Text>
          <TextInput
            style={[styles.formInput, { minHeight: 50, textAlignVertical: 'top' }]}
            value={formNotes}
            onChangeText={setFormNotes}
            placeholder="Optional notes..."
            placeholderTextColor={colors.textSecondary}
            multiline
          />

          {/* Save */}
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
                <Text style={styles.saveBtnText}>Save Payment</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Salary records table */}
          {records.length > 0 && (
            <View style={styles.recordsSection}>
              <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Records</Text>

              {/* Table header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Date</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Type</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
              </View>

              {pagedRecords.map((r) => {
                const total =
                  r.type === 'advance'
                    ? Number(r.advanceAmount) || Number(r.amount) || 0
                    : (Number(r.cashAmount) || 0) + (Number(r.digitalAmount) || 0);
                return (
                  <View key={r.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1 }]}>
                      {formatDate(r.paymentDate || r.createdAt)}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor:
                              r.type === 'advance' ? `${colors.yellow}22` : `${colors.green}22`,
                            borderColor: r.type === 'advance' ? colors.yellow : colors.green,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            { color: r.type === 'advance' ? colors.yellow : colors.green },
                          ]}
                        >
                          {r.type === 'advance' ? 'Advance' : 'Salary'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: fontWeight.semibold }]}>
                      {formatCurrency(total)}
                    </Text>
                  </View>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    onPress={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    style={[styles.pageBtn, page === 0 && { opacity: 0.3 }]}
                  >
                    <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.pageText}>
                    {page + 1} / {totalPages}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    style={[styles.pageBtn, page >= totalPages - 1 && { opacity: 0.3 }]}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  pageTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cycleInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 3,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  // Worker record rows (worker view)
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  recordDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  recordAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  noRecords: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  // Owner worker card
  ownerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  ownerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: 10,
  },
  ownerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerInitial: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  ownerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  ownerMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  ownerCardBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Pay type toggle
  payTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  payTypeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgDark,
  },
  payTypeBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  // Form
  formLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  amtRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    marginTop: spacing.md,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  // Records table
  recordsSection: {},
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderBright,
  },
  tableHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  // Empty
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
});
