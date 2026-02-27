"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Plus, RefreshCcw, AlertTriangle, CheckCircle2, MonitorOff, Monitor } from "lucide-react"
import NoSleep from "nosleep.js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getDeviceId, getLocalStorageData, setLocalStorageData } from "@/lib/storage"
import { DeviceData, Destination } from "@/types"
import { detectDisruption, extractRouteSummary } from "@/lib/bvg"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Fetch failed')
  }
  return res.json()
}

export default function Dashboard() {
  const router = useRouter()
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [noSleep, setNoSleep] = useState<NoSleep | null>(null)
  const [isAwake, setIsAwake] = useState(false)

  useEffect(() => {
    setDeviceId(getDeviceId())
    setNoSleep(new NoSleep())
  }, [])

  const toggleNoSleep = () => {
    if (!noSleep) return
    if (isAwake) {
      noSleep.disable()
      setIsAwake(false)
    } else {
      noSleep.enable()
      setIsAwake(true)
    }
  }

  const [localData, setLocalData] = useState<DeviceData | null>(null)

  useEffect(() => {
    if (deviceId) {
      setLocalData(getLocalStorageData<DeviceData>(`device:${deviceId}`))
    }
  }, [deviceId])

  const { data: apiData, mutate, isLoading } = useSWR<DeviceData>(
    deviceId ? `/api/device?deviceId=${deviceId}` : null,
    fetcher,
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      onSuccess: (data) => {
        if (data && !(data as any).error) {
          setLocalStorageData(`device:${deviceId}`, data)
          setOffline(false)
        }
      },
      onError: () => {
        setOffline(true)
      }
    }
  )

  const deviceData = apiData || localData

  // Redirect if no home
  useEffect(() => {
    if (deviceData && !deviceData.home && !isLoading) {
      router.push("/setup")
    }
  }, [deviceData, isLoading, router])

  // Polling fallback removed in favor of SWR internal refresh

  if (isLoading || !deviceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl animate-pulse">Loading dashboard...</div>
      </div>
    )
  }

  const destinations = deviceData.destinations || []

  return (
    <div className="flex flex-col min-h-screen max-w-3xl mx-auto p-4 md:p-8">
      {/* Top Bar */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          BVG Board
        </h1>
        {offline && deviceData === localData && (
          <Badge variant="outline" className="text-muted-foreground border-muted-foreground">
            Offline Mode
          </Badge>
        )}
        <Button variant="ghost" size="icon" onClick={() => mutate()} disabled={isLoading}>
          <RefreshCcw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </header>

      {/* Destination List */}
      <main className="flex-1 space-y-6 flex-col-gap-6">
        {destinations.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
            <h2 className="text-2xl font-semibold mb-2">No destinations yet</h2>
            <p className="text-muted-foreground mb-6">Add a place to track your commute status.</p>
            <Button onClick={() => router.push("/destination/new")} size="lg">
              <Plus className="mr-2 h-5 w-5" /> Add Destination
            </Button>
          </div>
        ) : (
          <div className="space-y-6 flex-col-gap-6">
            {destinations.map((dest) => (
              <DestinationCard
                key={dest.id}
                destination={dest}
                deviceId={deviceId!}
                homeStopId={deviceData.home?.stopId || ""}
              />
            ))}

            <Button
              variant="outline"
              className="w-full h-16 text-xl border-2 border-dashed"
              onClick={() => router.push("/destination/new")}
            >
              <Plus className="mr-2 h-6 w-6" /> Add destination
            </Button>
          </div>
        )}
      </main>

      {/* NoSleep control only */}
      <footer className="mt-12 flex justify-end">
        <Button
          variant={isAwake ? "default" : "outline"}
          size="sm"
          onClick={toggleNoSleep}
          className="flex-row-gap-2"
        >
          {isAwake ? <Monitor className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
          {isAwake ? "Keep Screen Awake" : "Enable Screen Awake"}
        </Button>
      </footer>
    </div>
  )
}

function DestinationCard({
  destination,
  deviceId,
  homeStopId
}: {
  destination: Destination;
  deviceId: string;
  homeStopId: string;
}) {
  const router = useRouter()
  const { data: journey, error } = useSWR(
    destination.preferredRouteToken ? `/api/journeys/refresh?token=${destination.preferredRouteToken}` : null,
    fetcher,
    {
      refreshInterval: 300000,
      revalidateOnFocus: false
    }
  )

  const disruption = detectDisruption(journey)
  const isUnknown = !!error || !journey

  const { data: alternativesData } = useSWR(
    disruption.isDisrupted && homeStopId ? `/api/journeys?from=${homeStopId}&to=${destination.stopId}` : null,
    fetcher
  )

  const statusColor = disruption.isDisrupted ? "destructive" : isUnknown ? "secondary" : "default"
  const statusLabel = disruption.isDisrupted ? "Disrupted" : isUnknown ? "Status unknown" : "All good"

  return (
    <Card
      className={`relative overflow-hidden cursor-pointer transition-colors ${disruption.isDisrupted ? "border-destructive bg-destructive/5" : ""
        }`}
      onClick={() => router.push(`/destination/${destination.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="pr-4">
            <CardTitle className="text-3xl font-bold truncate">
              {destination.name}
            </CardTitle>
          </div>
          <Badge
            variant={statusColor === "default" ? "default" : statusColor}
            className="text-lg px-3 py-1"
          >
            <span className={`w-2.5 h-2.5 rounded-full mr-2 ${disruption.isDisrupted ? "bg-white" : isUnknown ? "bg-slate-400" : "bg-white"
              }`} />
            {statusLabel}
          </Badge>
        </div>

        <div className="text-xl text-muted-foreground">
          {destination.preferredRouteSummary ? (
            <div className="flex items-center flex-wrap">
              {destination.preferredRouteSummary.legs.map((leg, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="mx-2 text-slate-300">→</span>}
                  <span className="font-bold text-slate-800">{leg.line || leg.mode}</span>
                </span>
              ))}
            </div>
          ) : (
            "No preferred route set"
          )}
        </div>
      </CardHeader>

      {disruption.isDisrupted && (
        <CardContent className="pt-0 pb-6">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center text-destructive font-bold text-lg mb-2">
              <AlertTriangle className="mr-2 h-5 w-5" />
              {disruption.reason || "Disruption reported"}
            </div>

            <p className="text-muted-foreground font-medium mb-3">Alternative routes:</p>
            <div className="space-y-3">
              {alternativesData?.journeys?.slice(0, 3).map((alt: any, i: number) => {
                const altSummary = extractRouteSummary(alt)
                const altDisruption = detectDisruption(alt)
                if (altDisruption.isDisrupted) return null

                return (
                  <div key={i} className="flex justify-between items-center text-slate-800 bg-white p-2 rounded border border-slate-200">
                    <div className="flex items-center flex-wrap gap-1">
                      {altSummary.legs.map((leg, li) => (
                        <span key={li} className="font-bold text-sm bg-slate-100 px-1.5 py-0.5 rounded">
                          {leg.line || leg.mode}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
              {(!alternativesData?.journeys || alternativesData.journeys.length === 0) && (
                <p className="text-sm italic">Searching for alternatives...</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
