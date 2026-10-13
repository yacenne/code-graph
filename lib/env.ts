function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || val.trim() === "") {
    throw new Error(
      `[FATAL CONFIG ERROR] Environment variable "${key}" is missing or empty. Startup aborted.`
    );
  }
  return val.trim();
}

export const env = {
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  },
  get NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY(): string {
    return (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    );
  },
  get NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY(): string {
    return requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  },
  get CLERK_SECRET_KEY(): string {
    return requireEnv("CLERK_SECRET_KEY");
  },
  get NEXT_PUBLIC_CLERK_SIGN_IN_URL(): string {
    return process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL?.trim() || "/sign-in";
  },
  get NEXT_PUBLIC_CLERK_SIGN_UP_URL(): string {
    return process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL?.trim() || "/sign-up";
  },
};

export function validateEnv(): void {
  const required = [
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  ];

  if (typeof window === "undefined") {
    required.push(env.CLERK_SECRET_KEY);
  }
}

// Execute immediately when module is loaded
validateEnv();
