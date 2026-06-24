import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import ThemeToggle from '../components/ThemeToggle'
import { LogOut, LayoutDashboard, Calendar, Users, UserCog, Home, Shield, User, ChevronDown, Settings, Bell, Building2, Car, Fuel } from 'lucide-react'
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

    // Subscribe to realtime notifications
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
            // Don't update unreadCount here - markAsRead handles it locally
            // to avoid race conditions and double decrementing
            // Always update notifications list, not just when dropdown is open
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

  const navItems = [
    { path: '/instructor-panel', label: 'Panel Instruktora', icon: LayoutDashboard, instructorOnly: true },
    { path: '/dashboard', label: 'Dashboard', icon: Home, adminOnly: true },
    { path: '/schedule', label: 'Grafik', icon: Calendar, adminOnly: false },
    { path: '/students', label: 'Kursanci', icon: Users, adminOnly: false },
    { path: '/instructors', label: 'Instruktorzy', icon: UserCog, adminOnly: true },
    { path: '/fleet', label: 'Moja Flota', icon: Car, adminOnly: true },
    { path: '/fuel-report', label: 'Raport Paliwa', icon: Fuel, instructorOnly: true },
    { path: '/organizations', label: 'Organizacje', icon: Building2, superAdminOnly: true },
  ]

  const filteredNavItems = navItems.filter(item => {
    if (item.superAdminOnly) return user?.isSuperAdmin
    if (item.instructorOnly) return user?.role === 'instructor'
    if (item.adminOnly) return isAdmin
    return isAdmin || user?.role === 'instructor'
  })

  const isActive = (path) => location.pathname === path

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
      
      // Update local state immediately for better UX
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
      
      // Update local state immediately for better UX
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
      // First mark all as read, then dismiss
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, dismissed: true })
        .eq('user_id', user.id)
        .eq('dismissed', false)
      
      if (error) {
        toast.error(`Błąd usuwania powiadomień: ${error.message}`)
        return
      }
      
      // Update local state immediately for better UX
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
      // Save lesson ID to localStorage so Schedule can open checklist modal
      localStorage.setItem('openChecklistForLesson', notification.entity_id)
      window.location.href = '/schedule'
    } else if (notification.type === 'checklist_completed' && notification.metadata?.instructor_id) {
      // For instructors: go to recent lessons
      // For admins: go to instructor profile
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
        // Admins use /instructors/:id, instructors use /instructor/:id
        const path = isAdmin ? `/instructors/${notification.entity_id}` : `/instructor/${notification.entity_id}`
        window.location.href = path
      }
    }
  }

  return (
    <nav className="relative z-50 bg-white dark:bg-dark-100 shadow-sm border-b dark:border-dark-200 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to={isAdmin ? '/dashboard' : '/instructor-panel'} className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-dark-900">
                Szkoła Jazdy CRM
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-100'
                      : 'text-gray-600 dark:text-dark-600 hover:bg-gray-100 dark:hover:bg-dark-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
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
                className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors cursor-pointer"
              >
                {isAdmin ? (
                  <Shield className="h-5 w-5 text-primary-600" />
                ) : (
                  <User className="h-5 w-5 text-primary-600" />
                )}
                <span className="text-sm text-gray-700 dark:text-dark-900 font-medium">
                  {instructorData ? `${instructorData.first_name} ${instructorData.last_name}` : user?.email}
                </span>
                <span className="text-xs text-gray-500 dark:text-dark-600">
                  ({user?.isSuperAdmin ? 'Super Admin' : user?.role === 'org_admin' ? 'Szef OSK' : isAdmin ? 'Admin' : 'Instruktor'})
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-dark-600" />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-100 rounded-lg shadow-lg border dark:border-dark-200 py-1 z-50">
                  <Link
                    to={user?.isSuperAdmin ? '/dashboard' : user?.role === 'org_admin' ? '/settings' : `/instructor/${instructorData?.id}`}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-dark-900 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Wyświetl profil</span>
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-dark-900 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Ustawienia</span>
                  </Link>
                  <div className="border-t dark:border-dark-200 my-1" />
                  <button
                    onClick={() => { setIsDropdownOpen(false); logout() }}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Wyloguj się</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
