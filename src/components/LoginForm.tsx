"use client";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "password-error" : undefined}
          className="control mt-1 block h-11 w-full px-3 text-md"
        />
        {state?.error && (
          <p id="password-error" role="alert" className="mt-1 text-sm text-error">
            {state.error}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn--primary h-11 w-full justify-center" disabled={pending}>
        {pending ? "Opening" : "Open dashboard"}
      </button>
    </form>
  );
}
