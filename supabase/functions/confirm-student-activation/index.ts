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

    const { token, email } = await req.json()
    if (!token || !email) {
      return new Response(JSON.stringify({ error: 'Brak tokenu lub adresu e-mail' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, first_name, email, email_verified, activation_token, activation_token_expires_at')
      .eq('email', email)
      .maybeSingle()

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Nie znaleziono kursanta' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (student.email_verified) {
      return new Response(JSON.stringify({ success: true, message: 'Konto jest już aktywne' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (student.activation_token !== token) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy token aktywacyjny' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const now = new Date().toISOString()
    if (!student.activation_token_expires_at || student.activation_token_expires_at < now) {
      return new Response(JSON.stringify({ error: 'Token aktywacyjny wygasł. Skontaktuj się z OSK.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({
        email_verified: true,
        activation_token: null,
        activation_token_expires_at: null
      })
      .eq('id', student.id)

    if (updateError) {
      console.error('Error activating student:', updateError)
      return new Response(JSON.stringify({ error: 'Błąd podczas aktywacji konta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Konto zostało aktywowane. Możesz się teraz zalogować.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in confirm-student-activation:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
