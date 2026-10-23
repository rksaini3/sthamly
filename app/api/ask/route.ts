// app/api/ask/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. लॉग-इन सुरक्षा जांच (DPDP Act Compliance)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'अनधिकृत (Unauthorized)' }, { status: 401 });
    }

    const { question } = await request.json();
    if (!question) {
      return NextResponse.json({ error: 'सवाल खाली नहीं हो सकता' }, { status: 400 });
    }

    // 2. गंभीर लक्षण जांच (Red Flags Screening)
    const urgentKeywords = ['chest pain', 'teez dard', 'severe bleeding', 'breathing problem', 'vomiting'];
    const isUrgent = urgentKeywords.some(keyword => question.toLowerCase().includes(keyword));

    if (isUrgent) {
      return NextResponse.json({
        answer: "⚠️ यह लक्षण गंभीर हो सकता है। Sthamly AI केवल सामान्य वैलनेस सलाह देता है। कृपया तुरंत नजदीकी डॉक्टर या BAMS/MD आयुर्वेदिक विशेषज्ञ से संपर्क करें।"
      });
    }

    // 3. OpenRouter API कॉल
    const response = await fetch("https://openrouter.ai", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // किफायती और सटीक मॉडल
        messages: [
          { 
            role: "system", 
            content: "आप Sthamly ऐप के एक आयुर्वेदिक सहायक हैं। केवल खान-पान, योग और दिनचर्या से जुड़ी सामान्य वैलनेस सलाह दें। कोई पक्का मेडिकल दावा या डायग्नोसिस न करें।" 
          },
          { role: "user", content: question }
        ]
      })
    });

    const aiData = await response.json();
    const aiAnswer = aiData.choices?.[0]?.message?.content || "माफी चाहते हैं, AI प्रतिक्रिया जनरेट नहीं कर सका।";

    return NextResponse.json({ answer: aiAnswer });

  } catch (err) {
    return NextResponse.json({ error: 'सर्वर एरर' }, { status: 500 });
  }
}
