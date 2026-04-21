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
import { openWhatsApp, formatBillMessage } from '../utils/whatsapp';

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

const formatDisplayDate = (ds) => {
  if (!ds) return '—';
  try {
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  } catch { return ds; }
};

const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ═════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════
export default function BillingScreen() {
  const { user } = useAuth();
  const { bills, customers, users, addBill, updateBill } = useData();
  const isOwner = user?.role === 'owner';

  // filters
  const [dateTab, setDateTab] = useState('All');
  const [serviceTab, setServiceTab] = useState('All');
  const [customFrom, setCustomFrom] = useState(new Date());
  const [customTo, setCustomTo] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // sheets
  const [detailBill, setDetailBill] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);

  // date range
  const dateRange = useMemo(() => {
    if (dateTab === 'Custom') return [toDateStr(customFrom), toDateStr(customTo)];
    return dateRanges[dateTab]();
  }, [dateTab, customFrom, customTo]);

  // filtered bills
  const filtered = useMemo(() => {
    return bills
      .filter((b) => {
        const d = b.generatedDate || b.date || '';
        if (d < dateRange[0] || d > dateRange[1]) return false;
        if (serviceTab === 'TV' && b.serviceType !== 'tv' && b.serviceType !== 'both') return false;
        if (serviceTab === 'Internet' && b.serviceType !== 'internet' && b.serviceType !== 'both') return false;
        return true;
      })
      .sort((a, b) => (b.generatedDate || '').localeCompare(a.generatedDate || ''));
  }, [bills, dateRange, serviceTab]);

  // stats
  const stats = useMemo(() => {
    const total = filtered.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const pending = filtered.filter((b) => b.status !== 'Paid').length;
    return { count: filtered.length, total, pending };
  }, [filtered]);

  // customer map
  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach((c) => { m[c.id] = c; });
    return m;
  }, [customers]);

  // ─── renderers ──────────────────────────────────────────────────
  const renderBillItem = useCallback(({ item }) => {
    const cust = customerMap[item.customerId];
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
          <Text style={styles.billDate}>{formatDisplayDate(item.generatedDate)}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [customerMap]);

  // ─── main render ────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Billing</Text>
        <Text style={styles.headerSub}>Generate and manage customer bills</Text>
      </View>

      {/* Generate action card */}
      <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={() => setShowGenerate(true)}>
        <View style={styles.actionLeft}>
          <View style={styles.actionIcon}>
            <Ionicons name="receipt-outline" size={24} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.actionTitle}>Generate Bill</Text>
            <Text style={styles.actionSub}>Create a new bill for a customer</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.accent} />
      </TouchableOpacity>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="document-text-outline" size={16} color={colors.accent} />
          <Text style={styles.statVal}>{stats.count}</Text>
          <Text style={styles.statLabel}>Bills</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxMid]}>
          <Ionicons name="cash-outline" size={16} color={colors.green} />
          <Text style={styles.statVal}>{fmt(stats.total)}</Text>
          <Text style={styles.statLabel}>Billed</Text>
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
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderBillItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>No bills found</Text>
          </View>
        }
      />

      {/* Bill Detail Sheet */}
      {detailBill && (
        <BillDetailSheet
          bill={detailBill}
          customer={customerMap[detailBill.customerId]}
          isOwner={isOwner}
          users={users}
          onClose={() => setDetailBill(null)}
          updateBill={updateBill}
        />
      )}

      {/* Generate Bill Sheet */}
      {showGenerate && (
        <GenerateBillSheet
          visible={showGenerate}
          onClose={() => setShowGenerate(false)}
          customers={customers}
          users={users}
          user={user}
          bills={bills}
          addBill={addBill}
        />
      )}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// BILL DETAIL SHEET
