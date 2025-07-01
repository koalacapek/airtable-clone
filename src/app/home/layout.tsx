import Navbar from "../_components/Navbar";
import Sidebar from "../_components/Sidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="h-fit flex-1 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
