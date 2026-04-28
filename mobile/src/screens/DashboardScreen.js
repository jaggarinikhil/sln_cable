import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import StatCard from '../components/StatCard';
import { StatusBadge, PaymentBadge } from '../components/StatusBadge';

const screenWidth = Dimensions.get('window').width;

const fmt = (n) => {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toLocaleString('en-IN');
};
const fmtCurrency = (n) => `₹${fmt(n)}`;
const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const rgba = (c, a) => {
  const hex = c.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const initialsOf = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

// ─── Reusable bits ──────────────────────────────────────────────────────────

const Hero = ({ title, subtitle, accent = colors.accent }) => (
  <View style={[styles.hero, { borderColor: rgba(accent, 0.35), backgroundColor: rgba(accent, 0.08) }]}>
    <View style={[styles.heroBadge, { backgroundColor: rgba(accent, 0.2) }]}>
      <Ionicons name="tv-outline" size={18} color={accent} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.heroBrand}>SLN CABLE & NETWORKS</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

const SectionHeader = ({ icon, title, color = colors.accent, onViewAll }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionIcon, { backgroundColor: rgba(color, 0.15) }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {onViewAll ? (
      <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.viewAll}>View all ›</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const Avatar = ({ name, color = colors.accent }) => (
  <View style={[styles.avatar, { backgroundColor: rgba(color, 0.15), borderColor: rgba(color, 0.3) }]}>
    <Text style={[styles.avatarText, { color }]}>{initialsOf(name)}</Text>
  </View>
);

const EmptyState = ({ icon, label }) => (
  <View style={styles.empty}>
    <Ionicons name={icon} size={28} color={colors.textSecondary} style={{ opacity: 0.5 }} />
    <Text style={styles.emptyText}>{label}</Text>
  </View>
);

// ─── Owner Dashboard ────────────────────────────────────────────────────────

const OwnerDashboard = ({ customers, bills, complaints, navigation }) => {
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const { tvCollected, internetCollected } = useMemo(() => {
    let tv = 0;
    let internet = 0;
    bills.forEach((b) => {
      const monthPayments = (b.payments || []).filter((p) => p.date?.startsWith(currentYearMonth));
      if (monthPayments.length > 0) {
        const total = b.totalAmount || 1;
        const ratioTV = b.serviceType === 'tv' ? 1 : b.serviceType === 'both' ? ((b.tvAmount || 0) / total) : 0;
        const ratioNet = b.serviceType === 'internet' ? 1 : b.serviceType === 'both' ? ((b.internetAmount || 0) / total) : 0;
        const monthlyPaidAmt = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
        tv += ratioTV * monthlyPaidAmt;
        internet += ratioNet * monthlyPaidAmt;
      }
    });
    return { tvCollected: Math.round(tv), internetCollected: Math.round(internet) };
  }, [bills, currentYearMonth]);

  const totalCollected = tvCollected + internetCollected;
  const totalOutstanding = useMemo(() => bills.reduce((s, b) => s + (b.balance || 0), 0), [bills]);
  const activeComplaints = useMemo(() => complaints.filter((c) => c.status !== 'Completed'), [complaints]);
  const pendingBills = useMemo(
    () => bills.filter((b) => b.status === 'Due' || b.status === 'Partial').sort((a, b) => (b.balance || 0) - (a.balance || 0)),
    [bills],
  );
  const pendingBillsBalance = useMemo(() => pendingBills.reduce((s, b) => s + (b.balance || 0), 0), [pendingBills]);

  const paymentModeData = useMemo(() => {
    const modes = { Cash: 0, PhonePe: 0, GPay: 0 };
    bills.forEach((b) => {
      (b.payments || []).forEach((p) => {
        const m = (p.mode || '').toLowerCase();
        if (m === 'cash') modes.Cash += p.amount || 0;
        else if (m === 'phonepe') modes.PhonePe += p.amount || 0;
        else if (m === 'gpay') modes.GPay += p.amount || 0;
      });
    });
    return [
      { name: 'Cash', amount: modes.Cash, color: colors.green, legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: 'PhonePe', amount: modes.PhonePe, color: colors.accent, legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: 'GPay', amount: modes.GPay, color: colors.cyan, legendFontColor: colors.textSecondary, legendFontSize: 12 },
    ];
  }, [bills]);

  const revenueTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      months.push({ ym, label, tv: 0, internet: 0 });
    }
    bills.forEach((b) => {
      const total = b.totalAmount || 1;
      const ratioTV = b.serviceType === 'tv' ? 1 : b.serviceType === 'both' ? ((b.tvAmount || 0) / total) : 0;
      const ratioNet = b.serviceType === 'internet' ? 1 : b.serviceType === 'both' ? ((b.internetAmount || 0) / total) : 0;
      (b.payments || []).forEach((p) => {
        const entry = months.find((m) => p.date?.startsWith(m.ym));
        if (entry) {
          entry.tv += ratioTV * (p.amount || 0);
          entry.internet += ratioNet * (p.amount || 0);
        }
      });
    });
    return months;
  }, [bills]);

  const recentPayments = useMemo(() => {
    const all = bills.flatMap((b) =>
      (b.payments || []).map((p) => ({
        ...p,
        customerName: b.customerName || 'Unknown',
        customerId: b.customerId,
        billNumber: b.billNumber || b.id,
      })),
    );
    all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return all.slice(0, 10);
  }, [bills]);

  const recentComplaints = useMemo(
    () => [...activeComplaints].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10),
    [activeComplaints],
  );

  const chartConfig = {
    backgroundGradientFrom: colors.bgCard,
    backgroundGradientTo: colors.bgCard,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99,102,241,${opacity})`,
    labelColor: () => colors.textSecondary,
    propsForLabels: { fontSize: 10 },
    barPercentage: 0.5,
  };

  const hasPaymentData = paymentModeData.some((d) => d.amount > 0);
  const hasRevenueData = revenueTrend.some((m) => m.tv > 0 || m.internet > 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <Hero title="Dashboard" subtitle={monthLabel} />

      {/* Highlight collection card */}
      <View style={styles.highlight}>
        <View style={styles.highlightLeft}>
          <Text style={styles.highlightLabel}>COLLECTED THIS MONTH</Text>
          <Text style={styles.highlightValue}>{fmtCurrency(totalCollected)}</Text>
          <View style={styles.highlightSplit}>
            <View style={styles.highlightChip}>
              <View style={[styles.dot, { backgroundColor: colors.purple }]} />
              <Text style={styles.highlightChipText}>TV {fmtCurrency(tvCollected)}</Text>
            </View>
            <View style={styles.highlightChip}>
              <View style={[styles.dot, { backgroundColor: colors.cyan }]} />
              <Text style={styles.highlightChipText}>Net {fmtCurrency(internetCollected)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.highlightIcon}>
          <Ionicons name="trending-up" size={32} color={colors.green} />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statHalf}>
          <StatCard
            title="Total Outstanding"
            value={fmtCurrency(totalOutstanding)}
            icon={<Ionicons name="alert-circle-outline" size={20} color={colors.red} />}
            color={colors.red}
          />
        </View>
        <View style={styles.statHalf}>
          <StatCard
            title="Customers"
            value={customers.length.toString()}
            icon={<Ionicons name="people-outline" size={20} color={colors.blue} />}
            color={colors.blue}
            onPress={() => navigation.navigate('Customers', { screen: 'CustomersList' })}
          />
        </View>
        <View style={styles.statHalf}>
          <StatCard
            title="Active Complaints"
            value={activeComplaints.length.toString()}
            icon={<Ionicons name="warning-outline" size={20} color={colors.yellow} />}
            color={colors.yellow}
            onPress={() => navigation.navigate('More', { screen: 'Complaints' })}
          />
        </View>
        <View style={styles.statHalf}>
          <StatCard
            title="Pending Bills"
            value={pendingBills.length.toString()}
            subtext={fmtCurrency(pendingBillsBalance)}
            icon={<Ionicons name="receipt-outline" size={20} color={colors.pink} />}
            color={colors.pink}
            onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
          />
        </View>
      </View>

      {/* Payment Mode Pie Chart */}
      <View style={styles.card}>
        <SectionHeader icon="pie-chart-outline" title="Payment Modes" color={colors.accent} />
        {hasPaymentData ? (
          <PieChart
            data={paymentModeData.map((d) => ({ ...d, population: d.amount }))}
            width={screenWidth - 48}
            height={180}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="10"
            absolute
          />
        ) : (
          <EmptyState icon="pie-chart-outline" label="No payment data yet" />
        )}
      </View>

      {/* Revenue Trend */}
      <View style={styles.card}>
        <SectionHeader icon="bar-chart-outline" title="Revenue Trend (6M)" color={colors.purple} />
        {hasRevenueData ? (
          <>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: colors.purple }]} />
                <Text style={styles.legendText}>TV</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: colors.cyan }]} />
                <Text style={styles.legendText}>Internet</Text>
              </View>
              <Text style={styles.legendUnit}>(₹ in thousands)</Text>
            </View>
            <BarChart
              data={{
                labels: revenueTrend.map((m) => m.label),
                datasets: [
                  { data: revenueTrend.map((m) => Math.round(m.tv / 1000) || 0), color: () => colors.purple, strokeWidth: 2 },
                  { data: revenueTrend.map((m) => Math.round(m.internet / 1000) || 0), color: () => colors.cyan, strokeWidth: 2 },
                ],
              }}
              width={screenWidth - 48}
              height={200}
              chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(168,85,247,${opacity})` }}
              style={{ borderRadius: 12, marginLeft: -12 }}
              fromZero
              withInnerLines={false}
            />
          </>
        ) : (
          <EmptyState icon="bar-chart-outline" label="No revenue data yet" />
        )}
      </View>

      {/* Recent Payments — horizontal carousel */}
      <View style={styles.card}>
        <SectionHeader
          icon="cash-outline"
          title="Recent Payments"
          color={colors.green}
          onViewAll={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
        />
        {recentPayments.length === 0 ? (
          <EmptyState icon="cash-outline" label="No payments yet" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
            {recentPayments.map((p, i) => (
              <TouchableOpacity
                key={`${p.date}-${i}`}
                style={[styles.hCard, { borderLeftColor: colors.green }]}
                onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
                activeOpacity={0.8}
              >
                <View style={styles.hCardTop}>
                  <Avatar name={p.customerName} color={colors.green} />
                  <Text style={[styles.hCardAmount, { color: colors.green }]}>+{fmtCurrency(p.amount || 0)}</Text>
                </View>
                <Text style={styles.hCardName} numberOfLines={1}>{p.customerName}</Text>
                <View style={styles.hCardMeta}>
                  <PaymentBadge mode={p.mode} />
                  <Text style={styles.listMeta}>{formatDate(p.date)}</Text>
                </View>
                {p.collectedBy ? (
                  <Text style={styles.listMeta} numberOfLines={1}>by {p.collectedBy}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Active Complaints — horizontal carousel */}
      <View style={styles.card}>
        <SectionHeader
          icon="warning-outline"
          title="Active Complaints"
          color={colors.yellow}
          onViewAll={() => navigation.navigate('More', { screen: 'Complaints' })}
        />
        {recentComplaints.length === 0 ? (
          <EmptyState icon="checkmark-circle-outline" label="All clear — no active complaints" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
            {recentComplaints.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.hCard, { borderLeftColor: colors.yellow }]}
                onPress={() => navigation.navigate('More', { screen: 'Complaints' })}
                activeOpacity={0.8}
              >
                <View style={styles.hCardTop}>
                  <Avatar name={c.customerName || '?'} color={colors.yellow} />
                  <StatusBadge status={c.status} />
                </View>
                <Text style={styles.hCardName} numberOfLines={1}>{c.customerName || 'Unknown'}</Text>
                <Text style={styles.hCardIssue} numberOfLines={2}>{c.issue || c.description || '—'}</Text>
                <Text style={styles.listMeta}>{formatDate(c.createdAt)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Pending Bills */}
      <View style={styles.card}>
        <SectionHeader
          icon="receipt-outline"
          title="Pending Bills"
          color={colors.pink}
          onViewAll={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
        />
        {pendingBills.length === 0 ? (
          <EmptyState icon="checkmark-circle-outline" label="No pending bills" />
        ) : (
          pendingBills.slice(0, 10).map((b, i) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.listRow, i < Math.min(pendingBills.length, 10) - 1 && styles.listRowBorder]}
              onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
              activeOpacity={0.7}
            >
              <Avatar name={b.customerName || '?'} color={colors.pink} />
              <View style={styles.listRowMid}>
                <Text style={styles.listPrimary} numberOfLines={1}>{b.customerName || 'Unknown'}</Text>
                <Text style={styles.listSecondary} numberOfLines={1}>
                  Bill #{b.billNumber || b.id} · Paid {fmtCurrency(b.amountPaid || 0)} / {fmtCurrency(b.totalAmount || 0)}
                </Text>
              </View>
              <View style={styles.listRowRight}>
                <Text style={[styles.listAmount, { color: colors.red }]}>{fmtCurrency(b.balance || 0)}</Text>
                <StatusBadge status={b.status} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ─── Worker Dashboard ───────────────────────────────────────────────────────

const WorkerDashboard = ({ user, bills, complaints, workHours, salary, users, navigation }) => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayLabel = now.toLocaleString('default', { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = (user.name || '').split(' ')[0];

  const hoursToday = useMemo(() => {
    const entries = (workHours || []).filter((w) => w.userId === user.userId && w.date?.startsWith(todayStr));
    return entries.reduce((s, w) => s + (w.hours || 0), 0);
  }, [workHours, user.userId, todayStr]);

  const collectedToday = useMemo(() => {
    let total = 0;
    bills.forEach((b) => {
      (b.payments || []).forEach((p) => {
        if (p.collectedBy === user.name && p.date?.startsWith(todayStr)) total += p.amount || 0;
      });
    });
    return total;
  }, [bills, user.name, todayStr]);

  const salaryInfo = useMemo(() => {
    const userRecord = (users || []).find((u) => u.id === user.userId);
    const monthlySalary = userRecord?.monthlySalary || 0;
    const salaryStartDay = userRecord?.salaryStartDay || 1;
    let cycleStart;
    if (now.getDate() >= salaryStartDay) cycleStart = new Date(now.getFullYear(), now.getMonth(), salaryStartDay);
    else cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, salaryStartDay);
    const cycleStartStr = cycleStart.toISOString().slice(0, 10);
    const cycleRecords = (salary || []).filter((s) => s.userId === user.userId && s.date >= cycleStartStr);
    const totalPaid = cycleRecords.filter((s) => s.type === 'payment' || s.type === 'salary').reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalAdvances = cycleRecords.filter((s) => s.type === 'advance').reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalAdvanceDeductions = cycleRecords.filter((s) => s.type === 'advance_deduction').reduce((sum, s) => sum + (s.amount || 0), 0);
    const outstandingAdvance = totalAdvances - totalAdvanceDeductions;
    const balance = monthlySalary - totalPaid - outstandingAdvance;
    return { monthlySalary, totalPaid, balance, outstandingAdvance };
  }, [users, salary, user.userId]);

  const activeComplaints = useMemo(
    () => complaints.filter((c) => c.status !== 'Completed').sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [complaints],
  );

  const myPayments = useMemo(() => {
    const all = bills.flatMap((b) =>
      (b.payments || [])
        .filter((p) => p.collectedBy === user.name)
        .map((p) => ({ ...p, customerName: b.customerName || 'Unknown', billNumber: b.billNumber || b.id })),
    );
    all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return all.slice(0, 10);
  }, [bills, user.name]);

  const salaryProgress = salaryInfo.monthlySalary > 0 ? Math.min(1, salaryInfo.totalPaid / salaryInfo.monthlySalary) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <Hero title={`Hi, ${firstName} 👋`} subtitle={todayLabel} accent={colors.cyan} />

      {/* Salary highlight */}
      <View style={styles.highlight}>
        <View style={styles.highlightLeft}>
          <Text style={styles.highlightLabel}>SALARY THIS CYCLE</Text>
          <Text style={styles.highlightValue}>
            {fmtCurrency(salaryInfo.totalPaid)}
            <Text style={styles.highlightValueSmall}> / {fmtCurrency(salaryInfo.monthlySalary)}</Text>
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${salaryProgress * 100}%` }]} />
          </View>
          <View style={styles.highlightSplit}>
            <Text style={styles.highlightChipText}>
              {salaryInfo.balance >= 0 ? 'Balance: ' : 'Excess: '}
              <Text style={{ color: salaryInfo.balance >= 0 ? colors.yellow : colors.green, fontWeight: fontWeight.bold }}>
                {fmtCurrency(Math.abs(salaryInfo.balance))}
              </Text>
            </Text>
            {salaryInfo.outstandingAdvance > 0 ? (
              <Text style={styles.highlightChipText}>
                Advance: <Text style={{ color: colors.red, fontWeight: fontWeight.bold }}>{fmtCurrency(salaryInfo.outstandingAdvance)}</Text>
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statHalf}>
          <StatCard
            title="Hours Today"
            value={hoursToday.toFixed(1)}
            icon={<Ionicons name="time-outline" size={20} color={colors.blue} />}
            color={colors.blue}
          />
        </View>
        <View style={styles.statHalf}>
          <StatCard
            title="Collected Today"
            value={fmtCurrency(collectedToday)}
            icon={<Ionicons name="cash-outline" size={20} color={colors.green} />}
            color={colors.green}
          />
        </View>
        <View style={styles.statHalf}>
          <StatCard
            title="Active Complaints"
            value={activeComplaints.length.toString()}
            icon={<Ionicons name="warning-outline" size={20} color={colors.yellow} />}
            color={colors.yellow}
            onPress={() => navigation.navigate('More', { screen: 'Complaints' })}
          />
        </View>
        <View style={styles.statHalf}>
          <StatCard
            title="My Payments"
            value={myPayments.length.toString()}
            icon={<Ionicons name="receipt-outline" size={20} color={colors.purple} />}
            color={colors.purple}
            onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
          />
        </View>
      </View>

      {/* Active Complaints */}
      <View style={styles.card}>
        <SectionHeader
          icon="warning-outline"
          title="Active Complaints"
          color={colors.yellow}
          onViewAll={() => navigation.navigate('More', { screen: 'Complaints' })}
        />
        {activeComplaints.length === 0 ? (
          <EmptyState icon="checkmark-circle-outline" label="All clear — no active complaints" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
            {activeComplaints.slice(0, 10).map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.hCard, { borderLeftColor: colors.yellow }]}
                onPress={() => navigation.navigate('More', { screen: 'Complaints' })}
                activeOpacity={0.8}
              >
                <View style={styles.hCardTop}>
                  <Avatar name={c.customerName || '?'} color={colors.yellow} />
                  <StatusBadge status={c.status} />
                </View>
                <Text style={styles.hCardName} numberOfLines={1}>{c.customerName || 'Unknown'}</Text>
                <Text style={styles.hCardIssue} numberOfLines={2}>{c.issue || c.description || '—'}</Text>
                <Text style={styles.listMeta}>{formatDate(c.createdAt)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Payments Collected — horizontal carousel */}
      <View style={styles.card}>
        <SectionHeader
          icon="cash-outline"
          title="Payments You Collected"
          color={colors.green}
          onViewAll={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
        />
        {myPayments.length === 0 ? (
          <EmptyState icon="cash-outline" label="No payments collected yet" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
            {myPayments.map((p, i) => (
              <TouchableOpacity
                key={`${p.date}-${i}`}
                style={[styles.hCard, { borderLeftColor: colors.green }]}
                onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
                activeOpacity={0.8}
              >
                <View style={styles.hCardTop}>
                  <Avatar name={p.customerName} color={colors.green} />
                  <Text style={[styles.hCardAmount, { color: colors.green }]}>+{fmtCurrency(p.amount || 0)}</Text>
                </View>
                <Text style={styles.hCardName} numberOfLines={1}>{p.customerName}</Text>
                <View style={styles.hCardMeta}>
                  <PaymentBadge mode={p.mode} />
                  <Text style={styles.listMeta}>{formatDate(p.date)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ─── Main Export ────────────────────────────────────────────────────────────

const DashboardScreen = () => {
  const { user } = useAuth();
  const { customers, bills, complaints, workHours, salary, users } = useData();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }} edges={['top']}>
      {user?.role === 'owner' ? (
        <OwnerDashboard customers={customers} bills={bills} complaints={complaints} navigation={navigation} />
      ) : (
        <WorkerDashboard
          user={user}
          bills={bills}
          complaints={complaints}
          workHours={workHours}
          salary={salary}
          users={users}
          navigation={navigation}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  contentContainer: { padding: spacing.lg, paddingTop: spacing.md },

  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  heroBadge: {
    width: 44, height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  heroBrand: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Highlight banner
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  highlightLeft: { flex: 1 },
  highlightLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  highlightValue: {
    fontSize: 28,
    fontWeight: fontWeight.extrabold,
    color: colors.green,
    marginBottom: 8,
  },
  highlightValueSmall: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  highlightSplit: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 4,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  highlightIcon: {
    width: 56, height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: rgba(colors.green, 0.12),
    alignItems: 'center', justifyContent: 'center',
  },

  // Salary progress
  progressTrack: {
    height: 6,
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statHalf: {
    width: (screenWidth - spacing.lg * 2 - spacing.md) / 2,
  },

  // Card
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionIcon: {
    width: 28, height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  viewAll: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },

  // Legend (chart)
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: fontSize.xs, color: colors.textSecondary },
  legendUnit: { fontSize: fontSize.xs, color: colors.textSecondary, marginLeft: 'auto', fontStyle: 'italic' },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // List rows
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listRowMid: { flex: 1 },
  listRowRight: { alignItems: 'flex-end', gap: 4 },
  listPrimary: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  listSecondary: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  listMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  listAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2, flexWrap: 'wrap' },

  // Horizontal carousel cards
  hScrollContent: {
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  hCard: {
    width: 220,
    backgroundColor: colors.bgCardLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    padding: spacing.md,
    gap: 6,
  },
  hCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hCardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  hCardAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  hCardIssue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    minHeight: 36,
  },
  hCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },

  // Avatar
  avatar: {
    width: 38, height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

export default DashboardScreen;
