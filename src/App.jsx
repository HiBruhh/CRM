import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SupabaseProvider } from './contexts/SupabaseContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import InstructorPanel from './pages/InstructorPanel'
import InstructorRecentLessons from './pages/InstructorRecentLessons'
import Schedule from './pages/Schedule'
import Students from './pages/Students'
import Instructors from './pages/Instructors'
import InstructorProfile from './pages/InstructorProfile'
import StudentProfile from './pages/StudentProfile'
import Settings from './pages/Settings'
import Organizations from './pages/Organizations'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import Navbar from './components/Navbar'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner text="Ładowanie aplikacji..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              {(user?.role === 'admin' || user?.isSuperAdmin || user?.role === 'org_admin') ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/instructor-panel" replace />
              )}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/instructor-panel" 
          element={
            <ProtectedRoute requiredRole="instructor">
              <InstructorPanel />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/instructor/recent-lessons" 
          element={
            <ProtectedRoute requiredRole="instructor">
              <InstructorRecentLessons />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/instructor/:instructorId" 
          element={
            <ProtectedRoute requiredRole="instructor">
              <InstructorProfile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/instructor-panel/:instructorId" 
          element={
            <ProtectedRoute requiredRole="instructor">
              <InstructorProfile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/schedule" 
          element={
            <ProtectedRoute>
              <Schedule />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/students" 
          element={
            <ProtectedRoute>
              <Students />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/instructors" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Instructors />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/instructors/:instructorId" 
          element={
            <ProtectedRoute requiredRole="admin">
              <InstructorProfile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/students/:studentId" 
          element={
            <ProtectedRoute>
              <StudentProfile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/organizations" 
          element={
            <ProtectedRoute>
              <Organizations />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </SupabaseProvider>
  )
}

export default App
