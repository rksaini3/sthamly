// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    // कोड को एक्टिव सेशन टोकन से बदलें
    await supabase.auth.exchangeCodeForSession(code);
  }

  // लॉगिन के बाद सीधे AI Consult होम पेज पर भेजें
  return NextResponse.redirect(new URL('/ask', request.url));
}
