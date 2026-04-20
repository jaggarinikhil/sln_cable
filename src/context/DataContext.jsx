import React, { createContext, useContext, useState, useEffect } from 'react';
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

    useEffect(() => {
        const stored = storage.getCustomers();
        const normalized = stored.map(c => ({
            ...c,
            services: c.services || {
                tv: { active: !!c.boxNumber, monthlyRate: 300, installationFee: 0 },
                internet: { active: false, monthlyRate: 0, installationFee: 0 }
            }
        }));
        setCustomers(normalized);
        setBills(storage.getBills());
        setComplaints(storage.getComplaints());
        setHandovers(storage.getHandovers());
        setWorkHours(storage.getWorkHours());
        setSalary(storage.getSalary());
        setUsers(storage.getUsers());
    }, []);

    const refreshData = () => {
        setCustomers(storage.getCustomers());
        setBills(storage.getBills());
        setComplaints(storage.getComplaints());
        setHandovers(storage.getHandovers());
        setWorkHours(storage.getWorkHours());
        setSalary(storage.getSalary());
        setUsers(storage.getUsers());
    };

    const addCustomer = (customer) => {
        const newId = Date.now().toString();
        const updated = [...customers, { ...customer, id: newId, createdAt: new Date().toISOString() }];
        storage.setCustomers(updated);
        setCustomers(updated);
        return newId;
    };

    const updateCustomer = (id, updates) => {
        const updated = customers.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
        storage.setCustomers(updated);
        setCustomers(updated);
    };

    const addBill = (bill) => {
        const updated = [...bills, { ...bill, id: Date.now().toString(), createdAt: new Date().toISOString(), modifiedCount: 0 }];
        storage.setBills(updated);
        setBills(updated);
    };

    const updateBill = (id, updates) => {
        const updated = bills.map(b => b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b);
        storage.setBills(updated);
        setBills(updated);
    };

    // Apply multiple bill updates atomically (avoids stale-closure bug when looping)
    const updateMultipleBills = (updatesList) => {
        // updatesList: [{ id, updates }, ...]
        const ts = new Date().toISOString();
        let updated = bills;
        for (const { id, updates } of updatesList) {
            updated = updated.map(b => b.id === id ? { ...b, ...updates, updatedAt: ts } : b);
        }
        storage.setBills(updated);
        setBills(updated);
    };

    const addComplaint = (complaint) => {
        const updated = [...complaints, { ...complaint, id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'Pending' }];
        storage.setComplaints(updated);
        setComplaints(updated);
    };

    const updateComplaintStatus = (id, status) => {
        const updated = complaints.map(c => c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c);
        storage.setComplaints(updated);
        setComplaints(updated);
    };

    const updateComplaint = (id, updates) => {
        const updated = complaints.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
        storage.setComplaints(updated);
        setComplaints(updated);
    };

    return (
        <DataContext.Provider value={{
            customers, addCustomer, updateCustomer,
            bills, addBill, updateBill, updateMultipleBills,
            complaints, addComplaint, updateComplaintStatus, updateComplaint,
            handovers, workHours, salary,
            users, refreshData
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
