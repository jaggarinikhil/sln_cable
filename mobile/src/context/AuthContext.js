import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { db } from '../utils/firebase';
import { collection, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { OWNER_PRESET, WORKER_PRESET } from '../utils/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const stored = await storage.getAuth();
      if (stored) setUser(stored);
      setLoading(false);
    };
    load();
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

  const login = useCallback(async (username, password) => {
    try {
      let userDoc = await getDoc(doc(db, 'users', username));

      if (!userDoc.exists()) {
        const allUsersSnap = await getDocs(collection(db, 'users'));
        if (allUsersSnap.empty) {
          await seedFirestoreUsers();
          userDoc = await getDoc(doc(db, 'users', username));
        }
      }

      if (userDoc.exists()) {
        const found = userDoc.data();
        found.id = userDoc.id;

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
            loggedInAt: new Date().toISOString(),
          };

          await storage.setAuth(session);
          setUser(session);
          return { success: true, role: found.role };
        }
      }
      return { success: false, message: 'Invalid username or password' };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, message: 'Connection error. Check database rules.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await storage.setAuth(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
