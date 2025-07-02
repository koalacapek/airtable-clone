// app/base/[slug]/page.tsx
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import type { ISlugProp } from "~/type";
import TableView from "~/app/_components/TableView";

const BaseSlugPage = async (params: ISlugProp) => {
  const session = await auth();
  const { slug: id } = await params.params;

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="p-6">
      <TableView baseId={id} />
    </main>
  );
};

export default BaseSlugPage;
