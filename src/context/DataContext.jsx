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
                tv: { active: !!c.boxNumber, monthlyRate: 300 },
                internet: { active: false, monthlyRate: 800 }
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
        const updated = [...customers, { ...customer, id: Date.now().toString(), createdAt: new Date().toISOString() }];
        storage.setCustomers(updated);
        setCustomers(updated);
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

    // Add more helpers as needed for complaints, salary, etc.

    return (
        <DataContext.Provider value={{
            customers, addCustomer, updateCustomer,
            bills, addBill, updateBill,
            complaints, handovers, workHours, salary,
            users, refreshData
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
