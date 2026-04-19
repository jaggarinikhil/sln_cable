export const PERMISSIONS = {
    // Dashboard
    viewDashboard: false,

    // Customers
    viewCustomers: true,
    createCustomer: true,
    editCustomer: true,
    deleteCustomer: false,

    // Bills
    generateBill: true,
    editBill: false,
    deleteBill: false,

    // Payments
    recordPayment: true,
    editPayment: false,
    deletePayment: false,

    // Complaints
    viewComplaints: true,
    createComplaint: true,
    updateComplaintStatus: true,
    deleteComplaint: false,

    // Work Hours
    logOwnHours: true,
    viewAllHours: false,
    editAnyHours: false,

    // Salary
    recordSalary: false,
    editSalary: false,
    viewOwnSalary: true,
    viewAllSalary: false,

    // Reports
    viewReports: false,
    viewWorkerCollections: false,
    viewOwnCollections: true,

    // Workers cash reconciliation
    recordHandover: false,

    // User management
    manageUsers: false,

    // Owner override flags
    canOverrideGeneratedBy: false,
    canOverrideReceivedBy: false
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
    viewOwnCollections: true
};
