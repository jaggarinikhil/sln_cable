import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { PERMISSIONS, OWNER_PRESET, WORKER_PRESET } from '../utils/permissions';
import BottomSheet from '../components/BottomSheet';
import FormInput from '../components/FormInput';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

// ---------------------------------------------------------------------------
// Permission section definitions
// ---------------------------------------------------------------------------
const PERMISSION_SECTIONS = [
  {
    title: 'Dashboard',
    keys: ['viewDashboard'],
  },
  {
    title: 'Customers',
    keys: ['viewCustomers', 'createCustomer', 'editCustomer', 'deleteCustomer'],
  },
  {
    title: 'Bills',
    keys: ['generateBill', 'editBill', 'deleteBill'],
  },
  {
    title: 'Payments',
    keys: ['recordPayment', 'editPayment', 'deletePayment'],
  },
  {
    title: 'Complaints',
    keys: ['viewComplaints', 'createComplaint', 'updateComplaintStatus', 'deleteComplaint'],
  },
  {
    title: 'Work Hours',
    keys: ['logOwnHours', 'viewAllHours', 'editAnyHours'],
  },
  {
    title: 'Salary',
    keys: ['recordSalary', 'editSalary', 'viewOwnSalary', 'viewAllSalary'],
  },
  {
    title: 'Reports',
    keys: ['viewReports', 'viewWorkerCollections', 'viewOwnCollections'],
  },
  {
    title: 'Admin',
    keys: ['manageUsers', 'canOverrideGeneratedBy', 'canOverrideReceivedBy'],
  },
];

const formatPermissionLabel = (key) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

// ---------------------------------------------------------------------------
// Role badge colors
// ---------------------------------------------------------------------------
const ROLE_COLORS = {
  Owner: colors.accent,
  Worker: colors.green,
  Custom: colors.yellow,
};

