"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthFormProps {
  mode: "login" | "register";
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent";

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    if (isRegister) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nick: nick.trim() || email.split("@")[0] } },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.push("/predict");
        router.refresh();
        return;
      }
      setInfo(
        "Konto utworzone. Sprawdź skrzynkę e-mail i potwierdź adres, aby się zalogować.",
      );
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/predict");
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border/70 bg-surface/50 p-6 shadow-xl shadow-black/30">
        <h1 className="text-xl font-bold tracking-tight">
          {isRegister ? "Załóż konto" : "Zaloguj się"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isRegister
            ? "Stwórz konto, aby zapisywać swoje typy i rywalizować ze znajomymi."
            : "Wróć do swojej drabinki i sprawdź ranking."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isRegister && (
            <div className="space-y-1.5">
              <label htmlFor="nick" className="text-xs font-medium text-muted">
                Nick (widoczny w rankingu)
              </label>
              <input
                id="nick"
                type="text"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                placeholder="np. Mistrz Typów"
                autoComplete="nickname"
                className={inputClass}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-muted">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ty@example.com"
              autoComplete="email"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-muted"
            >
              Hasło
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isRegister ? "new-password" : "current-password"}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-live/10 px-3 py-2 text-sm text-live">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong disabled:opacity-60"
          >
            {loading
              ? "Chwila..."
              : isRegister
                ? "Zarejestruj się"
                : "Zaloguj się"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {isRegister ? "Masz już konto? " : "Nie masz konta? "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-accent hover:underline"
          >
            {isRegister ? "Zaloguj się" : "Zarejestruj się"}
          </Link>
        </p>
      </div>
    </div>
  );
}
