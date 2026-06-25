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

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Brak RESEND_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find lessons starting between 23 and 25 hours from now (sent once per day)
    const now = new Date()
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from('driving_lessons')
      .select(`
        *,
        student:students(id, first_name, last_name, email, notification_enabled),
        instructor:instructors(id, first_name, last_name)
      `)
      .in('status', ['pending', 'proposed'])
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString())

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError)
      return new Response(JSON.stringify({ error: 'Błąd podczas pobierania jazd' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let sentCount = 0
    let skippedCount = 0
    const errors = []

    for (const lesson of lessons || []) {
      if (!lesson.student?.email || lesson.student?.notification_enabled === false) {
        skippedCount++
        continue
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

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
          <div style="text-align: center; margin-bottom: 24px;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 60px; margin-bottom: 12px;" />` : ''}
            <h2 style="font-size: 22px; margin: 0; color: #111827;">${orgName}</h2>
          </div>
          <h3 style="font-size: 18px; margin-bottom: 16px;">Przypomnienie o jutrzejszej jeździe</h3>
          <p style="font-size: 16px; margin-bottom: 16px;">
            Witaj ${lesson.student?.first_name || ''},
          </p>
          <p style="font-size: 16px; margin-bottom: 24px;">
            Jutro masz zaplanowaną jazdę na <strong>${startDate}</strong> - ${endDate}. Instruktor: ${lesson.instructor?.first_name} ${lesson.instructor?.last_name}.
          </p>
          <a href="${origin}/student/login" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px;">
            Zaloguj się do Strefy Kursanta
          </a>
        </div>
      `

      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${orgName} <noreply@cyfrowe-osk.pl>`,
            to: lesson.student.email,
            subject: `Przypomnienie o jutrzejszej jeździe - ${orgName}`,
            html: emailHtml
          })
        })

        if (!resendResponse.ok) {
          const resendError = await resendResponse.text()
          errors.push({ lesson: lesson.id, error: resendError })
        } else {
          sentCount++
        }
      } catch (emailError) {
        errors.push({ lesson: lesson.id, error: emailError instanceof Error ? emailError.message : 'Błąd wysyłania' })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sent: sentCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in send-lesson-reminders:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
