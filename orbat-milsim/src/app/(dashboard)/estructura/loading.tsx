import { Skeleton } from "@/components/ui/skeleton"

export default function EstructuraLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Tree skeleton */}
      <div className="space-y-2">
        {/* Regimiento */}
        <div
          className="rounded-lg border p-3 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-12 rounded-full ml-auto" />
        </div>

        {/* Compañías */}
        {[...Array(2)].map((_, ci) => (
          <div key={ci} className="ml-5 space-y-2">
            <div
              className="rounded-lg border p-3 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-10 rounded-full ml-auto" />
            </div>

            {/* Pelotones */}
            {[...Array(2)].map((_, pi) => (
              <div key={pi} className="ml-5 space-y-2">
                <div
                  className="rounded-lg border p-2.5 flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}
                >
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-4 w-8 rounded-full ml-auto" />
                </div>

                {/* Escuadras */}
                <div className="ml-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[...Array(3)].map((_, ei) => (
                    <div
                      key={ei}
                      className="rounded-md border p-2 flex items-center gap-2"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-6 rounded-full ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
