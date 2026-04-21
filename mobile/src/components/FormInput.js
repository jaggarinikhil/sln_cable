import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, borderRadius, fontSize, fontWeight } from '../theme';

const FormInput = ({ label, icon, error, style, ...props }) => {
  return (
    <View style={[styles.group, style]}>
      {label && (
        <View style={styles.labelRow}>
          {icon}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={colors.textSecondary}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: fontSize.lg,
  },
  inputError: {
    borderColor: colors.red,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.red,
    marginTop: 4,
  },
});

export default FormInput;
