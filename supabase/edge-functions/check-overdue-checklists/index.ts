import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find completed lessons without checklists that ended more than 24 hours ago
    const { data: overdueLessons, error: lessonsError } = await supabase
      .from('driving_lessons')
      .select(`
        id,
        start_time,
        end_time,
        instructor_id,
        student_id,
        instructors!inner (
          id,
          first_name,
          last_name
        ),
        students!inner (
          id,
          first_name,
          last_name
        )
      `)
      .eq('status', 'completed')
      .is('checklist', null)
      .lt('end_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('end_time', 'is', null)

    if (lessonsError) {
      throw lessonsError
    }

    if (!overdueLessons || overdueLessons.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No overdue checklists found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get admin user IDs
    const { data: adminUsers, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    if (adminError) {
      throw adminError
    }

    if (!adminUsers || adminUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No admin users found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notifications for each admin
    const notifications = []
    for (const lesson of overdueLessons) {
      const hoursSinceEnd = Math.floor(
        (Date.now() - new Date(lesson.end_time).getTime()) / (1000 * 60 * 60)
      )

      for (const admin of adminUsers) {
        notifications.push({
          user_id: admin.user_id,
          type: 'checklist_overdue',
          title: 'Checklista nieuzupełniona',
          message: `Instruktor ${lesson.instructors.first_name} ${lesson.instructors.last_name} nie uzupełnił checklisty dla kursanta ${lesson.students.first_name} ${lesson.students.last_name} przez ${hoursSinceEnd} godzin`,
          entity_type: 'driving_lesson',
          entity_id: lesson.id,
          metadata: {
            instructor_id: lesson.instructor_id,
            instructor_name: `${lesson.instructors.first_name} ${lesson.instructors.last_name}`,
            student_id: lesson.student_id,
            student_name: `${lesson.students.first_name} ${lesson.students.last_name}`,
            lesson_date: lesson.start_time,
            hours_overdue: hoursSinceEnd
          }
        })
      }
    }

    // Check if notifications already exist to avoid duplicates
    const existingNotifications = await supabase
      .from('notifications')
      .select('entity_id')
      .in(
        'entity_id',
        overdueLessons.map(l => l.id)
      )
      .eq('type', 'checklist_overdue')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const existingIds = new Set(existingNotifications?.data?.map(n => n.entity_id) || [])

    // Filter out duplicate notifications
    const newNotifications = notifications.filter(
      n => !existingIds.has(n.entity_id)
    )

    if (newNotifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(newNotifications)

      if (insertError) {
        throw insertError
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Processed overdue checklists',
        overdue_count: overdueLessons.length,
        notifications_created: newNotifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error checking overdue checklists:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
