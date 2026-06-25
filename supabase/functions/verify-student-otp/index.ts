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

    const { email, code } = await req.json()
    if (!email || !code) {
      return new Response(JSON.stringify({ error: 'Brak e-maila lub kodu' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, first_name, last_name, email, auth_id, organization_id, notification_enabled')
      .eq('email', email)
      .maybeSingle()

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Nie znaleziono kursanta' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: token, error: tokenError } = await supabaseAdmin
      .from('student_otp_tokens')
      .select('*')
      .eq('student_id', student.id)
      .eq('email', email)
      .eq('code', code)
      .is('used_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tokenError || !token) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy lub wygasły kod' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (token.attempts >= 3) {
      return new Response(JSON.stringify({ error: 'Wyczerpano limit prób. Wyślij kod ponownie.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const isValid = token.code === code

    if (!isValid) {
      await supabaseAdmin
        .from('student_otp_tokens')
        .update({ attempts: (token.attempts || 0) + 1 })
        .eq('id', token.id)

      return new Response(JSON.stringify({ error: 'Nieprawidłowy kod' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    await supabaseAdmin
      .from('student_otp_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', token.id)

    let authUserId = student.auth_id

    if (!authUserId) {
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) {
        console.error('Error listing users:', listError)
        return new Response(JSON.stringify({ error: 'Błąd podczas pobierania użytkowników' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const userExists = existingUsers?.users?.find(u => u.email === email)

      if (userExists) {
        authUserId = userExists.id
      } else {
        const tempPassword = crypto.randomUUID() + crypto.randomUUID()
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            role: 'student',
            first_name: student.first_name,
            last_name: student.last_name
          }
        })

        if (authError) {
          console.error('Error creating auth user:', authError)
          return new Response(JSON.stringify({ error: 'Błąd podczas tworzenia użytkownika w Auth' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        authUserId = authData.user.id
      }

      await supabaseAdmin
        .from('students')
        .update({ auth_id: authUserId, email_verified: true })
        .eq('id', student.id)
    }

    // Generate magic link for the user so the frontend can obtain a session
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/student/dashboard`
      }
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Error generating magic link:', linkError)
      return new Response(JSON.stringify({ error: 'Błąd podczas generowania sesji' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const actionLink = linkData.properties.action_link
    const url = new URL(actionLink)
    const tokenHash = url.searchParams.get('token')

    if (!tokenHash) {
      return new Response(JSON.stringify({ error: 'Nie udało się wygenerować tokenu sesji' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      token: tokenHash,
      email,
      role: 'student'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in verify-student-otp:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
