import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSupabase } from './SupabaseContext'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = useSupabase()

  const getUserWithRole = async (authUser) => {
    if (!authUser) return null
    
    // Pobieramy role z user metadata
    const role = authUser.user_metadata?.role || null
    
    // Check if super-admin
    const isSuperAdmin = authUser.email === 'admin@szkola.pl' || role === 'super_admin'
    
    // Pobieramy organization_id
    let organizationId = null
    let actualRole = role
    
    if (isSuperAdmin) {
      actualRole = 'super_admin'
    } else if (role === 'org_admin') {
      // Pobierz organization_id dla org_admin
      try {
        const { data: orgAdminData } = await supabase
          .from('organization_admins')
          .select('organization_id')
          .eq('auth_id', authUser.id)
          .maybeSingle()
        
        if (orgAdminData) {
          organizationId = orgAdminData.organization_id
        }
      } catch (error) {
        console.error('Error fetching organization_id for org_admin:', error)
      }

      // Fallback: szef może mieć też rekord w tabeli instructors
      if (!organizationId) {
        try {
          const { data: instructorData } = await supabase
            .from('instructors')
            .select('organization_id')
            .eq('auth_id', authUser.id)
            .maybeSingle()
          
          if (instructorData) {
            organizationId = instructorData.organization_id
          }
        } catch (error) {
          console.error('Error fetching organization_id from instructors for org_admin:', error)
        }
      }
    } else if (role === 'instructor') {
      // Pobieramy organization_id dla instruktorów
      try {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('organization_id')
          .eq('auth_id', authUser.id)
          .maybeSingle()
        
        if (instructorData) {
          organizationId = instructorData.organization_id
        }
      } catch (error) {
        console.error('Error fetching organization_id:', error)
      }
    }
    
    return {
      ...authUser,
      role: actualRole,
      organizationId,
      isSuperAdmin
    }
  }

  useEffect(() => {
    let isMounted = true

    // Timeout bezpieczeństwa — jeśli wszystko zawiedzie, wyzeruj loading po 5s
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth safety timeout — forcing loading=false')
        setLoading(false)
      }
    }, 5000)

    // initDone=true gdy inicjalizacja zakończy się — listener ignoruje eventy do tego czasu
    let initDone = false

    // Pobierz bieżącą sesję przy starcie (Supabase 2.38.x nie emituje INITIAL_SESSION)
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return
        if (session?.user) {
          const userWithRole = await getUserWithRole(session.user)
          if (isMounted) setUser(userWithRole)
        }
      } catch (err) {
        console.error('getSession error:', err)
      } finally {
        initDone = true
        if (isMounted) setLoading(false)
        clearTimeout(safetyTimeout)
      }
    }

    initSession()

    // Synchronizacja między kartami — gdy inna karta zmieni token Supabase,
    // ponownie wczytaj sesję. Event 'storage' nie odpala się w tej samej karcie.
    const handleStorageChange = (e) => {
      if (!isMounted || !initDone) return
      if (e.key && e.key.includes('auth-token')) {
        console.log('Cross-tab auth change detected, re-syncing session')
        syncSession()
      }
    }

    const syncSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return
        if (session?.user) {
          const userWithRole = await getUserWithRole(session.user)
          if (isMounted) setUser(userWithRole)
        } else {
          if (isMounted) setUser(null)
        }
      } catch (err) {
        console.error('Cross-tab sync error:', err)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Nasłuchuj zmian — tylko po zakończeniu inicjalizacji
    // SIGNED_IN obsługuje login() bezpośrednio; TOKEN_REFRESHED nie zmienia tożsamości
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session ? 'has session' : 'no session')
        if (!isMounted || !initDone) return
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') return

        try {
          if (session?.user) {
            const userWithRole = await getUserWithRole(session.user)
            if (isMounted) setUser(userWithRole)
          } else {
            if (isMounted) setUser(null)
          }
        } catch (error) {
          console.error('Auth state change error:', error)
          if (isMounted) setUser(null)
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(safetyTimeout)
      window.removeEventListener('storage', handleStorageChange)
      subscription.unsubscribe()
    }
  }, [supabase])

  const login = async (email, password) => {
    console.log('Attempting login...')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('Login error:', error)
      toast.error(error.message || 'Błąd logowania')
      throw error
    }

    if (!data?.user) {
      const err = new Error('Nie udało się pobrać danych użytkownika')
      toast.error(err.message)
      throw err
    }

    console.log('Login successful')
    const userWithRole = await getUserWithRole(data.user)
    setUser(userWithRole)
    toast.success('Zalogowano pomyślnie!')
    return userWithRole
  }

  const logout = async () => {
    try {
      console.log('Attempting logout...')
      await supabase.auth.signOut()
      console.log('Logout successful')
      toast.success('Wylogowano pomyślnie!')
    } catch (error) {
      console.error('Logout error:', error)
      setUser(null)
      toast.error(error.message || 'Błąd wylogowania')
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
