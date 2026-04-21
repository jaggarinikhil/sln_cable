import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { storage } from '../utils/storage';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import BottomSheet from '../components/BottomSheet';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SHIFT_TYPES = ['Morning', 'Evening', 'Full Day', 'Leave'];
const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Holiday', 'Half Day', 'Unpaid Leave', 'Other'];

const SHIFT_COLORS = {
  Morning: colors.yellow,
  Evening: colors.purple,
  'Full Day': colors.green,
  Leave: colors.red,
};

const SHIFT_DEFAULTS = {
  Morning: { entry: '09:00', exit: '13:00', hours: 4 },
  Evening: { entry: '14:00', exit: '18:00', hours: 4 },
  'Full Day': { entry: '09:00', exit: '18:00', hours: 9 },
};

const WORKER_PALETTE = [
  colors.accent,
  colors.cyan,
  colors.green,
  colors.purple,
  colors.pink,
  colors.yellow,
  colors.blue,
];

const DEFAULT_SALARY_START_DAY = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getCycles(salaryStartDay = DEFAULT_SALARY_START_DAY, count = 6) {
  const today = new Date();
  const cycles = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, salaryStartDay);
    if (today.getDate() < salaryStartDay && i === 0) {
      d.setMonth(d.getMonth() - 1);
    }
    const end = new Date(d.getFullYear(), d.getMonth() + 1, salaryStartDay - 1);
    const label = `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} - ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}`;
    cycles.push({
      label,
      startStr: d.toISOString().slice(0, 10),
      endStr: end.toISOString().slice(0, 10),
      start: d,
      end,
    });
  }
  return cycles;
}

