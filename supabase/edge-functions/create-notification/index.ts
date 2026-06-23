import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      },
    })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { user_id, type, title, message, entity_type, entity_id } = await req.json()

    // Validate required fields
    if (!user_id || !type || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, type, title, message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate notification type
    const validTypes = ['lesson_created', 'lesson_updated', 'lesson_cancelled', 'lesson_completed', 'student_assigned', 'student_removed', 'instructor_created', 'instructor_updated', 'instructor_removed']
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate entity_type if provided
    if (entity_type) {
      const validEntityTypes = ['lesson', 'student', 'instructor']
      if (!validEntityTypes.includes(entity_type)) {
        return new Response(
          JSON.stringify({ error: `Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create notification using service role
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseService = createClient(supabaseUrl, serviceRoleKey)

    const { data: notification, error: insertError } = await supabaseService
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
      })
      .select()
      .single()

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ data: notification }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
