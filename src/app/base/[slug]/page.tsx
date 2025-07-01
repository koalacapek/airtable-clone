// app/base/[slug]/page.tsx
import { auth } from "~/server/auth"; // adjust path if needed
import { redirect } from "next/navigation";

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function BaseSlugPage({ params }: PageProps) {
  const session = await auth();

  if (!session) {
    return redirect("/sign-in"); // or your custom sign-in route
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Base: {params.slug}</h1>
      {/* Render your actual base content here */}
    </main>
  );
}
