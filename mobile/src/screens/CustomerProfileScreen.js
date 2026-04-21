import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import StatCard from '../components/StatCard';
import { StatusBadge, ServiceBadge } from '../components/StatusBadge';
import BottomSheet from '../components/BottomSheet';
import FormInput from '../components/FormInput';

const VALIDITY_LABELS = { '1month': '1 Month', '3months': '3 Months', '6months': '6 Months', '1year': '1 Year' };

const AVATAR_GRADIENTS = [
  '#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b',
];

const getInitials = (name) =>
  (name || '').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

const formatDate = (d) => {
  if (!d) return '---';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatCurrency = (n) => `Rs.${(n || 0).toLocaleString('en-IN')}`;

/* ─── Edit Customer Form (inline) ─── */
const EditCustomerForm = ({ customer, onClose, onSave }) => {
  const SPEEDS = [10, 20, 30, 40, 50, 60, 70, 75, 100, 150, 200];
  const VALIDITIES = [
    { value: '1month', label: '1 Month' },
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: '1year', label: '1 Year' },
  ];
  const today = new Date().toISOString().split('T')[0];
  const [saving, setSaving] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [validityOpen, setValidityOpen] = useState(false);

  const s = customer.services || {};
  const fallbackDate = customer.createdAt ? new Date(customer.createdAt).toISOString().split('T')[0] : today;

  const [formData, setFormData] = useState({
    name: customer.name || '',
    phone: customer.phone || '',
    address: customer.address || '',
    boxNumber: customer.boxNumber || '',
    services: {
      tv: { active: false, monthlyRate: 300, installationFee: 0, annualSubscription: false, ...s.tv },
      internet: { active: false, speed: 50, validity: '1month', monthlyRate: '', installationFee: 0, subscribedDate: fallbackDate, ...s.internet },
    },
  });

  const hasTv = formData.services.tv.active;
  const hasNet = formData.services.internet.active;

  const setTV = (val) => setFormData((f) => ({ ...f, services: { ...f.services, tv: { ...f.services.tv, active: val } } }));
  const setNet = (val) => setFormData((f) => ({ ...f, services: { ...f.services, internet: { ...f.services.internet, active: val } } }));
  const updateTV = (field, val) => setFormData((f) => ({ ...f, services: { ...f.services, tv: { ...f.services.tv, [field]: val } } }));
  const updateNet = (field, val) => setFormData((f) => ({ ...f, services: { ...f.services, internet: { ...f.services.internet, [field]: val } } }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <View>
      <FormInput
        label="Full Name"
        icon={<Ionicons name="person" size={14} color={colors.textSecondary} />}
        placeholder="Enter full name"
        value={formData.name}
        onChangeText={(t) => setFormData({ ...formData, name: t })}
      />
      <FormInput
        label="Phone Number"
        icon={<Ionicons name="call" size={14} color={colors.textSecondary} />}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
        value={formData.phone}
        onChangeText={(t) => setFormData({ ...formData, phone: t })}
      />
      <FormInput
        label="Address"
        icon={<Ionicons name="location" size={14} color={colors.textSecondary} />}
        placeholder="Enter address"
        multiline
        value={formData.address}
        onChangeText={(t) => setFormData({ ...formData, address: t })}
      />
      <FormInput
        label="Box Number"
        icon={<Ionicons name="cube" size={14} color={colors.textSecondary} />}
        placeholder="Box number"
        value={formData.boxNumber}
        onChangeText={(t) => setFormData({ ...formData, boxNumber: t })}
      />

      {/* Service toggles */}
      <Text style={efs.sectionLabel}>Services</Text>
      <View style={efs.svcRow}>
        <TouchableOpacity
          style={[efs.svcBtn, hasTv && efs.svcBtnTv]}
          onPress={() => setTV(!hasTv)}
        >
          <Ionicons name="tv" size={18} color={hasTv ? colors.purple : colors.textSecondary} />
          <Text style={[efs.svcText, hasTv && { color: colors.purple }]}>TV</Text>
          <View style={[efs.check, hasTv && { backgroundColor: colors.purple, borderColor: colors.purple }]}>
            {hasTv && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[efs.svcBtn, hasNet && efs.svcBtnNet]}
          onPress={() => setNet(!hasNet)}
        >
          <Ionicons name="wifi" size={18} color={hasNet ? colors.cyan : colors.textSecondary} />
          <Text style={[efs.svcText, hasNet && { color: colors.cyan }]}>Internet</Text>
          <View style={[efs.check, hasNet && { backgroundColor: colors.cyan, borderColor: colors.cyan }]}>
            {hasNet && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
        </TouchableOpacity>
      </View>

      {hasTv && (
        <View style={efs.subBlock}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <FormInput label="TV Rate" placeholder="300" keyboardType="numeric"
              value={String(formData.services.tv.monthlyRate || '')}
              onChangeText={(t) => updateTV('monthlyRate', t === '' ? '' : Number(t))}
              style={{ flex: 1 }}
            />
            <FormInput label="Install Fee" placeholder="0" keyboardType="numeric"
              value={String(formData.services.tv.installationFee || '')}
              onChangeText={(t) => updateTV('installationFee', t === '' ? '' : Number(t))}
              style={{ flex: 1 }}
            />
          </View>
          <TouchableOpacity style={efs.annualRow}
            onPress={() => updateTV('annualSubscription', !formData.services.tv.annualSubscription)}>
            <View style={[efs.check, formData.services.tv.annualSubscription && { backgroundColor: colors.purple, borderColor: colors.purple }]}>
              {formData.services.tv.annualSubscription && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={efs.annualText}>Annual Subscriber</Text>
          </TouchableOpacity>
        </View>
      )}

      {hasNet && (
        <View style={efs.subBlock}>
          <Text style={efs.fieldLabel}>Speed</Text>
          <TouchableOpacity style={efs.picker} onPress={() => setSpeedOpen(!speedOpen)}>
            <Text style={efs.pickerVal}>{formData.services.internet.speed} Mbps</Text>
            <Ionicons name={speedOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          {speedOpen && (
            <View style={efs.dropdown}>
              {SPEEDS.map((sp) => (
                <TouchableOpacity key={sp} style={efs.dropItem} onPress={() => { updateNet('speed', sp); setSpeedOpen(false); }}>
                  <Text style={[efs.dropText, formData.services.internet.speed === sp && { color: colors.cyan }]}>{sp} Mbps</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[efs.fieldLabel, { marginTop: 10 }]}>Validity</Text>
          <TouchableOpacity style={efs.picker} onPress={() => setValidityOpen(!validityOpen)}>
            <Text style={efs.pickerVal}>{VALIDITIES.find((v) => v.value === formData.services.internet.validity)?.label}</Text>
            <Ionicons name={validityOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          {validityOpen && (
            <View style={efs.dropdown}>
              {VALIDITIES.map((v) => (
                <TouchableOpacity key={v.value} style={efs.dropItem} onPress={() => { updateNet('validity', v.value); setValidityOpen(false); }}>
                  <Text style={[efs.dropText, formData.services.internet.validity === v.value && { color: colors.cyan }]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <FormInput label="Plan Rate" placeholder="0" keyboardType="numeric"
              value={String(formData.services.internet.monthlyRate || '')}
              onChangeText={(t) => updateNet('monthlyRate', t === '' ? '' : Number(t))}
              style={{ flex: 1 }}
            />
            <FormInput label="Install Fee" placeholder="0" keyboardType="numeric"
              value={String(formData.services.internet.installationFee || '')}
              onChangeText={(t) => updateNet('installationFee', t === '' ? '' : Number(t))}
              style={{ flex: 1 }}
            />
          </View>
          <FormInput label="Subscribed Date" placeholder="YYYY-MM-DD"
            value={formData.services.internet.subscribedDate || ''}
            onChangeText={(t) => updateNet('subscribedDate', t)}
          />
        </View>
      )}

      <View style={efs.actions}>
        <TouchableOpacity style={efs.cancelBtn} onPress={onClose}>
          <Text style={efs.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[efs.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={efs.saveText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const efs = StyleSheet.create({
  sectionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  svcRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  svcBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 2, borderColor: colors.border, borderRadius: borderRadius.md, backgroundColor: 'rgba(255,255,255,0.03)' },
  svcBtnTv: { borderColor: colors.purple, backgroundColor: 'rgba(168,85,247,0.08)' },
  svcBtnNet: { borderColor: colors.cyan, backgroundColor: 'rgba(6,182,212,0.08)' },
  svcText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary, flex: 1 },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  subBlock: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: 12, marginBottom: 14 },
  annualRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: 'rgba(168,85,247,0.06)', borderRadius: borderRadius.sm, marginTop: 6 },
  annualText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: 6 },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: 12, paddingVertical: 10 },
  pickerVal: { fontSize: fontSize.md, color: colors.textPrimary },
  dropdown: { backgroundColor: colors.bgCardLight, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, marginTop: 4, maxHeight: 160 },
  dropItem: { paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropText: { fontSize: fontSize.md, color: colors.textPrimary },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 13, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, alignItems: 'center' },
  cancelText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, backgroundColor: colors.accent, borderRadius: borderRadius.md },
  saveText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#fff' },
});

/* ─── Main Screen ─── */
const CustomerProfileScreen = ({ route, navigation }) => {
  const { customerId } = route.params;
  const { customers, bills, complaints, updateCustomer, addBill } = useData();

  const customer = customers.find((c) => c.id === customerId);
  const customerBills = useMemo(() => bills.filter((b) => b.customerId === customerId), [bills, customerId]);
  const customerComplaints = useMemo(() => complaints.filter((c) => c.customerId === customerId), [complaints, customerId]);

  const [editOpen, setEditOpen] = useState(false);
  const [complaintsOpen, setComplaintsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Calculations
  const totalBilled = customerBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalPaid = customerBills.reduce((s, b) => s + (b.amountPaid || 0), 0);
  const totalOutstanding = customerBills.reduce((s, b) => s + (b.balance || 0), 0);

  const tvOutstanding = customerBills
    .filter((b) => b.balance > 0 && (b.serviceType === 'tv' || b.serviceType === 'both'))
    .reduce((s, b) => {
      if (b.serviceType === 'tv') return s + b.balance;
      const ratio = b.totalAmount > 0 ? (b.tvAmount || 0) / b.totalAmount : 0.5;
      return s + b.balance * ratio;
    }, 0);

  const internetOutstanding = customerBills
    .filter((b) => b.balance > 0 && (b.serviceType === 'internet' || b.serviceType === 'both'))
    .reduce((s, b) => {
      if (b.serviceType === 'internet') return s + b.balance;
      const ratio = b.totalAmount > 0 ? (b.internetAmount || 0) / b.totalAmount : 0.5;
      return s + b.balance * ratio;
    }, 0);

  const handleEditSave = async (formData) => {
    await updateCustomer(customerId, formData);
    setEditOpen(false);
  };

  if (!customer) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.notFoundText}>Customer not found</Text>
          <TouchableOpacity style={styles.backBtnAlt} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnAltText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const initials = getInitials(customer.name);
  const tv = customer.services?.tv;
  const internet = customer.services?.internet;
  const avatarColor = AVATAR_GRADIENTS[(parseInt(customerId, 10) || 0) % 5];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.heroBody}>
            <View style={[styles.heroAvatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.heroAvatarText}>{initials}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{customer.name}</Text>
              <View style={styles.heroMeta}>
                <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.heroMetaText}>{customer.phone || '---'}</Text>
              </View>
              {customer.address ? (
                <View style={styles.heroMeta}>
                  <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.heroMetaText} numberOfLines={2}>{customer.address}</Text>
                </View>
              ) : null}
              <View style={styles.heroBadges}>
                <StatusBadge status="Active" />
                {tv?.active && <ServiceBadge type="tv" />}
                {internet?.active && <ServiceBadge type="internet" />}
              </View>
            </View>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionEdit]} onPress={() => setEditOpen(true)}>
            <Ionicons name="pencil" size={16} color={colors.accent} />
            <Text style={[styles.actionText, { color: colors.accent }]}>Edit</Text>
          </TouchableOpacity>

          {totalOutstanding > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPay]}
              onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome', params: { customerId } })}
            >
              <Ionicons name="card" size={16} color={colors.green} />
              <Text style={[styles.actionText, { color: colors.green }]}>Pay Bill</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionGenerate]}
            onPress={() => navigation.navigate('Billing', { screen: 'BillingHome', params: { customerId } })}
          >
            <Ionicons name="receipt" size={16} color={colors.yellow} />
            <Text style={[styles.actionText, { color: colors.yellow }]}>Generate Bill</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Row (horizontal scroll) ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatLabel}>Total Billed</Text>
            <Text style={styles.miniStatValue}>{formatCurrency(totalBilled)}</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatLabel}>Total Paid</Text>
            <Text style={[styles.miniStatValue, { color: colors.green }]}>{formatCurrency(totalPaid)}</Text>
          </View>
          <View style={[styles.miniStat, { borderColor: 'rgba(168,85,247,0.25)' }]}>
            <Text style={[styles.miniStatLabel, { color: colors.purple }]}>TV Due</Text>
            <Text style={[styles.miniStatValue, { color: colors.purple }]}>{formatCurrency(Math.round(tvOutstanding))}</Text>
          </View>
          <View style={[styles.miniStat, { borderColor: 'rgba(6,182,212,0.25)' }]}>
            <Text style={[styles.miniStatLabel, { color: colors.cyan }]}>Internet Due</Text>
            <Text style={[styles.miniStatValue, { color: colors.cyan }]}>{formatCurrency(Math.round(internetOutstanding))}</Text>
          </View>
          <View style={[styles.miniStat, { borderColor: totalOutstanding > 0 ? 'rgba(248,113,113,0.25)' : 'rgba(16,185,129,0.25)' }]}>
            <Text style={[styles.miniStatLabel, { color: totalOutstanding > 0 ? colors.red : colors.green }]}>Outstanding</Text>
            <Text style={[styles.miniStatValue, { color: totalOutstanding > 0 ? colors.red : colors.green }]}>{formatCurrency(totalOutstanding)}</Text>
          </View>
        </ScrollView>

        {/* ── Info Cards ── */}
        <View style={styles.infoSection}>
          {/* Contact Details */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="person-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.infoCardTitle}>Contact Details</Text>
            </View>
            <InfoRow icon="call-outline" label="Phone" value={customer.phone || '---'} />
            <InfoRow icon="location-outline" label="Address" value={customer.address || '---'} />
            <InfoRow icon="cube-outline" label="Box #" value={customer.boxNumber || '---'} />
            <InfoRow icon="calendar-outline" label="Created" value={formatDate(customer.createdAt)} />
          </View>

          {/* TV Service Card */}
          {tv?.active && (
            <View style={[styles.infoCard, { borderColor: 'rgba(168,85,247,0.2)' }]}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="tv" size={18} color={colors.purple} />
                <Text style={[styles.infoCardTitle, { color: colors.purple }]}>TV Service</Text>
                {tv.annualSubscription && (
                  <View style={styles.annualTag}>
                    <Text style={styles.annualTagText}>Annual</Text>
                  </View>
                )}
              </View>
              <InfoRow icon="cube-outline" label="Box #" value={customer.boxNumber || '---'} tint={colors.purple} />
              <InfoRow icon="cash-outline" label={tv.annualSubscription ? 'Annual Rate' : 'Monthly Rate'}
                value={`Rs.${tv.monthlyRate || 0}`} tint={colors.purple} />
              {tv.installationFee > 0 && (
                <InfoRow icon="construct-outline" label="Installation" value={`Rs.${tv.installationFee}`} tint={colors.purple} />
              )}
            </View>
          )}

          {/* Internet Plan Card */}
          {internet?.active && (
            <View style={[styles.infoCard, { borderColor: 'rgba(6,182,212,0.2)' }]}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="wifi" size={18} color={colors.cyan} />
                <Text style={[styles.infoCardTitle, { color: colors.cyan }]}>Internet Plan</Text>
              </View>
              <InfoRow icon="speedometer-outline" label="Speed" value={`${internet.speed || 0} Mbps`} tint={colors.cyan} />
              <InfoRow icon="time-outline" label="Validity" value={VALIDITY_LABELS[internet.validity] || internet.validity || '---'} tint={colors.cyan} />
              <InfoRow icon="cash-outline" label="Monthly Rate" value={`Rs.${internet.monthlyRate || 0}`} tint={colors.cyan} />
              {internet.installationFee > 0 && (
                <InfoRow icon="construct-outline" label="Installation" value={`Rs.${internet.installationFee}`} tint={colors.cyan} />
              )}
              <InfoRow icon="calendar-outline" label="Subscribed" value={formatDate(internet.subscribedDate)} tint={colors.cyan} />
            </View>
          )}
        </View>

        {/* ── Complaints Section (collapsible) ── */}
        <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setComplaintsOpen(!complaintsOpen)}>
          <View style={styles.collapsibleLeft}>
            <Ionicons name="warning-outline" size={18} color={colors.yellow} />
            <Text style={styles.collapsibleTitle}>Complaints</Text>
            {customerComplaints.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{customerComplaints.length}</Text>
              </View>
            )}
          </View>
          <Ionicons name={complaintsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {complaintsOpen && (
          <View style={styles.collapsibleBody}>
            {customerComplaints.length === 0 ? (
              <Text style={styles.emptyHint}>No complaints recorded</Text>
            ) : (
              customerComplaints.map((comp) => (
                <View key={comp.id} style={styles.complaintRow}>
                  <View style={styles.complaintDot}>
                    <View style={[styles.dot, {
                      backgroundColor: comp.status === 'Completed' ? colors.green
                        : comp.status === 'In Progress' ? colors.accent
                        : colors.yellow
                    }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.complaintDesc} numberOfLines={2}>{comp.description || comp.title || '---'}</Text>
                    <View style={styles.complaintMeta}>
                      <Text style={styles.complaintDate}>{formatDate(comp.createdAt)}</Text>
                      {comp.serviceType && (
                        <ServiceBadge type={comp.serviceType} />
                      )}
                    </View>
                  </View>
                  <StatusBadge status={comp.status || 'Pending'} />
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Billing & Payment History (collapsible) ── */}
        <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setHistoryOpen(!historyOpen)}>
          <View style={styles.collapsibleLeft}>
            <Ionicons name="receipt-outline" size={18} color={colors.accent} />
            <Text style={styles.collapsibleTitle}>Billing & Payment History</Text>
            {customerBills.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{customerBills.length}</Text>
              </View>
            )}
          </View>
          <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {historyOpen && (
          <View style={styles.collapsibleBody}>
            {customerBills.length === 0 ? (
              <Text style={styles.emptyHint}>No bills yet</Text>
            ) : (
              [...customerBills]
                .sort((a, b) => new Date(b.createdAt || b.generatedDate) - new Date(a.createdAt || a.generatedDate))
                .map((bill) => (
                  <View key={bill.id} style={styles.billRow}>
                    <View style={styles.billLeft}>
                      <View style={styles.billIconWrap}>
                        <Ionicons
                          name={bill.serviceType === 'tv' ? 'tv' : bill.serviceType === 'internet' ? 'wifi' : 'receipt'}
                          size={16}
                          color={bill.serviceType === 'tv' ? colors.purple : bill.serviceType === 'internet' ? colors.cyan : colors.accent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.billService}>
                          {bill.serviceType === 'tv' ? 'Cable TV' : bill.serviceType === 'internet' ? 'Internet' : bill.serviceType === 'both' ? 'TV + Internet' : 'Bill'}
                        </Text>
                        <Text style={styles.billDate}>{formatDate(bill.generatedDate || bill.createdAt)}</Text>
                        {/* Payments under this bill */}
                        {bill.payments && bill.payments.length > 0 && (
                          <View style={styles.paymentsList}>
                            {bill.payments.map((p, idx) => (
                              <View key={idx} style={styles.paymentEntry}>
                                <Ionicons name="checkmark-circle" size={12} color={colors.green} />
                                <Text style={styles.paymentText}>
                                  {formatCurrency(p.amount)} via {p.mode || '---'} on {formatDate(p.date || p.paidAt)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.billRight}>
                      <Text style={styles.billTotal}>{formatCurrency(bill.totalAmount)}</Text>
                      <StatusBadge status={bill.balance > 0 ? 'Due' : 'Paid'} />
                      {bill.balance > 0 && (
                        <Text style={styles.billBalance}>Bal: {formatCurrency(bill.balance)}</Text>
                      )}
                    </View>
                  </View>
                ))
            )}
          </View>
        )}

      </ScrollView>

      {/* Edit Bottom Sheet */}
      <BottomSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Customer"
        subtitle="Update customer details"
        icon="pencil"
        iconColor={colors.accent}
      >
        <EditCustomerForm customer={customer} onClose={() => setEditOpen(false)} onSave={handleEditSave} />
      </BottomSheet>
    </View>
  );
};

/* ─── Info Row component ─── */
const InfoRow = ({ icon, label, value, tint }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={14} color={tint || colors.textSecondary} style={{ marginTop: 2 }} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  backBtnAlt: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    marginTop: 8,
  },
  backBtnAltText: {
    color: '#fff',
    fontWeight: fontWeight.bold,
  },

  /* Hero */
  heroCard: {
    backgroundColor: colors.bgCard,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroBody: {
    flexDirection: 'row',
    gap: 16,
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },

  /* Actions Row */
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionEdit: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderColor: 'rgba(99,102,241,0.25)',
  },
  actionPay: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.25)',
  },
  actionGenerate: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  /* Stats horizontal scroll */
  statsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  miniStat: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    marginRight: 10,
  },
  miniStatLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  miniStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
  },

  /* Info Cards */
  infoSection: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 16,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  infoCardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  annualTag: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  annualTagText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.purple,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    marginTop: 1,
  },

  /* Collapsible */
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  collapsibleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsibleTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  collapsibleBody: {
    marginHorizontal: 16,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    padding: 14,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },

  /* Complaints */
  complaintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  complaintDot: {
    width: 20,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  complaintDesc: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  complaintMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  complaintDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  /* Bills */
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  billLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  billIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billService: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  billDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  billRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  billTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
  },
  billBalance: {
    fontSize: 10,
    color: colors.red,
    fontWeight: fontWeight.bold,
  },
  paymentsList: {
    marginTop: 6,
    gap: 4,
  },
  paymentEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentText: {
    fontSize: 10,
    color: colors.green,
    fontWeight: fontWeight.medium,
  },
});

export default CustomerProfileScreen;
