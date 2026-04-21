import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, borderRadius, fontSize, fontWeight } from '../theme';

const StatCard = ({ title, value, subtext, icon, color = colors.accent, onPress }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  const rgbaLight = (c, a) => {
    // Convert hex to rgba
    const hex = c.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  return (
    <Wrapper
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.topLine, { backgroundColor: color }]} />
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: rgbaLight(color, 0.12) }]}>
          {icon}
        </View>
        {onPress && <Text style={[styles.arrow, { color }]}>→</Text>}
      </View>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      <Text style={[styles.title, { color }]}>{title}</Text>
      {subtext ? <Text style={styles.subtext} numberOfLines={1}>{subtext}</Text> : null}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    minWidth: 140,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    opacity: 0.6,
  },
  value: {
    fontSize: 26,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  subtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});

export default StatCard;
