import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

const rgba = (c, a) => {
  const hex = (c || '#94a3b8').replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

/**
 * Searchable dropdown for picking from a list of options.
 * options: [{ key, label, icon, color }]
 */
export default function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  title = 'Select',
  searchPlaceholder = 'Search…',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((o) => o.key === value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.key.toLowerCase().includes(q),
    );
  }, [options, search]);

  return (
    <>
      <TouchableOpacity style={styles.btn} onPress={() => setOpen(true)} activeOpacity={0.7}>
        {selected ? (
          <>
            <View style={[styles.icon, { backgroundColor: rgba(selected.color, 0.15) }]}>
              <Ionicons name={selected.icon} size={14} color={selected.color} />
            </View>
            <Text style={styles.text}>{selected.label}</Text>
          </>
        ) : (
          <Text style={[styles.text, { color: colors.textSecondary }]}>{placeholder}</Text>
        )}
        <Ionicons
          name="chevron-down"
          size={16}
          color={colors.textSecondary}
          style={{ marginLeft: 'auto' }}
        />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView
              style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}
              keyboardShouldPersistTaps="handled"
            >
              {filtered.length === 0 ? (
                <Text style={styles.empty}>No matches for "{search}"</Text>
              ) : (
                filtered.map((opt) => {
                  const active = opt.key === value;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.row, active && { backgroundColor: rgba(opt.color, 0.1) }]}
                      onPress={() => {
                        onChange(opt.key);
                        setSearch('');
                        setOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.icon, { backgroundColor: rgba(opt.color, 0.15) }]}>
                        <Ionicons name={opt.icon} size={16} color={opt.color} />
                      </View>
                      <Text
                        style={[
                          styles.rowText,
                          active && { color: opt.color, fontWeight: fontWeight.bold },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {active && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={opt.color}
                          style={{ marginLeft: 'auto' }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
              <View style={{ height: spacing.xl }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: fontSize.md, color: colors.textPrimary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, padding: 0 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: fontSize.md, color: colors.textPrimary },

  empty: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', padding: spacing.lg },
});
