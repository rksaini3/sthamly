import LoginForm from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

// Allow only paths inside this site.
function safeNext(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/plan";
  }
  return value;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = safeNext(searchParams.next);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold text-brand">Sthamly में login करें</h1>
      <p className="mt-2 text-sm text-neutral-700">
        आपका plan, log और consult history सिर्फ आपके लिए save होता है।
      </p>

      {searchParams.error ? (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          Login नहीं हो सका। दोबारा कोशिश करें।
        </p>
      ) : null}

      <div className="mt-6">
        <LoginForm next={next} />
      </div>

      <p className="mt-8 text-xs text-neutral-600">
        Sthamly general wellness जानकारी देता है। यह doctor की जगह नहीं है।
      </p>
    </main>
  );
}