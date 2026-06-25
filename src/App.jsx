import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SupabaseProvider, useSupabase } from './contexts/SupabaseContext'
import LandingPage from './pages/LandingPage'
import LoginChoice from './pages/LoginChoice'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import ConfirmEmailChange from './pages/ConfirmEmailChange'
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
import OrganizationManagement from './pages/OrganizationManagement'
import Fleet from './pages/Fleet'
import VehicleDetail from './pages/VehicleDetail'
import FuelReport from './pages/FuelReport'
import StudentLogin from './pages/StudentLogin'
import StudentActivate from './pages/StudentActivate'
import StudentDashboard from './pages/StudentDashboard'
import StudentSchedule from './pages/StudentSchedule'
import StudentLessons from './pages/StudentLessons'
import StudentDocuments from './pages/StudentDocuments'
import StudentMyProfile from './pages/StudentMyProfile'
import AdminDocuments from './pages/AdminDocuments'
import StudentLayout from './components/StudentLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import Navbar from './components/Navbar'

function AppContent() {
  const { user, loading } = useAuth()
  const supabase = useSupabase()
  const location = useLocation()
  const publicPages = ['/', '/login', '/instructor/login', '/student/login', '/reset-password', '/confirm-email-change']
  const isPublicPage = publicPages.includes(location.pathname) || location.pathname.startsWith('/confirm-email-change')

  const setPrimaryColorVariables = (hex) => {
    const root = document.documentElement
    root.style.setProperty('--color-primary-50', `color-mix(in srgb, ${hex} 5%, white)`)
    root.style.setProperty('--color-primary-100', `color-mix(in srgb, ${hex} 15%, white)`)
    root.style.setProperty('--color-primary-200', `color-mix(in srgb, ${hex} 30%, white)`)
    root.style.setProperty('--color-primary-300', `color-mix(in srgb, ${hex} 50%, white)`)
    root.style.setProperty('--color-primary-400', `color-mix(in srgb, ${hex} 70%, white)`)
    root.style.setProperty('--color-primary-500', `color-mix(in srgb, ${hex} 85%, white)`)
    root.style.setProperty('--color-primary-600', hex)
    root.style.setProperty('--color-primary-700', `color-mix(in srgb, ${hex} 70%, black)`)
    root.style.setProperty('--color-primary-800', `color-mix(in srgb, ${hex} 50%, black)`)
    root.style.setProperty('--color-primary-900', `color-mix(in srgb, ${hex} 30%, black)`)
  }

  const resetPrimaryColorVariables = () => {
    const root = document.documentElement
    root.style.setProperty('--color-primary-50', '#eff6ff')
    root.style.setProperty('--color-primary-100', '#dbeafe')
    root.style.setProperty('--color-primary-200', '#bfdbfe')
    root.style.setProperty('--color-primary-300', '#93c5fd')
    root.style.setProperty('--color-primary-400', '#60a5fa')
    root.style.setProperty('--color-primary-500', '#3b82f6')
    root.style.setProperty('--color-primary-600', '#2563eb')
    root.style.setProperty('--color-primary-700', '#1d4ed8')
    root.style.setProperty('--color-primary-800', '#1e40af')
    root.style.setProperty('--color-primary-900', '#1e3a8a')
  }

  useEffect(() => {
    const applyOrgColor = async () => {
      if (isPublicPage || !user?.organizationId) {
        resetPrimaryColorVariables()
        return
      }
      const { data, error } = await supabase
        .from('organizations')
        .select('primary_color')
        .eq('id', user.organizationId)
        .single()
      if (error || !data?.primary_color) {
        resetPrimaryColorVariables()
        return
      }
      setPrimaryColorVariables(data.primary_color)
    }
    applyOrgColor()
  }, [isPublicPage, user?.organizationId, supabase])

  if (loading) {
    return <LoadingSpinner text="Ładowanie aplikacji..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      {user && !isPublicPage && !location.pathname.startsWith('/student/') && <Navbar />}
      <main className={`min-h-screen ${user && !isPublicPage && !location.pathname.startsWith('/student/') ? 'pt-16 lg:pl-64' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginChoice />} />
          <Route path="/instructor/login" element={<Login />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/activate" element={<StudentActivate />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />
        <Route 
          path="/home" 
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
        <Route 
          path="/organization-management" 
          element={
            <ProtectedRoute requiredRole="admin">
              <OrganizationManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/fleet" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Fleet />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/vehicles/:vehicleId" 
          element={
            <ProtectedRoute>
              <VehicleDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/fuel-report" 
          element={
            <ProtectedRoute requiredRole="instructor">
              <FuelReport />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/documents" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDocuments />
            </ProtectedRoute>
          } 
        />
        {/* Student Zone */}
        <Route 
          path="/student/dashboard" 
          element={
            <ProtectedRoute requiredRole="student">
              <StudentLayout><StudentDashboard /></StudentLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/schedule" 
          element={
            <ProtectedRoute requiredRole="student">
              <StudentLayout><StudentSchedule /></StudentLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/lessons" 
          element={
            <ProtectedRoute requiredRole="student">
              <StudentLayout><StudentLessons /></StudentLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/documents" 
          element={
            <ProtectedRoute requiredRole="student">
              <StudentLayout><StudentDocuments /></StudentLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/profile" 
          element={
            <ProtectedRoute requiredRole="student">
              <StudentLayout><StudentMyProfile /></StudentLayout>
            </ProtectedRoute>
          } 
        />
      </Routes>
      </main>
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