// ---------------------------------------------------------------------------
// User card component
// ---------------------------------------------------------------------------
const UserCard = ({ user, onEdit, onResetPassword }) => {
  const roleColor = ROLE_COLORS[user.role] || colors.textSecondary;
  const initials = (user.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.userCard}>
      <View style={styles.userCardTop}>
        {/* Avatar */}
        <View style={[styles.avatar, { borderColor: roleColor }]}>
          <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{user.name}</Text>
            {/* Status dot */}
            <View
              style={[
                styles.statusDot,
                { backgroundColor: user.active !== false ? colors.green : colors.red },
              ]}
            />
          </View>
          <Text style={styles.userUsername}>@{user.username}</Text>
        </View>

        {/* Role badge */}
        <View style={[styles.roleBadge, { backgroundColor: `${roleColor}18`, borderColor: `${roleColor}40` }]}>
          <Text style={[styles.roleBadgeText, { color: roleColor }]}>{user.role}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.userActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(user)} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={16} color={colors.accent} />
          <Text style={[styles.actionBtnText, { color: colors.accent }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onResetPassword(user)} activeOpacity={0.7}>
          <Ionicons name="key-outline" size={16} color={colors.yellow} />
          <Text style={[styles.actionBtnText, { color: colors.yellow }]}>Reset Password</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Add / Edit User Sheet
// ---------------------------------------------------------------------------
const UserFormSheet = ({ visible, onClose, editUser, onSave }) => {
  const isEditing = !!editUser;
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Worker');
  const [permissions, setPermissions] = useState({ ...WORKER_PRESET });
  const [monthlySalary, setMonthlySalary] = useState('');
  const [salaryStartDay, setSalaryStartDay] = useState('1');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      if (editUser) {
        setName(editUser.name || '');
        setUsername(editUser.username || '');
        setPassword('');
        setRole(editUser.role || 'Worker');
        setPermissions(editUser.permissions || { ...WORKER_PRESET });
        setMonthlySalary(editUser.monthlySalary ? String(editUser.monthlySalary) : '');
        setSalaryStartDay(editUser.salaryStartDay ? String(editUser.salaryStartDay) : '1');
        setActive(editUser.active !== false);
      } else {
        setName('');
        setUsername('');
        setPassword('');
        setRole('Worker');
        setPermissions({ ...WORKER_PRESET });
        setMonthlySalary('');
        setSalaryStartDay('1');
        setActive(true);
      }
      setErrors({});
    }
  }, [visible, editUser]);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === 'Owner') {
      setPermissions({ ...OWNER_PRESET });
    } else if (newRole === 'Worker') {
      setPermissions({ ...WORKER_PRESET });
    }
    // Custom keeps current permissions
  };

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!username.trim()) e.username = 'Username is required';
    if (!isEditing && !password.trim()) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const userData = {
      name: name.trim(),
      username: username.trim(),
      role,
      permissions,
      monthlySalary: Number(monthlySalary) || 0,
      salaryStartDay: Number(salaryStartDay) || 1,
      active,
    };
    if (!isEditing) {
      userData.password = password;
      userData.id = Date.now().toString();
      userData.createdAt = new Date().toISOString();
    }
    onSave(userData, isEditing ? editUser.id : null);
  };

  const roles = ['Owner', 'Worker', 'Custom'];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Edit User' : 'Add User'}
      subtitle={isEditing ? `Editing ${editUser?.name}` : 'Create a new user account'}
      icon={isEditing ? 'create' : 'person-add'}
      iconColor={colors.accent}
    >
      <FormInput
        label="Name"
        icon={<Ionicons name="person-outline" size={14} color={colors.textSecondary} />}
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        error={errors.name}
      />
      <FormInput
        label="Username"
        icon={<Ionicons name="at" size={14} color={colors.textSecondary} />}
        value={username}
        onChangeText={setUsername}
        placeholder="Login username"
        autoCapitalize="none"
        error={errors.username}
        editable={!isEditing}
      />
      {!isEditing && (
        <FormInput
          label="Password"
          icon={<Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          error={errors.password}
        />
      )}

      {/* Role picker */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Role</Text>
        <View style={styles.roleRow}>
          {roles.map((r) => {
            const selected = role === r;
            const c = ROLE_COLORS[r];
            return (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleChip,
                  selected && { backgroundColor: `${c}20`, borderColor: c },
                ]}
                onPress={() => handleRoleChange(r)}
                activeOpacity={0.7}
              >
                <Text style={[styles.roleChipText, selected && { color: c }]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Custom permissions */}
      {role === 'Custom' && (
        <View style={styles.permissionsWrap}>
          <Text style={styles.permissionsTitle}>Permissions</Text>
          {PERMISSION_SECTIONS.map((section) => (
            <View key={section.title} style={styles.permSection}>
              <Text style={styles.permSectionTitle}>{section.title}</Text>
              {section.keys.map((key) => (
                <View key={key} style={styles.permRow}>
                  <Text style={styles.permLabel}>{formatPermissionLabel(key)}</Text>
                  <Switch
                    value={!!permissions[key]}
                    onValueChange={() => togglePermission(key)}
                    trackColor={{ false: colors.border, true: `${colors.accent}80` }}
                    thumbColor={permissions[key] ? colors.accent : colors.textSecondary}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Salary fields */}
      <FormInput
        label="Monthly Salary"
        icon={<Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />}
        value={monthlySalary}
        onChangeText={setMonthlySalary}
        placeholder="0"
        keyboardType="numeric"
      />
      <FormInput
        label="Salary Start Day"
        icon={<Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />}
        value={salaryStartDay}
        onChangeText={setSalaryStartDay}
        placeholder="1"
        keyboardType="numeric"
      />

      {/* Active toggle */}
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleLabel}>Active</Text>
          <Text style={styles.toggleSub}>User can log in when active</Text>
        </View>
        <Switch
          value={active}
          onValueChange={setActive}
          trackColor={{ false: colors.border, true: `${colors.green}80` }}
          thumbColor={active ? colors.green : colors.textSecondary}
        />
      </View>

      {/* Save button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Ionicons name="checkmark-circle" size={20} color={colors.white} />
        <Text style={styles.saveBtnText}>{isEditing ? 'Update User' : 'Create User'}</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
};

// ---------------------------------------------------------------------------
// Reset Password Sheet
// ---------------------------------------------------------------------------
const ResetPasswordSheet = ({ visible, onClose, user, onSave }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      setNewPassword('');
      setConfirm('');
      setErrors({});
    }
  }, [visible]);

  const handleSave = () => {
    const e = {};
    if (!newPassword.trim()) e.newPassword = 'Password is required';
    if (newPassword !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSave(user?.id, newPassword);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Reset Password"
      subtitle={user?.name}
      icon="key"
      iconColor={colors.yellow}
    >
      <FormInput
        label="New Password"
        icon={<Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Enter new password"
        secureTextEntry
        error={errors.newPassword}
      />
      <FormInput
        label="Confirm Password"
        icon={<Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />}
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Confirm new password"
        secureTextEntry
        error={errors.confirm}
      />
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Ionicons name="checkmark-circle" size={20} color={colors.white} />
        <Text style={styles.saveBtnText}>Reset Password</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
};

// ---------------------------------------------------------------------------
// Change Password Sheet (exported for MoreScreen)
// ---------------------------------------------------------------------------
export const ChangePasswordSheet = ({ visible, onClose }) => {
  const auth = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setErrors({});
    }
  }, [visible]);

  const handleSave = async () => {
    const e = {};
    if (!currentPassword.trim()) e.currentPassword = 'Current password is required';
    if (!newPassword.trim()) e.newPassword = 'New password is required';
    if (newPassword !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    try {
      const users = await storage.getUsers();
      const user = users.find((u) => u.id === auth.user?.userId || u.username === auth.user?.username);
      if (!user) {
        Alert.alert('Error', 'User not found.');
        return;
      }
      if (user.password !== currentPassword) {
        setErrors({ currentPassword: 'Current password is incorrect' });
        return;
      }
      const updated = users.map((u) =>
        u.id === user.id ? { ...u, password: newPassword, updatedAt: new Date().toISOString() } : u,
      );
      await storage.setUsers(updated);
      Alert.alert('Success', 'Password changed successfully.');
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to change password.');
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Change Password"
      subtitle="Update your login password"
      icon="key"
      iconColor={colors.accent}
    >
      <FormInput
        label="Current Password"
        icon={<Ionicons name="lock-open-outline" size={14} color={colors.textSecondary} />}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Enter current password"
        secureTextEntry
        error={errors.currentPassword}
      />
      <FormInput
        label="New Password"
        icon={<Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Enter new password"
        secureTextEntry
        error={errors.newPassword}
      />
      <FormInput
        label="Confirm New Password"
        icon={<Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />}
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Confirm new password"
        secureTextEntry
        error={errors.confirm}
      />
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Ionicons name="checkmark-circle" size={20} color={colors.white} />
        <Text style={styles.saveBtnText}>Change Password</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function UserManagementScreen() {
  const auth = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetPwUser, setResetPwUser] = useState(null);

  const loadUsers = useCallback(async () => {
    const data = await storage.getUsers();
    setUsers(data || []);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleEdit = (user) => {
    setEditUser(user);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditUser(null);
    setShowForm(true);
  };

  const handleSaveUser = async (userData, existingId) => {
    if (!auth.user?.permissions?.manageUsers) return;
    try {
      const allUsers = await storage.getUsers();
      let updated;
      if (existingId) {
        updated = allUsers.map((u) =>
          u.id === existingId ? { ...u, ...userData, updatedAt: new Date().toISOString() } : u,
        );
      } else {
        // Check duplicate username
        if (allUsers.some((u) => u.username === userData.username)) {
          Alert.alert('Error', 'Username already exists.');
          return;
        }
        updated = [...allUsers, userData];
      }
      await storage.setUsers(updated);
      setUsers(updated);
      setShowForm(false);
      setEditUser(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to save user.');
    }
  };

  const handleResetPassword = (user) => {
    setResetPwUser(user);
    setShowResetPw(true);
  };

  const handleSaveResetPassword = async (userId, newPassword) => {
    if (!auth.user?.permissions?.manageUsers) return;
    try {
      const allUsers = await storage.getUsers();
      const updated = allUsers.map((u) =>
        u.id === userId ? { ...u, password: newPassword, updatedAt: new Date().toISOString() } : u,
      );
      await storage.setUsers(updated);
      setUsers(updated);
      setShowResetPw(false);
      setResetPwUser(null);
      Alert.alert('Success', 'Password has been reset.');
    } catch (err) {
      Alert.alert('Error', 'Failed to reset password.');
    }
  };

  const renderUser = ({ item }) => (
    <UserCard user={item} onEdit={handleEdit} onResetPassword={handleResetPassword} />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={20} color={colors.white} />
          <Text style={styles.addBtnText}>Add User</Text>
        </TouchableOpacity>
      </View>

      {/* User list */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id || item.username}
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* Sheets */}
      <UserFormSheet
        visible={showForm}
        onClose={() => { setShowForm(false); setEditUser(null); }}
        editUser={editUser}
        onSave={handleSaveUser}
      />
      <ResetPasswordSheet
        visible={showResetPw}
        onClose={() => { setShowResetPw(false); setResetPwUser(null); }}
        user={resetPwUser}
        onSave={handleSaveResetPassword}
      />
    </View>
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
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  addBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },

  // User card
  userCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgDark,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  userUsername: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  // Form
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgDark,
    alignItems: 'center',
  },
  roleChipText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },

  // Permissions
  permissionsWrap: {
    marginBottom: 14,
  },
  permissionsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  permSection: {
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  permSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  permLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    flex: 1,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 14,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  toggleSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  saveBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: 12,
  },
});
