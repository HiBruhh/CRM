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
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Brak konfiguracji Supabase')
    }

    const { token, password } = await req.json()
    if (!token || !password) throw new Error('Brak tokenu lub hasła')
    if (password.length < 6) throw new Error('Hasło musi mieć min. 6 znaków')

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    })

    const tokenHash = await hashToken(token)

    const { data: resetToken, error: tokenError } = await adminClient
      .from('password_reset_tokens')
      .select('id, instructor_id, used, expires_at, instructors!inner(auth_id)')
      .eq('token_hash', tokenHash)
      .single()

    if (tokenError || !resetToken) throw new Error('Nieprawidłowy lub wygasły token')
    if (resetToken.used) throw new Error('Token został już użyty')
    if (new Date(resetToken.expires_at) < new Date()) throw new Error('Token wygasł')

    const authId = (resetToken as any).instructors?.auth_id
    if (!authId) throw new Error('Nie znaleziono konta użytkownika')

    const { error: updateError } = await adminClient.auth.admin.updateUserById(authId, {
      password
    })

    if (updateError) throw new Error('Błąd zmiany hasła: ' + updateError.message)

    const { error: markError } = await adminClient
      .from('password_reset_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', resetToken.id)

    if (markError) {
      console.error('Failed to mark token as used:', markError)
    }

    return new Response(JSON.stringify({ success: true, message: 'Hasło zostało zmienione' }), {
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
