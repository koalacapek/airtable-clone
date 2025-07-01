import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

const HomePage = async () => {
  const session = await auth();
  if (!session) redirect("/");
  console.log(session);

  return (
    <main className="flex h-full flex-col bg-gray-100">
      <div className="text-gray-4 p-10 text-3xl font-bold">
        <h1>Home</h1>
      </div>

      <p className="text-2xl">Welcome to the T3 App!</p>
      <p className="text-lg">
        This is a simple home page for your T3 application.
      </p>
    </main>
  );
};

export default HomePage;
