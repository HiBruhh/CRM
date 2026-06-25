import { supabase } from '../contexts/SupabaseContext'

const getToken = async () => {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token
}

const invokeFunction = async (name, body) => {
  const token = await getToken()
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(body)
  })

  const result = await response.json()
  if (!response.ok) {
    console.error(`Error invoking ${name}:`, result)
  }
  return result
}

export const sendLessonEmail = (lessonId, type) => {
  return invokeFunction('send-student-lesson-email', { lesson_id: lessonId, type })
}

export const sendDocumentEmail = (documentId, type) => {
  return invokeFunction('send-student-document-email', { document_id: documentId, type })
}

export const sendLessonReminders = () => {
  return invokeFunction('send-lesson-reminders', {})
}
