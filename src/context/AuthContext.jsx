import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { db } from '../utils/firebase';
import { collection, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { OWNER_PRESET, WORKER_PRESET } from '../utils/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = storage.getAuth();
        if (stored) setUser(stored);
        setLoading(false);
    }, []);

    const seedFirestoreUsers = async () => {
        const defaultUsers = [
            {
                username: 'Jaggarinikhil',
                password: 'Nikhil@123',
                name: 'Nikhil',
                role: 'owner',
                permissions: OWNER_PRESET,
                active: true,
                isSuperAdmin: true,
                createdAt: new Date().toISOString()
            },
            {
                username: 'mani',
                password: 'Mani@12',
                name: 'Mani',
                role: 'worker',
                permissions: WORKER_PRESET,
                active: true,
                isSuperAdmin: false,
                createdAt: new Date().toISOString()
            }
        ];

        for (const u of defaultUsers) {
            await setDoc(doc(db, 'users', u.username), u);
        }
    };

    const login = async (username, password) => {
        try {
            // First check if user exists. We use username as the document ID for efficiency.
            console.log('Attempting login for username:', username);
            let userDoc = await getDoc(doc(db, 'users', username));

            if (!userDoc.exists()) {
                console.log('User doc not found. Checking all existing users...');
                const allUsersSnap = await getDocs(collection(db, 'users'));
                const existingUsernames = allUsersSnap.docs.map(d => d.id);
                console.log('Usernames currently in database:', existingUsernames);

                if (allUsersSnap.empty) {
                    console.log('Users collection is empty, seeding default users...');
                    await seedFirestoreUsers();
                    userDoc = await getDoc(doc(db, 'users', username));
                } else if (username === 'Jaggarinikhil' || username === 'mani') {
                    // Force seed if these specific defaults are missing but collection isn't empty
                    console.log('Default user missing but collection not empty. Forced seeding defaults...');
                    await seedFirestoreUsers();
                    userDoc = await getDoc(doc(db, 'users', username));
                }
            }

            if (userDoc.exists()) {
                const found = userDoc.data();
                found.id = userDoc.id;

                // Validate password locally (simpler than composite index)
                if (found.password === password) {
                    if (!found.active) {
                        return { success: false, message: 'Account is disabled. Contact admin.' };
                    }

                    const session = {
                        userId: found.id,
                        username: found.username,
                        name: found.name,
                        role: found.role,
                        permissions: found.permissions,
                        loggedInAt: new Date().toISOString()
                    };

                    storage.setAuth(session);
                    setUser(session);
                    return { success: true, role: found.role };
                }
            }

            return { success: false, message: 'Invalid username or password' };
        } catch (err) {
            console.error("Login error:", err);
            return { success: false, message: 'Connection error. Check database rules.' };
        }
    };

    const logout = () => {
        storage.setAuth(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
