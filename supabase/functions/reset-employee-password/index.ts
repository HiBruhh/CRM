import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(token))
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      throw new Error('Brak konfiguracji Supabase lub Resend')
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) throw new Error('Brak nagłówka autoryzacji')
    const token = authHeader.replace('Bearer ', '')

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    })

    // Verify caller
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !user) throw new Error('Nieautoryzowany')
    if (user.user_metadata?.role !== 'org_admin') throw new Error('Brak uprawnień')

    const { instructorId } = await req.json()
    if (!instructorId) throw new Error('Brak ID instruktora')

    // Fetch instructor
    const { data: instructor, error: instructorError } = await adminClient
      .from('instructors')
      .select('id, email, first_name, last_name, organization_id, auth_id')
      .eq('id', instructorId)
      .single()

    if (instructorError || !instructor) throw new Error('Nie znaleziono instruktora')
    if (!instructor.email) throw new Error('Instruktor nie ma adresu email')

    // Verify caller is admin of the same organization
    const { data: orgAdmin, error: orgAdminError } = await adminClient
      .from('organization_admins')
      .select('id')
      .eq('auth_id', user.id)
      .eq('organization_id', instructor.organization_id)
      .single()

    if (orgAdminError || !orgAdmin) throw new Error('Brak uprawnień do tej organizacji')

    // Fetch organization branding
    const { data: organization } = await adminClient
      .from('organizations')
      .select('name, logo_url')
      .eq('id', instructor.organization_id)
      .single()

    // Generate a single-use reset token
    const resetToken = crypto.randomUUID()
    const tokenHash = await hashToken(resetToken)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString() // 1 hour

    const { error: insertError } = await adminClient
      .from('password_reset_tokens')
      .insert({
        instructor_id: instructor.id,
        email: instructor.email,
        token_hash: tokenHash,
        organization_id: instructor.organization_id,
        expires_at: expiresAt
      })

    if (insertError) throw new Error('Błąd zapisu tokenu: ' + insertError.message)

    // Build reset URL
    const origin = req.headers.get('origin') || 'http://localhost:5173'
    const resetUrl = `${origin}/reset-password?token=${resetToken}`

    // Send email via Resend
    const orgName = organization?.name || 'Szkoła Jazdy CRM'
    const logoUrl = organization?.logo_url

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 24px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 60px; margin-bottom: 12px;" />` : ''}
          <h2 style="font-size: 22px; margin: 0; color: #111827;">${orgName}</h2>
        </div>
        <h3 style="font-size: 18px; margin-bottom: 16px;">Reset hasła</h3>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Otrzymaliśmy prośbę o reset hasła dla Twojego konta.
        </p>
        <p style="font-size: 16px; margin-bottom: 24px;">
          Kliknij poniższy przycisk, aby ustawić nowe hasło. Link jest ważny 1 godzinę i można go użyć tylko raz.
        </p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px;">
          Ustaw nowe hasło
        </a>
        <p style="font-size: 14px; margin-top: 24px; color: #6b7280;">
          Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.
        </p>
      </div>
    `

    const emailText = `${orgName}\n\nReset hasła\n\nOtrzymaliśmy prośbę o reset hasła dla Twojego konta. Kliknij poniższy link, aby ustawić nowe hasło. Link jest ważny 1 godzinę i można go użyć tylko raz.\n\n${resetUrl}\n\nJeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.`

    const resendPayload = {
      from: `${orgName} <noreply@cyfrowe-osk.pl>`,
      to: instructor.email,
      subject: `Reset hasła - ${orgName}`,
      html: emailHtml,
      text: emailText
    }
    console.log('Resend payload:', JSON.stringify(resendPayload))

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resendPayload)
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text()
      throw new Error('Błąd wysyłki emaila: ' + resendError)
    }

    return new Response(JSON.stringify({ success: true, message: 'Wysłano email resetujący hasło' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
