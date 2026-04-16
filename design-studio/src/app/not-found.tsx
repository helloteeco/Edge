import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="card max-w-md text-center">
        <div className="text-6xl font-bold text-brand-900/10 mb-4">404</div>
        <h2 className="text-xl font-bold text-brand-900 mb-2">
          Page not found
        </h2>
        <p className="text-sm text-brand-600 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/dashboard" className="btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
