import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Lazy-loaded page components — each page is only fetched when first navigated to
const Login = lazy(() => import('./pages/Login'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'));
const Billing = lazy(() => import('./pages/Billing'));
const Payments = lazy(() => import('./pages/Payments'));
const Complaints = lazy(() => import('./pages/Complaints'));
const WorkHours = lazy(() => import('./pages/WorkHours'));
const Salary = lazy(() => import('./pages/Salary'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const CustomerHistoryPage = lazy(() => import('./pages/CustomerHistoryPage'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Personal = lazy(() => import('./pages/Personal'));

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="page-loading" />}>
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
                <ProtectedRoute>
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

              <Route path="/payments" element={
                <ProtectedRoute>
                  <Layout><Payments /></Layout>
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

              <Route path="/expenses" element={
                <ProtectedRoute requires="manageUsers">
                  <Layout><Expenses /></Layout>
                </ProtectedRoute>
              } />

              <Route path="/personal" element={
                <ProtectedRoute requires="manageUsers">
                  <Layout><Personal /></Layout>
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
