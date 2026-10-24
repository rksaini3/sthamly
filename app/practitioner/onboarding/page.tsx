import { redirect } from "next/navigation";
import { submitPractitioner } from "@/app/practitioner/onboarding/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  invalid: "कुछ जानकारी सही नहीं है। सभी ज़रूरी fields भरें।",
  docs: "दोनों documents upload करें।",
  file_size: "हर file 5 MB से छोटी होनी चाहिए।",
  file_type: "सिर्फ PDF, JPG या PNG files चलेंगी।",
  upload: "Document upload नहीं हुआ। दोबारा कोशिश करें।",
  already_verified: "आपका account पहले से verified है।",
  save: "जानकारी save नहीं हुई। दोबारा कोशिश करें।",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { submitted?: string; error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/practitioner/onboarding")}`);
  }

  const db = createSupabaseAdminClient();
  const { data: practitioner } = await db
    .from("practitioners")
    .select("verified, is_listed")
    .eq("id", user.id)
    .maybeSingle();

  const errorText = searchParams.error ? ERROR_TEXT[searchParams.error] ?? ERROR_TEXT.save : null;

  if (practitioner?.verified) {
    return (
      <main className="mx-auto min-h-screen max-w-md space-y-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-brand">आपका account verified है</h1>
        <p className="text-sm text-neutral-700">
          {practitioner.is_listed
            ? "आपकी profile users को दिख रही है।"
            : "आपकी profile अभी listed नहीं है। Admin से संपर्क करें।"}
        </p>
      </main>
    );
  }

  const pending = !!practitioner;

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-4 py-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-brand">Practitioner के रूप में जुड़ें</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Sthamly पर BAMS या MD (Ayurveda) practitioners 30 मिनट की wellness consultation देते हैं।
          Admin आपके documents जाँचने के बाद ही profile को listed करेगा।
        </p>
      </header>

      {searchParams.submitted ? (
        <p role="status" className="rounded-md bg-brand-soft p-3 text-sm text-brand">
          आपका application मिल गया है। Review में लगभग 48 घंटे लग सकते हैं।
        </p>
      ) : null}

      {pending && !searchParams.submitted ? (
        <p className="rounded-md bg-brand-soft p-3 text-sm text-brand">
          आपका application review में है। नीचे दी जानकारी बदलकर दोबारा भेज सकते हैं।
        </p>
      ) : null}

      {errorText ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorText}
        </p>
      ) : null}

      <form action={submitPractitioner} encType="multipart/form-data" className="space-y-5">
        <div>
          <label htmlFor="display_name" className="block text-sm font-medium">
            नाम (profile पर दिखेगा)
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            minLength={3}
            maxLength={80}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="qualification" className="block text-sm font-medium">
            योग्यता
          </label>
          <select
            id="qualification"
            name="qualification"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          >
            <option value="BAMS">BAMS</option>
            <option value="MD_Ayurveda">MD (Ayurveda)</option>
          </select>
        </div>

        <div>
          <label htmlFor="registration_no" className="block text-sm font-medium">
            Registration number
          </label>
          <input
            id="registration_no"
            name="registration_no"
            required
            minLength={3}
            maxLength={40}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="registration_council" className="block text-sm font-medium">
            Registration council (जैसे State Ayurveda Council)
          </label>
          <input
            id="registration_council"
            name="registration_council"
            required
            minLength={3}
            maxLength={120}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="languages" className="block text-sm font-medium">
            भाषाएँ (comma से अलग करें)
          </label>
          <input
            id="languages"
            name="languages"
            required
            placeholder="Hindi, English"
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="specialities" className="block text-sm font-medium">
            विशेषज्ञता (comma से अलग करें, वैकल्पिक)
          </label>
          <input
            id="specialities"
            name="specialities"
            placeholder="acidity, sleep, skin"
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="fee_rupees" className="block text-sm font-medium">
            फ़ीस (₹, 30 मिनट के लिए, ₹200 से ₹2000)
          </label>
          <input
            id="fee_rupees"
            name="fee_rupees"
            type="number"
            required
            min={200}
            max={2000}
            step={50}
            defaultValue={699}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium">
            परिचय (वैकल्पिक, 500 अक्षर तक)
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="degree_doc" className="block text-sm font-medium">
            डिग्री certificate (PDF, JPG या PNG, 5 MB तक)
          </label>
          <input
            id="degree_doc"
            name="degree_doc"
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png"
            className="mt-1 w-full text-sm"
          />
        </div>

        <div>
          <label htmlFor="registration_doc" className="block text-sm font-medium">
            Registration certificate (PDF, JPG या PNG, 5 MB तक)
          </label>
          <input
            id="registration_doc"
            name="registration_doc"
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png"
            className="mt-1 w-full text-sm"
          />
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-neutral-300 bg-white p-4">
          <input type="checkbox" name="agreement" required className="mt-1 h-5 w-5 accent-brand" />
          <span className="text-sm text-neutral-800">
            मैं Practitioner Agreement v{AGREEMENT_VERSION} से सहमत हूँ। इसमें payout, आचरण, गोपनीयता और
            content review की शर्तें हैं। Consultation diagnosis या इलाज नहीं है।
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-brand px-4 py-3 text-base font-medium text-white"
        >
          {pending ? "जानकारी दोबारा भेजें" : "Application भेजें"}
        </button>
      </form>
    </main>
  );
}

const AGREEMENT_VERSION = "1.0";