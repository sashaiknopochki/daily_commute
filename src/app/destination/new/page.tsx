import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { kv } from "@vercel/kv"
import { ArrowLeft } from "lucide-react"
import { DeviceData } from "@/types"
import { getJourneys, extractRouteSummary } from "@/lib/bvg"
import { findRoutes, saveDestination } from "./actions"

export const dynamic = "force-dynamic"

export default async function NewDestinationPage({
  searchParams,
}: {
  searchParams: Promise<{
    step?: string
    name?: string
    address?: string
    stopId?: string
    stopName?: string
    error?: string
  }>
}) {
  const params = await searchParams
  const step = params.step === "2" ? 2 : 1

  // ── Step 2: pick a route ────────────────────────────────────────────────
  if (step === 2) {
    const { name = "", address = "", stopId = "", stopName = "" } = params

    const cookieStore = await cookies()
    const deviceId = cookieStore.get("device_id")?.value
    if (!deviceId) redirect("/")

    const deviceData = await kv.get<DeviceData>(`device:${deviceId}`)
    if (!deviceData?.home) redirect("/setup")

    let journeys: any[] = []
    let fetchError: string | null = null
    try {
      const data = await getJourneys(deviceData.home.stopId, stopId)
      journeys = data.journeys || []
    } catch {
      fetchError = "Could not fetch routes — check your connection"
    }

    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <a
            href="/destination/new"
            className="inline-flex items-center gap-2 mb-6 text-zinc-400 hover:text-zinc-100 no-underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to details
          </a>

          <h2 className="text-3xl font-bold text-zinc-100 mb-2">Choose your preferred route</h2>
          <p className="text-zinc-400 mb-6">
            From <strong className="text-zinc-100">{deviceData.home.stopName}</strong> to{" "}
            <strong className="text-zinc-100">{stopName}</strong>
          </p>

          {fetchError && (
            <div className="p-4 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400 mb-4">
              {fetchError}
            </div>
          )}

          <div className="space-y-4">
            {journeys.map((journey, idx) => {
              const summary = extractRouteSummary(journey)
              const firstDep = journey.legs?.[0]?.departure
                ? new Date(journey.legs[0].departure).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null

              return (
                <form key={idx} action={saveDestination}>
                  <input type="hidden" name="name" value={name} />
                  <input type="hidden" name="address" value={address} />
                  <input type="hidden" name="stopId" value={stopId} />
                  <input type="hidden" name="stopName" value={stopName} />
                  <input type="hidden" name="refreshToken" value={journey.refreshToken ?? ""} />
                  <input type="hidden" name="routeSummary" value={JSON.stringify(summary)} />
                  <button
                    type="submit"
                    className="w-full text-left rounded-xl border border-zinc-700 bg-zinc-900 p-6 hover:border-zinc-500 cursor-pointer"
                  >
                    <div className="flex items-center flex-wrap gap-2 mb-3">
                      {summary.legs.map((leg, li) => (
                        <span key={li} className="flex items-center">
                          {li > 0 && <span className="mx-2 text-zinc-500">→</span>}
                          <span className="bg-zinc-800 text-zinc-100 rounded px-2 py-1 text-sm font-bold border border-zinc-700">
                            {leg.line || leg.mode}
                          </span>
                        </span>
                      ))}
                    </div>
                    {firstDep && (
                      <p className="text-zinc-400 text-base">
                        Next: <strong className="text-zinc-100">{firstDep}</strong>
                      </p>
                    )}
                  </button>
                </form>
              )
            })}

            {!fetchError && journeys.length === 0 && (
              <div className="text-center py-10 bg-zinc-900 rounded-xl border border-zinc-700 text-zinc-400">
                No routes found for this journey.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 1: name + address ──────────────────────────────────────────────
  const { error, name = "", address = "" } = params

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <a
          href="/"
          className="inline-flex items-center gap-2 mb-6 text-zinc-400 hover:text-zinc-100 no-underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </a>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-8">Where are you going?</h1>

          <form action={findRoutes} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-lg font-medium text-zinc-100">
                Destination Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                defaultValue={name}
                placeholder="e.g. Office, Gym, Partner"
                className="w-full h-12 px-4 text-lg rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="address" className="block text-lg font-medium text-zinc-100">
                Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                required
                minLength={5}
                defaultValue={address}
                placeholder="e.g. Alexanderplatz, Berlin"
                className="w-full h-12 px-4 text-lg rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400 text-sm font-medium">
                {decodeURIComponent(error)}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-14 text-xl font-semibold rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
            >
              Find Routes →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
