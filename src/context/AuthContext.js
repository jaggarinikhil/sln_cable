import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const USERS = [
  { username: 'Jaggarinikhil', password: 'Nikhil@123', role: 'owner', displayName: 'Nikhil' },
  { username: 'mani', password: 'Mani@12', role: 'worker', displayName: 'Mani' },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('sln_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = (username, password) => {
    const found = USERS.find(u => u.username === username && u.password === password);
    if (found) {
      const userData = { username: found.username, role: found.role, displayName: found.displayName };
      localStorage.setItem('sln_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, role: found.role };
    }
    return { success: false };
  };

  const logout = () => {
    localStorage.removeItem('sln_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
