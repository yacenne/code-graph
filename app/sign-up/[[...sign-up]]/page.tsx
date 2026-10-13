import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignUp
        appearance={{
          elements: {
            card: "shadow-xs border border-surface-border bg-surface",
          },
        }}
      />
    </div>
  );
}
