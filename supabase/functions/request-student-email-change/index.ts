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

    const { student_id, new_email } = await req.json()
    if (!student_id || !new_email) {
      return new Response(JSON.stringify({ error: 'Brak wymaganych danych' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, first_name, email, auth_id, organization_id')
      .eq('id', student_id)
      .eq('auth_id', user.id)
      .single()

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Brak uprawnień lub nie znaleziono kursanta' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (new_email === student.email) {
      return new Response(JSON.stringify({ error: 'Nowy e-mail jest taki sam jak obecny' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if new email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.find(u => u.email === new_email)
    if (emailExists) {
      return new Response(JSON.stringify({ error: 'Ten adres e-mail jest już używany' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const confirmationToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('student_email_changes')
      .insert({
        student_id: student.id,
        new_email: new_email,
        token: confirmationToken,
        expires_at: expiresAt
      })

    if (insertError) {
      console.error('Error saving email change:', insertError)
      return new Response(JSON.stringify({ error: 'Błąd podczas zapisywania zmiany e-maila' }), {
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
    const confirmationUrl = `${origin}/confirm-email-change?token=${confirmationToken}`

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 24px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 60px; margin-bottom: 12px;" />` : ''}
          <h2 style="font-size: 22px; margin: 0; color: #111827;">${orgName}</h2>
        </div>
        <h3 style="font-size: 18px; margin-bottom: 16px;">Potwierdź zmianę adresu e-mail</h3>
        <p style="font-size: 16px; margin-bottom: 24px;">
          Kliknij poniższy przycisk, aby potwierdzić zmianę adresu e-mail w Strefie Kursanta. Link jest ważny 24 godziny.
        </p>
        <a href="${confirmationUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px;">
          Potwierdź zmianę e-maila
        </a>
        <p style="font-size: 14px; margin-top: 24px; color: #6b7280;">
          Jeśli nie spodziewałeś się tej wiadomości, zignoruj ją.
        </p>
      </div>
    `

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${orgName} <noreply@cyfrowe-osk.pl>`,
        to: new_email,
        subject: `Potwierdź zmianę adresu e-mail - ${orgName}`,
        html: emailHtml
      })
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text()
      console.error('Error sending confirmation email:', resendError)
      return new Response(JSON.stringify({ error: 'Błąd podczas wysyłania e-maila potwierdzającego' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'E-mail potwierdzający został wysłany'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in request-student-email-change:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
