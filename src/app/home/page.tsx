"use server";

import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import BaseList from "../_components/BaseList";

export default async function HomePage() {
  const session = await auth();

  if (!session) redirect("/sign-in");

  return (
    <main className="flex h-full flex-col bg-gray-100">
      <BaseList />
    </main>
  );
}
