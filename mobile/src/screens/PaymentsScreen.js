import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, Alert,
  StyleSheet, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import BottomSheet from '../components/BottomSheet';
import { StatusBadge, ServiceBadge, PaymentBadge } from '../components/StatusBadge';
import FormInput from '../components/FormInput';
import { openWhatsApp, formatPaymentMessage } from '../utils/whatsapp';

// ─── helpers ─────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dateRanges = {
  Today: () => { const t = today(); return [t, t]; },
  Yesterday: () => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return [s, s];
  },
  'Last 15 Days': () => {
    const d = new Date(); d.setDate(d.getDate() - 15);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return [s, today()];
  },
  'Last Month': () => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return [s, today()];
  },
  'Last 6 Months': () => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return [s, today()];
  },
  All: () => ['2000-01-01', '2100-12-31'],
};

const DATE_TABS = ['Today', 'Yesterday', 'Last 15 Days', 'Last Month', 'Last 6 Months', 'All', 'Custom'];
const SERVICE_TABS = ['All', 'TV', 'Internet'];
const PAYMENT_MODES = ['Cash', 'PhonePe', 'GPay'];

const formatDisplayDate = (ds) => {
  if (!ds) return '—';
  try {
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  } catch { return ds; }
};

const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ─── payment distribution logic ──────────────────────────────────
const effectiveBalance = (bill, choice) => {
  if (choice === 'skip') return 0;
  if (bill.serviceType !== 'both') return bill.balance || 0;
  if (bill.tvPaid || bill.internetPaid) return bill.balance || 0;
  if (choice === 'tv') return bill.tvAmount || bill.balance || 0;
  if (choice === 'internet') return bill.internetAmount || bill.balance || 0;
  return bill.balance || 0;
};

