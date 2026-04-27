import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../utils/firebase';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    query,
    orderBy,
    setDoc,
    getDocs,
    getDoc,
    deleteDoc
} from 'firebase/firestore';
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
        // Subscriptions
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

    const addCustomer = async (customer) => {
        const docRef = await addDoc(collection(db, 'customers'), {
            ...customer,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    };

    const updateCustomer = async (id, updates) => {
        await updateDoc(doc(db, 'customers', id), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    };

    const addBill = async (bill) => {
        await addDoc(collection(db, 'bills'), {
            ...bill,
            createdAt: new Date().toISOString(),
            modifiedCount: 0
        });
    };

    const updateBill = async (id, updates) => {
        await updateDoc(doc(db, 'bills', id), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    };

    const updateMultipleBills = async (updatesList) => {
        const ts = new Date().toISOString();
        for (const { id, updates } of updatesList) {
            await updateDoc(doc(db, 'bills', id), {
                ...updates,
                updatedAt: ts
            });
        }
    };

    const addComplaint = async (complaint) => {
        await addDoc(collection(db, 'complaints'), {
            ...complaint,
            createdAt: new Date().toISOString(),
            status: 'Pending'
        });
    };

    const updateComplaintStatus = async (id, status) => {
        await updateDoc(doc(db, 'complaints', id), {
            status,
            updatedAt: new Date().toISOString()
        });
    };

    const updateComplaint = async (id, updates) => {
        await updateDoc(doc(db, 'complaints', id), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    };

    const addUser = async (userData) => {
        // Use username as doc ID for AuthContext compatibility
        const username = userData.username;
        await setDoc(doc(db, 'users', username), {
            ...userData,
            createdAt: new Date().toISOString()
        });
    };

    const updateUser = async (originalUsername, updates) => {
        const userRef = doc(db, 'users', originalUsername);

        if (updates.username && updates.username !== originalUsername) {
            // Username changed: create new doc, then delete old one
            await setDoc(doc(db, 'users', updates.username), {
                ...updates,
                updatedAt: new Date().toISOString()
            });
            await deleteDoc(userRef);
        } else {
            await updateDoc(userRef, {
                ...updates,
                updatedAt: new Date().toISOString()
            });
        }
    };

    const deleteUser = async (username) => {
        await deleteDoc(doc(db, 'users', username));
    };

    const addWorkHours = async (entry) => {
        await addDoc(collection(db, 'workHours'), {
            ...entry,
            createdAt: new Date().toISOString()
        });
    };

    const updateWorkHours = async (id, updates) => {
        await updateDoc(doc(db, 'workHours', id), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    };

    const addSalary = async (record) => {
        await addDoc(collection(db, 'salary'), {
            ...record,
            createdAt: new Date().toISOString()
        });
    };

    const updateSalary = async (id, updates) => {
        await updateDoc(doc(db, 'salary', id), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    };

    return (
        <DataContext.Provider value={{
            customers, addCustomer, updateCustomer,
            bills, addBill, updateBill, updateMultipleBills,
            complaints, addComplaint, updateComplaintStatus, updateComplaint,
            users, addUser, updateUser,
            handovers,
            workHours, addWorkHours, updateWorkHours,
            salary, addSalary, updateSalary,
            loading
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
