import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
      <p className="text-muted mb-8">This page could not be found.</p>
      <Link 
        href="/"
        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
      >
        Go back home
      </Link>
    </div>
  );
}
