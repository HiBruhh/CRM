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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Brak zmiennych środowiskowych' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const role = user.user_metadata?.role
    const allowedRoles = ['admin', 'super_admin', 'org_admin']
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Brak uprawnień' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { student_id } = await req.json()
    if (!student_id) {
      return new Response(JSON.stringify({ error: 'Brak student_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, first_name, last_name, email, organization_id, auth_id')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Nie znaleziono kursanta' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!student.email) {
      return new Response(JSON.stringify({ error: 'Kursant nie ma adresu e-mail' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (student.email_verified) {
      return new Response(JSON.stringify({ error: 'Konto kursanta zostało już aktywowane' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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

      const userExists = existingUsers?.users?.find(u => u.email === student.email)

      if (userExists) {
        authUserId = userExists.id
      } else {
        const tempPassword = crypto.randomUUID() + crypto.randomUUID()
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: student.email,
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
    }

    const activationToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({
        auth_id: authUserId,
        email_verified: false,
        activation_token: activationToken,
        activation_token_expires_at: expiresAt,
        activation_email_sent: true,
        activation_email_sent_at: new Date().toISOString()
      })
      .eq('id', student.id)

    if (updateError) {
      console.error('Error updating student activation token:', updateError)
      return new Response(JSON.stringify({ error: 'Błąd podczas aktualizacji kursanta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Brak RESEND_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('name, logo_url')
      .eq('id', student.organization_id)
      .single()

    const orgName = organization?.name || 'Szkoła Jazdy CRM'
    const logoUrl = organization?.logo_url
    const origin = req.headers.get('origin') || 'http://localhost:5173'
    const activationUrl = `${origin}/student/activate?token=${activationToken}&email=${encodeURIComponent(student.email)}`

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 24px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 60px; margin-bottom: 12px;" />` : ''}
          <h2 style="font-size: 22px; margin: 0; color: #111827;">${orgName}</h2>
        </div>
        <h3 style="font-size: 18px; margin-bottom: 16px;">Aktywacja konta w Strefie Kursanta</h3>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Witaj ${student.first_name},
        </p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Twoje konto w Strefie Kursanta zostało utworzone. Kliknij poniższy przycisk, aby aktywować konto i móc się logować za pomocą kodu OTP.
        </p>
        <p style="font-size: 16px; margin-bottom: 24px;">
          <strong>Link jest ważny 24 godziny.</strong>
        </p>
        <a href="${activationUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px;">
          Aktywuj konto
        </a>
        <p style="font-size: 14px; margin-top: 24px; color: #6b7280;">
          Jeśli nie spodziewałeś się tej wiadomości, zignoruj ją.
        </p>
      </div>
    `

    const emailText = `${orgName}\n\nAktywacja konta w Strefie Kursanta\n\nWitaj ${student.first_name},\n\nTwoje konto w Strefie Kursanta zostało utworzone. Kliknij poniższy link, aby aktywować konto i móc się logować za pomocą kodu OTP.\n\nLink jest ważny 24 godziny.\n\n${activationUrl}\n\nJeśli nie spodziewałeś się tej wiadomości, zignoruj ją.`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${orgName} <noreply@cyfrowe-osk.pl>`,
        to: student.email,
        subject: `Aktywacja konta - Strefa Kursanta - ${orgName}`,
        html: emailHtml,
        text: emailText
      })
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text()
      console.error('Error sending activation email:', resendError)
      return new Response(JSON.stringify({ error: 'Błąd podczas wysyłania e-maila' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'E-mail aktywacyjny został wysłany'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in send-student-activation-email:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
