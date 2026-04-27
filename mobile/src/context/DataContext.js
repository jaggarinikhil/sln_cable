import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../utils/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';

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
    // Subs
    const subs = [
      onSnapshot(collection(db, 'customers'), (snap) => {
        setCustomers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }),
      onSnapshot(query(collection(db, 'bills'), orderBy('createdAt', 'desc')), (snap) => {
        setBills(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }),
      onSnapshot(query(collection(db, 'complaints'), orderBy('createdAt', 'desc')), (snap) => {
        setComplaints(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }),
      onSnapshot(collection(db, 'handovers'), (snap) => {
        setHandovers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }),
      onSnapshot(collection(db, 'workHours'), (snap) => {
        setWorkHours(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }),
      onSnapshot(collection(db, 'salary'), (snap) => {
        setSalary(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }),
      onSnapshot(collection(db, 'users'), (snap) => {
        setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      })
    ];

    setLoading(false);
    return () => subs.forEach(unsub => unsub());
  }, []);

  const addCustomer = useCallback(async (customer) => {
    const docRef = await addDoc(collection(db, 'customers'), {
      ...customer,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  }, []);

  const updateCustomer = useCallback(async (id, updates) => {
    await updateDoc(doc(db, 'customers', id), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }, []);

  const addBill = useCallback(async (bill) => {
    await addDoc(collection(db, 'bills'), {
      ...bill,
      createdAt: new Date().toISOString(),
      modifiedCount: 0
    });
  }, []);

  const updateBill = useCallback(async (id, updates) => {
    await updateDoc(doc(db, 'bills', id), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }, []);

  const updateMultipleBills = useCallback(async (updatesList) => {
    const ts = new Date().toISOString();
    for (const { id, updates } of updatesList) {
      await updateDoc(doc(db, 'bills', id), {
        ...updates,
        updatedAt: ts
      });
    }
  }, []);

  const addComplaint = useCallback(async (complaint) => {
    await addDoc(collection(db, 'complaints'), {
      ...complaint,
      createdAt: new Date().toISOString(),
      status: 'Pending'
    });
  }, []);

  const updateComplaintStatus = useCallback(async (id, status) => {
    await updateDoc(doc(db, 'complaints', id), {
      status,
      updatedAt: new Date().toISOString()
    });
  }, []);

  const updateComplaint = useCallback(async (id, updates) => {
    await updateDoc(doc(db, 'complaints', id), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }, []);

  const addWorkHours = useCallback(async (entry) => {
    await addDoc(collection(db, 'workHours'), {
      ...entry,
      createdAt: new Date().toISOString()
    });
  }, []);

  const updateWorkHours = useCallback(async (id, updates) => {
    await updateDoc(doc(db, 'workHours', id), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }, []);

  const addSalary = useCallback(async (record) => {
    await addDoc(collection(db, 'salary'), {
      ...record,
      createdAt: new Date().toISOString()
    });
  }, []);

  const updateSalary = useCallback(async (id, updates) => {
    await updateDoc(doc(db, 'salary', id), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }, []);

  return (
    <DataContext.Provider value={{
      customers, addCustomer, updateCustomer,
      bills, addBill, updateBill, updateMultipleBills,
      complaints, addComplaint, updateComplaintStatus, updateComplaint,
      handovers, workHours, addWorkHours, updateWorkHours,
      salary, addSalary, updateSalary,
      users, loading,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
