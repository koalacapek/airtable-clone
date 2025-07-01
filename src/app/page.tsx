import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function Home() {
  // const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();
  redirect(session ? "/home" : "/sign-in");

  // redirect("/sign-in");

  // if (session?.user) {
  //   void api.post.getLatest.prefetch();
  // }
}
