import BottomNav from "@/components/BottomNav";

// Signed-in area. Pages inside this group get the bottom navigation.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}