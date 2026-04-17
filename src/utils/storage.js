// Bills
export const getBills = () => {
  const data = localStorage.getItem('sln_bills');
  return data ? JSON.parse(data) : [];
};

export const saveBills = (bills) => {
  localStorage.setItem('sln_bills', JSON.stringify(bills));
};

export const addBill = (bill) => {
  const bills = getBills();
  const totalAmount = parseFloat(bill.totalAmount) || 0;
  const amountPaid = parseFloat(bill.amountPaid) || 0;
  const newBill = {
    ...bill,
    id: Date.now().toString(),
    totalAmount,
    amountPaid,
    balanceAmount: totalAmount - amountPaid,
    billGeneratedDate: bill.billGeneratedDate || new Date().toISOString().split('T')[0],
    billPaidDate: bill.billPaidDate || '',
    createdAt: new Date().toISOString(),
    modifiedCount: 0,
  };
  saveBills([...bills, newBill]);
  return newBill;
};

export const updateBill = (id, updates, role) => {
  const bills = getBills();
  const idx = bills.findIndex(b => b.id === id);
  if (idx === -1) return { success: false, message: 'Bill not found' };

  const bill = bills[idx];

  if (role === 'worker' && bill.modifiedCount >= 1) {
    return { success: false, message: 'Edit limit reached' };
  }

  const totalAmount = parseFloat(updates.totalAmount) || 0;
  const amountPaid = parseFloat(updates.amountPaid) || 0;

  const updatedBill = {
    ...bill,
    ...updates,
    totalAmount,
    amountPaid,
    balanceAmount: totalAmount - amountPaid,
    modifiedCount: role === 'worker' ? bill.modifiedCount + 1 : bill.modifiedCount,
    updatedAt: new Date().toISOString(),
  };

  bills[idx] = updatedBill;
  saveBills(bills);
  return { success: true, bill: updatedBill };
};

// Complaints
export const getComplaints = () => {
  const data = localStorage.getItem('sln_complaints');
  return data ? JSON.parse(data) : [];
};

export const saveComplaints = (complaints) => {
  localStorage.setItem('sln_complaints', JSON.stringify(complaints));
};

export const addComplaint = (complaint) => {
  const complaints = getComplaints();
  const newComplaint = {
    ...complaint,
    id: Date.now().toString(),
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };
  saveComplaints([...complaints, newComplaint]);
  return newComplaint;
};

export const updateComplaintStatus = (id, status) => {
  const complaints = getComplaints();
  const idx = complaints.findIndex(c => c.id === id);
  if (idx === -1) return false;
  complaints[idx] = { ...complaints[idx], status, updatedAt: new Date().toISOString() };
  saveComplaints(complaints);
  return true;
};
