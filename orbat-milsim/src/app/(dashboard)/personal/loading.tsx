import { Skeleton } from "@/components/ui/skeleton"

export default function PersonalLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-56 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        {/* Header row */}
        <div
          className="grid grid-cols-5 gap-4 px-4 py-3 border-b"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          {["w-20", "w-16", "w-24", "w-20", "w-16"].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>

        {/* Data rows */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-5 gap-4 px-4 py-3.5 border-b last:border-0"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  )
}
