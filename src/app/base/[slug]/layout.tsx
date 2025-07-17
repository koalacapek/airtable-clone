import BaseNavbar from "~/app/_components/BaseNavbar";
import BaseSidebar from "~/app/_components/BaseSidebar";

export default function BaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const id = params.slug;

  return (
    <div className="flex h-full">
      <BaseSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <BaseNavbar baseId={id} />
        <main className="flex-1 overflow-y-auto bg-white">{children}</main>
      </div>
    </div>
  );
}
