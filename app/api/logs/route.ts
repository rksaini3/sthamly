// app/api/logs/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { acidity_level, gas_level, fatigue_level, notes } = await request.json();

    const { data, error } = await supabase
      .from('daily_symptom_logs')
      .insert({
        user_id: user.id,
        acidity_level, // 'None', 'Mild', 'Severe'
        gas_level,
        fatigue_level,
        notes,
        logged_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
      })
      .select();

    if (error) return NextResponse.json({ error: 'लॉग सेव नहीं हुआ' }, { status: 400 });
    return NextResponse.json({ message: 'लॉग सुरक्षित हुआ', data });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
