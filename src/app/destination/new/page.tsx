"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ChevronRight, Check, ArrowLeft, Bus, Train, MoveRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getDeviceId, getLocalStorageData } from "@/lib/storage"
import { DeviceData } from "@/types"
import { extractRouteSummary } from "@/lib/bvg"

const step1Schema = z.object({
    name: z.string().min(2, "Name is required"),
    address: z.string().min(5, "Address must be at least 5 characters"),
})

export default function NewDestinationPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [homeStop, setHomeStop] = useState<any>(null)
    const [targetStop, setTargetStop] = useState<any>(null)
    const [journeys, setJourneys] = useState<any[]>([])

    const form = useForm<z.infer<typeof step1Schema>>({
        resolver: zodResolver(step1Schema),
        defaultValues: { name: "", address: "" },
    })

    // Step 1 -> Step 2
    async function onStep1Submit(values: z.infer<typeof step1Schema>) {
        setLoading(true)
        setError(null)
        try {
            // Get home stop
            const deviceId = getDeviceId()
            let deviceData;
            try {
                const deviceRes = await fetch(`/api/device?deviceId=${deviceId}`)
                deviceData = await deviceRes.json()
                if (deviceData.error) throw new Error("API error")
            } catch (err) {
                deviceData = JSON.parse(localStorage.getItem(`device:${deviceId}`) || '{}')
            }

            if (!deviceData?.home) throw new Error("Home address not set")
            setHomeStop(deviceData.home)

            // Geocode destination
            const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(values.address)}`)
            if (!geoRes.ok) throw new Error("Destination address not found")
            const geoData = await geoRes.json()

            // Find nearby stop
            const stopRes = await fetch(`/api/stops/nearby?lat=${geoData.lat}&lon=${geoData.lon}`)
            if (!stopRes.ok) throw new Error("Could not find any BVG stops nearby")
            const stops = await stopRes.json()
            if (!Array.isArray(stops) || stops.length === 0) throw new Error("No BVG stops found near destination")
            setTargetStop(stops[0])

            // Get journeys
            const journeyRes = await fetch(`/api/journeys?from=${deviceData.home.stopId}&to=${stops[0].id}`)
            const journeyData = await journeyRes.json()
            setJourneys(journeyData.journeys || [])

            setStep(2)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleSelectRoute(journey: any) {
        setLoading(true)
        try {
            const deviceId = getDeviceId()
            const routeSummary = extractRouteSummary(journey)

            const payload = {
                deviceId,
                destination: {
                    name: form.getValues().name,
                    address: form.getValues().address,
                    stopId: targetStop.id,
                    stopName: targetStop.name,
                    preferredRouteToken: journey.refreshToken,
                    preferredRouteSummary: routeSummary,
                }
            }

            try {
                const res = await fetch("/api/destinations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })

                if (!res.ok) throw new Error("API save failed")
            } catch (err) {
                console.warn("Storage unreachable, falling back to local storage")
                const existingDataString = localStorage.getItem(`device:${deviceId}`)
                const existingData: DeviceData = existingDataString
                    ? JSON.parse(existingDataString)
                    : { deviceId, home: homeStop, destinations: [], createdAt: new Date().toISOString() }

                const newDest = {
                    ...payload.destination,
                    id: Math.random().toString(36).substring(2, 9),
                    createdAt: new Date().toISOString()
                }

                existingData.destinations.push(newDest as any)
                localStorage.setItem(`device:${deviceId}`, JSON.stringify(existingData))
            }

            router.push("/")
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <Button variant="ghost" onClick={() => step === 1 ? router.back() : setStep(1)} className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4" /> {step === 1 ? "Back" : "Back to details"}
                </Button>

                {step === 1 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-3xl font-bold">Where are you going?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onStep1Submit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-lg">Destination Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Office, Gym, Partner" className="text-lg h-12" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-lg">Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Alexanderplatz, Berlin" className="text-lg h-12" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Arrival time removed */}
                                    {error && <p className="text-destructive font-medium">{error}</p>}
                                    <Button type="submit" className="w-full h-14 text-xl" disabled={loading}>
                                        {loading ? "Finding routes..." : "Find Routes"} <ChevronRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Choose your preferred route</h2>
                        <p className="text-muted-foreground">
                            From <span className="font-bold text-foreground">{homeStop ? homeStop.stopName : ""}</span> to <span className="font-bold text-foreground">{targetStop ? targetStop.name : ""}</span>
                        </p>

                        <div className="space-y-4">
                            {journeys.map((journey, idx) => {
                                const summary = extractRouteSummary(journey)
                                const firstDeparture = new Date(journey.legs[0].departure)

                                return (
                                    <Card
                                        key={idx}
                                        className="cursor-pointer hover:border-black transition-colors"
                                        onClick={() => handleSelectRoute(journey)}
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    {summary.legs.map((leg, li) => (
                                                        <div key={li} className="flex items-center">
                                                            {li > 0 && <MoveRight className="mx-2 h-4 w-4 text-slate-300" />}
                                                            <div className="bg-slate-900 text-white rounded px-2 py-1 text-sm font-bold">
                                                                {leg.line || leg.mode}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-end text-muted-foreground font-medium">
                                                <div className="text-lg">
                                                    Next: <span className="text-foreground font-bold">
                                                        {firstDeparture.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}

                            {journeys.length === 0 && (
                                <div className="text-center py-10 bg-zinc-900 rounded-lg border border-zinc-700">
                                    No routes found for this journey.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
