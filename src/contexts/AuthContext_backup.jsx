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
  const [loading, setLoading] = useState(false)
  const supabase = useSupabase()

  useEffect(() => {
    // Sprawdzamy sesję przy starcie
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setUser(session.user)
        }
        setLoading(false)
      } catch (error) {
        console.error('Session check error:', error)
        setLoading(false)
      }
    }

    checkSession()

    // Nasłuchujemy zmiany stanu autoryzacji
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session ? 'has session' : 'no session')
        
        if (session) {
          setUser(session.user)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const login = async (email, password) => {
    try {
      setLoading(true)
      console.log('Attempting login...')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        throw error
      }

      console.log('Login successful')
      toast.success('Zalogowano pomyślnie!')
      return data
    } catch (error) {
      console.error('Login catch error:', error)
      toast.error(error.message || 'Błąd logowania')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      console.log('Attempting logout...')
      
      await supabase.auth.signOut()
      console.log('Logout successful')
      toast.success('Wylogowano pomyślnie!')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error(error.message || 'Błąd wylogowania')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
