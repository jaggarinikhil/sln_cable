import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useData } from '../context/DataContext';
import { storage } from '../utils/storage';
import StatCard from '../components/StatCard';
import { StatusBadge, PaymentBadge } from '../components/StatusBadge';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - 2; // minus card padding + border

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n) => {
  if (n === undefined || n === null) return '0';
  return Number(n).toLocaleString('en-IN');
};

const fmtCurrency = (n) => `₹${fmt(n)}`;

const pad = (n) => String(n).padStart(2, '0');

const toDateStr = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const toMonthStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const getMonthLabel = (d) =>
  d.toLocaleString('default', { month: 'long', year: 'numeric' });

const getWeekDates = (weekOffset) => {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const chartConfig = {
  backgroundColor: colors.bgCard,
  backgroundGradientFrom: colors.bgCard,
  backgroundGradientTo: colors.bgCard,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
  labelColor: () => colors.textSecondary,
  barPercentage: 0.5,
  propsForBackgroundLines: {
    stroke: colors.border,
    strokeDasharray: '',
  },
  propsForLabels: {
    fontSize: 10,
  },
};

const PIE_COLORS = [colors.green, colors.accent, colors.cyan, colors.purple, colors.yellow, colors.pink, colors.blue, colors.red];

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------
const CollapsibleSection = ({ title, icon, defaultOpen, children }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={() => setOpen(!open)}
      >
        <View style={styles.sectionLeft}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name={icon} size={18} color={colors.accent} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Date / Month / Week pickers
// ---------------------------------------------------------------------------
const DatePicker = ({ value, onChange }) => {
  const shift = (days) => {
    const d = new Date(value);
    d.setDate(d.getDate() + days);
    onChange(d);
  };
  return (
    <View style={styles.pickerRow}>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => shift(-1)}>
        <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.pickerLabel}>{toDateStr(value)}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => shift(1)}>
        <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const MonthPicker = ({ value, onChange }) => {
  const shift = (m) => {
    const d = new Date(value);
    d.setMonth(d.getMonth() + m);
    onChange(d);
  };
  return (
    <View style={styles.pickerRow}>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => shift(-1)}>
        <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.pickerLabel}>{getMonthLabel(value)}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => shift(1)}>
        <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const WeekPicker = ({ offset, onChange }) => {
  const dates = getWeekDates(offset);
  const label = `${toDateStr(dates[0])}  to  ${toDateStr(dates[6])}`;
  return (
    <View style={styles.pickerRow}>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => onChange(offset - 1)}>
        <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => onChange(offset + 1)}>
        <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Daily Report
