// app/base/[slug]/page.tsx
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import type { ISlugProp } from "~/type";

export default async function BaseSlugPage(params: ISlugProp) {
  const session = await auth();
  const { slug } = await params.params;

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Base: {slug}</h1>
    </main>
  );
}