// ═════════════════════════════════════════════════════════════════
function BillDetailSheet({ bill, customer, isOwner, users, onClose, updateBill }) {
  const [editing, setEditing] = useState(false);
  const [editAmt, setEditAmt] = useState(String(bill.totalAmount || ''));
  const [editTvAmt, setEditTvAmt] = useState(String(bill.tvAmount || ''));
  const [editNetAmt, setEditNetAmt] = useState(String(bill.internetAmount || ''));
  const [editDate, setEditDate] = useState(bill.generatedDate || today());
  const [editNote, setEditNote] = useState(bill.note || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editPayIdx, setEditPayIdx] = useState(null);
  const [editPayAmt, setEditPayAmt] = useState('');

  const payments = bill.payments || [];

  const handleSaveEdit = () => {
    const total = Number(editAmt) || bill.totalAmount;
    const paid = bill.amountPaid || 0;
    const balance = total - paid;
    const updates = {
      totalAmount: total,
      tvAmount: Number(editTvAmt) || bill.tvAmount,
      internetAmount: Number(editNetAmt) || bill.internetAmount,
      generatedDate: editDate,
      note: editNote,
      balance,
      status: balance <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Due',
      modifiedCount: (bill.modifiedCount || 0) + 1,
    };
    updateBill(bill.id, updates);
    setEditing(false);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert('Delete Bill', 'Are you sure you want to delete this bill?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          updateBill(bill.id, { deleted: true, status: 'Deleted' });
          onClose();
        },
      },
    ]);
  };

  const handleWhatsApp = () => {
    if (!customer?.phone) {
      Alert.alert('No Phone', 'Customer phone number not found.');
      return;
    }
    openWhatsApp(customer.phone, formatBillMessage(bill));
  };

  const handleEditPayment = (idx) => {
    if (!isOwner) return;
    setEditPayIdx(idx);
    setEditPayAmt(String(payments[idx]?.amount || ''));
  };

  const handleSavePaymentEdit = () => {
    if (editPayIdx === null) return;
    const updatedPayments = [...payments];
    updatedPayments[editPayIdx] = { ...updatedPayments[editPayIdx], amount: Number(editPayAmt) || 0 };
    const totalPaid = updatedPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const balance = (bill.totalAmount || 0) - totalPaid;
    updateBill(bill.id, {
      payments: updatedPayments,
      amountPaid: totalPaid,
      balance,
      status: balance <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Due',
    });
    setEditPayIdx(null);
    onClose();
  };

  const handleDeletePayment = (idx) => {
    if (!isOwner) return;
    Alert.alert('Delete Payment', 'Remove this payment record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          const updatedPayments = payments.filter((_, i) => i !== idx);
          const totalPaid = updatedPayments.reduce((s, p) => s + (p.amount || 0), 0);
          const balance = (bill.totalAmount || 0) - totalPaid;
          updateBill(bill.id, {
            payments: updatedPayments,
            amountPaid: totalPaid,
            balance,
            status: balance <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Due',
          });
          onClose();
        },
      },
    ]);
  };

  return (
    <BottomSheet visible onClose={onClose} title={`Bill #${bill.billNumber || ''}`} subtitle={bill.customerName} icon="receipt-outline" iconColor={colors.accent}>
      {/* Info rows */}
      <View style={styles.detailSection}>
        <DetailRow label="Customer" value={bill.customerName} />
        <DetailRow label="Date" value={formatDisplayDate(bill.generatedDate)} />
        <DetailRow label="Service" value={<ServiceBadge type={bill.serviceType} />} />
        <DetailRow label="Total" value={fmt(bill.totalAmount)} highlight />
        {bill.serviceType === 'both' && (
          <>
            <DetailRow label="TV Amount" value={fmt(bill.tvAmount)} />
            <DetailRow label="Internet" value={fmt(bill.internetAmount)} />
          </>
        )}
        <DetailRow label="Paid" value={fmt(bill.amountPaid)} />
        <DetailRow label="Balance" value={fmt(bill.balance)} highlight={bill.balance > 0} />
        <DetailRow label="Status" value={<StatusBadge status={bill.status} />} />
        {bill.generatedBy && <DetailRow label="Generated By" value={users.find(u => u.id === bill.generatedBy)?.name || bill.generatedByName || '—'} />}
        {bill.note ? <DetailRow label="Note" value={bill.note} /> : null}
      </View>

      {/* Payments */}
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
              {isOwner && (
                <View style={styles.payActions}>
                  <TouchableOpacity onPress={() => handleEditPayment(i)} style={styles.payActionBtn}>
                    <Ionicons name="pencil" size={14} color={colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeletePayment(i)} style={styles.payActionBtn}>
                    <Ionicons name="trash" size={14} color={colors.red} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Edit payment inline */}
      {editPayIdx !== null && (
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Edit Payment #{editPayIdx + 1}</Text>
          <FormInput
            label="Amount"
            value={editPayAmt}
            onChangeText={setEditPayAmt}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleSavePaymentEdit}>
            <Text style={styles.btnPrimaryText}>Save Payment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit bill (owner only) */}
      {isOwner && !editing && (
        <View style={styles.detailActions}>
          <TouchableOpacity style={styles.btnOutline} onPress={() => setEditing(true)}>
            <Ionicons name="pencil" size={16} color={colors.accent} />
            <Text style={styles.btnOutlineText}>Edit Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnOutline, styles.btnDanger]} onPress={handleDelete}>
            <Ionicons name="trash" size={16} color={colors.red} />
            <Text style={[styles.btnOutlineText, { color: colors.red }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {isOwner && editing && (
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Edit Bill</Text>
          <FormInput label="Total Amount" value={editAmt} onChangeText={setEditAmt} keyboardType="numeric" />
          {bill.serviceType === 'both' && (
            <>
              <FormInput label="TV Amount" value={editTvAmt} onChangeText={setEditTvAmt} keyboardType="numeric" />
              <FormInput label="Internet Amount" value={editNetAmt} onChangeText={setEditNetAmt} keyboardType="numeric" />
            </>
          )}
          <TouchableOpacity style={styles.datePickBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.datePickText}>{editDate}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(editDate + 'T00:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowDatePicker(false); if (d) setEditDate(toDateStr(d)); }}
            />
          )}
          <FormInput label="Note" value={editNote} onChangeText={setEditNote} multiline />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveEdit}>
            <Text style={styles.btnPrimaryText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* WhatsApp */}
      <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
        <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
        <Text style={styles.whatsappBtnText}>Share via WhatsApp</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

// ═════════════════════════════════════════════════════════════════
// GENERATE BILL SHEET
// ═════════════════════════════════════════════════════════════════
function GenerateBillSheet({ visible, onClose, customers, users, user, bills, addBill }) {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [serviceType, setServiceType] = useState('both');
  const [billDate, setBillDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tvAmount, setTvAmount] = useState('');
  const [internetAmount, setInternetAmount] = useState('');
  const [generatedBy, setGeneratedBy] = useState(user?.userId || '');
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    // Auto-fill rates from customer services
    const tvRate = cust.services?.tv?.monthlyRate || cust.monthlyRate || 300;
    const netRate = cust.services?.internet?.monthlyRate || 0;
    setTvAmount(String(tvRate));
    setInternetAmount(String(netRate));
    // auto-detect service type
    const hasTV = cust.services?.tv?.active !== false;
    const hasNet = cust.services?.internet?.active === true;
    if (hasTV && hasNet) setServiceType('both');
    else if (hasNet) setServiceType('internet');
    else setServiceType('tv');
    setStep(2);
  };

  const total = useMemo(() => {
    if (serviceType === 'tv') return Number(tvAmount) || 0;
    if (serviceType === 'internet') return Number(internetAmount) || 0;
    return (Number(tvAmount) || 0) + (Number(internetAmount) || 0);
  }, [serviceType, tvAmount, internetAmount]);

  const nextBillNumber = useMemo(() => {
    const nums = bills.map((b) => Number(b.billNumber) || 0);
    return String(Math.max(0, ...nums) + 1);
  }, [bills]);

  const handleGenerate = async () => {
    if (!selectedCustomer) return;
    if (total <= 0) {
      Alert.alert('Invalid', 'Bill amount must be greater than 0.');
      return;
    }
    setSaving(true);
    const genUser = users.find(u => u.id === generatedBy);
    const bill = {
      billNumber: nextBillNumber,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      serviceType,
      generatedDate: billDate,
      totalAmount: total,
      tvAmount: serviceType !== 'internet' ? Number(tvAmount) || 0 : 0,
      internetAmount: serviceType !== 'tv' ? Number(internetAmount) || 0 : 0,
      amountPaid: 0,
      balance: total,
      status: 'Due',
      payments: [],
      generatedBy: generatedBy,
      generatedByName: genUser?.name || user?.name || '',
      tvPaid: false,
      internetPaid: false,
      phone: selectedCustomer.phone,
      boxNumber: selectedCustomer.boxNumber,
    };
    await addBill(bill);
    setSaving(false);

    // offer whatsapp
    Alert.alert(
      'Bill Generated',
      `Bill #${nextBillNumber} for ${fmt(total)} created successfully.`,
      [
        {
          text: 'Share via WhatsApp',
          onPress: () => {
            if (selectedCustomer.phone) {
              openWhatsApp(selectedCustomer.phone, formatBillMessage({ ...bill, id: 'new' }));
            }
          },
        },
        { text: 'Done', style: 'cancel' },
      ],
    );
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Generate Bill" subtitle="Create a new customer bill" icon="receipt-outline" iconColor={colors.green}>
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
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.custRow} onPress={() => handleSelectCustomer(item)}>
                <View style={styles.custAvatar}>
                  <Text style={styles.custAvatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.custName}>{item.name}</Text>
                  <Text style={styles.custMeta}>{item.phone || ''} {item.area ? `• ${item.area}` : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptySmall}>No customers found</Text>
            }
          />
        </>
      )}

      {step === 2 && selectedCustomer && (
        <>
          {/* Selected customer header */}
          <TouchableOpacity style={styles.selectedCust} onPress={() => setStep(1)}>
            <View style={styles.custAvatar}>
              <Text style={styles.custAvatarText}>{(selectedCustomer.name || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.custName}>{selectedCustomer.name}</Text>
              <Text style={styles.custMeta}>{selectedCustomer.phone || ''}</Text>
            </View>
            <Ionicons name="swap-horizontal" size={18} color={colors.accent} />
          </TouchableOpacity>

          {/* Service type */}
          <Text style={styles.fieldLabel}>Service Type</Text>
          <View style={styles.serviceRow}>
            {['tv', 'internet', 'both'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.serviceTab, serviceType === t && styles.serviceTabActive]}
                onPress={() => setServiceType(t)}
              >
                <Text style={[styles.serviceTabText, serviceType === t && styles.serviceTabTextActive]}>
                  {t === 'tv' ? 'TV' : t === 'internet' ? 'Internet' : 'Both'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date */}
          <Text style={styles.fieldLabel}>Bill Date</Text>
          <TouchableOpacity style={styles.datePickBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.datePickText}>{billDate}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(billDate + 'T00:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowDatePicker(false); if (d) setBillDate(toDateStr(d)); }}
            />
          )}

          {/* Amounts */}
          {serviceType !== 'internet' && (
            <FormInput
              label="TV Amount"
              icon={<Ionicons name="tv-outline" size={14} color={colors.purple} />}
              value={tvAmount}
              onChangeText={setTvAmount}
              keyboardType="numeric"
              placeholder="0"
            />
          )}
          {serviceType !== 'tv' && (
            <FormInput
              label="Internet Amount"
              icon={<Ionicons name="wifi-outline" size={14} color={colors.cyan} />}
              value={internetAmount}
              onChangeText={setInternetAmount}
              keyboardType="numeric"
              placeholder="0"
            />
          )}

          {/* Generated By */}
          <Text style={styles.fieldLabel}>Generated By</Text>
          <TouchableOpacity style={styles.datePickBtn} onPress={() => setShowUserPicker(!showUserPicker)}>
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.datePickText}>{users.find(u => u.id === generatedBy)?.name || 'Select'}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          {showUserPicker && (
            <View style={styles.pickerList}>
              {users.filter(u => u.active !== false).map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.pickerItem, generatedBy === u.id && styles.pickerItemActive]}
                  onPress={() => { setGeneratedBy(u.id); setShowUserPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, generatedBy === u.id && { color: colors.accent }]}>{u.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmt(total)}</Text>
          </View>

          {/* Generate */}
          <TouchableOpacity
            style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
            onPress={handleGenerate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                <Text style={styles.btnPrimaryText}>Generate Bill</Text>
              </>
            )}
          </TouchableOpacity>
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
    borderColor: `${colors.accent}30`,
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
    backgroundColor: `${colors.accent}15`,
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

  // detail sheet
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
  detailActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
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
  payActions: {
    flexDirection: 'row',
    gap: 8,
  },
  payActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
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
  btnPrimaryText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    gap: 6,
  },
  btnOutlineText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  btnDanger: {
    borderColor: colors.red,
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

  // customer list
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
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${colors.accent}10`,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
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
    color: colors.accent,
  },
});
