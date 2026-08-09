interface DocumentCardProps {
  filename: string;
  extension: string;
  status: string;
}

export default function DocumentCard({
  filename,
  extension,
  status,
}: DocumentCardProps) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-xs uppercase text-white/40">
          {extension || "—"}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/80">
            {filename}
          </p>

          <p className="mt-1 text-xs text-white/30">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}