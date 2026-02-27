"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { kv } from "@vercel/kv"
import { geocode, getNearbyStops } from "@/lib/bvg"
import { DeviceData, RouteSummary } from "@/types"

async function getDeviceData() {
  const cookieStore = await cookies()
  const deviceId = cookieStore.get("device_id")?.value
  if (!deviceId) return { deviceId: null, data: null }
  try {
    const data = await kv.get<DeviceData>(`device:${deviceId}`)
    return { deviceId, data }
  } catch {
    return { deviceId, data: null }
  }
}

// Save name/address changes. If address changed, redirect to route picker.
export async function updateDestination(formData: FormData) {
  const { deviceId, data } = await getDeviceData()
  if (!deviceId || !data) redirect("/")

  const id = formData.get("id") as string
  const name = (formData.get("name") as string).trim()
  const address = (formData.get("address") as string).trim()

  const dest = data.destinations.find((d) => d.id === id)
  if (!dest) redirect("/")

  let errorMsg: string | null = null

  // Address unchanged — just update name
  if (address === dest.address) {
    try {
      const idx = data.destinations.findIndex((d) => d.id === id)
      data.destinations[idx] = { ...data.destinations[idx], name }
      await kv.set(`device:${deviceId}`, data)
    } catch (e: any) {
      errorMsg = e.message ?? "Could not save"
    }

    if (errorMsg) redirect(`/destination/${id}?error=` + encodeURIComponent(errorMsg))
    redirect("/")
  }

  // Address changed — geocode and redirect to route picker
  let stopId = ""
  let stopName = ""
  try {
    const geo = await geocode(address)
    if (!geo) throw new Error("Address not found")
    const stops = await getNearbyStops(geo.lat, geo.lon)
    if (!stops?.length) throw new Error("No BVG stops found nearby")
    stopId = stops[0].id as string
    stopName = stops[0].name as string
  } catch (e: any) {
    errorMsg = e.message ?? "Geocoding failed"
  }

  if (errorMsg) redirect(`/destination/${id}?error=` + encodeURIComponent(errorMsg))

  redirect(
    `/destination/${id}?view=routes` +
      "&name=" + encodeURIComponent(name) +
      "&address=" + encodeURIComponent(address) +
      "&stopId=" + encodeURIComponent(stopId) +
      "&stopName=" + encodeURIComponent(stopName)
  )
}

// Save newly selected route
export async function selectRoute(formData: FormData) {
  const { deviceId, data } = await getDeviceData()
  if (!deviceId || !data) redirect("/")

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const address = formData.get("address") as string
  const stopId = formData.get("stopId") as string
  const stopName = formData.get("stopName") as string
  const refreshToken = formData.get("refreshToken") as string
  const routeSummaryJson = formData.get("routeSummary") as string

  let routeSummary: RouteSummary | null = null
  try { routeSummary = JSON.parse(routeSummaryJson) } catch { /* leave null */ }

  const idx = data.destinations.findIndex((d) => d.id === id)
  if (idx === -1) redirect("/")

  let errorMsg: string | null = null
  try {
    data.destinations[idx] = {
      ...data.destinations[idx],
      name,
      address,
      stopId,
      stopName,
      preferredRouteToken: refreshToken || null,
      preferredRouteSummary: routeSummary,
    }
    await kv.set(`device:${deviceId}`, data)
  } catch (e: any) {
    errorMsg = e.message ?? "Could not save"
  }

  if (errorMsg) redirect(`/destination/${id}?error=` + encodeURIComponent(errorMsg))
  redirect("/")
}

// Delete destination
export async function deleteDestination(formData: FormData) {
  const { deviceId, data } = await getDeviceData()
  if (!deviceId || !data) redirect("/")

  const id = formData.get("id") as string
  let errorMsg: string | null = null
  try {
    data.destinations = data.destinations.filter((d) => d.id !== id)
    await kv.set(`device:${deviceId}`, data)
  } catch (e: any) {
    errorMsg = e.message ?? "Could not delete"
  }

  if (errorMsg) redirect(`/destination/${id}?error=` + encodeURIComponent(errorMsg))
  redirect("/")
}
