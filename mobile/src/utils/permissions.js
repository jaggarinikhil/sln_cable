export const PERMISSIONS = {
  viewDashboard: false,
  viewCustomers: true,
  createCustomer: true,
  editCustomer: true,
  deleteCustomer: false,
  generateBill: true,
  editBill: false,
  deleteBill: false,
  recordPayment: true,
  editPayment: false,
  deletePayment: false,
  viewComplaints: true,
  createComplaint: true,
  updateComplaintStatus: true,
  deleteComplaint: false,
  logOwnHours: true,
  viewAllHours: false,
  editAnyHours: false,
  recordSalary: false,
  editSalary: false,
  viewOwnSalary: true,
  viewAllSalary: false,
  viewReports: false,
  viewWorkerCollections: false,
  viewOwnCollections: true,
  recordHandover: false,
  manageUsers: false,
  canOverrideGeneratedBy: false,
  canOverrideReceivedBy: false,
};

export const OWNER_PRESET = Object.keys(PERMISSIONS).reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, {});

export const WORKER_PRESET = {
  ...PERMISSIONS,
  viewCustomers: true,
  createCustomer: true,
  editCustomer: true,
  generateBill: true,
  recordPayment: true,
  viewComplaints: true,
  createComplaint: true,
  updateComplaintStatus: true,
  logOwnHours: true,
  viewOwnSalary: true,
  viewOwnCollections: true,
};
