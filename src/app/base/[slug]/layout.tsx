import type { ReactNode } from "react";
import BaseNavbar from "~/app/_components/BaseNavbar";
import BaseSidebar from "~/app/_components/BaseSidebar";

type LayoutParams = Promise<{ slug: string }>;

export default async function BaseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: LayoutParams;
}) {
  // Await the params promise to extract slug
  const { slug: id } = await params;

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
