import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignIn
        appearance={{
          elements: {
            card: "shadow-xs border border-surface-border bg-surface",
          },
        }}
      />
    </div>
  );
}
