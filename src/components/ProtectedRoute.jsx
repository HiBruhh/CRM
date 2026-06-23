import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-600">Ładowanie...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('No user found, redirecting to login')
    return <Navigate to="/login" replace />
  }

  const adminRoles = ['admin', 'org_admin', 'super_admin']
  const hasAccess = !requiredRole
    || user.isSuperAdmin
    || user.role === requiredRole
    || (requiredRole === 'admin' && adminRoles.includes(user.role))

  if (!hasAccess) {
    console.log('User role mismatch:', user.role, 'required:', requiredRole)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900 mb-2">Brak dostępu</h1>
          <p className="text-gray-600 dark:text-dark-600">Nie masz uprawnień do tej strony.</p>
        </div>
      </div>
    )
  }

  console.log('ProtectedRoute: User authenticated, rendering children')
  return children
}

export default ProtectedRoute
