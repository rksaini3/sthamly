// app/api/me/export/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. दोष रिज़ल्ट मंगाना
    const { data: dosha } = await supabase.from('dosha_results').select('*').eq('user_id', user.id);
    
    // 2. पुराने सारे सिम्पटम लॉग्स मंगाना
    const { data: logs } = await supabase.from('daily_symptom_logs').select('*').eq('user_id', user.id);

    // 3. पूरा डेटा पैकेट तैयार करना (DPDP Act Right to Data Portability Compliance)
    const userDataPacket = {
      export_info: {
        app: "Sthamly Ayurveda",
        exported_at: new Date().toISOString(),
        compliance: "India DPDP Act 2023 Compliant"
      },
      user_profile: {
        id: user.id,
        email: user.email
      },
      health_data: {
        dosha_history: dosha || [],
        symptom_logs: logs || []
      }
    };

    // फाइल को JSON फॉर्मेट में डाउनलोड कराने के लिए हेडर्स सेट करना
    return new NextResponse(JSON.stringify(userDataPacket, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=sthamly_my_data_${user.id}.json`,
      },
    });

  } catch (err) {
    return NextResponse.json({ error: 'डेटा एक्सपोर्ट करने में विफल' }, { status: 500 });
  }
}
