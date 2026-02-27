"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { kv } from "@vercel/kv"
import { geocode, getNearbyStops } from "@/lib/bvg"
import { DeviceData, Destination, RouteSummary } from "@/types"

// Step 1 → find stop, redirect to step 2 with stop info in URL
export async function findRoutes(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim() ?? ""
  const address = (formData.get("address") as string | null)?.trim() ?? ""

  if (!name || name.length < 2 || !address || address.length < 5) {
    redirect("/destination/new?error=" + encodeURIComponent("Please fill in both fields"))
  }

  let errorMsg: string | null = null
  let stopId = ""
  let stopName = ""

  try {
    const geo = await geocode(address)
    if (!geo) throw new Error("Address not found — try being more specific")

    const stops = await getNearbyStops(geo.lat, geo.lon)
    if (!stops || stops.length === 0) throw new Error("No BVG stops found near that address")

    stopId = stops[0].id as string
    stopName = stops[0].name as string
  } catch (e: any) {
    errorMsg = e.message ?? "Something went wrong"
  }

  if (errorMsg) {
    redirect(
      "/destination/new?error=" +
        encodeURIComponent(errorMsg) +
        "&name=" +
        encodeURIComponent(name) +
        "&address=" +
        encodeURIComponent(address)
    )
  }

  redirect(
    "/destination/new?step=2" +
      "&name=" + encodeURIComponent(name) +
      "&address=" + encodeURIComponent(address) +
      "&stopId=" + encodeURIComponent(stopId) +
      "&stopName=" + encodeURIComponent(stopName)
  )
}

// Step 2 → save chosen journey, redirect to dashboard
export async function saveDestination(formData: FormData) {
  const cookieStore = await cookies()
  const deviceId = cookieStore.get("device_id")?.value
  if (!deviceId) redirect("/")

  const name = formData.get("name") as string
  const address = formData.get("address") as string
  const stopId = formData.get("stopId") as string
  const stopName = formData.get("stopName") as string
  const refreshToken = formData.get("refreshToken") as string
  const routeSummaryJson = formData.get("routeSummary") as string

  let routeSummary: RouteSummary | null = null
  try {
    routeSummary = JSON.parse(routeSummaryJson)
  } catch { /* leave null */ }

  const newDest: Omit<Destination, "id" | "createdAt"> = {
    name,
    address,
    stopId,
    stopName,
    preferredRouteToken: refreshToken || null,
    preferredRouteSummary: routeSummary,
  }

  let errorMsg: string | null = null
  try {
    let data = await kv.get<DeviceData>(`device:${deviceId}`)
    if (!data) throw new Error("Device not found — please set up again")

    const dest: Destination = {
      ...newDest,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    data.destinations.push(dest)
    await kv.set(`device:${deviceId}`, data)
  } catch (e: any) {
    errorMsg = e.message ?? "Could not save destination"
  }

  if (errorMsg) {
    redirect("/destination/new?error=" + encodeURIComponent(errorMsg))
  }
  redirect("/")
}
