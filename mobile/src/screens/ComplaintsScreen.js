import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { StatusBadge, ServiceBadge } from '../components/StatusBadge';
import BottomSheet from '../components/BottomSheet';

// ---------------------------------------------------------------------------
// Status / service constants
// ---------------------------------------------------------------------------
const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Completed'];
const SERVICE_FILTERS = ['All', 'TV', 'Internet', 'General'];

const STATUS_DOT = {
  Pending: colors.yellow,
  'In Progress': colors.accent,
  Completed: colors.green,
};

const STATUS_TAB_COLORS = {
  Pending: colors.red,
  'In Progress': colors.yellow,
  Completed: colors.green,
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function ComplaintsScreen() {
  const { user } = useAuth();
  const { complaints, customers, addComplaint, updateComplaint } = useData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');

  // Detail sheet
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // New complaint sheet
  const [newVisible, setNewVisible] = useState(false);

  // Filtered complaints
  const filtered = useMemo(() => {
    let list = [...complaints].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    if (statusFilter !== 'All') {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (serviceFilter !== 'All') {
      list = list.filter(
        (c) => (c.serviceType || '').toLowerCase() === serviceFilter.toLowerCase(),
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => (c.customerName || '').toLowerCase().includes(q));
    }
    return list;
  }, [complaints, statusFilter, serviceFilter, search]);

  const openDetail = (item) => {
    setSelectedComplaint(item);
    setDetailVisible(true);
  };

  // -------------------------------------------------------------------
  // Render complaint row
  // -------------------------------------------------------------------
  const renderItem = ({ item }) => {
    const dotColor = STATUS_DOT[item.status] || colors.textSecondary;
    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: '2-digit',
        })
      : '';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => openDetail(item)}
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.rowBody}>
          <Text style={styles.rowName}>{item.customerName || 'Unknown'}</Text>
          <Text style={styles.rowIssue} numberOfLines={2}>
            {item.description || item.issue || '—'}
          </Text>
          <View style={styles.rowMeta}>
            <ServiceBadge type={(item.serviceType || 'general').toLowerCase()} />
            <Text style={styles.rowDate}>{date}</Text>
            <StatusBadge status={item.status} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // -------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Complaints</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setNewVisible(true)}
        >
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.newBtnText}>New Complaint</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customer name..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter tabs */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((s) => {
          const active = statusFilter === s;
          const tabColor = STATUS_TAB_COLORS[s] || colors.accent;
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.filterTab,
                active && { backgroundColor: `${tabColor}22`, borderColor: tabColor },
              ]}
              onPress={() => setStatusFilter(s)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  active && { color: tabColor },
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Service filter */}
      <View style={styles.filterRow}>
        {SERVICE_FILTERS.map((s) => {
          const active = serviceFilter === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setServiceFilter(s)}
            >
              <Text
                style={[styles.filterTabText, active && styles.filterTabTextActive]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No complaints found</Text>
          </View>
        }
      />

      {/* Detail Sheet */}
      {selectedComplaint && (
        <ComplaintDetailSheet
          visible={detailVisible}
          onClose={() => { setDetailVisible(false); setSelectedComplaint(null); }}
          complaint={selectedComplaint}
          updateComplaint={updateComplaint}
          userName={user?.name || 'Unknown'}
        />
      )}

      {/* New Complaint Sheet */}
      <NewComplaintSheet
        visible={newVisible}
        onClose={() => setNewVisible(false)}
        customers={customers}
        addComplaint={addComplaint}
        userName={user?.name || 'Unknown'}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// ComplaintDetailSheet
// ---------------------------------------------------------------------------
function ComplaintDetailSheet({ visible, onClose, complaint, updateComplaint, userName }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const notes = complaint.notes || [];
  const statuses = ['Pending', 'In Progress', 'Completed'];

  const handleStatusChange = async (newStatus) => {
    if (newStatus === complaint.status) return;
    setSaving(true);
    try {
      await updateComplaint(complaint.id, { status: newStatus });
      complaint.status = newStatus;
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
    setSaving(false);
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    const newNote = {
      text: note.trim(),
      addedBy: userName,
      date: new Date().toISOString(),
    };
    try {
      const updatedNotes = [...notes, newNote];
      await updateComplaint(complaint.id, { notes: updatedNotes });
      complaint.notes = updatedNotes;
      setNote('');
    } catch (e) {
      Alert.alert('Error', 'Failed to add note');
    }
    setSaving(false);
  };

  const date = complaint.createdAt
    ? new Date(complaint.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={complaint.customerName || 'Complaint'}
      subtitle={complaint.customerPhone || complaint.phone || ''}
      icon="chatbubble-ellipses"
      iconColor={colors.accent}
    >
      {/* Meta row */}
      <View style={styles.detailMeta}>
        <ServiceBadge type={(complaint.serviceType || 'general').toLowerCase()} />
        <Text style={styles.detailDate}>{date}</Text>
        {complaint.createdByName && (
          <Text style={styles.detailCreatedBy}>by {complaint.createdByName}</Text>
        )}
      </View>

      {/* Issue description */}
      <View style={styles.descCard}>
        <Text style={styles.descLabel}>Issue</Text>
        <Text style={styles.descText}>
          {complaint.description || complaint.issue || '—'}
        </Text>
      </View>

      {/* Status buttons */}
      <Text style={styles.sectionLabel}>Status</Text>
      <View style={styles.statusRow}>
        {statuses.map((s) => {
          const active = complaint.status === s;
          const c = STATUS_DOT[s] || colors.textSecondary;
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusBtn,
                active && { backgroundColor: `${c}22`, borderColor: c },
              ]}
              onPress={() => handleStatusChange(s)}
              disabled={saving}
            >
              <Text style={[styles.statusBtnText, active && { color: c }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notes timeline */}
      <Text style={styles.sectionLabel}>Notes</Text>
      {notes.length === 0 && (
        <Text style={styles.noNotes}>No notes yet</Text>
      )}
      {notes.map((n, i) => (
        <View key={i} style={styles.noteItem}>
          <View style={styles.noteDot} />
          <View style={styles.noteBody}>
            <Text style={styles.noteText}>{n.text}</Text>
            <Text style={styles.noteMeta}>
              {n.addedBy || 'Unknown'} &middot;{' '}
              {n.date
                ? new Date(n.date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </Text>
          </View>
        </View>
      ))}

      {/* Add note */}
      <View style={styles.addNoteRow}>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note..."
          placeholderTextColor={colors.textSecondary}
          value={note}
          onChangeText={setNote}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !note.trim() && { opacity: 0.4 }]}
          onPress={handleAddNote}
          disabled={saving || !note.trim()}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="send" size={18} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// NewComplaintSheet
// ---------------------------------------------------------------------------
function NewComplaintSheet({ visible, onClose, customers, addComplaint, userName }) {
  const [custSearch, setCustSearch] = useState('');
  const [selectedCust, setSelectedCust] = useState(null);
  const [serviceType, setServiceType] = useState('General');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredCusts = useMemo(() => {
    if (!custSearch.trim()) return [];
    const q = custSearch.trim().toLowerCase();
    return customers
      .filter((c) => (c.name || '').toLowerCase().includes(q))
      .slice(0, 10);
  }, [custSearch, customers]);

  const handleSubmit = async () => {
    if (!selectedCust) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    setSaving(true);
    try {
      await addComplaint({
        customerId: selectedCust.id,
        customerName: selectedCust.name,
        customerPhone: selectedCust.phone || '',
        description: description.trim(),
        serviceType,
        createdByName: userName,
        notes: [],
      });
      // Reset & close
      setCustSearch('');
      setSelectedCust(null);
      setServiceType('General');
      setDescription('');
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Failed to create complaint');
    }
    setSaving(false);
  };

  const reset = () => {
    setCustSearch('');
    setSelectedCust(null);
    setServiceType('General');
    setDescription('');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={reset}
      title="New Complaint"
      icon="add-circle"
      iconColor={colors.green}
    >
      {/* Customer search */}
      <Text style={styles.formLabel}>Customer</Text>
      {selectedCust ? (
        <View style={styles.selectedCust}>
          <Text style={styles.selectedCustName}>{selectedCust.name}</Text>
          <TouchableOpacity onPress={() => { setSelectedCust(null); setCustSearch(''); }}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customer..."
              placeholderTextColor={colors.textSecondary}
              value={custSearch}
              onChangeText={setCustSearch}
            />
          </View>
          {filteredCusts.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.custOption}
              onPress={() => {
                setSelectedCust(c);
                setCustSearch(c.name);
              }}
            >
              <Text style={styles.custOptionText}>{c.name}</Text>
              <Text style={styles.custOptionSub}>{c.phone || c.area || ''}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Service type */}
      <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Service Type</Text>
      <View style={styles.filterRow}>
        {['TV', 'Internet', 'General'].map((s) => {
          const active = serviceType === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setServiceType(s)}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Description */}
      <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Description</Text>
      <TextInput
        style={styles.textarea}
        placeholder="Describe the issue..."
        placeholderTextColor={colors.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, saving && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color={colors.white} />
            <Text style={styles.submitBtnText}>Submit Complaint</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
  },
  newBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    paddingVertical: 10,
  },
  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  filterTabActive: {
    backgroundColor: `${colors.accent}22`,
    borderColor: colors.accent,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.accent,
  },
  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  rowBody: {
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  rowIssue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  rowDate: {
    fontSize: fontSize.xs,
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
  // Detail sheet
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  detailDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailCreatedBy: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  descCard: {
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  descLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  descText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  statusBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgDark,
  },
  statusBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  // Notes
  noNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  noteItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  noteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  noteBody: {
    flex: 1,
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  noteText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  noteMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  addNoteRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
    alignItems: 'flex-end',
  },
  noteInput: {
    flex: 1,
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    maxHeight: 80,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // New complaint sheet
  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  selectedCust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectedCustName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  custOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  custOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  custOptionSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  textarea: {
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    marginTop: spacing.lg,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
