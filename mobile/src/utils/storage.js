import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys — identical to web app for future Firebase migration
const KEYS = {
  USERS: 'sln_users',
  AUTH: 'sln_auth',
  CUSTOMERS: 'sln_customers',
  BILLS: 'sln_bills',
  COMPLAINTS: 'sln_complaints',
  HANDOVERS: 'sln_handovers',
  WORK_HOURS: 'sln_work_hours',
  SALARY: 'sln_salary',
  SALARY_CONFIG: 'sln_salary_config',
};

const get = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error reading ${key}`, e);
    return [];
  }
};

const set = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error writing ${key}`, e);
  }
};

export const storage = {
  getUsers: () => get(KEYS.USERS),
  setUsers: (data) => set(KEYS.USERS, data),

  getAuth: async () => {
    try {
      const data = await AsyncStorage.getItem(KEYS.AUTH);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  },
  setAuth: async (data) => {
    if (data) {
      await AsyncStorage.setItem(KEYS.AUTH, JSON.stringify(data));
    } else {
      await AsyncStorage.removeItem(KEYS.AUTH);
    }
  },

  getCustomers: () => get(KEYS.CUSTOMERS),
  setCustomers: (data) => set(KEYS.CUSTOMERS, data),

  getBills: () => get(KEYS.BILLS),
  setBills: (data) => set(KEYS.BILLS, data),

  getComplaints: () => get(KEYS.COMPLAINTS),
  setComplaints: (data) => set(KEYS.COMPLAINTS, data),

  getHandovers: () => get(KEYS.HANDOVERS),
  setHandovers: (data) => set(KEYS.HANDOVERS, data),

  getWorkHours: () => get(KEYS.WORK_HOURS),
  setWorkHours: (data) => set(KEYS.WORK_HOURS, data),

  getSalary: () => get(KEYS.SALARY),
  setSalary: (data) => set(KEYS.SALARY, data),

  getSalaryConfig: () => get(KEYS.SALARY_CONFIG),
  setSalaryConfig: (data) => set(KEYS.SALARY_CONFIG, data),
};
