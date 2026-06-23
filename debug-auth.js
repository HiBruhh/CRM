// Debug script to check Supabase connection
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://utncrcyqldhggazhkcqn.supabase.co',
  'sb_publishable_oy0tTfSSUz2JVIIOftw8Sg_lrYQuQKw'
)

const testConnection = async () => {
  console.log('Testing Supabase connection...')
  
  try {
    // Test 1: Check if we can reach Supabase
    const { data, error } = await supabase.from('profiles').select('count').single()
    
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    
    console.log('Supabase connection successful!')
    console.log('Profiles count:', data)
    
    // Test 2: Try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
    } else {
      console.log('Session:', session)
    }
    
    return true
  } catch (err) {
    console.error('Connection test failed:', err)
    return false
  }
}

testConnection()
