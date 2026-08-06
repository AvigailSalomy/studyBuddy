import Link from "next/link";

export default function GroupNotFound() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-xl font-semibold">Group not found</h1>
      <p className="text-sm text-muted-foreground">
        This group doesn&apos;t exist, or the link may be incorrect.
      </p>
      <Link href="/dashboard" className="text-sm underline underline-offset-4">
        ← Back to dashboard
      </Link>
    </div>
  );
}
