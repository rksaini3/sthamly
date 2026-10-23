// app/api/dosha-results/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// यूजर का पुराना दोष डेटा मंगाना (GET)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('dosha_results')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) return NextResponse.json({ error: 'डेटा नहीं मिला' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// क्विज़ के बाद नया दोष डेटा सेव करना (POST)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { vata_score, pitta_score, kapha_score, primary_dosha } = await request.json();

    const { data, error } = await supabase
      .from('dosha_results')
      .upsert({
        user_id: user.id,
        vata_score,
        pitta_score,
        kapha_score,
        primary_dosha,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) return NextResponse.json({ error: 'सेव करने में विफल' }, { status: 400 });
    return NextResponse.json({ message: 'सफलतापूर्वक सेव हुआ', data });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
