import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ChangePasswordSheet } from './UserManagementScreen';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

const MENU_ITEMS = [
  { key: 'Complaints', icon: 'chatbubble-ellipses', label: 'Complaints', permission: 'viewComplaints' },
  { key: 'WorkHours', icon: 'time', label: 'Work Hours', permission: 'logOwnHours' },
  { key: 'Salary', icon: 'wallet', label: 'Salary', permission: 'viewOwnSalary' },
  { key: 'Reports', icon: 'bar-chart', label: 'Reports', permission: 'viewReports' },
  { key: 'Expenses', icon: 'card', label: 'Business Expenses', permission: 'viewExpenses' },
  { key: 'Personal', icon: 'briefcase', label: 'Personal Ledger', permission: null, ownerOnly: true },
  { key: 'UserManagement', icon: 'people-circle', label: 'User Management', permission: 'manageUsers' },
  { key: 'CustomerHistory', icon: 'document-text', label: 'Customer History', permission: null },
  { key: 'ChangePassword', icon: 'key', label: 'Change Password', permission: null },
];

export default function MoreScreen({ navigation }) {
  const auth = useAuth();
  const permissions = auth.user?.permissions || {};
  const [showChangePw, setShowChangePw] = useState(false);

  const isOwner = auth.user?.role === 'owner';
  const visibleItems = MENU_ITEMS.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.permission === null) return true;
    return isOwner || permissions[item.permission];
  });

  const handleMenuPress = (key) => {
    if (key === 'ChangePassword') {
      setShowChangePw(true);
    } else {
      navigation.navigate(key);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => auth.logout(),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User info header */}
      <View style={styles.userCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={24} color={colors.accent} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{auth.user?.name || 'User'}</Text>
          <Text style={styles.userRole}>{auth.user?.role || 'Staff'}</Text>
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.menuCard}>
        {visibleItems.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.menuItem,
              index < visibleItems.length - 1 && styles.menuItemBorder,
            ]}
            activeOpacity={0.6}
            onPress={() => handleMenuPress(item.key)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name={item.icon} size={20} color={colors.accent} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutCard}
        activeOpacity={0.7}
        onPress={handleLogout}
      >
        <View style={styles.menuItemLeft}>
          <View style={[styles.menuIconBox, styles.logoutIcon]}>
            <Ionicons name="log-out" size={20} color={colors.red} />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.red} />
      </TouchableOpacity>

      <ChangePasswordSheet visible={showChangePw} onClose={() => setShowChangePw(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: spacing.md,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  userRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  menuCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  logoutIcon: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.red,
  },
});
