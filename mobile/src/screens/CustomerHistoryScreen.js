import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { colors, borderRadius, fontSize, fontWeight, spacing } from '../theme';
import { StatusBadge, ServiceBadge } from '../components/StatusBadge';

const CustomerHistoryScreen = () => {
  const { customers, bills } = useData();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.boxNumber || '').includes(q)
    ).slice(0, 20);
  }, [search, customers]);

  const customer = selectedId ? customers.find(c => c.id === selectedId) : null;

  const customerBills = useMemo(() => {
    if (!selectedId) return [];
    return [...bills]
      .filter(b => b.customerId === selectedId)
      .sort((a, b) => new Date(b.generatedDate || b.createdAt) - new Date(a.generatedDate || a.createdAt));
  }, [selectedId, bills]);

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const renderBillItem = ({ item: b }) => {
    const payments = b.payments || [];
    return (
      <View style={styles.billCard}>
        <View style={styles.billHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.billNum}>#{b.billNumber}</Text>
            <Text style={styles.billDate}>
              {b.generatedDate ? new Date(b.generatedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </Text>
          </View>
          <ServiceBadge type={b.serviceType} />
          <StatusBadge status={b.status} />
        </View>

        <View style={styles.billAmounts}>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountVal}>{fmt(b.totalAmount)}</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={[styles.amountVal, { color: colors.green }]}>{fmt(b.amountPaid)}</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Balance</Text>
            <Text style={[styles.amountVal, { color: b.balance > 0 ? colors.red : colors.green }]}>{fmt(b.balance)}</Text>
          </View>
        </View>

        {payments.length > 0 && (
          <View style={styles.paymentsList}>
            <Text style={styles.paymentsTitle}>Payments ({payments.length})</Text>
            {payments.map((p, i) => (
              <View key={p.id || i} style={styles.paymentRow}>
                <Text style={styles.paymentDate}>
                  {p.date ? new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                </Text>
                <Text style={styles.paymentAmt}>{fmt(p.amount)}</Text>
                <Text style={styles.paymentMode}>{p.mode || '—'}</Text>
                <Text style={styles.paymentBy}>{p.collectedByName || '—'}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (!selectedId) {
    return (
      <View style={styles.container}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer name, phone, box..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {!search.trim() ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>Customer History</Text>
            <Text style={styles.emptySub}>Search for a customer to view their billing history</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptySub}>No customers found</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={c => c.id}
            renderItem={({ item: c }) => {
              const due = bills.filter(b => b.customerId === c.id).reduce((s, b) => s + (b.balance || 0), 0);
              return (
                <TouchableOpacity style={styles.custRow} onPress={() => { setSelectedId(c.id); setSearch(''); }}>
                  <View style={styles.custAvatar}>
                    <Text style={styles.custInitials}>
                      {(c.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.custName}>{c.name}</Text>
                    <Text style={styles.custMeta}>{c.phone}{c.boxNumber ? ` · Box ${c.boxNumber}` : ''}</Text>
                  </View>
                  {due > 0 && <Text style={styles.custDue}>{fmt(due)}</Text>}
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => setSelectedId(null)}>
        <Ionicons name="arrow-back" size={18} color={colors.accent} />
        <Text style={styles.backText}>Back to search</Text>
      </TouchableOpacity>

      {customer && (
        <View style={styles.heroCard}>
          <Text style={styles.heroName}>{customer.name}</Text>
          <Text style={styles.heroMeta}>{customer.phone}{customer.address ? ` · ${customer.address}` : ''}</Text>
          <Text style={styles.heroBills}>{customerBills.length} bill{customerBills.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      <FlatList
        data={customerBills}
        keyExtractor={b => b.id}
        renderItem={renderBillItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptySub}>No bills found for this customer</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark, padding: spacing.lg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: fontSize.md },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  emptySub: { fontSize: fontSize.md, color: colors.textSecondary },
  custRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: 14, marginBottom: 8,
  },
  custAvatar: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  custInitials: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  custName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  custMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  custDue: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, color: colors.red },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { fontSize: fontSize.md, color: colors.accent, fontWeight: fontWeight.semibold },
  heroCard: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg, padding: 16, marginBottom: 16,
  },
  heroName: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, color: colors.textPrimary },
  heroMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
  heroBills: { fontSize: fontSize.sm, color: colors.accent, fontWeight: fontWeight.bold, marginTop: 6 },
  billCard: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg, padding: 16, marginBottom: 12,
  },
  billHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  billNum: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  billDate: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  billAmounts: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  amountCol: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10 },
  amountLabel: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  amountVal: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, color: colors.textPrimary },
  paymentsList: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
  paymentsTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  paymentDate: { fontSize: fontSize.sm, color: colors.textSecondary, width: 60 },
  paymentAmt: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.green, width: 70 },
  paymentMode: { fontSize: fontSize.xs, color: colors.textSecondary, width: 60 },
  paymentBy: { fontSize: fontSize.xs, color: colors.textSecondary, flex: 1, textAlign: 'right' },
});

export default CustomerHistoryScreen;