// ═════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════
export default function PaymentsScreen() {
  const { user } = useAuth();
  const { bills, customers, users, updateMultipleBills } = useData();
  const isOwner = user?.role === 'owner';

  // filters
  const [dateTab, setDateTab] = useState('All');
  const [serviceTab, setServiceTab] = useState('All');
  const [customFrom, setCustomFrom] = useState(new Date());
  const [customTo, setCustomTo] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // sheet
  const [showRecord, setShowRecord] = useState(false);
  const [detailBill, setDetailBill] = useState(null);

  // date range
  const dateRange = useMemo(() => {
    if (dateTab === 'Custom') return [toDateStr(customFrom), toDateStr(customTo)];
    return dateRanges[dateTab]();
  }, [dateTab, customFrom, customTo]);

  // All bills that have payments within the date range
  const filteredBills = useMemo(() => {
    return bills
      .filter((b) => {
        if (b.deleted || b.status === 'Deleted') return false;
        // Include bill if it has any payment in range, or if bill itself is in range
        const hasPayInRange = (b.payments || []).some(p => {
          const pd = p.date || '';
          return pd >= dateRange[0] && pd <= dateRange[1];
        });
        const billInRange = (b.generatedDate || '') >= dateRange[0] && (b.generatedDate || '') <= dateRange[1];
        if (!hasPayInRange && !billInRange) return false;
        if (serviceTab === 'TV' && b.serviceType !== 'tv' && b.serviceType !== 'both') return false;
        if (serviceTab === 'Internet' && b.serviceType !== 'internet' && b.serviceType !== 'both') return false;
        return true;
      })
      .sort((a, b) => (b.generatedDate || '').localeCompare(a.generatedDate || ''));
  }, [bills, dateRange, serviceTab]);

  // stats
  const stats = useMemo(() => {
    const todayStr = today();
    let paymentsToday = 0;
    let totalCollected = 0;
    bills.forEach((b) => {
      (b.payments || []).forEach((p) => {
        if (p.date === todayStr) paymentsToday++;
        if (p.date >= dateRange[0] && p.date <= dateRange[1]) {
          totalCollected += (p.amount || 0);
        }
      });
    });
    const pending = bills.filter((b) => !b.deleted && b.status !== 'Deleted' && b.status !== 'Paid' && (b.balance || 0) > 0).length;
    return { paymentsToday, totalCollected, pending };
  }, [bills, dateRange]);

  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach((c) => { m[c.id] = c; });
    return m;
  }, [customers]);

  const renderBillItem = useCallback(({ item }) => {
    const cust = customerMap[item.customerId];
    const payCount = (item.payments || []).length;
    return (
      <TouchableOpacity style={styles.billRow} activeOpacity={0.7} onPress={() => setDetailBill(item)}>
        <View style={styles.billRowTop}>
          <Text style={styles.billNum}>#{item.billNumber || '—'}</Text>
          <ServiceBadge type={item.serviceType} />
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.billCust} numberOfLines={1}>{item.customerName || cust?.name || '—'}</Text>
        <View style={styles.billRowBottom}>
          <View style={styles.billAmounts}>
            <Text style={styles.billAmt}>{fmt(item.totalAmount)}</Text>
            <Text style={styles.billPaid}>Paid {fmt(item.amountPaid)}</Text>
            {(item.balance > 0) && <Text style={styles.billBal}>Bal {fmt(item.balance)}</Text>}
          </View>
          <View style={styles.billDateRow}>
            {payCount > 0 && (
              <Text style={styles.payCount}>{payCount} payment{payCount > 1 ? 's' : ''}</Text>
            )}
            <Text style={styles.billDate}>{formatDisplayDate(item.generatedDate)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [customerMap]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
        <Text style={styles.headerSub}>Record and track customer payments</Text>
      </View>

      {/* Record Payment action card */}
      <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={() => setShowRecord(true)}>
        <View style={styles.actionLeft}>
          <View style={[styles.actionIcon, { backgroundColor: `${colors.green}15` }]}>
            <Ionicons name="card-outline" size={24} color={colors.green} />
          </View>
          <View>
            <Text style={styles.actionTitle}>Record Payment</Text>
            <Text style={styles.actionSub}>Collect payment from a customer</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.green} />
      </TouchableOpacity>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="today-outline" size={16} color={colors.accent} />
          <Text style={styles.statVal}>{stats.paymentsToday}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxMid]}>
          <Ionicons name="cash-outline" size={16} color={colors.green} />
          <Text style={styles.statVal}>{fmt(stats.totalCollected)}</Text>
          <Text style={styles.statLabel}>Collected</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.yellow} />
          <Text style={styles.statVal}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Date filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {DATE_TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, dateTab === t && styles.tabActive]}
            onPress={() => setDateTab(t)}
          >
            <Text style={[styles.tabText, dateTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Custom date pickers */}
      {dateTab === 'Custom' && (
        <View style={styles.customDateRow}>
          <TouchableOpacity style={styles.customDateBtn} onPress={() => setShowFromPicker(true)}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.customDateText}>{toDateStr(customFrom)}</Text>
          </TouchableOpacity>
          <Text style={styles.customDateSep}>to</Text>
          <TouchableOpacity style={styles.customDateBtn} onPress={() => setShowToPicker(true)}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.customDateText}>{toDateStr(customTo)}</Text>
          </TouchableOpacity>
          {showFromPicker && (
            <DateTimePicker
              value={customFrom}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowFromPicker(false); if (d) setCustomFrom(d); }}
            />
          )}
          {showToPicker && (
            <DateTimePicker
              value={customTo}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowToPicker(false); if (d) setCustomTo(d); }}
            />
          )}
        </View>
      )}

      {/* Service filter */}
      <View style={styles.serviceRow}>
        {SERVICE_TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.serviceTab, serviceTab === t && styles.serviceTabActive]}
            onPress={() => setServiceTab(t)}
          >
            <Text style={[styles.serviceTabText, serviceTab === t && styles.serviceTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bill list */}
      <FlatList
        data={filteredBills}
        keyExtractor={(item) => item.id}
        renderItem={renderBillItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>No bills found for this period</Text>
          </View>
        }
      />

      {/* Bill detail sheet (read-only payment view) */}
      {detailBill && (
        <BillPaymentDetail
          bill={detailBill}
          customer={customerMap[detailBill.customerId]}
          users={users}
          onRecordPayment={() => setShowRecord(true)}
          onClose={() => setDetailBill(null)}
        />
      )}

      {/* Record Payment Sheet */}
      {showRecord && (
        <RecordPaymentSheet
          visible={showRecord}
          onClose={() => {
            setShowRecord(false);
            setDetailBill(null); // clear detail if we entered from there
          }}
          initialCustomer={detailBill ? customerMap[detailBill.customerId] : null}
          customers={customers}
          bills={bills}
          users={users}
          user={user}
          updateMultipleBills={updateMultipleBills}
        />
      )}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// BILL PAYMENT DETAIL (simple read view)
// ═════════════════════════════════════════════════════════════════
function BillPaymentDetail({ bill, customer, users, onRecordPayment, onClose }) {
  const payments = bill.payments || [];
  return (
    <BottomSheet visible onClose={onClose} title={`Bill #${bill.billNumber || ''}`} subtitle={bill.customerName} icon="card-outline" iconColor={colors.green}>
      <View style={styles.detailSection}>
        <DetailRow label="Customer" value={bill.customerName} />
        <DetailRow label="Date" value={formatDisplayDate(bill.generatedDate)} />
        <DetailRow label="Service" value={<ServiceBadge type={bill.serviceType} />} />
        <DetailRow label="Total" value={fmt(bill.totalAmount)} highlight />
        <DetailRow label="Paid" value={fmt(bill.amountPaid)} />
        <DetailRow label="Balance" value={fmt(bill.balance)} highlight={bill.balance > 0} />
        <DetailRow label="Status" value={<StatusBadge status={bill.status} />} />
      </View>

      {/* Record Payment Action */}
      {bill.balance > 0 && (
        <TouchableOpacity
          style={[styles.btnPrimary, styles.recordInDetail]}
          onPress={onRecordPayment}
        >
          <Ionicons name="card-outline" size={18} color={colors.white} />
          <Text style={styles.btnPrimaryText}>Record Payment</Text>
        </TouchableOpacity>
      )}

      {payments.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {payments.map((p, i) => (
            <View key={p.id || i} style={styles.paymentRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.payRowTop}>
                  <Text style={styles.payAmt}>{fmt(p.amount)}</Text>
                  <PaymentBadge mode={p.mode} />
                </View>
                <Text style={styles.payMeta}>
                  {formatDisplayDate(p.date)} {p.collectedByName ? `• ${p.collectedByName}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* WhatsApp */}
      {customer?.phone && (
        <TouchableOpacity
          style={styles.whatsappBtn}
          onPress={() => openWhatsApp(customer.phone, formatPaymentMessage(bill))}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.whatsappBtnText}>Share via WhatsApp</Text>
        </TouchableOpacity>
      )}
    </BottomSheet>
  );
}

// ═════════════════════════════════════════════════════════════════
// RECORD PAYMENT SHEET
// ═════════════════════════════════════════════════════════════════
function RecordPaymentSheet({ visible, onClose, initialCustomer, customers, bills, users, user, updateMultipleBills }) {
  const [step, setStep] = useState(initialCustomer ? 2 : 1);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomer || null);

  // Re-sync if initialCustomer changes
  React.useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomer(initialCustomer);
      setStep(2);
    }
  }, [initialCustomer]);
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [payMode, setPayMode] = useState('Cash');
  const [collectedBy, setCollectedBy] = useState(user?.userId || '');
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // per-bill service choices for 'both' type bills
  const [serviceChoices, setServiceChoices] = useState({});
  const [expandedBill, setExpandedBill] = useState(null);

  // customer search
  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers.filter(c => !c.deleted);
    const q = search.toLowerCase();
    return customers.filter((c) => !c.deleted && (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.setupBoxNumber || c.boxNumber || '').toLowerCase().includes(q) ||
      (c.customerId || '').toLowerCase().includes(q)
    ));
  }, [customers, search]);

  // pending bills for selected customer (oldest first)
  const pendingBills = useMemo(() => {
    if (!selectedCustomer) return [];
    return bills
      .filter((b) =>
        b.customerId === selectedCustomer.id &&
        !b.deleted &&
        b.status !== 'Deleted' &&
        b.status !== 'Paid' &&
        (b.balance || 0) > 0
      )
      .sort((a, b) => (a.generatedDate || '').localeCompare(b.generatedDate || ''));
  }, [bills, selectedCustomer]);

  // total outstanding based on service choices
  const totalOutstanding = useMemo(() => {
    return pendingBills.reduce((sum, bill) => {
      const choice = serviceChoices[bill.id] || (bill.serviceType === 'both' ? 'both' : bill.serviceType);
      return sum + effectiveBalance(bill, choice);
    }, 0);
  }, [pendingBills, serviceChoices]);

  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setServiceChoices({});
    setStep(2);
    // auto-fill amount will be set after pendingBills compute
  };

  // when pendingBills change, auto-fill amount
  React.useEffect(() => {
    if (step === 2 && pendingBills.length > 0 && !amount) {
      setAmount(String(totalOutstanding));
    }
  }, [step, pendingBills, totalOutstanding]);

  // update service choice for a bill
  const setChoice = (billId, choice) => {
    const next = { ...serviceChoices, [billId]: choice };
    setServiceChoices(next);
    // recalculate amount
    const newTotal = pendingBills.reduce((sum, bill) => {
      const c = next[bill.id] || (bill.serviceType === 'both' ? 'both' : bill.serviceType);
      return sum + effectiveBalance(bill, c);
    }, 0);
    setAmount(String(newTotal));
  };

  // ─── distribute payment ────────────────────────────────────────
  const handleSave = async () => {
    const payAmt = Number(amount) || 0;
    if (payAmt <= 0) {
      Alert.alert('Invalid', 'Payment amount must be greater than 0.');
      return;
    }
    if (pendingBills.length === 0) {
      Alert.alert('No Bills', 'No pending bills to apply payment to.');
      return;
    }

    setSaving(true);
    const collUser = users.find(u => u.id === collectedBy);
    let remaining = payAmt;
    const updatesList = [];

    for (const bill of pendingBills) {
      if (remaining <= 0) break;
      const choice = serviceChoices[bill.id] || (bill.serviceType === 'both' ? 'both' : bill.serviceType);
      if (choice === 'skip') continue;

      const eff = effectiveBalance(bill, choice);
      if (eff <= 0) continue;

      const allocated = Math.min(remaining, eff);
      remaining -= allocated;

      const paymentRecord = {
        id: Date.now().toString() + '_' + bill.id,
        amount: allocated,
        date: payDate,
        mode: payMode,
        collectedBy: collectedBy,
        collectedByName: collUser?.name || user?.name || '',
      };

      const existingPayments = bill.payments || [];
      const newPayments = [...existingPayments, paymentRecord];
      const newPaid = (bill.amountPaid || 0) + allocated;
      const newBalance = (bill.totalAmount || 0) - newPaid;

      // determine tvPaid/internetPaid flags
      let tvPaid = bill.tvPaid || false;
      let internetPaid = bill.internetPaid || false;

      if (bill.serviceType === 'both') {
        if (choice === 'tv') tvPaid = true;
        else if (choice === 'internet') internetPaid = true;
        else if (choice === 'both') {
          tvPaid = true;
          internetPaid = true;
        }
      }

      updatesList.push({
        id: bill.id,
        updates: {
          payments: newPayments,
          amountPaid: newPaid,
          balance: Math.max(0, newBalance),
          status: newBalance <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Due',
          tvPaid,
          internetPaid,
        },
      });
    }

    if (updatesList.length > 0) {
      await updateMultipleBills(updatesList);
    }

    setSaving(false);

    // offer WhatsApp share
    const paidDist = pendingBills.filter(b => updatesList.some(u => u.id === b.id));

    const billTotal = paidDist.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const cumulativePaid = paidDist.reduce((s, b) => s + (b.amountPaid || 0), 0) + payAmt;
    const combinedPayments = [];
    paidDist.forEach(b => {
      (b.payments || []).forEach(p => combinedPayments.push(p));
    });
    combinedPayments.push({ amount: payAmt });

    const resolvedServiceType = (() => {
      if (paidDist.length === 0) return 'tv';
      const types = new Set();
      for (const d of paidDist) {
        const choice = serviceChoices[d.id] || 'both';
        if (d.serviceType === 'tv' || choice === 'tv') types.add('tv');
        else if (d.serviceType === 'internet' || choice === 'internet') types.add('internet');
        else { types.add('tv'); types.add('internet'); }
      }
      if (types.has('tv') && types.has('internet')) return 'both';
      if (types.has('tv')) return 'tv';
      return 'internet';
    })();

    const updatedBill = {
      customerName: selectedCustomer.name,
      totalAmount: billTotal,
      amountPaid: cumulativePaid,
      balance: Math.max(0, billTotal - cumulativePaid),
      generatedDate: payDate,
      serviceType: resolvedServiceType,
      billNumber: paidDist.length === 1 ? paidDist[0].billNumber : 'MULTIPLE',
      payments: combinedPayments
    };

    Alert.alert(
      'Payment Recorded',
      `${fmt(payAmt)} payment recorded for ${selectedCustomer.name}.`,
      [
        {
          text: 'Share via WhatsApp',
          onPress: () => {
            if (selectedCustomer.phone) {
              openWhatsApp(selectedCustomer.phone, formatPaymentMessage(updatedBill, payAmt, payDate));
            }
          },
        },
        { text: 'Done', style: 'cancel' },
      ],
    );
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Record Payment" subtitle="Collect customer payment" icon="card-outline" iconColor={colors.green}>
      {step === 1 && (
        <>
          {/* Search */}
          <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customer..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 350 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            renderItem={({ item }) => {
              const custPending = bills.filter(b => b.customerId === item.id && !b.deleted && b.status !== 'Paid' && (b.balance || 0) > 0).length;
              return (
                <TouchableOpacity style={styles.custRow} onPress={() => handleSelectCustomer(item)}>
                  <View style={styles.custAvatar}>
                    <Text style={styles.custAvatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.custName}>{item.name}</Text>
                    <Text style={styles.custMeta}>
                      {item.phone || ''} {custPending > 0 ? `• ${custPending} pending` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptySmall}>No customers found</Text>}
          />
        </>
      )}

      {step === 2 && selectedCustomer && (
        <>
          {/* Selected customer */}
          <TouchableOpacity style={styles.selectedCust} onPress={() => { setStep(1); setSelectedCustomer(null); }}>
            <View style={styles.custAvatar}>
              <Text style={styles.custAvatarText}>{(selectedCustomer.name || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.custName}>{selectedCustomer.name}</Text>
              <Text style={styles.custMeta}>{selectedCustomer.phone || ''}</Text>
            </View>
            <Ionicons name="swap-horizontal" size={18} color={colors.accent} />
          </TouchableOpacity>

          {/* Pending bills */}
          {pendingBills.length === 0 ? (
            <View style={styles.noPending}>
              <Ionicons name="checkmark-circle" size={32} color={colors.green} />
              <Text style={styles.noPendingText}>No pending bills for this customer</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Pending Bills ({pendingBills.length})</Text>
              {pendingBills.map((bill) => {
                const choice = serviceChoices[bill.id] || (bill.serviceType === 'both' ? 'both' : bill.serviceType);
                const eff = effectiveBalance(bill, choice);
                const isExpanded = expandedBill === bill.id;
                return (
                  <View key={bill.id} style={styles.pendingBillCard}>
                    <TouchableOpacity
                      style={styles.pendingBillHeader}
                      onPress={() => setExpandedBill(isExpanded ? null : bill.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.pendingBillTop}>
                          <Text style={styles.billNum}>#{bill.billNumber}</Text>
                          <ServiceBadge type={bill.serviceType} />
                          <StatusBadge status={bill.status} />
                        </View>
                        <Text style={styles.pendingBillDate}>{formatDisplayDate(bill.generatedDate)}</Text>
                      </View>
                      <View style={styles.pendingBillRight}>
                        <Text style={styles.pendingBillBal}>{fmt(eff)}</Text>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>

                    {/* service choice dropdown for 'both' type */}
                    {bill.serviceType === 'both' && !bill.tvPaid && !bill.internetPaid && (
                      <View style={styles.choiceRow}>
                        {['both', 'tv', 'internet', 'skip'].map((opt) => (
                          <TouchableOpacity
                            key={opt}
                            style={[styles.choiceBtn, choice === opt && styles.choiceBtnActive]}
                            onPress={() => setChoice(bill.id, opt)}
                          >
                            <Text style={[styles.choiceBtnText, choice === opt && styles.choiceBtnTextActive]}>
                              {opt === 'tv' ? 'TV' : opt === 'internet' ? 'Net' : opt === 'both' ? 'Both' : 'Skip'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <View style={styles.pendingBillDetails}>
                        <DetailRow label="Total" value={fmt(bill.totalAmount)} />
                        <DetailRow label="Paid" value={fmt(bill.amountPaid)} />
                        <DetailRow label="Balance" value={fmt(bill.balance)} />
                        {bill.serviceType === 'both' && (
                          <>
                            <DetailRow label="TV Amount" value={fmt(bill.tvAmount)} />
                            <DetailRow label="Internet" value={fmt(bill.internetAmount)} />
                            {bill.tvPaid && <DetailRow label="TV" value="Paid" />}
                            {bill.internetPaid && <DetailRow label="Internet" value="Paid" />}
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Total outstanding */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Outstanding</Text>
                <Text style={styles.totalValue}>{fmt(totalOutstanding)}</Text>
              </View>

              {/* Amount input */}
              <FormInput
                label="Payment Amount"
                icon={<Ionicons name="cash-outline" size={14} color={colors.green} />}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
              />

              {/* Date */}
              <Text style={styles.fieldLabel}>Payment Date</Text>
              <TouchableOpacity style={styles.datePickBtn} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.datePickText}>{payDate}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(payDate + 'T00:00:00')}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => { setShowDatePicker(false); if (d) setPayDate(toDateStr(d)); }}
                />
              )}

              {/* Payment mode */}
              <Text style={styles.fieldLabel}>Payment Mode</Text>
              <View style={styles.modeRow}>
                {PAYMENT_MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modeBtn, payMode === m && styles.modeBtnActive]}
                    onPress={() => setPayMode(m)}
                  >
                    <Ionicons
                      name={m === 'Cash' ? 'cash-outline' : 'phone-portrait-outline'}
                      size={16}
                      color={payMode === m ? colors.accent : colors.textSecondary}
                    />
                    <Text style={[styles.modeBtnText, payMode === m && styles.modeBtnTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Collected By */}
              <Text style={styles.fieldLabel}>Collected By</Text>
              <TouchableOpacity style={styles.datePickBtn} onPress={() => setShowUserPicker(!showUserPicker)}>
                <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.datePickText}>{users.find(u => u.id === collectedBy)?.name || 'Select'}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              {showUserPicker && (
                <View style={styles.pickerList}>
                  {users.filter(u => u.active !== false).map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.pickerItem, collectedBy === u.id && styles.pickerItemActive]}
                      onPress={() => { setCollectedBy(u.id); setShowUserPicker(false); }}
                    >
                      <Text style={[styles.pickerItemText, collectedBy === u.id && { color: colors.accent }]}>{u.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Save */}
              <TouchableOpacity
                style={[styles.btnPrimary, styles.btnGreen, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                    <Text style={styles.btnPrimaryText}>Record Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </BottomSheet>
  );
}

// ═════════════════════════════════════════════════════════════════
// DETAIL ROW helper
// ═════════════════════════════════════════════════════════════════
function DetailRow({ label, value, highlight }) {
  const isComponent = typeof value === 'object';
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {isComponent ? value : (
        <Text style={[styles.detailValue, highlight && { color: colors.accent, fontWeight: fontWeight.bold }]}>{value}</Text>
      )}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // action card
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: `${colors.green}30`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  actionSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 4,
  },
  statBoxMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  statVal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // tabs
  tabScroll: {
    maxHeight: 44,
    marginBottom: spacing.sm,
  },
  tabContent: {
    paddingHorizontal: spacing.xl,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: `${colors.accent}20`,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },

  // custom date
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    gap: 8,
  },
  customDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customDateText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  customDateSep: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // service filter
  serviceRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    gap: 8,
  },
  serviceTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceTabActive: {
    backgroundColor: `${colors.accent}20`,
    borderColor: colors.accent,
  },
  serviceTabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  serviceTabTextActive: {
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },

  // bill list
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  billRow: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  billRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  billNum: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    marginRight: 'auto',
  },
  billCust: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  billRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  billAmt: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  billPaid: {
    fontSize: fontSize.xs,
    color: colors.green,
  },
  billBal: {
    fontSize: fontSize.xs,
    color: colors.red,
  },
  billDateRow: {
    alignItems: 'flex-end',
    gap: 2,
  },
  payCount: {
    fontSize: 10,
    color: colors.green,
    fontWeight: fontWeight.semibold,
  },
  billDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  // empty
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptySmall: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    paddingVertical: 20,
  },

  // detail
  detailSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },

  // payment rows
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: 8,
  },
  payRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  payAmt: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  payMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  // whatsapp
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37,211,102,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.3)',
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    gap: 8,
    marginTop: spacing.sm,
  },
  whatsappBtnText: {
    color: '#25D366',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },

  // search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
    gap: 8,
  },
  searchBoxFocused: {
    borderColor: colors.accent,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },

  // customer rows
  custRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  custAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custAvatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  custName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  custMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  selectedCust: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // pending bills
  noPending: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  noPendingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  pendingBillCard: {
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginBottom: 8,
    overflow: 'hidden',
  },
  pendingBillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  pendingBillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  pendingBillDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  pendingBillRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  pendingBillBal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  pendingBillDetails: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },

  // service choice
  choiceRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  choiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceBtnActive: {
    backgroundColor: `${colors.accent}20`,
    borderColor: colors.accent,
  },
  choiceBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  choiceBtnTextActive: {
    color: colors.accent,
  },

  // form helpers
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  datePickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  datePickText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  pickerList: {
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginBottom: 14,
    marginTop: -8,
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemActive: {
    backgroundColor: `${colors.accent}15`,
  },
  pickerItemText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },

  // payment mode
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBtnActive: {
    backgroundColor: `${colors.accent}15`,
    borderColor: colors.accent,
  },
  modeBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  modeBtnTextActive: {
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },

  // total
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${colors.green}10`,
    borderWidth: 1,
    borderColor: `${colors.green}30`,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.green,
  },

  // buttons
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    gap: 8,
    marginTop: spacing.sm,
  },
  btnGreen: {
    backgroundColor: colors.greenDark,
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  recordInDetail: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
