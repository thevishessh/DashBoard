"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, safeEqual, SESSION_COOKIE, SESSION_DAYS, sessionSecret } from "@/lib/auth/session";

export type LoginState = { error: string } | null;

/** Only same-site paths, never "//other.site". */
const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) redirect("/");
  const given = String(form.get("password") ?? "");
  if (!safeEqual(given, expected)) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    return { error: "That password is not correct." };
  }
  (await cookies()).set(SESSION_COOKIE, await createSession(sessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
