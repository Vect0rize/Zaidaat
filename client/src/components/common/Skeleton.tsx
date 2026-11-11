export function PropertyCardSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-slate-200/80" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-6 w-28 rounded bg-slate-200" />
          <div className="h-4 w-20 rounded bg-slate-100" />
        </div>
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3.5 w-1/2 rounded bg-slate-100" />
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <div className="h-3.5 w-16 rounded bg-slate-100" />
          <div className="h-3.5 w-16 rounded bg-slate-100" />
          <div className="h-3.5 w-20 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function ProfessionalCardSkeleton() {
  return (
    <div className="card p-5 animate-pulse space-y-4">
      <div className="flex items-start gap-3.5">
        <div className="h-14 w-14 rounded-full bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-slate-100" />
          <div className="h-5 w-44 rounded bg-slate-200" />
          <div className="h-3.5 w-5/6 rounded bg-slate-100" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded bg-slate-100" />
        <div className="h-5 w-20 rounded bg-slate-100" />
        <div className="h-5 w-14 rounded bg-slate-100" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="h-14 rounded-lg bg-slate-100" />
        <div className="h-14 rounded-lg bg-slate-100" />
        <div className="h-14 rounded-lg bg-slate-100" />
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="h-5 w-28 rounded bg-slate-200" />
        <div className="h-9 w-24 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="card p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-28 rounded bg-slate-100" />
        <div className="h-5 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="h-5 w-3/4 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-100" />
      <div className="h-4 w-2/3 rounded bg-slate-100" />
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="h-6 w-32 rounded bg-slate-200" />
        <div className="h-9 w-28 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-pulse space-y-6">
      <div className="h-5 w-40 rounded bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-[16/9] rounded-xl bg-slate-200" />
          <div className="h-32 rounded-xl bg-slate-100" />
        </div>
        <div className="h-96 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
