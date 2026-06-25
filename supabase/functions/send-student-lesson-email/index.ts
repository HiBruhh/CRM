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

    const { lesson_id, type } = await req.json()
    if (!lesson_id || !type) {
      return new Response(JSON.stringify({ error: 'Brak wymaganych danych' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from('driving_lessons')
      .select(`
        *,
        student:students(id, first_name, last_name, email, notification_enabled),
        instructor:instructors(id, first_name, last_name, email)
      `)
      .eq('id', lesson_id)
      .single()

    if (lessonError || !lesson) {
      return new Response(JSON.stringify({ error: 'Nie znaleziono jazdy' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!lesson.student?.email || lesson.student?.notification_enabled === false) {
      return new Response(JSON.stringify({ success: true, message: 'Kursant ma wyłączone powiadomienia' }), {
        status: 200,
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
      .eq('id', lesson.organization_id)
      .single()

    const orgName = organization?.name || 'Szkoła Jazdy CRM'
    const logoUrl = organization?.logo_url
    const origin = req.headers.get('origin') || 'http://localhost:5173'

    const startDate = new Date(lesson.start_time).toLocaleString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const endDate = new Date(lesson.end_time).toLocaleString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    })

    let subject = ''
    let heading = ''
    let message = ''
    let ctaText = ''
    let ctaUrl = `${origin}/student/login`

    switch (type) {
      case 'scheduled':
        subject = `Zaplanowano jazdę - ${orgName}`
        heading = 'Masz zaplanowaną jazdę'
        message = `Twoja jazda została zaplanowana na <strong>${startDate}</strong> - ${endDate}. Instruktor: ${lesson.instructor?.first_name} ${lesson.instructor?.last_name}.`
        ctaText = 'Zobacz szczegóły'
        break
      case 'proposed':
        subject = `Propozycja jazdy - ${orgName}`
        heading = 'Otrzymałeś propozycję jazdy'
        message = `Instruktor zaproponował jazdę na <strong>${startDate}</strong> - ${endDate}. Zaloguj się do Strefy Kursanta, aby zaakceptować lub odrzucić propozycję.`
        ctaText = 'Zaloguj się i odpowiedz'
        break
      case 'updated':
        subject = `Zaktualizowano jazdę - ${orgName}`
        heading = 'Twoja jazda została zaktualizowana'
        message = `Twoja jazda na <strong>${startDate}</strong> - ${endDate} została zaktualizowana. Instruktor: ${lesson.instructor?.first_name} ${lesson.instructor?.last_name}.`
        ctaText = 'Zobacz szczegóły'
        break
      case 'cancelled':
        subject = `Anulowano jazdę - ${orgName}`
        heading = 'Twoja jazda została anulowana'
        message = `Twoja jazda na <strong>${startDate}</strong> - ${endDate} została anulowana.`
        ctaText = 'Zaloguj się do Strefy Kursanta'
        break
      case 'proposal_accepted':
        subject = `Propozycja jazdy zaakceptowana - ${orgName}`
        heading = 'Kursant zaakceptował propozycję'
        message = `Kursant ${lesson.student?.first_name} ${lesson.student?.last_name} zaakceptował jazdę na <strong>${startDate}</strong>.`
        ctaText = 'Zobacz w panelu'
        ctaUrl = `${origin}/schedule`
        break
      case 'proposal_rejected':
        subject = `Propozycja jazdy odrzucona - ${orgName}`
        heading = 'Kursant odrzucił propozycję'
        message = `Kursant ${lesson.student?.first_name} ${lesson.student?.last_name} odrzucił jazdę na <strong>${startDate}</strong>.`
        ctaText = 'Zobacz w panelu'
        ctaUrl = `${origin}/schedule`
        break
      default:
        subject = `Informacja o jeździe - ${orgName}`
        heading = 'Informacja o jeździe'
        message = `Twoja jazda na <strong>${startDate}</strong> - ${endDate}.`
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 24px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 60px; margin-bottom: 12px;" />` : ''}
          <h2 style="font-size: 22px; margin: 0; color: #111827;">${orgName}</h2>
        </div>
        <h3 style="font-size: 18px; margin-bottom: 16px;">${heading}</h3>
        <p style="font-size: 16px; margin-bottom: 24px;">
          Witaj ${lesson.student?.first_name || ''},
        </p>
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
        to: type === 'proposal_accepted' || type === 'proposal_rejected' ? lesson.instructor?.email : lesson.student?.email,
        subject,
        html: emailHtml
      })
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text()
      console.error('Error sending lesson email:', resendError)
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
    console.error('Error in send-student-lesson-email:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
