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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
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
    const { email, password, first_name, last_name, phone, license_number, status, organization_id: requestedOrgId } = await req.json()

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
      const { data: adminInstructor } = await supabaseAdmin
        .from('instructors')
        .select('organization_id')
        .eq('auth_id', user.id)
        .single()
      
      organizationId = adminInstructor?.organization_id
      
      if (!organizationId) {
        const { data: defaultOrg } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('slug', 'default-organization')
          .single()
        
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

    if (!email || !password || !first_name || !last_name) {
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
      // 6. Tworzenie użytkownika w Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
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

    return new Response(JSON.stringify({ data: instructorData }), {
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
