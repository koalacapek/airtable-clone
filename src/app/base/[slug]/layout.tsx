import BaseNavbar from "~/app/_components/BaseNavbar";
import BaseSidebar from "~/app/_components/BaseSidebar";

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <BaseSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <BaseNavbar />
        <main className="flex-1 overflow-y-auto bg-white">{children}</main>
      </div>
    </div>
  );
}
