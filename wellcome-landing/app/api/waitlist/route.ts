import { NextResponse } from 'next/server';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validIntents = new Set(['DISCOVER', 'HOST', 'BOTH']);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const intent = typeof body.intent === 'string' ? body.intent : 'DISCOVER';
    const honeypot = typeof body.website === 'string' ? body.website.trim() : '';

    if (honeypot) {
      return NextResponse.json({ accepted: true });
    }

    if (!emailPattern.test(email) || !validIntents.has(intent)) {
      return NextResponse.json({ message: 'Informe um e-mail valido para entrar na lista.' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Waitlist is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
      return NextResponse.json({ message: 'A lista esta sendo preparada. Tente novamente em alguns minutos.' }, { status: 503 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/waitlist_signups`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ email, intent, source: 'wellcome-landing' }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Waitlist signup failed:', await response.text());
      return NextResponse.json({ message: 'Nao foi possivel registrar seu e-mail agora. Tente novamente.' }, { status: 502 });
    }

    return NextResponse.json({ accepted: true }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Nao foi possivel processar sua solicitacao.' }, { status: 400 });
  }
}
