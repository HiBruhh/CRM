import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import ThemeToggle from '../components/ThemeToggle'
import { LogOut, LayoutDashboard, Calendar, Users, UserCog, Home, Shield, User, ChevronDown, Settings, Bell, Building2, Car, Fuel, Menu, X, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const Navbar = () => {
  const { user, logout } = useAuth()
  const supabase = useSupabase()
  const location = useLocation()
  const isAdmin = user?.role === 'admin' || user?.isSuperAdmin || user?.role === 'org_admin'
  const [instructorData, setInstructorData] = useState(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const notificationDropdownRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [organization, setOrganization] = useState(null)

  const fetchOrganization = async () => {
    if (!user?.organizationId) return
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .eq('id', user.organizationId)
      .single()
    if (!error) setOrganization(data)
  }

  useEffect(() => {
    fetchOrganization()
  }, [user?.organizationId, supabase])

  useEffect(() => {
    const handleFocus = () => fetchOrganization()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user?.organizationId, supabase])

  useEffect(() => {
    const handleOrgUpdate = (e) => {
      setOrganization(prev => prev ? { ...prev, ...e.detail } : e.detail)
    }
    window.addEventListener('organization-updated', handleOrgUpdate)
    return () => window.removeEventListener('organization-updated', handleOrgUpdate)
  }, [])

  useEffect(() => {
    const fetchInstructorData = async () => {
      if (user?.role === 'instructor' && user?.id) {
        const { data } = await supabase
          .from('instructors')
          .select('id, first_name, last_name')
          .eq('auth_id', user.id)
          .single()
        setInstructorData(data)
      }
    }
    fetchInstructorData()
  }, [user, supabase])

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user?.id) {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false)
          .eq('dismissed', false)
        setUnreadCount(count || 0)
      }
    }
    fetchUnreadCount()

    const channel = supabase
      .channel(`notifications:${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && !payload.new.read) {
            setUnreadCount(prev => prev + 1)
            if (isNotificationDropdownOpen) {
              fetchNotifications()
            }
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new : n)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, isNotificationDropdownOpen])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleClickOutsideNotification = (event) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutsideNotification)
    return () => document.removeEventListener('mousedown', handleClickOutsideNotification)
  }, [])

  const navigationGroups = [
    {
      title: 'Główne',
      items: [
        { path: '/instructor-panel', label: 'Panel Instruktora', icon: LayoutDashboard, instructorOnly: true },
        { path: '/dashboard', label: 'Dashboard', icon: Home, adminOnly: true },
        { path: '/schedule', label: 'Grafik', icon: Calendar },
        { path: '/students', label: 'Kursanci', icon: Users }
      ]
    },
    {
      title: 'Zarządzanie',
      items: [
        { path: '/instructors', label: 'Instruktorzy', icon: UserCog, adminOnly: true },
        { path: '/admin/documents', label: 'Dokumenty', icon: FileText, adminOnly: true },
        { path: '/fleet', label: 'Moja Flota', icon: Car, adminOnly: true },
        { path: '/fuel-report', label: 'Raport Paliwa', icon: Fuel, instructorOnly: true }
      ]
    },
    {
      title: 'Administracja',
      items: [
        { path: '/organizations', label: 'Organizacje', icon: Building2, superAdminOnly: true },
        { path: '/organization-management', label: 'Moja organizacja', icon: Building2, orgAdminOnly: true },
        { path: '/settings', label: 'Ustawienia', icon: Settings }
      ]
    }
  ]

  const isItemVisible = (item) => {
    if (item.superAdminOnly) return user?.isSuperAdmin
    if (item.orgAdminOnly) return user?.role === 'org_admin'
    if (item.instructorOnly) return user?.role === 'instructor'
    if (item.adminOnly) return isAdmin
    return isAdmin || user?.role === 'instructor'
  }

  const isActive = (path) => {
    if (location.pathname === path) return true
    if (path === '/fleet' && location.pathname.startsWith('/vehicles/')) return true
    return false
  }

  const fetchNotifications = async () => {
    if (user?.id) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10)
      setNotifications(data || [])
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) {
        toast.error(`Błąd oznaczania powiadomienia: ${error.message}`)
        return
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      toast.error(`Błąd oznaczania powiadomienia: ${error.message}`)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) {
        toast.error(`Błąd oznaczania powiadomień: ${error.message}`)
        return
      }

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      )
      setUnreadCount(0)
      toast.success('Wszystkie powiadomienia oznaczone jako przeczytane')
    } catch (error) {
      toast.error(`Błąd oznaczania powiadomień: ${error.message}`)
    }
  }

  const deleteAllNotifications = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, dismissed: true })
        .eq('user_id', user.id)
        .eq('dismissed', false)

      if (error) {
        toast.error(`Błąd usuwania powiadomień: ${error.message}`)
        return
      }

      setNotifications([])
      setUnreadCount(0)
      toast.success('Wszystkie powiadomienia usunięte')
    } catch (error) {
      toast.error(`Błąd usuwania powiadomień: ${error.message}`)
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    setIsNotificationDropdownOpen(false)

    if (notification.type === 'checklist_reminder' && notification.entity_type === 'lesson' && notification.entity_id) {
      localStorage.setItem('openChecklistForLesson', notification.entity_id)
      window.location.href = '/schedule'
    } else if (notification.type === 'checklist_completed' && notification.metadata?.instructor_id) {
      if (user?.role === 'instructor') {
        window.location.href = '/instructor/recent-lessons'
      } else {
        window.location.href = `/instructors/${notification.metadata.instructor_id}`
      }
    } else if (notification.entity_type && notification.entity_id) {
      if (notification.entity_type === 'lesson') {
        window.location.href = '/schedule'
      } else if (notification.entity_type === 'student') {
        window.location.href = `/students/${notification.entity_id}`
      } else if (notification.entity_type === 'instructor') {
        const path = isAdmin ? `/instructors/${notification.entity_id}` : `/instructor/${notification.entity_id}`
        window.location.href = path
      }
    }
  }

  return (
    <>
      {/* Top header */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white dark:bg-dark-100 border-b dark:border-dark-200 shadow-sm transition-colors duration-200">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 text-gray-600 dark:text-dark-600 transition-colors"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to={isAdmin ? '/dashboard' : '/instructor-panel'} className="flex items-center gap-2">
              {organization?.logo_url ? (
                <>
                  <img src={organization.logo_url} alt={organization.name} className="h-8 w-auto max-w-[140px] object-contain" />
                  <span className="text-lg font-bold text-gray-900 dark:text-dark-900 hidden sm:block">
                    {organization.name}
                  </span>
                </>
              ) : organization?.name ? (
                <>
                  <Calendar className="h-7 w-7 text-primary-600" />
                  <span className="text-lg font-bold text-gray-900 dark:text-dark-900 hidden sm:block">
                    {organization.name}
                  </span>
                </>
              ) : (
                <>
                  <Calendar className="h-7 w-7 text-primary-600" />
                  <span className="text-lg font-bold text-gray-900 dark:text-dark-900 hidden sm:block">
                    Szkoła Jazdy CRM
                  </span>
                </>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />

            {/* Notification Bell */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                onClick={() => {
                  setIsNotificationDropdownOpen(!isNotificationDropdownOpen)
                  if (!isNotificationDropdownOpen) {
                    fetchNotifications()
                  }
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
              >
                <Bell className="h-5 w-5 text-gray-600 dark:text-dark-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-100 rounded-lg shadow-lg border dark:border-dark-200 py-2 z-50">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-dark-600">
                      Brak powiadomień
                    </div>
                  ) : (
                    <>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-200 cursor-pointer border-b dark:border-dark-200 last:border-b-0 ${
                              !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                                !notification.read ? 'bg-blue-500' : 'bg-gray-300 dark:bg-dark-600'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${
                                  !notification.read ? 'text-gray-900 dark:text-dark-900' : 'text-gray-600 dark:text-dark-600'
                                }`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-dark-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-dark-700 mt-2">
                                  {new Date(notification.created_at).toLocaleString('pl-PL')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex border-t dark:border-dark-200">
                        {unreadCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAllAsRead()
                            }}
                            className="flex-1 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors"
                          >
                            Oznacz jako przeczytane
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteAllNotifications()
                          }}
                          className="flex-1 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-l dark:border-dark-200"
                        >
                          Usuń wszystkie
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors cursor-pointer"
              >
                {isAdmin ? (
                  <Shield className="h-5 w-5 text-primary-600" />
                ) : (
                  <User className="h-5 w-5 text-primary-600" />
                )}
                <span className="text-sm text-gray-700 dark:text-dark-900 font-medium hidden sm:block max-w-[140px] truncate">
                  {instructorData ? `${instructorData.first_name} ${instructorData.last_name}` : user?.email}
                </span>
                <span className="text-xs text-gray-500 dark:text-dark-600 hidden md:block">
                  ({user?.isSuperAdmin ? 'Super Admin' : user?.role === 'org_admin' ? 'Szef OSK' : isAdmin ? 'Admin' : 'Instruktor'})
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-dark-600" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-100 rounded-lg shadow-lg border dark:border-dark-200 py-1 z-50">
                  <Link
                    to={user?.isSuperAdmin ? '/dashboard' : user?.role === 'org_admin' ? '/settings' : `/instructor/${instructorData?.id}`}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-dark-900 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Wyświetl profil</span>
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-dark-900 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Ustawienia</span>
                  </Link>
                  <div className="border-t dark:border-dark-200 my-1" />
                  <button
                    onClick={() => { setIsDropdownOpen(false); logout() }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Wyloguj się</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-dark-100 border-r dark:border-dark-200 shadow-sm transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full overflow-y-auto py-4 px-3">
          {navigationGroups.map(group => {
            const visibleItems = group.items.filter(isItemVisible)
            if (visibleItems.length === 0) return null
            return (
              <div key={group.title} className="mb-6">
                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-dark-500 uppercase tracking-wider">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const Icon = item.icon
                    const active = isActive(item.path)
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-100'
                            : 'text-gray-700 dark:text-dark-900 hover:bg-gray-100 dark:hover:bg-dark-200'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  )
}

export default Navbar
