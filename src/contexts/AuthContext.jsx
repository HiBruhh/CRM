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
    let loadingResolved = false

    const resolveLoading = () => {
      if (!loadingResolved) {
        loadingResolved = true
        setLoading(false)
      }
    }

    // Timeout bezpieczeństwa - jeśli za 2s loading nie zostanie wyzerowany, wyzeruj go
    const safetyTimeout = setTimeout(() => {
      console.warn('Auth loading timeout - forcing loading=false')
      resolveLoading()
    }, 2000)

    // Sprawdzamy sesję przy starcie
    const checkSession = async () => {
      try {
        console.log('Checking initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        console.log('Initial session found:', !!session)
        
        if (session) {
          const userWithRole = await getUserWithRole(session.user)
          setUser(userWithRole)
          console.log('User restored from session:', userWithRole.email, 'role:', userWithRole.role)
        }
      } catch (error) {
        console.error('Session check error:', error)
        setUser(null)
      } finally {
        resolveLoading()
      }
    }

    checkSession()

    // Nasłuchujemy zmiany stanu autoryzacji
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session ? 'has session' : 'no session')
        
        try {
          if (session) {
            const userWithRole = await getUserWithRole(session.user)
            setUser(userWithRole)
            console.log('User set from auth change:', userWithRole.email, 'role:', userWithRole.role)
          } else {
            setUser(null)
            console.log('User cleared from auth change')
          }
        } catch (error) {
          console.error('Auth state change error:', error)
          setUser(null)
        } finally {
          resolveLoading()
        }
      }
    )

    return () => {
      console.log('Cleaning up auth subscription')
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [supabase])

  const login = async (email, password) => {
    setLoading(true)
    console.log('Attempting login...')

    const createTimeout = (ms, message) =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(message)), ms)
      )

    try {
      // Wyczyść ewentualną starą sesję, żeby uniknąć konfliktów z cookies/localStorage
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (e) {
        console.log('No previous session to clear')
      }

      // Logowanie z timeoutem 10s — jeśli Supabase nie odpowie, przerywamy
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        createTimeout(10000, 'Logowanie trwa zbyt długo. Spróbuj ponownie.')
      ])

      if (error) {
        console.error('Login error:', error)
        throw error
      }

      if (!data?.user) {
        throw new Error('Nie udało się pobrać danych użytkownika')
      }

      console.log('Login successful')
      toast.success('Zalogowano pomyślnie!')

      // Pobierz rolę użytkownika z timeoutem 5s
      const userWithRole = await Promise.race([
        getUserWithRole(data.user),
        createTimeout(5000, 'Nie udało się pobrać uprawnień użytkownika.')
      ])
      setUser(userWithRole)
      return userWithRole
    } catch (error) {
      console.error('Login catch error:', error)
      // Wyczyść ewentualne pozostałości po nieudanym logowaniu
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (e) {}
      toast.error(error.message || 'Błąd logowania')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      console.log('Attempting logout...')
      
      await supabase.auth.signOut()
      console.log('Logout successful')
      toast.success('Wylogowano pomyślnie!')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error(error.message || 'Błąd wylogowania')
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
