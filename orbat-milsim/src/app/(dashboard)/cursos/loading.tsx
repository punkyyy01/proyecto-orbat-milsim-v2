import { Skeleton } from "@/components/ui/skeleton"

export default function CursosLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Stats row */}
      <div className="flex gap-4">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-5 w-36 rounded-full" />
      </div>

      {/* Course cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            </div>
            <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
