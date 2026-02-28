import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { redis } from "@/lib/redis"
import { Plus, AlertTriangle } from "lucide-react"
import { DeviceData } from "@/types"
import { refreshJourney, getJourneys, detectDisruption, extractRouteSummary } from "@/lib/bvg"

export const dynamic = "force-dynamic"

export default async function Dashboard() {
  const cookieStore = await cookies()
  const deviceId = cookieStore.get("device_id")?.value

  // No cookie yet — the inline bootstrap script in layout will set it and reload.
  // Render a neutral loading shell so there's no flash of broken UI.
  if (!deviceId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-zinc-400">Loading…</p>
      </div>
    )
  }

  let deviceData: DeviceData | null = null
  try {
    deviceData = await redis.get<DeviceData>(`device:${deviceId}`)
  } catch {
    // KV unavailable — treat as new device
  }

  if (!deviceData || !deviceData.home) {
    redirect("/setup")
  }

  const { home, destinations } = deviceData

  // Fetch live journey statuses for every destination in parallel
  type JourneyResult = {
    dest: (typeof destinations)[number]
    journey: any
    disruption: { isDisrupted: boolean; reason?: string }
    alternatives: any[]
  }

  const results: JourneyResult[] = await Promise.all(
    destinations.map(async (dest) => {
      let journey: any = null
      let disruption = { isDisrupted: false, reason: undefined as string | undefined }
      let alternatives: any[] = []

      // Primary check: ask the journey planner for current options.
      // This is the ground truth — during a strike the preferred line simply
      // won't appear in any returned journey, even if the stored refresh token
      // still looks valid.
      try {
        const freshData = await getJourneys(home!.stopId, dest.stopId)
        const freshJourneys: any[] = freshData.journeys || []

        // Transit lines the user chose as their preferred route
        const preferredLines = (dest.preferredRouteSummary?.legs ?? [])
          .filter((l) => l.mode !== "walking" && l.line)
          .map((l) => l.line as string)

        if (preferredLines.length > 0) {
          // Collect every fresh journey that uses at least one preferred line
          const withPreferred = freshJourneys.filter((j: any) =>
            (j.legs ?? []).some((l: any) => preferredLines.includes(l.line?.name))
          )

          if (withPreferred.length === 0) {
            // Line absent from planner results entirely → strike / outage
            disruption = {
              isDisrupted: true,
              reason: "Preferred line not currently operating",
            }
            alternatives = freshJourneys
              .filter((j: any) => !detectDisruption(j).isDisrupted)
              .slice(0, 3)
          } else {
            // Pick the first trip with no disruption flags.
            // Only escalate to Disrupted if every preferred-line journey is affected
            // (a single cancelled departure doesn't mean the line is down).
            const cleanJourney = withPreferred.find((j: any) => !detectDisruption(j).isDisrupted)
            journey = cleanJourney ?? withPreferred[0]
            disruption = cleanJourney
              ? { isDisrupted: false, reason: undefined }
              : (detectDisruption(withPreferred[0]) as typeof disruption)
            if (disruption.isDisrupted) {
              alternatives = freshJourneys
                .filter((j: any) => !withPreferred.includes(j) && !detectDisruption(j).isDisrupted)
                .slice(0, 3)
            }
          }
        } else {
          // No transit legs in preferred summary (walking-only or no route set yet)
          journey = freshJourneys[0] ?? null
          if (journey) disruption = detectDisruption(journey) as typeof disruption
        }
      } catch {
        // getJourneys failed — fall back to the stored refresh token
        if (dest.preferredRouteToken) {
          try {
            journey = await refreshJourney(dest.preferredRouteToken)
            disruption = detectDisruption(journey) as typeof disruption
          } catch {
            // leave journey null → shows "Status unknown"
          }
        }
      }

      return { dest, journey, disruption, alternatives }
    })
  )

  return (
    <div className="flex flex-col min-h-screen max-w-3xl mx-auto p-4 md:p-8">
      {/* Auto-refresh every 5 minutes — pure vanilla JS, works on iOS 12 */}
      <script dangerouslySetInnerHTML={{ __html: "setTimeout(function(){location.reload();},300000);" }} />

      <header className="mb-8">
        <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">
          BVG Board
        </h1>
      </header>

      <main className="flex-1 space-y-6">
        {destinations.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-700">
            <h2 className="text-2xl font-semibold mb-2">No destinations yet</h2>
            <p className="text-zinc-400 mb-6">Add a place to track your commute status.</p>
            <a
              href="/destination/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-zinc-100 text-zinc-900 font-semibold text-lg hover:bg-zinc-200"
            >
              <Plus className="h-5 w-5" /> Add Destination
            </a>
          </div>
        ) : (
          <>
            {results.map(({ dest, journey, disruption, alternatives }) => {
              const isUnknown = !journey
              const statusLabel = disruption.isDisrupted ? "Disrupted" : isUnknown ? "Status unknown" : "All good"
              const statusClass = disruption.isDisrupted
                ? "bg-red-600 text-white"
                : isUnknown
                ? "bg-zinc-700 text-zinc-300"
                : "bg-zinc-100 text-zinc-900"
              const cardClass = disruption.isDisrupted
                ? "border-red-800 bg-red-950/20"
                : "border-zinc-800 bg-zinc-900"

              return (
                <a
                  key={dest.id}
                  href={`/destination/${dest.id}`}
                  className={`block rounded-xl border overflow-hidden no-underline ${cardClass}`}
                >
                  <div className="p-6 pb-3">
                    <div className="flex justify-between items-start gap-4">
                      <h2 className="text-3xl font-bold text-zinc-100 truncate">
                        {dest.name}
                      </h2>
                      <span className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1 text-base font-semibold ${statusClass}`}>
                        <span className="w-2.5 h-2.5 rounded-full bg-current opacity-80" />
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-2 text-xl text-zinc-400 flex items-center flex-wrap gap-1">
                      {dest.preferredRouteSummary ? (() => {
                        const transitLegs = dest.preferredRouteSummary.legs.filter((l: any) => l.mode !== 'walking')
                        return transitLegs.map((leg: any, i: number) => (
                          <span key={i} className="flex items-center">
                            {i > 0 && <span className="mx-1 text-zinc-600">→</span>}
                            <span className="font-bold text-zinc-100">{leg.line || leg.mode}</span>
                          </span>
                        ))
                      })() : (
                        "No preferred route set"
                      )}
                    </div>
                  </div>

                  {disruption.isDisrupted && (
                    <div className="px-6 pb-6">
                      <div className="p-4 bg-red-950/40 border border-red-800/40 rounded-lg">
                        <div className="flex items-center text-red-400 font-bold text-base mb-2">
                          <AlertTriangle className="mr-2 h-5 w-5" />
                          {disruption.reason || "Disruption reported"}
                        </div>
                        {alternatives.length > 0 && (
                          <>
                            <p className="text-zinc-400 text-sm font-medium mb-2">Alternative routes:</p>
                            <div className="space-y-2">
                              {alternatives.map((alt, i) => {
                                const altSummary = extractRouteSummary(alt)
                                return (
                                  <div key={i} className="flex items-center flex-wrap gap-1 bg-zinc-800 px-3 py-2 rounded border border-zinc-700">
                                    {altSummary.legs.filter((l: any) => l.mode !== 'walking').map((leg: any, li: number) => (
                                      <span key={li} className="flex items-center">
                                        {li > 0 && <span className="mx-1 text-zinc-500">→</span>}
                                        <span className="text-sm font-bold text-zinc-100">{leg.line || leg.mode}</span>
                                      </span>
                                    ))}
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </a>
              )
            })}

            <a
              href="/destination/new"
              className="flex items-center justify-center gap-2 w-full h-16 text-xl rounded-xl border-2 border-dashed border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 no-underline"
            >
              <Plus className="h-6 w-6" /> Add destination
            </a>
          </>
        )}
      </main>
    </div>
  )
}
