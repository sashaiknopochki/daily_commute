import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { redis } from "@/lib/redis"
import { ArrowLeft } from "lucide-react"
import { DeviceData } from "@/types"
import { getJourneys, extractRouteSummary } from "@/lib/bvg"
import { updateDestination, selectRoute, deleteDestination } from "./actions"

export const dynamic = "force-dynamic"

export default async function EditDestinationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    view?: string
    name?: string
    address?: string
    stopId?: string
    stopName?: string
    error?: string
  }>
}) {
  const { id } = await params
  const sp = await searchParams

  const cookieStore = await cookies()
  const deviceId = cookieStore.get("device_id")?.value
  if (!deviceId) redirect("/")

  const deviceData = await redis.get<DeviceData>(`device:${deviceId}`)
  if (!deviceData?.home) redirect("/setup")

  const destination = deviceData.destinations.find((d) => d.id === id)
  if (!destination) redirect("/")

  // ── Delete confirmation view ─────────────────────────────────────────
  if (sp.view === "confirm-delete") {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <a
            href={`/destination/${id}`}
            className="inline-flex items-center gap-2 mb-6 text-zinc-400 hover:text-zinc-100 no-underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </a>

          <div className="rounded-xl border border-red-800/60 bg-zinc-900 p-8 text-center space-y-6">
            <h2 className="text-2xl font-bold text-zinc-100">Remove "{destination.name}"?</h2>
            <p className="text-zinc-400">This will remove it from your board.</p>

            <div className="flex gap-4 justify-center">
              <form action={deleteDestination}>
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  className="px-8 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                >
                  Yes, delete
                </button>
              </form>
              <a
                href={`/destination/${id}`}
                className="px-8 py-3 rounded-lg border border-zinc-700 text-zinc-300 font-semibold hover:border-zinc-500 hover:text-zinc-100 no-underline"
              >
                Cancel
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Route picker view ─────────────────────────────────────────────────
  if (sp.view === "routes") {
    const stopId = sp.stopId ?? destination.stopId
    const stopName = sp.stopName ?? destination.stopName
    const name = sp.name ?? destination.name
    const address = sp.address ?? destination.address

    let journeys: any[] = []
    let fetchError: string | null = null
    try {
      const data = await getJourneys(deviceData.home.stopId, stopId)
      journeys = data.journeys || []
    } catch {
      fetchError = "Could not fetch routes"
    }

    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <a
            href={`/destination/${id}`}
            className="inline-flex items-center gap-2 mb-6 text-zinc-400 hover:text-zinc-100 no-underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to edit
          </a>

          <h2 className="text-3xl font-bold text-zinc-100 mb-2">Updated route options</h2>
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
              return (
                <form key={idx} action={selectRoute}>
                  <input type="hidden" name="id" value={id} />
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
                    <div className="flex items-center flex-wrap gap-2">
                      {summary.legs.map((leg, li) => (
                        <span key={li} className="flex items-center">
                          {li > 0 && <span className="mx-2 text-zinc-500">→</span>}
                          <span className="bg-zinc-800 text-zinc-100 rounded px-2 py-1 text-sm font-bold border border-zinc-700">
                            {leg.line || leg.mode}
                          </span>
                        </span>
                      ))}
                    </div>
                  </button>
                </form>
              )
            })}

            {!fetchError && journeys.length === 0 && (
              <div className="text-center py-10 bg-zinc-900 rounded-xl border border-zinc-700 text-zinc-400">
                No routes found.
              </div>
            )}
          </div>

          <a
            href={`/destination/${id}`}
            className="mt-6 flex items-center justify-center w-full h-12 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 no-underline"
          >
            Cancel
          </a>
        </div>
      </div>
    )
  }

  // ── Edit form (default view) ──────────────────────────────────────────
  const { error } = sp

  // Build the "change route" URL (keeps current stop, just re-picks route)
  const changeRouteUrl =
    `/destination/${id}?view=routes` +
    "&stopId=" + encodeURIComponent(destination.stopId) +
    "&stopName=" + encodeURIComponent(destination.stopName)

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <a
          href="/"
          className="inline-flex items-center gap-2 mb-6 text-zinc-400 hover:text-zinc-100 no-underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </a>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="flex items-center justify-between p-8 pb-6">
            <h1 className="text-3xl font-bold text-zinc-100">Edit Destination</h1>

            {/* Delete — navigates to a confirmation page (no JS needed) */}
            <a
              href={`/destination/${id}?view=confirm-delete`}
              className="p-2 rounded-lg text-red-500 hover:bg-red-950/40 no-underline"
              title="Delete destination"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </a>
          </div>

          <div className="px-8 pb-8 space-y-6">
            <form action={updateDestination} className="space-y-6">
              <input type="hidden" name="id" value={id} />

              <div className="space-y-2">
                <label htmlFor="name" className="block text-lg font-medium text-zinc-100">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  defaultValue={destination.name}
                  className="w-full h-12 px-4 text-lg rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 focus:outline-none focus:border-zinc-500"
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
                  defaultValue={destination.address}
                  className="w-full h-12 px-4 text-lg rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
                <p className="text-sm text-zinc-500">Changing address will reset your preferred route.</p>
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
                Save Details
              </button>
            </form>

            <a
              href={changeRouteUrl}
              className="flex items-center justify-center w-full h-12 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100 no-underline"
            >
              Change preferred route
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
