import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { username, password, role, stationId, adminEmail } = await req.json()

    const internalEmail = `${username.trim().toLowerCase()}@bmtrading.internal`

    // Create auth user with admin API — no session switching, no emails
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true, // skip email confirmation
    })

    if (userError) return NextResponse.json({ error: userError.message }, { status: 400 })

    // Insert profile
    const { error: profError } = await supabaseAdmin.from('profiles').insert({
      id: userData.user.id,
      username: username.trim().toLowerCase(),
      email: adminEmail,
      role,
      station_id: role === 'gerant' ? (stationId || null) : null,
    })

    if (profError) {
      // Clean up auth user if profile fails
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      return NextResponse.json({ error: profError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}