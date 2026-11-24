import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { passwordRequired } from "@/lib/auth/staff";

export const metadata: Metadata = { title: "Registrar Office" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!passwordRequired()) redirect("/");
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[24rem] flex-col justify-center px-5 py-16">
      <p className="font-display text-lg tracking-[-0.02em]">Registrar Office</p>
      <h1 className="mt-1">Dashboard</h1>
      <div className="mt-8">
        <LoginForm next={next ?? "/"} />
      </div>
      <p className="mt-10 text-sm">
        <a href="/request" className="text-accent-deep underline underline-offset-2 hover:text-ink">
          Students: raise a request here
        </a>
      </p>
    </main>
  );
}
