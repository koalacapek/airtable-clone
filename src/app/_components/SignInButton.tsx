"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { redirectTo: "/home" })}
      className="rounded bg-white/10 px-6 py-2 text-white hover:bg-white/20"
    >
      Sign in with Google
    </button>
  );
}
