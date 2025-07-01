"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { Button } from "~/components/ui/button";

const SignInPage = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-y-10 rounded-xl bg-white p-10 py-20 shadow-md">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="logo" width={100} height={100} />
          <h1 className="text-2xl font-semibold">Sign In to Airtable Clone</h1>
          <p className="text-sm text-gray-600">Please sign in to continue</p>
        </div>
        <div>
          <Button
            variant={"outline"}
            onClick={() => signIn("google", { redirectTo: "/home" })}
            className="rounded border bg-white px-20 py-2 text-black hover:cursor-pointer"
          >
            <Image src="/google.png" alt="Google logo" width={20} height={20} />
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
