import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(token))
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateTempPassword(): string {
  return crypto.randomUUID() + crypto.randomUUID()
}

serve(async (req) => {
  // Dodaj nagłówki CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
  }

  // Obsłuż OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Sprawdź czy user jest zalogowany i ma rolę admin
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
    
    // Użyj anon key do weryfikacji tokenu
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Użyj service role key do operacji admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 2. Pobierz usera z tokenu
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Sprawdź rolę usera
    const role = user.user_metadata?.role
    const allowedRoles = ['admin', 'super_admin', 'org_admin']
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Brak uprawnień' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Pobierz dane z request
    const { email, first_name, last_name, phone, license_number, status, organization_id: requestedOrgId } = await req.json()

    let organizationId = requestedOrgId

    const isSuperAdmin = role === 'super_admin' || user.email === 'admin@szkola.pl'

    // Super-admin może tworzyć instruktora w dowolnej organizacji
    if (isSuperAdmin) {
      if (!organizationId) {
        return new Response(JSON.stringify({ error: 'Wybierz organizację' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } else {
      // Admin/org_admin — pobierz organization_id z własnego rekordu
      // Najpierw sprawdź organization_admins (szef organizacji)
      const { data: orgAdmin } = await supabaseAdmin
        .from('organization_admins')
        .select('organization_id')
        .eq('auth_id', user.id)
        .maybeSingle()

      organizationId = orgAdmin?.organization_id

      // Jeśli nie ma w organization_admins, sprawdź instruktorów
      if (!organizationId) {
        const { data: adminInstructor } = await supabaseAdmin
          .from('instructors')
          .select('organization_id')
          .eq('auth_id', user.id)
          .maybeSingle()

        organizationId = adminInstructor?.organization_id
      }

      // Fallback na domyślną organizację
      if (!organizationId) {
        const { data: defaultOrg } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('slug', 'default-organization')
          .maybeSingle()

        if (defaultOrg) {
          organizationId = defaultOrg.id
        } else {
          return new Response(JSON.stringify({ error: 'Nie znaleziono organizacji' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
    }

    if (!email || !first_name || !last_name) {
      return new Response(JSON.stringify({ error: 'Brak wymaganych danych' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Sprawdź czy użytkownik już istnieje w Supabase Auth
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return new Response(JSON.stringify({ error: 'Błąd podczas pobierania użytkowników' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userExists = existingUsers?.users?.find(u => u.email === email)
    let authUserId

    if (userExists) {
      authUserId = userExists.id
    } else {
      // 6. Tworzenie użytkownika w Supabase Auth z tymczasowym hasłem
      const tempPassword = generateTempPassword()
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role: 'instructor',
          first_name,
          last_name
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

    // 7. Sprawdź czy instruktor już istnieje w tabeli instructors
    const { data: existingInstructor } = await supabaseAdmin
      .from('instructors')
      .select('*')
      .eq('email', email)
      .single()

    if (existingInstructor) {
      return new Response(JSON.stringify({ error: 'Instruktor z tym emailem już istnieje' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 8. Generowanie sekwencyjnego numeru instruktora (tylko INS-*, pomijamy SZEF-* itp.)
    const { data: lastInstructor } = await supabaseAdmin
      .from('instructors')
      .select('instructor_number')
      .ilike('instructor_number', 'INS-%')
      .order('instructor_number', { ascending: false })
      .limit(1)
      .single()

    let nextNumber = 1
    if (lastInstructor?.instructor_number) {
      const match = lastInstructor.instructor_number.match(/INS-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }

    const instructorNumber = `INS-${nextNumber.toString().padStart(4, '0')}`

    // 9. Tworzenie rekordu w tabeli instructors
    const { data: instructorData, error: instructorError } = await supabaseAdmin
      .from('instructors')
      .insert({
        auth_id: authUserId,
        organization_id: organizationId,
        instructor_number: instructorNumber,
        first_name,
        last_name,
        email,
        phone,
        license_number,
        status
      })
      .select()
      .single()

    if (instructorError) {
      console.error('Error creating instructor:', instructorError)
      return new Response(JSON.stringify({ error: 'Błąd podczas tworzenia instruktora' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 10. Wyślij email aktywacyjny dla nowo utworzonego użytkownika
    if (!userExists && resendApiKey) {
      try {
        const activationToken = crypto.randomUUID()
        const tokenHash = await hashToken(activationToken)
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // 24 hours

        const { error: tokenError } = await supabaseAdmin
          .from('password_reset_tokens')
          .insert({
            instructor_id: instructorData.id,
            email: instructorData.email,
            token_hash: tokenHash,
            organization_id: organizationId,
            expires_at: expiresAt
          })

        if (tokenError) {
          console.error('Error saving activation token:', tokenError)
        } else {
          const { data: organization } = await supabaseAdmin
            .from('organizations')
            .select('name, logo_url')
            .eq('id', organizationId)
            .single()

          const orgName = organization?.name || 'Szkoła Jazdy CRM'
          const logoUrl = organization?.logo_url
          const origin = req.headers.get('origin') || 'http://localhost:5173'
          const activationUrl = `${origin}/reset-password?token=${activationToken}`

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
              <div style="text-align: center; margin-bottom: 24px;">
                ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 60px; margin-bottom: 12px;" />` : ''}
                <h2 style="font-size: 22px; margin: 0; color: #111827;">${orgName}</h2>
              </div>
              <h3 style="font-size: 18px; margin-bottom: 16px;">Aktywacja konta</h3>
              <p style="font-size: 16px; margin-bottom: 16px;">
                Witaj ${first_name}, Twoje konto instruktora zostało utworzone.
              </p>
              <p style="font-size: 16px; margin-bottom: 24px;">
                Kliknij poniższy przycisk, aby ustawić hasło i aktywować konto. Link jest ważny 24 godziny.
              </p>
              <a href="${activationUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px;">
                Ustaw hasło i aktywuj konto
              </a>
              <p style="font-size: 14px; margin-top: 24px; color: #6b7280;">
                Jeśli nie spodziewałeś się tej wiadomości, zignoruj ją.
              </p>
            </div>
          `

          const emailText = `${orgName}\n\nAktywacja konta\n\nWitaj ${first_name}, Twoje konto instruktora zostało utworzone. Kliknij poniższy link, aby ustawić hasło i aktywować konto. Link jest ważny 24 godziny.\n\n${activationUrl}\n\nJeśli nie spodziewałeś się tej wiadomości, zignoruj ją.`

          const resendPayload = {
            from: `${orgName} <noreply@cyfrowe-osk.pl>`,
            to: email,
            subject: `Aktywacja konta - ${orgName}`,
            html: emailHtml,
            text: emailText
          }

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
            console.error('Error sending activation email:', resendError)
          }
        }
      } catch (emailError) {
        console.error('Exception sending activation email:', emailError)
      }
    }

    return new Response(JSON.stringify({
      data: instructorData,
      message: !userExists ? 'Instruktor został dodany. Wysłano email aktywacyjny.' : 'Instruktor został dodany.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in create-instructor function:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
