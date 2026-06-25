import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Brak zmiennych środowiskowych' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { email } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'Brak adresu e-mail' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, first_name, email, organization_id, notification_enabled, email_verified, activation_email_sent')
      .eq('email', email)
      .maybeSingle()

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Adres e-mail jest błędny lub nie istnieje.', code: 'EMAIL_NOT_FOUND' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!student.email_verified) {
      return new Response(JSON.stringify({
        error: 'Konto nie jest jeszcze aktywne. Sprawdź swoją skrzynkę e-mail lub skontaktuj się z OSK.',
        code: 'ACCOUNT_NOT_ACTIVATED'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Rate limiting: check recent sends
    const { count: recentSends } = await supabaseAdmin
      .from('student_otp_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (recentSends && recentSends >= 100) {
      return new Response(JSON.stringify({ error: 'Wyczerpano limit wysyłek kodów. Spróbuj ponownie za godzinę.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('student_otp_tokens')
      .insert({
        student_id: student.id,
        email: student.email,
        code,
        expires_at: expiresAt
      })

    if (insertError) {
      console.error('Error inserting OTP token:', insertError)
      return new Response(JSON.stringify({ error: 'Błąd podczas generowania kodu' }), {
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

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 24px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 60px; margin-bottom: 12px;" />` : ''}
          <h2 style="font-size: 22px; margin: 0; color: #111827;">${orgName}</h2>
        </div>
        <h3 style="font-size: 18px; margin-bottom: 16px;">Kod logowania do Strefy Kursanta</h3>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Witaj ${student.first_name},
        </p>
        <p style="font-size: 16px; margin-bottom: 24px;">
          Twój kod logowania to:
        </p>
        <div style="text-align: center; padding: 24px; background: #f3f4f6; border-radius: 8px; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #6b7280;">
          Kod jest ważny 10 minut. Nikomu go nie podawaj.
        </p>
      </div>
    `

    const emailText = `${orgName}\n\nKod logowania do Strefy Kursanta\n\nWitaj ${student.first_name},\n\nTwój kod logowania to: ${code}\n\nKod jest ważny 10 minut. Nikomu go nie podawaj.`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${orgName} <noreply@cyfrowe-osk.pl>`,
        to: student.email,
        subject: `Kod logowania - Strefa Kursanta - ${orgName}`,
        html: emailHtml,
        text: emailText
      })
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text()
      console.error('Error sending OTP email:', resendError)
      return new Response(JSON.stringify({ error: 'Błąd podczas wysyłania e-maila z kodem' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Kod został wysłany',
      email: student.email
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in send-student-otp:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
