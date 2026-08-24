export function AccessDenied({
  message = "You don't have access to this case.",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
      <span className="material-symbols-outlined text-4xl text-outline">lock</span>
      <h2 className="text-lg font-semibold text-on-surface">Access denied</h2>
      <p className="max-w-sm text-sm text-on-surface-variant">{message}</p>
    </div>
  );
}