function calcHours(entry, exit) {
  if (!entry || !exit) return 0;
  const [eh, em] = entry.split(':').map(Number);
  const [xh, xm] = exit.split(':').map(Number);
  const diff = (xh * 60 + xm) - (eh * 60 + em);
  return Math.max(0, +(diff / 60).toFixed(1));
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function WorkHoursScreen() {
  const { user } = useAuth();
  const { workHours, addWorkHours, updateWorkHours, users } = useData();

  const isOwner = user?.role === 'owner';
  const workers = useMemo(
    () => (isOwner ? users.filter((u) => u.role === 'worker' && u.active !== false) : users.filter((u) => u.id === user?.userId)),
    [users, isOwner, user],
  );

  // Worker selector (for non-owner, lock to self)
  const [selectedWorkerId, setSelectedWorkerId] = useState(
    isOwner ? null : user?.userId,
  );

  // Determine salaryStartDay from selected worker (or default)
  const selectedWorker = useMemo(
    () => workers.find((w) => w.id === selectedWorkerId),
    [workers, selectedWorkerId],
  );
  const salaryStartDay = selectedWorker?.salaryStartDay || DEFAULT_SALARY_START_DAY;

  const cycles = useMemo(() => getCycles(salaryStartDay), [salaryStartDay]);
  const [cycleIdx, setCycleIdx] = useState(0);
  const cycle = cycles[cycleIdx];

  const [expandedWorker, setExpandedWorker] = useState(null);

  // Add entry sheet
  const [addVisible, setAddVisible] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [addWorkerId, setAddWorkerId] = useState(null);

  const openAddEntry = (workerId) => {
    setAddWorkerId(workerId);
    setEditEntry(null);
    setAddVisible(true);
  };

  const openEditEntry = (entry, workerId) => {
    setAddWorkerId(workerId);
    setEditEntry(entry);
    setAddVisible(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Cycle selector */}
      <Text style={styles.sectionLabel}>Pay Cycle</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cycleScroll}>
        {cycles.map((c, i) => {
          const active = i === cycleIdx;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.cycleChip, active && styles.cycleChipActive]}
              onPress={() => setCycleIdx(i)}
            >
              <Text style={[styles.cycleChipText, active && styles.cycleChipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Worker selector (only if owner) */}
      {isOwner && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Worker</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cycleScroll}>
            <TouchableOpacity
              style={[styles.cycleChip, !selectedWorkerId && styles.cycleChipActive]}
              onPress={() => setSelectedWorkerId(null)}
            >
              <Text style={[styles.cycleChipText, !selectedWorkerId && styles.cycleChipTextActive]}>
                All Workers
              </Text>
            </TouchableOpacity>
            {workers.map((w) => {
              const active = selectedWorkerId === w.id;
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.cycleChip, active && styles.cycleChipActive]}
                  onPress={() => setSelectedWorkerId(w.id)}
                >
                  <Text style={[styles.cycleChipText, active && styles.cycleChipTextActive]}>
                    {w.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Worker cards */}
      {(selectedWorkerId ? workers.filter((w) => w.id === selectedWorkerId) : workers).map(
        (worker, wIdx) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            workHours={workHours}
            cycle={cycle}
            colorIdx={wIdx}
            expanded={expandedWorker === worker.id}
            onToggle={() =>
              setExpandedWorker(expandedWorker === worker.id ? null : worker.id)
            }
            onAddEntry={() => openAddEntry(worker.id)}
            onEditEntry={(entry) => openEditEntry(entry, worker.id)}
          />
        ),
      )}

      {workers.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>No workers found</Text>
        </View>
      )}

      {/* Add/Edit entry sheet */}
      <EntryFormSheet
        visible={addVisible}
        onClose={() => { setAddVisible(false); setEditEntry(null); }}
        workerId={addWorkerId}
        editEntry={editEntry}
        addWorkHours={addWorkHours}
        updateWorkHours={updateWorkHours}
        userName={user?.name || 'Unknown'}
      />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// WorkerCard
// ---------------------------------------------------------------------------
function WorkerCard({ worker, workHours, cycle, colorIdx, expanded, onToggle, onAddEntry, onEditEntry }) {
  const accent = WORKER_PALETTE[colorIdx % WORKER_PALETTE.length];

  const entries = useMemo(() => {
    return workHours
      .filter(
        (e) =>
          e.workerId === worker.id &&
          e.date >= cycle.startStr &&
          e.date <= cycle.endStr,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [workHours, worker.id, cycle]);

  const totalHours = useMemo(
    () => entries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0),
    [entries],
  );

  return (
    <View style={[styles.workerCard, { borderLeftColor: accent }]}>
      <TouchableOpacity style={styles.workerHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.workerAvatar, { backgroundColor: `${accent}22` }]}>
          <Text style={[styles.workerInitial, { color: accent }]}>
            {(worker.name || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.workerName}>{worker.name}</Text>
          <Text style={styles.workerSub}>{entries.length} entries</Text>
        </View>
        <View style={[styles.hoursBadge, { backgroundColor: `${accent}22`, borderColor: accent }]}>
          <Text style={[styles.hoursBadgeText, { color: accent }]}>{totalHours.toFixed(1)}h</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.workerBody}>
          {entries.length === 0 && (
            <Text style={styles.noEntries}>No entries this cycle</Text>
          )}
          {entries.map((entry) => {
            const sc = SHIFT_COLORS[entry.shiftType] || colors.textSecondary;
            return (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryRow}
                activeOpacity={0.7}
                onPress={() => onEditEntry(entry)}
              >
                <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                <View style={[styles.shiftBadge, { backgroundColor: `${sc}22`, borderColor: sc }]}>
                  <Text style={[styles.shiftBadgeText, { color: sc }]}>
                    {entry.shiftType}
                  </Text>
                </View>
                {entry.shiftType !== 'Leave' ? (
                  <Text style={styles.entryTimes}>
                    {entry.entryTime || '—'} - {entry.exitTime || '—'}
                  </Text>
                ) : (
                  <Text style={[styles.entryTimes, { color: colors.red }]}>
                    {entry.leaveType || 'Leave'}
                  </Text>
                )}
                <Text style={styles.entryHours}>
                  {entry.shiftType !== 'Leave' ? `${entry.hours || 0}h` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Notes for latest entry */}
          <TouchableOpacity style={styles.addEntryBtn} onPress={onAddEntry}>
            <Ionicons name="add-circle" size={18} color={accent} />
            <Text style={[styles.addEntryText, { color: accent }]}>Add Entry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// EntryFormSheet
// ---------------------------------------------------------------------------
function EntryFormSheet({ visible, onClose, workerId, editEntry, addWorkHours, updateWorkHours, userName }) {
  const isEdit = !!editEntry;

  const [date, setDate] = useState(editEntry?.date || new Date().toISOString().slice(0, 10));
  const [shiftType, setShiftType] = useState(editEntry?.shiftType || 'Morning');
  const [entryTime, setEntryTime] = useState(editEntry?.entryTime || SHIFT_DEFAULTS.Morning.entry);
  const [exitTime, setExitTime] = useState(editEntry?.exitTime || SHIFT_DEFAULTS.Morning.exit);
  const [leaveType, setLeaveType] = useState(editEntry?.leaveType || 'Casual Leave');
  const [notes, setNotes] = useState(editEntry?.notes || '');
  const [saving, setSaving] = useState(false);

  // Reset on open
  React.useEffect(() => {
    if (visible) {
      if (editEntry) {
        setDate(editEntry.date || new Date().toISOString().slice(0, 10));
        setShiftType(editEntry.shiftType || 'Morning');
        setEntryTime(editEntry.entryTime || '09:00');
        setExitTime(editEntry.exitTime || '13:00');
        setLeaveType(editEntry.leaveType || 'Casual Leave');
        setNotes(editEntry.notes || '');
      } else {
        setDate(new Date().toISOString().slice(0, 10));
        setShiftType('Morning');
        setEntryTime('09:00');
        setExitTime('13:00');
        setLeaveType('Casual Leave');
        setNotes('');
      }
    }
  }, [visible, editEntry]);

  const handleShiftChange = (type) => {
    setShiftType(type);
    if (type !== 'Leave' && SHIFT_DEFAULTS[type]) {
      setEntryTime(SHIFT_DEFAULTS[type].entry);
      setExitTime(SHIFT_DEFAULTS[type].exit);
    }
  };

  const hours = shiftType !== 'Leave' ? calcHours(entryTime, exitTime) : 0;

  const handleSave = async () => {
    if (!date) {
      Alert.alert('Error', 'Please enter a date');
      return;
    }
    setSaving(true);
    const record = {
      workerId,
      date,
      shiftType,
      entryTime: shiftType !== 'Leave' ? entryTime : null,
      exitTime: shiftType !== 'Leave' ? exitTime : null,
      hours: shiftType !== 'Leave' ? hours : 0,
      leaveType: shiftType === 'Leave' ? leaveType : null,
      notes: notes.trim(),
      addedBy: userName,
    };

    try {
      if (isEdit) {
        await updateWorkHours(editEntry.id, record);
      } else {
        await addWorkHours(record);
      }
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Failed to save entry');
    }
    setSaving(false);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit Entry' : 'Add Entry'}
      icon={isEdit ? 'create' : 'add-circle'}
      iconColor={colors.green}
    >
      {/* Date */}
      <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.formInput}
        value={date}
        onChangeText={setDate}
        placeholder="2026-04-21"
        placeholderTextColor={colors.textSecondary}
      />

      {/* Shift type */}
      <Text style={styles.formLabel}>Shift Type</Text>
      <View style={styles.shiftRow}>
        {SHIFT_TYPES.map((s) => {
          const active = shiftType === s;
          const sc = SHIFT_COLORS[s];
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.shiftOption,
                active && { backgroundColor: `${sc}22`, borderColor: sc },
              ]}
              onPress={() => handleShiftChange(s)}
            >
              <Text style={[styles.shiftOptionText, active && { color: sc }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {shiftType !== 'Leave' ? (
        <>
          {/* Entry / Exit times */}
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Entry Time</Text>
              <TextInput
                style={styles.formInput}
                value={entryTime}
                onChangeText={setEntryTime}
                placeholder="09:00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Exit Time</Text>
              <TextInput
                style={styles.formInput}
                value={exitTime}
                onChangeText={setExitTime}
                placeholder="13:00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          <View style={styles.calcHours}>
            <Ionicons name="time" size={16} color={colors.accent} />
            <Text style={styles.calcHoursText}>Calculated: {hours} hours</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.formLabel}>Leave Type</Text>
          <View style={styles.shiftRow}>
            {LEAVE_TYPES.map((lt) => {
              const active = leaveType === lt;
              return (
                <TouchableOpacity
                  key={lt}
                  style={[styles.leaveOption, active && styles.leaveOptionActive]}
                  onPress={() => setLeaveType(lt)}
                >
                  <Text style={[styles.leaveOptionText, active && styles.leaveOptionTextActive]}>
                    {lt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Notes */}
      <Text style={styles.formLabel}>Notes</Text>
      <TextInput
        style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
        value={notes}
        onChangeText={setNotes}
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
            <Ionicons name="checkmark-circle" size={20} color={colors.white} />
            <Text style={styles.saveBtnText}>{isEdit ? 'Update Entry' : 'Save Entry'}</Text>
          </>
        )}
      </TouchableOpacity>
    </BottomSheet>
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
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  // Cycle / worker chips
  cycleScroll: {
    marginBottom: spacing.md,
  },
  cycleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    marginRight: 8,
  },
  cycleChipActive: {
    backgroundColor: `${colors.accent}22`,
    borderColor: colors.accent,
  },
  cycleChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  cycleChipTextActive: {
    color: colors.accent,
  },
  // Worker card
  workerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: 10,
  },
  workerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInitial: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  workerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  workerSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  hoursBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  hoursBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  workerBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noEntries: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  // Entry row
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  entryDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    width: 55,
  },
  shiftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  shiftBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  entryTimes: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  entryHours: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    width: 35,
    textAlign: 'right',
  },
  addEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.md,
  },
  addEntryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  // Form
  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: spacing.md,
  },
  formInput: {
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  shiftRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  shiftOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgDark,
  },
  shiftOptionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  leaveOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgDark,
    marginBottom: 4,
  },
  leaveOptionActive: {
    backgroundColor: `${colors.red}22`,
    borderColor: colors.red,
  },
  leaveOptionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  leaveOptionTextActive: {
    color: colors.red,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  calcHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  calcHoursText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    marginTop: spacing.lg,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
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
