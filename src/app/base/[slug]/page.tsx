// app/base/[slug]/page.tsx
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import type { ISlugProp } from "~/type";
import BaseContent from "~/app/_components/BaseContent";

const BaseSlugPage = async ({ params }: ISlugProp) => {
  const session = await auth();
  const { slug: id } = params;

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="h-full w-full">
      <BaseContent baseId={id} />
    </main>
  );
};

export default BaseSlugPage;
