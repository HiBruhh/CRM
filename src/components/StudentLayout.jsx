import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import {
  Calendar,
  Clock,
  FileText,
  User,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  GraduationCap
} from 'lucide-react'
import toast from 'react-hot-toast'

const StudentLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const supabase = useSupabase()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [organization, setOrganization] = useState(null)

  const orgColor = useMemo(() => {
    return organization?.primary_color || '#4F46E5'
  }, [organization])

  useEffect(() => {
    if (!user?.organizationId) return
    const fetchOrganization = async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url, primary_color')
        .eq('id', user.organizationId)
        .single()
      if (error) {
        console.error('Error fetching organization:', error)
        return
      }
      if (data) setOrganization(data)
    }
    fetchOrganization()
  }, [user?.organizationId, supabase])

  const handleLogout = async () => {
    await logout()
    navigate('/student/login', { replace: true })
    toast.success('Wylogowano')
  }

  const navigation = [
    { path: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/student/schedule', label: 'Grafik', icon: Calendar },
    { path: '/student/lessons', label: 'Historia', icon: Clock },
    { path: '/student/documents', label: 'Dokumenty', icon: FileText },
    { path: '/student/profile', label: 'Profil', icon: User }
  ]

  const OrgLogo = () => (
    <div className="flex items-center shrink-0">
      {organization?.logo_url ? (
        <img
          src={organization.logo_url}
          alt={organization.name}
          className="h-8 w-auto max-w-[120px] object-contain rounded"
        />
      ) : (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white"
          style={{ backgroundColor: orgColor }}
        >
          <GraduationCap className="h-5 w-5" />
        </div>
      )}
    </div>
  )

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-dark-50"
      style={{ '--org-primary': orgColor }}
    >
      {/* Mobile header */}
      <header className="lg:hidden bg-white dark:bg-dark-100 border-b border-gray-200 dark:border-dark-200 px-4 py-3 flex items-center justify-between">
        <Link to="/student/dashboard" className="flex items-center gap-2">
          <OrgLogo />
          <div className="leading-tight">
            <p className="font-bold text-sm text-gray-900 dark:text-dark-900">
              {organization?.name || 'Cyfrowe OSK'}
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-500">Strefa Kursanta</p>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-gray-600 dark:text-dark-600"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-dark-100 border-r border-gray-200 dark:border-dark-200 transition-transform duration-200`}
        >
          <div className="p-4 border-b border-gray-200 dark:border-dark-200 hidden lg:flex items-center gap-2">
            <OrgLogo />
            <div className="leading-tight">
              <p className="font-bold text-sm text-gray-900 dark:text-dark-900">
                {organization?.name || 'Cyfrowe OSK'}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-500">Strefa Kursanta</p>
            </div>
          </div>

          <div className="p-4">
            <p className="text-xs text-gray-500 dark:text-dark-500 uppercase font-semibold mb-2">
              {user?.firstName} {user?.lastName}
            </p>
          </div>

          <nav className="px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                  style={isActive ? { backgroundColor: `${orgColor}15`, color: orgColor } : undefined}
                >
                  <item.icon
                    className="h-5 w-5"
                    style={isActive ? { color: orgColor } : undefined}
                  />
                  <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-dark-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Wyloguj
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  )
}

export default StudentLayout
