import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet,
  Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import StatCard from '../components/StatCard';
import { ServiceBadge } from '../components/StatusBadge';
import BottomSheet from '../components/BottomSheet';
import FormInput from '../components/FormInput';

const AVATAR_GRADIENTS = [
  ['#6366f1', '#818cf8'],
  ['#a855f7', '#c084fc'],
  ['#06b6d4', '#22d3ee'],
  ['#10b981', '#34d399'],
  ['#f59e0b', '#fbbf24'],
];

const SPEEDS = [10, 20, 30, 40, 50, 60, 70, 75, 100, 150, 200];
const VALIDITIES = [
  { value: '1month', label: '1 Month' },
  { value: '3months', label: '3 Months' },
  { value: '6months', label: '6 Months' },
  { value: '1year', label: '1 Year' },
];
const FILTERS = ['All', 'TV', 'Internet', 'Annual'];
const PAGE_SIZE = 20;

const getInitials = (name) =>
  (name || '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const Avatar = ({ name, id, size = 44 }) => {
  const idx = (parseInt(id, 10) || 0) % 5;
  const bg = AVATAR_GRADIENTS[idx][0];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
    </View>
  );
};

/* ─── Customer Form (two-step) ─── */
const CustomerForm = ({ onClose, onSave, editingCustomer }) => {
  const today = new Date().toISOString().split('T')[0];

  const [step, setStep] = useState('form');
  const [billChoice, setBillChoice] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState(() => {
    if (editingCustomer) {
      const s = editingCustomer.services || {};
      const fallbackDate = editingCustomer.createdAt
        ? new Date(editingCustomer.createdAt).toISOString().split('T')[0]
        : today;
      return {
        ...editingCustomer,
        services: {
          tv: { active: false, monthlyRate: 300, installationFee: 0, annualSubscription: false, ...s.tv },
          internet: { active: false, speed: 50, validity: '1month', monthlyRate: '', installationFee: 0, subscribedDate: fallbackDate, ...s.internet },
        },
      };
    }
    return {
      name: '',
      phone: '',
      address: '',
      boxNumber: '',
      services: {
        tv: { active: false, monthlyRate: 300, installationFee: 0, annualSubscription: false },
        internet: { active: false, speed: 50, validity: '1month', monthlyRate: '', installationFee: 0, subscribedDate: today },
      },
    };
  });

  const hasTv = formData.services.tv.active;
  const hasNet = formData.services.internet.active;

  const tvBillAmt = hasTv
    ? (Number(formData.services.tv.monthlyRate) || 0) + (Number(formData.services.tv.installationFee) || 0)
    : 0;
  const netBillAmt = hasNet
    ? (Number(formData.services.internet.monthlyRate) || 0) + (Number(formData.services.internet.installationFee) || 0)
    : 0;
  const bothBillAmt = tvBillAmt + netBillAmt;

  const setTV = (val) => setFormData((f) => ({ ...f, services: { ...f.services, tv: { ...f.services.tv, active: val } } }));
  const setNet = (val) => setFormData((f) => ({ ...f, services: { ...f.services, internet: { ...f.services.internet, active: val } } }));
  const updateTV = (field, val) => setFormData((f) => ({ ...f, services: { ...f.services, tv: { ...f.services.tv, [field]: val } } }));
  const updateNet = (field, val) => setFormData((f) => ({ ...f, services: { ...f.services, internet: { ...f.services.internet, [field]: val } } }));

  const handleNext = () => {
    if (!formData.name.trim()) return Alert.alert('Validation', 'Name is required');
    if (!formData.phone.trim()) return Alert.alert('Validation', 'Phone is required');
    if (!formData.address.trim()) return Alert.alert('Validation', 'Address is required');
    if (!hasTv && !hasNet) return Alert.alert('Validation', 'Select at least one service');

    const defaultChoice = hasTv && hasNet ? 'both' : hasTv ? 'tv' : 'internet';
    setBillChoice(defaultChoice);
    setStep('bill');
  };

  const handleConfirmBill = async (withBill) => {
    setSaving(true);
    let billSpec = null;
    if (withBill && billChoice) {
      const now = new Date().toISOString();
      if (billChoice === 'both') {
        billSpec = { serviceType: 'both', totalAmount: bothBillAmt, tvAmount: tvBillAmt, internetAmount: netBillAmt, balance: bothBillAmt, status: 'Pending', generatedDate: now };
      } else if (billChoice === 'tv') {
        billSpec = { serviceType: 'tv', totalAmount: tvBillAmt, balance: tvBillAmt, status: 'Pending', generatedDate: now };
      } else {
        billSpec = { serviceType: 'internet', totalAmount: netBillAmt, balance: netBillAmt, status: 'Pending', generatedDate: now };
      }
    }
    await onSave(formData, billSpec);
    setSaving(false);
  };

  /* ── Speed Picker ── */
  const [speedOpen, setSpeedOpen] = useState(false);
  const [validityOpen, setValidityOpen] = useState(false);

  if (step === 'bill') {
    return (
      <View>
        {/* Bill confirmation header */}
        <View style={fs.billHeader}>
          <Ionicons name="document-text" size={28} color={colors.accent} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={fs.billTitle}>Generate a Bill?</Text>
            <Text style={fs.billSub}>Customer saved. Create a bill now?</Text>
          </View>
        </View>

        <Text style={[fs.sectionLabel, { marginTop: 16, marginBottom: 8 }]}>Select service to bill</Text>

        {/* Bill service options */}
        {hasTv && (
          <TouchableOpacity
            style={[fs.billSvcBtn, billChoice === 'tv' && fs.billSvcActiveTv]}
            onPress={() => setBillChoice('tv')}
          >
            <Ionicons name="tv" size={20} color={billChoice === 'tv' ? colors.purple : colors.textSecondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={fs.billSvcName}>Cable TV</Text>
              <Text style={fs.billSvcAmt}>Rs.{tvBillAmt.toLocaleString('en-IN')}</Text>
              {formData.services.tv.installationFee > 0 && (
                <Text style={fs.billSvcBreak}>Rs.{formData.services.tv.monthlyRate} + Rs.{formData.services.tv.installationFee} install</Text>
              )}
            </View>
            <View style={[fs.radioOuter, billChoice === 'tv' && { borderColor: colors.purple }]}>
              {billChoice === 'tv' && <View style={[fs.radioInner, { backgroundColor: colors.purple }]} />}
            </View>
          </TouchableOpacity>
        )}

        {hasNet && (
          <TouchableOpacity
            style={[fs.billSvcBtn, billChoice === 'internet' && fs.billSvcActiveNet]}
            onPress={() => setBillChoice('internet')}
          >
            <Ionicons name="wifi" size={20} color={billChoice === 'internet' ? colors.cyan : colors.textSecondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={fs.billSvcName}>Internet</Text>
              <Text style={fs.billSvcAmt}>Rs.{netBillAmt.toLocaleString('en-IN')}</Text>
              {formData.services.internet.installationFee > 0 && (
                <Text style={fs.billSvcBreak}>Rs.{formData.services.internet.monthlyRate} + Rs.{formData.services.internet.installationFee} install</Text>
              )}
            </View>
            <View style={[fs.radioOuter, billChoice === 'internet' && { borderColor: colors.cyan }]}>
              {billChoice === 'internet' && <View style={[fs.radioInner, { backgroundColor: colors.cyan }]} />}
            </View>
          </TouchableOpacity>
        )}

        {hasTv && hasNet && (
          <TouchableOpacity
            style={[fs.billSvcBtn, billChoice === 'both' && fs.billSvcActiveBoth]}
            onPress={() => setBillChoice('both')}
          >
            <Ionicons name="checkmark-circle" size={20} color={billChoice === 'both' ? colors.green : colors.textSecondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={fs.billSvcName}>Both Services</Text>
              <Text style={fs.billSvcAmt}>Rs.{bothBillAmt.toLocaleString('en-IN')}</Text>
              <Text style={fs.billSvcBreak}>TV Rs.{tvBillAmt} + Internet Rs.{netBillAmt}</Text>
            </View>
            <View style={[fs.radioOuter, billChoice === 'both' && { borderColor: colors.green }]}>
              {billChoice === 'both' && <View style={[fs.radioInner, { backgroundColor: colors.green }]} />}
            </View>
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={fs.actionsRow}>
          <TouchableOpacity style={fs.btnCancel} onPress={() => handleConfirmBill(false)} disabled={saving}>
            <Text style={fs.btnCancelText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[fs.btnSave, (!billChoice || saving) && { opacity: 0.5 }]}
            onPress={() => handleConfirmBill(true)}
            disabled={!billChoice || saving}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="document-text" size={16} color="#fff" />
                <Text style={fs.btnSaveText}>Generate Bill</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Step 1: Customer Details */}
      <FormInput
        label="Full Name *"
        icon={<Ionicons name="person" size={14} color={colors.textSecondary} />}
        placeholder="Enter full name"
        value={formData.name}
        onChangeText={(t) => setFormData({ ...formData, name: t })}
      />
      <FormInput
        label="Phone Number *"
        icon={<Ionicons name="call" size={14} color={colors.textSecondary} />}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
        value={formData.phone}
        onChangeText={(t) => setFormData({ ...formData, phone: t })}
      />
      <FormInput
        label="Address *"
        icon={<Ionicons name="location" size={14} color={colors.textSecondary} />}
        placeholder="Enter full address"
        multiline
        numberOfLines={3}
        value={formData.address}
        onChangeText={(t) => setFormData({ ...formData, address: t })}
      />

      {/* Services */}
      <Text style={fs.sectionLabel}>Services *</Text>
      <View style={fs.serviceRow}>
        <TouchableOpacity
          style={[fs.serviceBtn, hasTv && fs.serviceBtnActiveTv]}
          onPress={() => setTV(!hasTv)}
        >
          <Ionicons name="tv" size={22} color={hasTv ? colors.purple : colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={[fs.serviceName, hasTv && { color: colors.purple }]}>Cable TV</Text>
            <Text style={fs.serviceRate}>Rs.{formData.services.tv.monthlyRate || 300}/mo</Text>
          </View>
          <View style={[fs.checkCircle, hasTv && { backgroundColor: colors.purple, borderColor: colors.purple }]}>
            {hasTv && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[fs.serviceBtn, hasNet && fs.serviceBtnActiveNet]}
          onPress={() => setNet(!hasNet)}
        >
          <Ionicons name="wifi" size={22} color={hasNet ? colors.cyan : colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={[fs.serviceName, hasNet && { color: colors.cyan }]}>Internet</Text>
            <Text style={fs.serviceRate}>{hasNet && formData.services.internet.speed ? `${formData.services.internet.speed} Mbps` : 'Select plan'}</Text>
          </View>
          <View style={[fs.checkCircle, hasNet && { backgroundColor: colors.cyan, borderColor: colors.cyan }]}>
            {hasNet && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>
      </View>

      {/* TV Fields */}
      {hasTv && (
        <View style={fs.subFields}>
          <FormInput
            label="Box Number (optional)"
            icon={<Ionicons name="cube" size={14} color={colors.textSecondary} />}
            placeholder="Set-top box number"
            value={formData.boxNumber}
            onChangeText={(t) => setFormData({ ...formData, boxNumber: t })}
          />
          <View style={fs.feeRow}>
            <FormInput
              label="TV Monthly Rate"
              placeholder="300"
              keyboardType="numeric"
              value={String(formData.services.tv.monthlyRate || '')}
              onChangeText={(t) => updateTV('monthlyRate', t === '' ? '' : Number(t))}
              style={{ flex: 1 }}
            />
            <FormInput
              label="Installation Fee"
              placeholder="0"
              keyboardType="numeric"
              value={String(formData.services.tv.installationFee || '')}
              onChangeText={(t) => updateTV('installationFee', t === '' ? '' : Number(t))}
              style={{ flex: 1 }}
            />
          </View>

          {/* Annual subscription toggle */}
          <TouchableOpacity
            style={fs.annualRow}
            onPress={() => updateTV('annualSubscription', !formData.services.tv.annualSubscription)}
            activeOpacity={0.7}
          >
            <Switch
              value={!!formData.services.tv.annualSubscription}
              onValueChange={(v) => updateTV('annualSubscription', v)}
              trackColor={{ false: colors.border, true: 'rgba(168,85,247,0.5)' }}
              thumbColor={formData.services.tv.annualSubscription ? colors.purple : colors.textSecondary}
            />
            <View style={{ marginLeft: 10 }}>
              <Text style={fs.annualText}>Annual Subscriber</Text>
              <Text style={fs.annualNote}>Pays once a year</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Internet Fields */}
      {hasNet && (
        <View style={fs.subFields}>
          {/* Speed picker */}
          <Text style={fs.fieldLabel}>Speed *</Text>
          <TouchableOpacity style={fs.pickerBtn} onPress={() => setSpeedOpen(!speedOpen)}>
            <Text style={fs.pickerText}>{formData.services.internet.speed} Mbps</Text>
            <Ionicons name={speedOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {speedOpen && (
            <View style={fs.pickerDropdown}>
              {SPEEDS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[fs.pickerOption, formData.services.internet.speed === s && fs.pickerOptionActive]}
                  onPress={() => { updateNet('speed', s); setSpeedOpen(false); }}
                >
                  <Text style={[fs.pickerOptionText, formData.services.internet.speed === s && { color: colors.cyan }]}>{s} Mbps</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Validity picker */}
          <Text style={[fs.fieldLabel, { marginTop: 14 }]}>Validity *</Text>
          <TouchableOpacity style={fs.pickerBtn} onPress={() => setValidityOpen(!validityOpen)}>
            <Text style={fs.pickerText}>{VALIDITIES.find((v) => v.value === formData.services.internet.validity)?.label}</Text>
            <Ionicons name={validityOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {validityOpen && (
            <View style={fs.pickerDropdown}>
              {VALIDITIES.map((v) => (
                <TouchableOpacity
                  key={v.value}
                  style={[fs.pickerOption, formData.services.internet.validity === v.value && fs.pickerOptionActive]}
                  onPress={() => { updateNet('validity', v.value); setValidityOpen(false); }}
                >
                  <Text style={[fs.pickerOptionText, formData.services.internet.validity === v.value && { color: colors.cyan }]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[fs.feeRow, { marginTop: 14 }]}>
            <FormInput
              label="Plan Rate *"
              placeholder="Total plan price"
              keyboardType="numeric"
              value={String(formData.services.internet.monthlyRate || '')}
              onChangeText={(t) => updateNet('monthlyRate', t === '' ? '' : Number(t))}
              style={{ flex: 1 }}
            />
            <FormInput
              label="Installation Fee"
              placeholder="0"
              keyboardType="numeric"
              value={String(formData.services.internet.installationFee || '')}
              onChangeText={(t) => updateNet('installationFee', t === '' ? '' : Number(t))}
              style={{ flex: 1 }}
            />
          </View>

          <FormInput
            label="Subscribed Date"
            placeholder="YYYY-MM-DD"
            value={formData.services.internet.subscribedDate || ''}
            onChangeText={(t) => updateNet('subscribedDate', t)}
          />

          {/* Plan preview */}
          <View style={fs.planPreview}>
            <View style={fs.planBadge}><Text style={fs.planBadgeText}>{formData.services.internet.speed} Mbps</Text></View>
            <View style={[fs.planBadge, { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }]}>
              <Text style={[fs.planBadgeText, { color: colors.accent }]}>
                {VALIDITIES.find((v) => v.value === formData.services.internet.validity)?.label}
              </Text>
            </View>
            {formData.services.internet.monthlyRate ? (
              <Text style={fs.planRate}>Rs.{formData.services.internet.monthlyRate}/plan</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={fs.actionsRow}>
        <TouchableOpacity style={fs.btnCancel} onPress={onClose}>
          <Text style={fs.btnCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={fs.btnSave} onPress={handleNext}>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
          <Text style={fs.btnSaveText}>{editingCustomer ? 'Save Changes' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ─── Main Customers Screen ─── */
const CustomersScreen = ({ navigation }) => {
  const { customers, bills, addCustomer, addBill } = useData();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // Stats
  const totalTV = customers.filter((c) => c.services?.tv?.active).length;
  const totalInternet = customers.filter((c) => c.services?.internet?.active).length;
  const totalAnnual = customers.filter((c) => c.services?.tv?.annualSubscription).length;

  // Filtered list
  const filtered = useMemo(() => {
    let list = customers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.address || '').toLowerCase().includes(q) ||
          (c.boxNumber || '').includes(q)
      );
    }
    if (filter === 'TV') list = list.filter((c) => c.services?.tv?.active);
    else if (filter === 'Internet') list = list.filter((c) => c.services?.internet?.active);
    else if (filter === 'Annual') list = list.filter((c) => !!c.services?.tv?.annualSubscription);
    return list;
  }, [customers, search, filter]);

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  // Customer total due
  const getDue = useCallback(
    (custId) => bills.filter((b) => b.customerId === custId).reduce((s, b) => s + (b.balance || 0), 0),
    [bills]
  );

  const handleSave = async (formData, billSpec) => {
    const newId = await addCustomer(formData);
    if (billSpec) {
      await addBill({ ...billSpec, customerId: newId });
    }
    setShowForm(false);
  };

  const handleStatPress = (f) => {
    setFilter(f);
    setPage(1);
  };

  const renderCustomer = ({ item: c }) => {
    const due = getDue(c.id);
    return (
      <TouchableOpacity
        style={styles.custRow}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CustomerProfile', { customerId: c.id })}
      >
        <Avatar name={c.name} id={c.id} />
        <View style={styles.custInfo}>
          <Text style={styles.custName} numberOfLines={1}>{c.name}</Text>
          {c.address ? <Text style={styles.custAddr} numberOfLines={1}>{c.address}</Text> : null}
          <View style={styles.custMeta}>
            <Ionicons name="call-outline" size={11} color={colors.textSecondary} />
            <Text style={styles.custPhone}>{c.phone || '---'}</Text>
            {c.boxNumber ? (
              <>
                <Text style={styles.custDot}> . </Text>
                <Ionicons name="cube-outline" size={11} color={colors.textSecondary} />
                <Text style={styles.custPhone}>{c.boxNumber}</Text>
              </>
            ) : null}
          </View>
          <View style={styles.badgeRow}>
            {c.services?.tv?.active && <ServiceBadge type="tv" />}
            {c.services?.internet?.active && <ServiceBadge type="internet" />}
          </View>
        </View>
        <View style={styles.custRight}>
          {due > 0 ? (
            <Text style={styles.dueRed}>Rs.{due.toLocaleString('en-IN')}</Text>
          ) : (
            <View style={styles.clearBadge}>
              <Text style={styles.clearText}>Clear</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Stat cards 2x2 */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="All Customers"
            value={customers.length}
            icon={<Ionicons name="people" size={20} color={colors.accent} />}
            color={colors.accent}
            onPress={() => handleStatPress('All')}
          />
          <StatCard
            title="Cable TV"
            value={totalTV}
            icon={<Ionicons name="tv" size={20} color={colors.purple} />}
            color={colors.purple}
            onPress={() => handleStatPress('TV')}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="Internet"
            value={totalInternet}
            icon={<Ionicons name="wifi" size={20} color={colors.cyan} />}
            color={colors.cyan}
            onPress={() => handleStatPress('Internet')}
          />
          <StatCard
            title="Annual TV"
            value={totalAnnual}
            icon={<Ionicons name="calendar" size={20} color={colors.yellow} />}
            color={colors.yellow}
            onPress={() => handleStatPress('Annual')}
          />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, phone, address, box#..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1); }}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => { setFilter(f); setPage(1); }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countText}>{filtered.length} found</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add Customer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={paged}
        keyExtractor={(c) => c.id}
        renderItem={renderCustomer}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasMore) setPage((p) => p + 1); }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        }
      />

      {/* Add Customer Bottom Sheet */}
      <BottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="New Customer"
        subtitle="Fill in the details below"
        icon="person-add"
        iconColor={colors.accent}
      >
        <CustomerForm onClose={() => setShowForm(false)} onSave={handleSave} />
      </BottomSheet>
    </View>
  );
};

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  addBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  listContent: {
    paddingBottom: 40,
  },
  statsGrid: {
    padding: 16,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    padding: 0,
  },

  /* Filters */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: 'rgba(99,102,241,0.4)',
  },
  filterText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filterTextActive: {
    color: colors.accent,
  },
  countText: {
    marginLeft: 'auto',
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  /* Customer Row */
  custRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: fontWeight.bold,
  },
  custInfo: {
    flex: 1,
    gap: 3,
  },
  custName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  custAddr: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  custMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  custPhone: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  custDot: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  custRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  dueRed: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.red,
  },
  clearBadge: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  clearText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.green,
    textTransform: 'uppercase',
  },

  /* Empty */
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

/* ─── Form Styles ─── */
const fs = StyleSheet.create({
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  serviceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  serviceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  serviceBtnActiveTv: {
    borderColor: colors.purple,
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  serviceBtnActiveNet: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(6,182,212,0.08)',
  },
  serviceName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  serviceRate: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subFields: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 16,
  },
  feeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  annualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(168,85,247,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  annualText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  annualNote: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  pickerDropdown: {
    backgroundColor: colors.bgCardLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginTop: 4,
    maxHeight: 180,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(6,182,212,0.1)',
  },
  pickerOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  planPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(6,182,212,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.2)',
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  planBadge: {
    backgroundColor: 'rgba(6,182,212,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.3)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.cyan,
  },
  planRate: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginLeft: 'auto',
  },

  /* Bill step */
  billHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    borderRadius: borderRadius.lg,
    marginBottom: 16,
  },
  billTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
  },
  billSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  billSvcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 8,
  },
  billSvcActiveTv: {
    borderColor: colors.purple,
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  billSvcActiveNet: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(6,182,212,0.08)',
  },
  billSvcActiveBoth: {
    borderColor: colors.green,
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  billSvcName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  billSvcAmt: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  billSvcBreak: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  /* Actions */
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  btnSave: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
  },
  btnSaveText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
});

export default CustomersScreen;
