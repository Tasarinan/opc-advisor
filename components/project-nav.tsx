export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}
