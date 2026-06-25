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

    const { document_id, type } = await req.json()
    if (!document_id || !type) {
      return new Response(JSON.stringify({ error: 'Brak wymaganych danych' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: doc, error: docError } = await supabaseAdmin
      .from('student_documents')
      .select(`
        *,
        student:students(id, first_name, last_name, email, notification_enabled)
      `)
      .eq('id', document_id)
      .single()

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Nie znaleziono dokumentu' }), {
        status: 404,
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
      .eq('id', doc.student?.organization_id)
      .single()

    const orgName = organization?.name || 'Szkoła Jazdy CRM'
    const logoUrl = organization?.logo_url
    const origin = req.headers.get('origin') || 'http://localhost:5173'

    let subject = ''
    let heading = ''
    let message = ''
    let toEmail = ''
    let sendToAdmins = false
    let ctaUrl = `${origin}/student/documents`
    let ctaText = 'Zobacz dokumenty'

    switch (type) {
      case 'uploaded_by_student':
        subject = `Nowy dokument od kursanta - ${orgName}`
        heading = 'Kursant przesłał dokument'
        message = `Kursant ${doc.student?.first_name} ${doc.student?.last_name} przesłał dokument <strong>${doc.file_name}</strong>. Zaloguj się do panelu, aby go sprawdzić.`
        sendToAdmins = true
        ctaUrl = `${origin}/admin/documents?student=${doc.student_id}`
        ctaText = 'Sprawdź dokument'
        break
      case 'uploaded_by_osk':
        if (doc.student?.notification_enabled === false) {
          return new Response(JSON.stringify({ success: true, message: 'Kursant ma wyłączone powiadomienia' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        subject = `Nowy dokument od OSK - ${orgName}`
        heading = 'Otrzymałeś nowy dokument'
        message = `Szkoła jazdy przesłała Ci dokument <strong>${doc.file_name}</strong>. Zaloguj się do Strefy Kursanta, aby go zobaczyć.`
        toEmail = doc.student?.email
        break
      case 'approved':
        if (doc.student?.notification_enabled === false) {
          return new Response(JSON.stringify({ success: true, message: 'Kursant ma wyłączone powiadomienia' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        subject = `Dokument zaakceptowany - ${orgName}`
        heading = 'Twój dokument został zaakceptowany'
        message = `Dokument <strong>${doc.file_name}</strong> został zaakceptowany przez szkołę jazdy.`
        toEmail = doc.student?.email
        break
      case 'rejected':
        if (doc.student?.notification_enabled === false) {
          return new Response(JSON.stringify({ success: true, message: 'Kursant ma wyłączone powiadomienia' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        subject = `Dokument odrzucony - ${orgName}`
        heading = 'Twój dokument został odrzucony'
        message = `Dokument <strong>${doc.file_name}</strong> został odrzucony.`
        if (doc.osk_comment) {
          message += ` Komentarz OSK: <strong>${doc.osk_comment}</strong>`
        }
        toEmail = doc.student?.email
        break
      default:
        subject = `Informacja o dokumencie - ${orgName}`
        heading = 'Informacja o dokumencie'
        message = `Dokument <strong>${doc.file_name}</strong>.`
    }

    // For OSK notifications, send to organization admins
    if (sendToAdmins) {
      const { data: admins } = await supabaseAdmin
        .from('organization_admins')
        .select('auth_id')
        .eq('organization_id', doc.student?.organization_id)

      const adminIds = (admins || []).map(a => a.auth_id)

      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const adminEmails = (users?.users || [])
        .filter(u => adminIds.includes(u.id))
        .map(u => u.email)
        .filter(Boolean)

      if (adminEmails.length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'Brak adminów do powiadomienia' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      toEmail = adminEmails[0] || ''
    }

    if (!toEmail) {
      return new Response(JSON.stringify({ success: true, message: 'Brak adresu e-mail' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 24px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 60px; margin-bottom: 12px;" />` : ''}
          <h2 style="font-size: 22px; margin: 0; color: #111827;">${orgName}</h2>
        </div>
        <h3 style="font-size: 18px; margin-bottom: 16px;">${heading}</h3>
        ${type !== 'uploaded_by_student' ? `<p style="font-size: 16px; margin-bottom: 16px;">Witaj ${doc.student?.first_name || ''},</p>` : ''}
        <p style="font-size: 16px; margin-bottom: 24px;">
          ${message}
        </p>
        <a href="${ctaUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px;">
          ${ctaText}
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
        to: toEmail,
        subject,
        html: emailHtml
      })
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text()
      console.error('Error sending document email:', resendError)
      return new Response(JSON.stringify({ error: 'Błąd podczas wysyłania e-maila' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'E-mail wysłany'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in send-student-document-email:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
