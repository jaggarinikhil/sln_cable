import { colors } from '../theme';

// Source-of-truth list of accounts. Add/remove here.
// Each entry: key (stable id), label (display), short (badge), color, icon
export const ACCOUNTS = [
  { key: 'cash',           label: 'Cash',             short: 'Cash',  color: colors.green,  icon: 'cash-outline' },
  { key: 'amma_canara',    label: "Amma's Canara",    short: 'A·CB',  color: colors.yellow, icon: 'card-outline' },
  { key: 'amma_baroda',    label: "Amma's Baroda",    short: 'A·BB',  color: colors.pink,   icon: 'card-outline' },
  { key: 'nikhil_canara',  label: "Nikhil's Canara",  short: 'N·CB',  color: colors.cyan,   icon: 'card-outline' },
  { key: 'nikhil_baroda',  label: "Nikhil's Baroda",  short: 'N·BB',  color: colors.purple, icon: 'card-outline' },
  { key: 'akhil_canara',   label: "Akhil's Canara",   short: 'Ak·CB', color: colors.blue,   icon: 'card-outline' },
  { key: 'akhil_axis',     label: "Akhil's Axis",     short: 'Ak·AX', color: colors.accent, icon: 'card-outline' },
  { key: 'other',          label: 'Other',            short: 'Other', color: colors.textSecondary, icon: 'wallet-outline' },
];

export const getAccount = (key) =>
  ACCOUNTS.find((a) => a.key === key) || ACCOUNTS[ACCOUNTS.length - 1];
