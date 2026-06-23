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

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const isSuperAdmin = user.user_metadata?.role === 'super_admin' || user.email === 'admin@szkola.pl'
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Brak uprawnień - tylko super-admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { adminId, authId } = await req.json()

    if (!adminId) {
      return new Response(JSON.stringify({ error: 'Brak ID admina' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Pobierz dane admina przed usunięciem
    const { data: adminData, error: adminFetchError } = await supabaseAdmin
      .from('organization_admins')
      .select('id, auth_id')
      .eq('id', adminId)
      .single()

    if (adminFetchError || !adminData) {
      return new Response(JSON.stringify({ error: 'Nie znaleziono admina' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const targetAuthId = authId || adminData.auth_id

    // Usuń rekord admina
    const { error: deleteError } = await supabaseAdmin
      .from('organization_admins')
      .delete()
      .eq('id', adminId)

    if (deleteError) {
      return new Response(JSON.stringify({ error: 'Błąd podczas usuwania admina: ' + deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Zaktualizuj rolę w auth.users na instructor (jeśli mamy auth_id)
    if (targetAuthId) {
      const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(targetAuthId)

      if (getUserError) {
        console.error('Error fetching auth user for demote:', getUserError)
      } else if (authUser) {
        const updatedMetadata = { ...(authUser.user_metadata || {}), role: 'instructor' }
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          targetAuthId,
          { user_metadata: updatedMetadata }
        )

        if (updateError) {
          console.error('Error updating auth role on demote:', updateError)
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in demote-from-org-admin function:', error)
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
