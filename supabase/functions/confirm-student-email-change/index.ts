import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Brak zmiennych środowiskowych' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { token } = await req.json()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Brak tokenu' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: change, error: changeError } = await supabaseAdmin
      .from('student_email_changes')
      .select('*')
      .eq('token', token)
      .is('confirmed_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (changeError || !change) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy lub wygasły token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('auth_id')
      .eq('id', change.student_id)
      .single()

    if (studentError || !student?.auth_id) {
      return new Response(JSON.stringify({ error: 'Nie znaleziono kursanta' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      student.auth_id,
      { email: change.new_email }
    )

    if (authError) {
      console.error('Error updating auth email:', authError)
      return new Response(JSON.stringify({ error: 'Błąd podczas aktualizacji e-maila w Auth' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({ email: change.new_email })
      .eq('id', change.student_id)

    if (updateError) {
      console.error('Error updating student email:', updateError)
      return new Response(JSON.stringify({ error: 'Błąd podczas aktualizacji e-maila' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: confirmError } = await supabaseAdmin
      .from('student_email_changes')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', change.id)

    if (confirmError) {
      console.error('Error confirming email change:', confirmError)
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Adres e-mail został zmieniony'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in confirm-student-email-change:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
