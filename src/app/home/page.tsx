"use server";

import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import BaseList from "../_components/BaseList";

export default async function HomePage() {
  const session = await auth();

  if (!session) redirect("/sign-in");

  return (
    <main className="flex h-full flex-col gap-y-5 bg-gray-100 px-12 py-9">
      <h1 className="text-2xl font-bold">Home</h1>
      <BaseList />
    </main>
  );
}
