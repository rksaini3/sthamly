import BottomNav from "@/components/BottomNav";
import InstallPrompt from "@/components/InstallPrompt";

// Signed-in area. Every page inside app/(app)/ gets the bottom navigation and the install banner.
// Auth is checked on each page and by middleware.ts.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <InstallPrompt />
      <BottomNav />
    </>
  );
}