import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { seedData } from '../utils/seed';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        seedData();
        const stored = storage.getAuth();
        if (stored) setUser(stored);
        setLoading(false);
    }, []);

    const login = (username, password) => {
        const users = storage.getUsers();
        const found = users.find(u => u.username === username && u.password === password);

        if (found) {
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
        return { success: false, message: 'Invalid username or password' };
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
