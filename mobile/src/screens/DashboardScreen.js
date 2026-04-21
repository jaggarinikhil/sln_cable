import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
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
  return n.toLocaleString('en-IN');
};

const fmtCurrency = (n) => `\u20B9${fmt(n)}`;

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

// ─── Owner Dashboard ────────────────────────────────────────────────────────

const OwnerDashboard = ({ customers, bills, complaints, navigation }) => {
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthBills = useMemo(
    () => bills.filter((b) => b.generatedDate?.startsWith(currentYearMonth)),
    [bills, currentYearMonth],
  );

  // TV & Internet collected
  const { tvCollected, internetCollected } = useMemo(() => {
    let tv = 0;
    let internet = 0;
    thisMonthBills.forEach((b) => {
      const total = b.totalAmount || 1;
      const paid = b.amountPaid || 0;
      const tvAmt = b.tvAmount || 0;
      const netAmt = b.internetAmount || 0;
      const tvRatio = tvAmt / total;
      const netRatio = netAmt / total;
      tv += tvRatio * paid;
      internet += netRatio * paid;
    });
    return { tvCollected: Math.round(tv), internetCollected: Math.round(internet) };
  }, [thisMonthBills]);

  // Total outstanding across ALL bills
  const totalOutstanding = useMemo(
    () => bills.reduce((s, b) => s + (b.balance || 0), 0),
    [bills],
  );

  // Active complaints
  const activeComplaints = useMemo(
    () => complaints.filter((c) => c.status !== 'Completed'),
    [complaints],
  );

  // Pending bills (Due or Partial)
  const pendingBills = useMemo(
    () =>
      bills
        .filter((b) => b.status === 'Due' || b.status === 'Partial')
        .sort((a, b) => (b.balance || 0) - (a.balance || 0)),
    [bills],
  );

  const pendingBillsBalance = useMemo(
    () => pendingBills.reduce((s, b) => s + (b.balance || 0), 0),
    [pendingBills],
  );

  // Payment mode chart data
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

  // Revenue trend – last 6 months
  const revenueTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      months.push({ ym, label, tv: 0, internet: 0 });
    }
    bills.forEach((b) => {
      const entry = months.find((m) => b.generatedDate?.startsWith(m.ym));
      if (entry) {
        const total = b.totalAmount || 1;
        const paid = b.amountPaid || 0;
        entry.tv += ((b.tvAmount || 0) / total) * paid;
        entry.internet += ((b.internetAmount || 0) / total) * paid;
      }
    });
    return months;
  }, [bills]);

  // Recent payments – flattened from all bills
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
    return all.slice(0, 30);
  }, [bills]);

  // Recent active complaints
  const recentComplaints = useMemo(() => {
    return [...activeComplaints]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 30);
  }, [activeComplaints]);

  const chartConfig = {
    backgroundGradientFrom: colors.bgCard,
    backgroundGradientTo: colors.bgCard,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99,102,241,${opacity})`,
    labelColor: () => colors.textSecondary,
    propsForLabels: { fontSize: 10 },
    barPercentage: 0.5,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <Text style={styles.header}>Dashboard</Text>
      <Text style={styles.subHeader}>{currentYearMonth}</Text>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statHalf}>
          <StatCard
            title="TV Collected"
            value={fmtCurrency(tvCollected)}
            icon={<Ionicons name="tv-outline" size={20} color={colors.purple} />}
            color={colors.purple}
          />
        </View>
        <View style={styles.statHalf}>
          <StatCard
            title="Internet Collected"
            value={fmtCurrency(internetCollected)}
            icon={<Ionicons name="wifi-outline" size={20} color={colors.cyan} />}
            color={colors.cyan}
          />
        </View>
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
            title="Total Customers"
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
            subtext={`Balance: ${fmtCurrency(pendingBillsBalance)}`}
            icon={<Ionicons name="receipt-outline" size={20} color={colors.red} />}
            color={colors.red}
            onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
          />
        </View>
      </View>

      {/* Payment Mode Pie Chart */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment Modes</Text>
        {paymentModeData.some((d) => d.amount > 0) ? (
          <PieChart
            data={paymentModeData.map((d) => ({ ...d, population: d.amount }))}
            width={screenWidth - 48}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="10"
            absolute
          />
        ) : (
          <Text style={styles.emptyText}>No payment data available</Text>
        )}
      </View>

      {/* Revenue Trend Bar Chart */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Revenue Trend (6 Months)</Text>
        {revenueTrend.some((m) => m.tv > 0 || m.internet > 0) ? (
          <BarChart
            data={{
              labels: revenueTrend.map((m) => m.label),
              datasets: [
                { data: revenueTrend.map((m) => Math.round(m.tv / 1000) || 0) },
              ],
              legend: ['TV (K)'],
            }}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(168,85,247,${opacity})`,
            }}
            style={{ borderRadius: 12 }}
            fromZero
            showValuesOnTopOfBars
          />
        ) : (
          <Text style={styles.emptyText}>No revenue data available</Text>
        )}
      </View>

      {/* Recent Payments */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {recentPayments.length === 0 ? (
          <Text style={styles.emptyText}>No payments yet</Text>
        ) : (
          recentPayments.map((p, i) => (
            <TouchableOpacity
              key={`${p.date}-${i}`}
              style={[styles.listRow, i < recentPayments.length - 1 && styles.listRowBorder]}
              onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
              activeOpacity={0.7}
            >
              <View style={styles.listRowLeft}>
                <Text style={styles.listPrimary} numberOfLines={1}>{p.customerName}</Text>
                <View style={styles.rowMeta}>
                  <PaymentBadge mode={p.mode} />
                  <Text style={styles.listMeta}>{formatDate(p.date)}</Text>
                </View>
                {p.collectedBy ? (
                  <Text style={styles.listMeta}>by {p.collectedBy}</Text>
                ) : null}
              </View>
              <Text style={[styles.listAmount, { color: colors.green }]}>
                {fmtCurrency(p.amount || 0)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recent Complaints */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Complaints</Text>
          <TouchableOpacity onPress={() => navigation.navigate('More', { screen: 'Complaints' })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {recentComplaints.length === 0 ? (
          <Text style={styles.emptyText}>No active complaints</Text>
        ) : (
          recentComplaints.map((c, i) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.listRow, i < recentComplaints.length - 1 && styles.listRowBorder]}
              onPress={() => navigation.navigate('More', { screen: 'Complaints' })}
              activeOpacity={0.7}
            >
              <View style={styles.listRowLeft}>
                <Text style={styles.listPrimary} numberOfLines={1}>{c.customerName || 'Unknown'}</Text>
                <Text style={styles.listSecondary} numberOfLines={1}>
                  {c.issue || c.description || '—'}
                </Text>
                <Text style={styles.listMeta}>{formatDate(c.createdAt)}</Text>
              </View>
              <StatusBadge status={c.status} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Pending Bills */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Bills</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {pendingBills.length === 0 ? (
          <Text style={styles.emptyText}>No pending bills</Text>
        ) : (
          pendingBills.slice(0, 30).map((b, i) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.listRow, i < Math.min(pendingBills.length, 30) - 1 && styles.listRowBorder]}
              onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
              activeOpacity={0.7}
            >
              <View style={styles.listRowLeft}>
                <Text style={styles.listPrimary} numberOfLines={1}>{b.customerName || 'Unknown'}</Text>
                <Text style={styles.listSecondary}>Bill #{b.billNumber || b.id}</Text>
                <View style={styles.billAmounts}>
                  <Text style={styles.listMeta}>Total: {fmtCurrency(b.totalAmount || 0)}</Text>
                  <Text style={styles.listMeta}>  Paid: {fmtCurrency(b.amountPaid || 0)}</Text>
                </View>
              </View>
              <View style={styles.listRowRight}>
                <Text style={[styles.listAmount, { color: colors.red }]}>
                  {fmtCurrency(b.balance || 0)}
                </Text>
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
  const firstName = (user.name || '').split(' ')[0];

  // Hours today
  const hoursToday = useMemo(() => {
    const entries = (workHours || []).filter(
      (w) => w.userId === user.userId && w.date?.startsWith(todayStr),
    );
    return entries.reduce((s, w) => {
      const hrs = w.hours || 0;
      return s + hrs;
    }, 0);
  }, [workHours, user.userId, todayStr]);

  // Collected today
  const collectedToday = useMemo(() => {
    let total = 0;
    bills.forEach((b) => {
      (b.payments || []).forEach((p) => {
        if (p.collectedBy === user.name && p.date?.startsWith(todayStr)) {
          total += p.amount || 0;
        }
      });
    });
    return total;
  }, [bills, user.name, todayStr]);

  // Salary cycle calculations
  const salaryInfo = useMemo(() => {
    const userRecord = (users || []).find((u) => u.id === user.userId);
    const monthlySalary = userRecord?.monthlySalary || 0;
    const salaryStartDay = userRecord?.salaryStartDay || 1;

    // Calculate cycle start
    let cycleStart;
    if (now.getDate() >= salaryStartDay) {
      cycleStart = new Date(now.getFullYear(), now.getMonth(), salaryStartDay);
    } else {
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, salaryStartDay);
    }
    const cycleStartStr = cycleStart.toISOString().slice(0, 10);

    // Get salary records in this cycle
    const cycleRecords = (salary || []).filter((s) => {
      return s.userId === user.userId && s.date >= cycleStartStr;
    });

    const totalPaid = cycleRecords
      .filter((s) => s.type === 'payment' || s.type === 'salary')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const totalAdvances = cycleRecords
      .filter((s) => s.type === 'advance')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const totalAdvanceDeductions = cycleRecords
      .filter((s) => s.type === 'advance_deduction')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const outstandingAdvance = totalAdvances - totalAdvanceDeductions;
    const balance = monthlySalary - totalPaid - outstandingAdvance;

    return { monthlySalary, totalPaid, balance, outstandingAdvance };
  }, [users, salary, user.userId]);

  // Active complaints assigned to or relevant
  const activeComplaints = useMemo(
    () =>
      complaints
        .filter((c) => c.status !== 'Completed')
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [complaints],
  );

  // Payments collected by this user
  const myPayments = useMemo(() => {
    const all = bills.flatMap((b) =>
      (b.payments || [])
        .filter((p) => p.collectedBy === user.name)
        .map((p) => ({
          ...p,
          customerName: b.customerName || 'Unknown',
          billNumber: b.billNumber || b.id,
        })),
    );
    all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return all.slice(0, 30);
  }, [bills, user.name]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Welcome header */}
      <Text style={styles.header}>Welcome, {firstName}</Text>
      <Text style={styles.subHeader}>{todayStr}</Text>

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
            title="Paid This Cycle"
            value={fmtCurrency(salaryInfo.totalPaid)}
            subtext={`of ${fmtCurrency(salaryInfo.monthlySalary)}`}
            icon={<Ionicons name="wallet-outline" size={20} color={colors.accent} />}
            color={colors.accent}
          />
        </View>
        <View style={styles.statHalf}>
          <StatCard
            title={salaryInfo.balance >= 0 ? 'Balance Due' : 'Excess'}
            value={fmtCurrency(Math.abs(salaryInfo.balance))}
            icon={
              <Ionicons
                name={salaryInfo.balance >= 0 ? 'trending-down-outline' : 'trending-up-outline'}
                size={20}
                color={salaryInfo.balance >= 0 ? colors.yellow : colors.green}
              />
            }
            color={salaryInfo.balance >= 0 ? colors.yellow : colors.green}
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
      </View>

      {/* Active Complaints */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Complaints</Text>
          <TouchableOpacity onPress={() => navigation.navigate('More', { screen: 'Complaints' })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {activeComplaints.length === 0 ? (
          <Text style={styles.emptyText}>No active complaints</Text>
        ) : (
          activeComplaints.slice(0, 30).map((c, i) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.listRow, i < Math.min(activeComplaints.length, 30) - 1 && styles.listRowBorder]}
              onPress={() => navigation.navigate('More', { screen: 'Complaints' })}
              activeOpacity={0.7}
            >
              <View style={styles.listRowLeft}>
                <Text style={styles.listPrimary} numberOfLines={1}>{c.customerName || 'Unknown'}</Text>
                <Text style={styles.listSecondary} numberOfLines={1}>
                  {c.issue || c.description || '—'}
                </Text>
                <Text style={styles.listMeta}>{formatDate(c.createdAt)}</Text>
              </View>
              <StatusBadge status={c.status} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Payments You Collected */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payments You Collected</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {myPayments.length === 0 ? (
          <Text style={styles.emptyText}>No payments collected yet</Text>
        ) : (
          myPayments.map((p, i) => (
            <TouchableOpacity
              key={`${p.date}-${i}`}
              style={[styles.listRow, i < myPayments.length - 1 && styles.listRowBorder]}
              onPress={() => navigation.navigate('Payments', { screen: 'PaymentsHome' })}
              activeOpacity={0.7}
            >
              <View style={styles.listRowLeft}>
                <Text style={styles.listPrimary} numberOfLines={1}>{p.customerName}</Text>
                <View style={styles.rowMeta}>
                  <PaymentBadge mode={p.mode} />
                  <Text style={styles.listMeta}>{formatDate(p.date)}</Text>
                </View>
              </View>
              <Text style={[styles.listAmount, { color: colors.green }]}>
                {fmtCurrency(p.amount || 0)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ─── Main Export ─────────────────────────────────────────────────────────────

const DashboardScreen = () => {
  const { user } = useAuth();
  const { customers, bills, complaints, workHours, salary, users } = useData();
  const navigation = useNavigation();

  if (user?.role === 'owner') {
    return (
      <OwnerDashboard
        customers={customers}
        bills={bills}
        complaints={complaints}
        navigation={navigation}
      />
    );
  }

  return (
    <WorkerDashboard
      user={user}
      bills={bills}
      complaints={complaints}
      workHours={workHours}
      salary={salary}
      users={users}
      navigation={navigation}
    />
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  header: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subHeader: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },

  // Stats grid – 2 columns
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
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

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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

  // List rows
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listRowLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  listRowRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
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
  listMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  listAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  billAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  // Empty state
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
});

export default DashboardScreen;
