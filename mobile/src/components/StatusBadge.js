import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight } from '../theme';

const STATUS_STYLES = {
  Paid: { bg: 'rgba(16,185,129,0.12)', color: colors.green, border: 'rgba(16,185,129,0.25)' },
  Due: { bg: 'rgba(248,113,113,0.12)', color: colors.red, border: 'rgba(248,113,113,0.25)' },
  Partial: { bg: 'rgba(99,102,241,0.12)', color: colors.accent, border: 'rgba(99,102,241,0.25)' },
  Pending: { bg: 'rgba(245,158,11,0.12)', color: colors.yellow, border: 'rgba(245,158,11,0.25)' },
  'In Progress': { bg: 'rgba(99,102,241,0.12)', color: colors.accent, border: 'rgba(99,102,241,0.25)' },
  Completed: { bg: 'rgba(16,185,129,0.12)', color: colors.green, border: 'rgba(16,185,129,0.25)' },
  Active: { bg: 'rgba(16,185,129,0.12)', color: colors.green, border: 'rgba(16,185,129,0.25)' },
};

const PaymentBadge = ({ mode }) => {
  const m = (mode || '').toLowerCase();
  const style = m === 'cash' ? STATUS_STYLES.Paid
    : m === 'phonepe' ? STATUS_STYLES.Partial
    : m === 'gpay' ? { bg: 'rgba(6,182,212,0.12)', color: colors.cyan, border: 'rgba(6,182,212,0.25)' }
    : { bg: 'rgba(255,255,255,0.06)', color: colors.textSecondary, border: colors.border };

  return (
    <View style={[styles.badge, { backgroundColor: style.bg, borderColor: style.border }]}>
      <Text style={[styles.badgeText, { color: style.color }]}>{mode || '—'}</Text>
    </View>
  );
};

const StatusBadge = ({ status, size = 'sm' }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Due;
  const isLg = size === 'lg';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: s.bg, borderColor: s.border },
      isLg && styles.badgeLg,
    ]}>
      <Text style={[
        styles.badgeText,
        { color: s.color },
        isLg && styles.badgeTextLg,
      ]}>{status || '—'}</Text>
    </View>
  );
};

const ServiceBadge = ({ type }) => {
  const isTV = type === 'tv';
  const isNet = type === 'internet';
  const isBoth = type === 'both';

  const bg = isTV ? 'rgba(168,85,247,0.15)' : isNet ? 'rgba(6,182,212,0.15)' : 'rgba(99,102,241,0.15)';
  const color = isTV ? colors.purple : isNet ? colors.cyan : colors.accent;
  const border = isTV ? 'rgba(168,85,247,0.25)' : isNet ? 'rgba(6,182,212,0.25)' : 'rgba(99,102,241,0.25)';
  const label = isTV ? 'TV' : isNet ? 'Internet' : isBoth ? 'Both' : type;

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeLg: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  badgeTextLg: {
    fontSize: fontSize.sm,
  },
});

export { StatusBadge, PaymentBadge, ServiceBadge };
export default StatusBadge;
