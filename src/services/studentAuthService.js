import { supabase } from '../contexts/SupabaseContext'

const getAuthHeader = async () => {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  return token ? `Bearer ${token}` : `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
}

export const sendStudentOTP = async (email) => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-student-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': await getAuthHeader()
    },
    body: JSON.stringify({ email })
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Błąd wysyłania kodu')
  return result
}

export const verifyStudentOTP = async (email, code) => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-student-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': await getAuthHeader()
    },
    body: JSON.stringify({ email, code })
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Błąd weryfikacji kodu')
  return result
}

export const sendStudentActivationEmail = async (studentId) => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-student-activation-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': await getAuthHeader()
    },
    body: JSON.stringify({ student_id: studentId })
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Błąd wysyłania maila aktywacyjnego')
  return result
}