// ---------------------------------------------------------------------------
const DailyReport = ({ bills, workHoursData, users }) => {
  const [date, setDate] = useState(new Date());
  const dateStr = toDateStr(date);

  const dayBills = useMemo(
    () => bills.filter((b) => b.date === dateStr || (b.createdAt && b.createdAt.startsWith(dateStr))),
    [bills, dateStr],
  );

  const payments = useMemo(
    () => dayBills.filter((b) => b.status === 'Paid' || b.status === 'Partial'),
    [dayBills],
  );

  const totalBilled = useMemo(() => dayBills.reduce((s, b) => s + (Number(b.amount) || 0), 0), [dayBills]);
  const totalCollected = useMemo(
    () => payments.reduce((s, b) => s + (Number(b.paidAmount || b.amount) || 0), 0),
    [payments],
  );
  const tvCollected = useMemo(
    () => payments.reduce((s, b) => s + (Number(b.tvAmount) || 0), 0),
    [payments],
  );
  const internetCollected = useMemo(
    () => payments.reduce((s, b) => s + (Number(b.internetAmount) || 0), 0),
    [payments],
  );

  const dayHours = useMemo(() => {
    const entries = (workHoursData || []).filter((w) => w.date === dateStr);
    return entries.reduce((s, w) => s + (Number(w.hours) || 0), 0);
  }, [workHoursData, dateStr]);

  // Payment mode breakdown for pie chart
  const modeBreakdown = useMemo(() => {
    const map = {};
    payments.forEach((b) => {
      const mode = b.paymentMode || 'Cash';
      map[mode] = (map[mode] || 0) + (Number(b.paidAmount || b.amount) || 0);
    });
    return Object.entries(map).map(([name, amount], i) => ({
      name,
      population: amount,
      color: PIE_COLORS[i % PIE_COLORS.length],
      legendFontColor: colors.textSecondary,
      legendFontSize: 11,
    }));
  }, [payments]);

  return (
    <CollapsibleSection title="Daily Report" icon="today" defaultOpen>
      <DatePicker value={date} onChange={setDate} />

      <View style={styles.statsGrid}>
        <StatCard
          title="Bills Generated"
          value={fmt(dayBills.length)}
          icon={<Ionicons name="document-text" size={18} color={colors.accent} />}
          color={colors.accent}
        />
        <StatCard
          title="Total Billed"
          value={fmtCurrency(totalBilled)}
          icon={<Ionicons name="cash" size={18} color={colors.cyan} />}
          color={colors.cyan}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Collected"
          value={fmtCurrency(totalCollected)}
          icon={<Ionicons name="wallet" size={18} color={colors.green} />}
          color={colors.green}
        />
        {tvCollected > 0 && (
          <StatCard
            title="TV Collected"
            value={fmtCurrency(tvCollected)}
            icon={<Ionicons name="tv" size={18} color={colors.purple} />}
            color={colors.purple}
          />
        )}
      </View>
      {(internetCollected > 0 || dayHours > 0) && (
        <View style={styles.statsGrid}>
          {internetCollected > 0 && (
            <StatCard
              title="Internet Collected"
              value={fmtCurrency(internetCollected)}
              icon={<Ionicons name="wifi" size={18} color={colors.cyan} />}
              color={colors.cyan}
            />
          )}
          {dayHours > 0 && (
            <StatCard
              title="Hours Worked"
              value={`${dayHours}h`}
              icon={<Ionicons name="time" size={18} color={colors.yellow} />}
              color={colors.yellow}
            />
          )}
        </View>
      )}

      {/* Collection breakdown table */}
      {payments.length > 0 && (
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Collection Breakdown</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHeaderRow}>
                {['Customer', 'Bill#', 'Amount', 'Mode', 'Collected By', 'Date'].map((h) => (
                  <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
                ))}
              </View>
              {payments.map((b, i) => (
                <View key={b.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={styles.tableCell} numberOfLines={1}>{b.customerName || '—'}</Text>
                  <Text style={styles.tableCell}>{b.billNumber || b.id?.slice(-6) || '—'}</Text>
                  <Text style={styles.tableCell}>{fmtCurrency(b.paidAmount || b.amount)}</Text>
                  <Text style={styles.tableCell}>{b.paymentMode || 'Cash'}</Text>
                  <Text style={styles.tableCell}>{b.receivedBy || b.generatedBy || '—'}</Text>
                  <Text style={styles.tableCell}>{b.paymentDate || dateStr}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Pie chart */}
      {modeBreakdown.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Payment Mode Split</Text>
          <PieChart
            data={modeBreakdown}
            width={CHART_WIDTH}
            height={180}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
          />
        </View>
      )}
    </CollapsibleSection>
  );
};

// ---------------------------------------------------------------------------
// Collection Report (Monthly)
// ---------------------------------------------------------------------------
const CollectionReport = ({ bills }) => {
  const [month, setMonth] = useState(new Date());
  const monthStr = toMonthStr(month);
  const year = month.getFullYear();
  const mon = month.getMonth();
  const numDays = daysInMonth(year, mon);

  const monthBills = useMemo(
    () =>
      bills.filter((b) => {
        const d = b.date || (b.createdAt && b.createdAt.slice(0, 10));
        return d && d.startsWith(monthStr);
      }),
    [bills, monthStr],
  );

  const totalBilled = monthBills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const paidBills = monthBills.filter((b) => b.status === 'Paid' || b.status === 'Partial');
  const totalCollected = paidBills.reduce((s, b) => s + (Number(b.paidAmount || b.amount) || 0), 0);
  const collectionRate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0';
  const tvCollected = paidBills.reduce((s, b) => s + (Number(b.tvAmount) || 0), 0);
  const internetCollected = paidBills.reduce((s, b) => s + (Number(b.internetAmount) || 0), 0);

  // Bill status breakdown
  const paidCount = monthBills.filter((b) => b.status === 'Paid').length;
  const partialCount = monthBills.filter((b) => b.status === 'Partial').length;
  const dueCount = monthBills.filter((b) => b.status === 'Due' || !b.status).length;

  // Daily collection for bar chart
  const dailyData = useMemo(() => {
    const map = {};
    paidBills.forEach((b) => {
      const d = b.paymentDate || b.date || (b.createdAt && b.createdAt.slice(0, 10));
      if (!d) return;
      const day = parseInt(d.slice(8, 10), 10);
      map[day] = (map[day] || 0) + (Number(b.paidAmount || b.amount) || 0);
    });
    // Show every 5th day label to avoid crowding
    const labels = [];
    const data = [];
    for (let i = 1; i <= numDays; i++) {
      labels.push(i % 5 === 0 || i === 1 ? String(i) : '');
      data.push(map[i] || 0);
    }
    return { labels, datasets: [{ data }] };
  }, [paidBills, numDays]);

  return (
    <CollapsibleSection title="Collection Report (Monthly)" icon="calendar">
      <MonthPicker value={month} onChange={setMonth} />

      <View style={styles.statsGrid}>
        <StatCard
          title="Total Billed"
          value={fmtCurrency(totalBilled)}
          icon={<Ionicons name="receipt" size={18} color={colors.accent} />}
          color={colors.accent}
        />
        <StatCard
          title="Total Collected"
          value={fmtCurrency(totalCollected)}
          icon={<Ionicons name="wallet" size={18} color={colors.green} />}
          color={colors.green}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Collection Rate"
          value={`${collectionRate}%`}
          icon={<Ionicons name="trending-up" size={18} color={colors.cyan} />}
          color={colors.cyan}
        />
        <StatCard
          title="TV Collected"
          value={fmtCurrency(tvCollected)}
          icon={<Ionicons name="tv" size={18} color={colors.purple} />}
          color={colors.purple}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Internet Collected"
          value={fmtCurrency(internetCollected)}
          icon={<Ionicons name="wifi" size={18} color={colors.cyan} />}
          color={colors.cyan}
        />
        <View style={{ flex: 1, minWidth: 140 }} />
      </View>

      {/* Daily collection bar chart */}
      {dailyData.datasets[0].data.some((v) => v > 0) && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Collections</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={dailyData}
              width={Math.max(CHART_WIDTH, numDays * 18)}
              height={200}
              chartConfig={chartConfig}
              fromZero
              showValuesOnTopOfBars={false}
              withInnerLines
              style={styles.chart}
            />
          </ScrollView>
        </View>
      )}

      {/* Bill status breakdown */}
      <View style={styles.statusRow}>
        <View style={[styles.statusChip, { borderColor: 'rgba(16,185,129,0.3)' }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.green }]} />
          <Text style={styles.statusLabel}>Paid: {paidCount}</Text>
        </View>
        <View style={[styles.statusChip, { borderColor: 'rgba(99,102,241,0.3)' }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.statusLabel}>Partial: {partialCount}</Text>
        </View>
        <View style={[styles.statusChip, { borderColor: 'rgba(248,113,113,0.3)' }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.red }]} />
          <Text style={styles.statusLabel}>Due: {dueCount}</Text>
        </View>
      </View>
    </CollapsibleSection>
  );
};

// ---------------------------------------------------------------------------
// Worker Collection Report
// ---------------------------------------------------------------------------
const WorkerCollectionReport = ({ bills, users }) => {
  const [month, setMonth] = useState(new Date());
  const monthStr = toMonthStr(month);

  const monthPaidBills = useMemo(
    () =>
      bills.filter((b) => {
        const d = b.paymentDate || b.date || (b.createdAt && b.createdAt.slice(0, 10));
        return d && d.startsWith(monthStr) && (b.status === 'Paid' || b.status === 'Partial');
      }),
    [bills, monthStr],
  );

  const workerData = useMemo(() => {
    const map = {};
    monthPaidBills.forEach((b) => {
      const worker = b.receivedBy || b.generatedBy || 'Unknown';
      if (!map[worker]) map[worker] = { name: worker, total: 0, count: 0, cash: 0, digital: 0 };
      const amt = Number(b.paidAmount || b.amount) || 0;
      map[worker].total += amt;
      map[worker].count += 1;
      const mode = (b.paymentMode || '').toLowerCase();
      if (mode === 'cash') {
        map[worker].cash += amt;
      } else {
        map[worker].digital += amt;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [monthPaidBills]);

  const barData = useMemo(() => {
    if (workerData.length === 0) return null;
    return {
      labels: workerData.map((w) => w.name.slice(0, 8)),
      datasets: [{ data: workerData.map((w) => w.total) }],
    };
  }, [workerData]);

  return (
    <CollapsibleSection title="Worker Collection Report" icon="people">
      <MonthPicker value={month} onChange={setMonth} />

      {workerData.length === 0 ? (
        <Text style={styles.emptyText}>No collections this month.</Text>
      ) : (
        <>
          {workerData.map((w) => (
            <View key={w.name} style={styles.workerCard}>
              <View style={styles.workerTop}>
                <View style={styles.workerAvatar}>
                  <Text style={styles.workerInitial}>{(w.name[0] || '?').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{w.name}</Text>
                  <Text style={styles.workerSub}>{w.count} payments</Text>
                </View>
                <Text style={styles.workerTotal}>{fmtCurrency(w.total)}</Text>
              </View>
              <View style={styles.workerSplit}>
                <View style={styles.splitItem}>
                  <Text style={styles.splitLabel}>Cash</Text>
                  <Text style={[styles.splitVal, { color: colors.green }]}>{fmtCurrency(w.cash)}</Text>
                </View>
                <View style={styles.splitItem}>
                  <Text style={styles.splitLabel}>Digital</Text>
                  <Text style={[styles.splitVal, { color: colors.cyan }]}>{fmtCurrency(w.digital)}</Text>
                </View>
              </View>
            </View>
          ))}

          {barData && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Worker Comparison</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={barData}
                  width={Math.max(CHART_WIDTH, workerData.length * 80)}
                  height={200}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  }}
                  fromZero
                  showValuesOnTopOfBars
                  style={styles.chart}
                />
              </ScrollView>
            </View>
          )}
        </>
      )}
    </CollapsibleSection>
  );
};

// ---------------------------------------------------------------------------
// Complaints Report
// ---------------------------------------------------------------------------
const ComplaintsReport = ({ complaints }) => {
  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === 'Pending').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const completed = complaints.filter((c) => c.status === 'Completed').length;

  // By service type
  const byService = useMemo(() => {
    const map = {};
    complaints.forEach((c) => {
      const svc = c.serviceType || c.type || 'Other';
      map[svc] = (map[svc] || 0) + 1;
    });
    return Object.entries(map);
  }, [complaints]);

  // Recent complaints (latest 10)
  const recent = useMemo(
    () =>
      [...complaints]
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 10),
    [complaints],
  );

  return (
    <CollapsibleSection title="Complaints Report" icon="chatbubble-ellipses">
      <View style={styles.statsGrid}>
        <StatCard
          title="Total"
          value={fmt(total)}
          icon={<Ionicons name="chatbubbles" size={18} color={colors.accent} />}
          color={colors.accent}
        />
        <StatCard
          title="Pending"
          value={fmt(pending)}
          icon={<Ionicons name="hourglass" size={18} color={colors.yellow} />}
          color={colors.yellow}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="In Progress"
          value={fmt(inProgress)}
          icon={<Ionicons name="construct" size={18} color={colors.cyan} />}
          color={colors.cyan}
        />
        <StatCard
          title="Completed"
          value={fmt(completed)}
          icon={<Ionicons name="checkmark-circle" size={18} color={colors.green} />}
          color={colors.green}
        />
      </View>

      {/* By service type */}
      {byService.length > 0 && (
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>By Service Type</Text>
          {byService.map(([svc, count]) => (
            <View key={svc} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{svc}</Text>
              <Text style={styles.breakdownValue}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent complaints */}
      {recent.length > 0 && (
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Recent Complaints</Text>
          {recent.map((c, i) => (
            <View key={c.id || i} style={[styles.complaintRow, i < recent.length - 1 && styles.complaintBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.complaintCustomer}>{c.customerName || 'Unknown'}</Text>
                <Text style={styles.complaintDesc} numberOfLines={1}>{c.description || c.complaint || '—'}</Text>
                <Text style={styles.complaintDate}>{(c.createdAt || '').slice(0, 10)}</Text>
              </View>
              <StatusBadge status={c.status} />
            </View>
          ))}
        </View>
      )}
    </CollapsibleSection>
  );
};

// ---------------------------------------------------------------------------
// Work Hours Report
// ---------------------------------------------------------------------------
const WorkHoursReport = ({ workHoursData, users }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = getWeekDates(weekOffset);
  const weekDateStrs = weekDates.map(toDateStr);
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weekEntries = useMemo(
    () => (workHoursData || []).filter((w) => weekDateStrs.includes(w.date)),
    [workHoursData, weekDateStrs],
  );

  // Per-worker breakdown
  const workerMap = useMemo(() => {
    const map = {};
    weekEntries.forEach((w) => {
      const name = w.userName || w.userId || 'Unknown';
      if (!map[name]) map[name] = { name, total: 0, daily: new Array(7).fill(0) };
      map[name].total += Number(w.hours) || 0;
      const idx = weekDateStrs.indexOf(w.date);
      if (idx >= 0) map[name].daily[idx] += Number(w.hours) || 0;
    });
    return Object.values(map);
  }, [weekEntries, weekDateStrs]);

  // Bar chart: total hours per day across all workers
  const dailyTotals = useMemo(() => {
    const totals = new Array(7).fill(0);
    workerMap.forEach((w) => {
      w.daily.forEach((h, i) => { totals[i] += h; });
    });
    return totals;
  }, [workerMap]);

  const barData = {
    labels: dayLabels,
    datasets: [{ data: dailyTotals.some((v) => v > 0) ? dailyTotals : [0, 0, 0, 0, 0, 0, 0] }],
  };

  return (
    <CollapsibleSection title="Work Hours Report" icon="time">
      <WeekPicker offset={weekOffset} onChange={setWeekOffset} />

      {workerMap.length === 0 ? (
        <Text style={styles.emptyText}>No work hours logged this week.</Text>
      ) : (
        <>
          {workerMap.map((w) => (
            <View key={w.name} style={styles.workerCard}>
              <View style={styles.workerTop}>
                <View style={styles.workerAvatar}>
                  <Text style={styles.workerInitial}>{(w.name[0] || '?').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{w.name}</Text>
                </View>
                <Text style={styles.workerTotal}>{w.total}h</Text>
              </View>
              <View style={styles.hoursRow}>
                {dayLabels.map((d, i) => (
                  <View key={d} style={styles.hourDay}>
                    <Text style={styles.hourDayLabel}>{d}</Text>
                    <Text style={[styles.hourDayVal, w.daily[i] > 0 && { color: colors.green }]}>
                      {w.daily[i] > 0 ? `${w.daily[i]}h` : '-'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Daily Hours</Text>
            <BarChart
              data={barData}
              width={CHART_WIDTH}
              height={200}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
              }}
              fromZero
              showValuesOnTopOfBars
              style={styles.chart}
            />
          </View>
        </>
      )}
    </CollapsibleSection>
  );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function ReportsScreen() {
  const { bills, complaints } = useData();
  const [workHoursData, setWorkHoursData] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [wh, u] = await Promise.all([storage.getWorkHours(), storage.getUsers()]);
      setWorkHoursData(wh);
      setUsers(u);
    };
    load();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DailyReport bills={bills} workHoursData={workHoursData} users={users} />
      <CollectionReport bills={bills} />
      <WorkerCollectionReport bills={bills} users={users} />
      <ComplaintsReport complaints={complaints} />
      <WorkHoursReport workHoursData={workHoursData} users={users} />
    </ScrollView>
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
    paddingBottom: 40,
  },

  // Section
  section: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  sectionBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Pickers
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pickerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    minWidth: 140,
    textAlign: 'center',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  // Table
  tableCard: {
    backgroundColor: colors.bgCardLight,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  tableTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  tableHeaderCell: {
    width: 100,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tableCell: {
    width: 100,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    paddingHorizontal: 4,
  },

  // Charts
  chartCard: {
    backgroundColor: colors.bgCardLight,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chart: {
    borderRadius: borderRadius.sm,
  },

  // Status chips
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    backgroundColor: colors.bgCardLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },

  // Worker cards
  workerCard: {
    backgroundColor: colors.bgCardLight,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  workerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInitial: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  workerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  workerSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  workerTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.green,
  },
  workerSplit: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  splitItem: {
    flex: 1,
  },
  splitLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  splitVal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },

  // Hours row
  hoursRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hourDay: {
    flex: 1,
    alignItems: 'center',
  },
  hourDayLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  hourDayVal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },

  // Breakdown
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  breakdownValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },

  // Complaints
  complaintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.md,
  },
  complaintBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  complaintCustomer: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  complaintDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  complaintDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Empty
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
