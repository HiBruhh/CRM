import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
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
    const isSuperAdmin = role === 'super_admin' || user.email === 'admin@szkola.pl'
    const allowedRoles = ['admin', 'super_admin', 'org_admin']
    if (!allowedRoles.includes(role) && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Brak uprawnień' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Pobierz dane z request
    const { instructorId, authId } = await req.json()

    if (!instructorId) {
      return new Response(JSON.stringify({ error: 'Brak ID instruktora' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4.5 Sprawdź czy użytkownik może usunąć tego instruktora
    if (!isSuperAdmin) {
      const { data: instructorData } = await supabaseAdmin
        .from('instructors')
        .select('organization_id')
        .eq('id', instructorId)
        .single()
      
      if (!instructorData) {
        return new Response(JSON.stringify({ error: 'Nie znaleziono instruktora' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: adminInstructor } = await supabaseAdmin
        .from('instructors')
        .select('organization_id')
        .eq('auth_id', user.id)
        .single()
      
      if (adminInstructor?.organization_id !== instructorData.organization_id) {
        return new Response(JSON.stringify({ error: 'Brak uprawnień do usunięcia tego instruktora' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 5. Usunięcie użytkownika z Supabase Auth
    if (authId) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authId)
      if (authError) {
        console.error('Auth delete error:', authError)
      }
    }

    // 6. Usunięcie rekordu z tabeli instructors
    const { error } = await supabaseAdmin
      .from('instructors')
      .delete()
      .eq('id', instructorId)

    if (error) {
      console.error('Error deleting instructor:', error)
      return new Response(JSON.stringify({ error: 'Błąd podczas usuwania instruktora' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in delete-instructor function:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
