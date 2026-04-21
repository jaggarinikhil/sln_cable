import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [salary, setSalary] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [c, b, co, h, w, s, u] = await Promise.all([
        storage.getCustomers(),
        storage.getBills(),
        storage.getComplaints(),
        storage.getHandovers(),
        storage.getWorkHours(),
        storage.getSalary(),
        storage.getUsers(),
      ]);
      const normalized = c.map(cust => ({
        ...cust,
        services: cust.services || {
          tv: { active: !!cust.boxNumber, monthlyRate: 300, installationFee: 0 },
          internet: { active: false, monthlyRate: 0, installationFee: 0 },
        },
      }));
      setCustomers(normalized);
      setBills(b);
      setComplaints(co);
      setHandovers(h);
      setWorkHours(w);
      setSalary(s);
      setUsers(u);
      setLoading(false);
    };
    load();
  }, []);

  const refreshData = useCallback(async () => {
    const [c, b, co, h, w, s, u] = await Promise.all([
      storage.getCustomers(),
      storage.getBills(),
      storage.getComplaints(),
      storage.getHandovers(),
      storage.getWorkHours(),
      storage.getSalary(),
      storage.getUsers(),
    ]);
    setCustomers(c);
    setBills(b);
    setComplaints(co);
    setHandovers(h);
    setWorkHours(w);
    setSalary(s);
    setUsers(u);
  }, []);

  const addCustomer = useCallback(async (customer) => {
    const newId = Date.now().toString();
    const updated = [...customers, { ...customer, id: newId, createdAt: new Date().toISOString() }];
    await storage.setCustomers(updated);
    setCustomers(updated);
    return newId;
  }, [customers]);

  const updateCustomer = useCallback(async (id, updates) => {
    const updated = customers.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
    await storage.setCustomers(updated);
    setCustomers(updated);
  }, [customers]);

  const addBill = useCallback(async (bill) => {
    const updated = [...bills, { ...bill, id: Date.now().toString(), createdAt: new Date().toISOString(), modifiedCount: 0 }];
    await storage.setBills(updated);
    setBills(updated);
  }, [bills]);

  const updateBill = useCallback(async (id, updates) => {
    const updated = bills.map(b => b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b);
    await storage.setBills(updated);
    setBills(updated);
  }, [bills]);

  const updateMultipleBills = useCallback(async (updatesList) => {
    const ts = new Date().toISOString();
    let updated = [...bills];
    for (const { id, updates } of updatesList) {
      updated = updated.map(b => b.id === id ? { ...b, ...updates, updatedAt: ts } : b);
    }
    await storage.setBills(updated);
    setBills(updated);
  }, [bills]);

  const addComplaint = useCallback(async (complaint) => {
    const updated = [...complaints, { ...complaint, id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'Pending' }];
    await storage.setComplaints(updated);
    setComplaints(updated);
  }, [complaints]);

  const updateComplaintStatus = useCallback(async (id, status) => {
    const updated = complaints.map(c => c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c);
    await storage.setComplaints(updated);
    setComplaints(updated);
  }, [complaints]);

  const updateComplaint = useCallback(async (id, updates) => {
    const updated = complaints.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
    await storage.setComplaints(updated);
    setComplaints(updated);
  }, [complaints]);

  const addWorkHours = useCallback(async (entry) => {
    const updated = [...workHours, { ...entry, id: Date.now().toString(), createdAt: new Date().toISOString() }];
    await storage.setWorkHours(updated);
    setWorkHours(updated);
  }, [workHours]);

  const updateWorkHours = useCallback(async (id, updates) => {
    const updated = workHours.map(w => w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w);
    await storage.setWorkHours(updated);
    setWorkHours(updated);
  }, [workHours]);

  const addSalary = useCallback(async (record) => {
    const updated = [...salary, { ...record, id: Date.now().toString(), createdAt: new Date().toISOString() }];
    await storage.setSalary(updated);
    setSalary(updated);
  }, [salary]);

  const updateSalary = useCallback(async (id, updates) => {
    const updated = salary.map(s => s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s);
    await storage.setSalary(updated);
    setSalary(updated);
  }, [salary]);

  return (
    <DataContext.Provider value={{
      customers, addCustomer, updateCustomer,
      bills, addBill, updateBill, updateMultipleBills,
      complaints, addComplaint, updateComplaintStatus, updateComplaint,
      handovers, workHours, addWorkHours, updateWorkHours,
      salary, addSalary, updateSalary,
      users, refreshData, loading,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
