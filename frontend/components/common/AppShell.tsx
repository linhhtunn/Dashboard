import Navbar from "./Navbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-glow min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-screen-2xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}