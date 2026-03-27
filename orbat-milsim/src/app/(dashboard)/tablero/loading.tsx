import { Skeleton } from "@/components/ui/skeleton"

export default function TableroLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 space-y-1.5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(3)].map((_, gi) => (
          <div
            key={gi}
            className="flex-shrink-0 w-72 rounded-xl border"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            {/* Company header */}
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <Skeleton className="h-4 w-28" />
            </div>

            <div className="p-3 space-y-3">
              {/* Platoon columns */}
              {[...Array(2)].map((_, pi) => (
                <div key={pi} className="space-y-2">
                  {/* Platoon label */}
                  <Skeleton className="h-3 w-20" />

                  {/* Squad cards */}
                  {[...Array(2)].map((_, si) => (
                    <div
                      key={si}
                      className="rounded-lg border p-3 space-y-2"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-4 w-8 rounded-full" />
                      </div>
                      {/* Member rows */}
                      {[...Array(3)].map((_, mi) => (
                        <div key={mi} className="flex items-center gap-2 pl-2">
                          <Skeleton className="h-3 w-3 rounded-full shrink-0" />
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-4 w-14 rounded-full ml-auto" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
