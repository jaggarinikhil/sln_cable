import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import Billing from './pages/Billing';
import Complaints from './pages/Complaints';
import WorkHours from './pages/WorkHours';
import Salary from './pages/Salary';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import CustomerHistoryPage from './pages/CustomerHistoryPage';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Navigate to="/dashboard" replace />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/dashboard" element={
              <ProtectedRoute requires="viewDashboard">
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/customers" element={
              <ProtectedRoute requires="viewCustomers">
                <Layout><Customers /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/customers/:id" element={
              <ProtectedRoute requires="viewCustomers">
                <Layout><CustomerProfile /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/billing" element={
              <ProtectedRoute>
                <Layout><Billing /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/complaints" element={
              <ProtectedRoute requires="viewComplaints">
                <Layout><Complaints /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/work-hours" element={
              <ProtectedRoute requires="logOwnHours">
                <Layout><WorkHours /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/salary" element={
              <ProtectedRoute requires="viewOwnSalary">
                <Layout><Salary /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute requires="viewReports">
                <Layout><Reports /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/history" element={
              <ProtectedRoute>
                <Layout><CustomerHistoryPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/users" element={
              <ProtectedRoute requires="manageUsers">
                <Layout><UserManagement /></Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
