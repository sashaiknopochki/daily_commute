"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { redis } from "@/lib/redis"
import { geocode, getNearbyStops } from "@/lib/bvg"
import { DeviceData } from "@/types"

export async function setupHome(formData: FormData) {
  const address = (formData.get("address") as string | null)?.trim() ?? ""

  if (!address || address.length < 5) {
    redirect("/setup?error=" + encodeURIComponent("Please enter a full address"))
  }

  const cookieStore = await cookies()
  const deviceId = cookieStore.get("device_id")?.value
  if (!deviceId) redirect("/")

  let errorMsg: string | null = null

  try {
    const geo = await geocode(address)
    if (!geo) throw new Error("Address not found — try being more specific")

    const stops = await getNearbyStops(geo.lat, geo.lon)
    if (!stops || stops.length === 0) throw new Error("No BVG stops found near that address")

    const home = {
      address,
      stopId: stops[0].id as string,
      stopName: stops[0].name as string,
    }

    let data = await redis.get<DeviceData>(`device:${deviceId}`)
    if (!data) {
      data = { deviceId, home: null, destinations: [], createdAt: new Date().toISOString() }
    }
    data.home = home
    await redis.set(`device:${deviceId}`, data)
  } catch (e: any) {
    errorMsg = e.message ?? "Something went wrong"
  }

  if (errorMsg) {
    redirect("/setup?error=" + encodeURIComponent(errorMsg))
  }
  redirect("/")
}
