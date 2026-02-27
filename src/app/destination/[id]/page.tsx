"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ChevronRight, ArrowLeft, Trash2, Save, MoveRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { getDeviceId } from "@/lib/storage"
import { extractRouteSummary } from "@/lib/bvg"
import { Destination } from "@/types"

const editSchema = z.object({
    name: z.string().min(2, "Name is required"),
    address: z.string().min(5, "Address must be at least 5 characters"),
})

export default function EditDestinationPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [destination, setDestination] = useState<Destination | null>(null)
    const [journeys, setJourneys] = useState<any[]>([])
    const [showJourneys, setShowJourneys] = useState(false)
    const [homeStop, setHomeStop] = useState<any>(null)
    const [newTargetStop, setNewTargetStop] = useState<any>(null)

    const form = useForm<z.infer<typeof editSchema>>({
        resolver: zodResolver(editSchema),
        defaultValues: { name: "", address: "" },
    })

    useEffect(() => {
        async function init() {
            const deviceId = getDeviceId()
            try {
                let data;
                try {
                    const res = await fetch(`/api/device?deviceId=${deviceId}`)
                    data = await res.json()
                    if (data.error) throw new Error("API error")
                } catch (err) {
                    data = JSON.parse(localStorage.getItem(`device:${deviceId}`) || 'null')
                }

                if (!data) throw new Error("Device data not found")

                const dest = data.destinations.find((d: any) => d.id === id)
                if (!dest) throw new Error("Destination not found")

                setDestination(dest)
                setHomeStop(data.home)
                form.reset({ name: dest.name, address: dest.address })
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [id, form])

    async function onSaveDetails(values: z.infer<typeof editSchema>) {
        setSaving(true)
        setError(null)
        try {
            const deviceId = getDeviceId()

            // If address changed, we need new routes
            if (values.address !== destination?.address) {
                // Geocode
                const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(values.address)}`)
                const geoData = await geoRes.json()

                // Stops
                const stopRes = await fetch(`/api/stops/nearby?lat=${geoData.lat}&lon=${geoData.lon}`)
                const stops = await stopRes.json()
                setNewTargetStop(stops[0])

                // Journeys
                const journeyRes = await fetch(`/api/journeys?from=${homeStop.stopId}&to=${stops[0].id}`)
                const journeyData = await journeyRes.json()
                setJourneys(journeyData.journeys || [])
                setShowJourneys(true)
            } else {
                // Just update name
                try {
                    const res = await fetch(`/api/destinations/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            deviceId, updates: {
                                name: values.name,
                            }
                        })
                    })
                    if (!res.ok) throw new Error("API Patch failed")
                } catch (err) {
                    console.warn("API Patch failed, falling back to local storage")
                    const existingData = JSON.parse(localStorage.getItem(`device:${deviceId}`) || '{}')
                    const idx = existingData.destinations?.findIndex((d: any) => d.id === id)
                    if (idx !== -1) {
                        existingData.destinations[idx] = {
                            ...existingData.destinations[idx],
                            name: values.name,
                        }
                        localStorage.setItem(`device:${deviceId}`, JSON.stringify(existingData))
                    }
                }
                router.push("/")
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleSelectNewRoute(journey: any) {
        setSaving(true)
        try {
            const deviceId = getDeviceId()
            const summary = extractRouteSummary(journey)

            try {
                const res = await fetch(`/api/destinations/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        deviceId,
                        updates: {
                            name: form.getValues().name,
                            address: form.getValues().address,
                            stopId: newTargetStop.id,
                            stopName: newTargetStop.name,
                            preferredRouteToken: journey.refreshToken,
                            preferredRouteSummary: summary,
                        }
                    })
                })
                if (!res.ok) throw new Error("API Path failed")
            } catch (err) {
                console.warn("API Patch failed, falling back to local storage")
                const existingData = JSON.parse(localStorage.getItem(`device:${deviceId}`) || '{}')
                const idx = existingData.destinations?.findIndex((d: any) => d.id === id)
                if (idx !== -1) {
                    existingData.destinations[idx] = {
                        ...existingData.destinations[idx],
                        name: form.getValues().name,
                        address: form.getValues().address,
                        stopId: newTargetStop.id,
                        stopName: newTargetStop.name,
                        preferredRouteToken: journey.refreshToken,
                        preferredRouteSummary: summary,
                    }
                    localStorage.setItem(`device:${deviceId}`, JSON.stringify(existingData))
                }
            }
            router.push("/")
        } catch (err: any) {
            setError(err.message)
            setSaving(false)
        }
    }

    async function handleDelete() {
        try {
            const deviceId = getDeviceId()
            await fetch(`/api/destinations/${id}?deviceId=${deviceId}`, { method: "DELETE" })
            router.push("/")
        } catch (err: any) {
            setError("Delete failed")
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <Button variant="ghost" onClick={() => router.push("/")} className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
                </Button>

                {!showJourneys ? (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-3xl font-bold">Edit Destination</CardTitle>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive">
                                        <Trash2 className="h-6 w-6" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will remove "{destination?.name}" from your board.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSaveDetails)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-lg">Name</FormLabel>
                                                <FormControl>
                                                    <Input className="text-lg h-12" {...field} />
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
                                                    <Input className="text-lg h-12" {...field} />
                                                </FormControl>
                                                <FormDescription>Changing address will reset your preferred route.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Arrival time removed */}
                                    {error && <p className="text-destructive font-medium">{error}</p>}
                                    <Button type="submit" className="w-full h-14 text-xl" disabled={saving}>
                                        {saving ? "Saving..." : "Save Details"} <Save className="ml-2 h-5 w-5" />
                                    </Button>
                                </form>
                            </Form>

                            <Button
                                variant="outline"
                                className="w-full h-12 mt-4"
                                onClick={async () => {
                                    setSaving(true)
                                    try {
                                        const journeyRes = await fetch(`/api/journeys?from=${homeStop.stopId}&to=${destination?.stopId}`)
                                        const journeyData = await journeyRes.json()
                                        setJourneys(journeyData.journeys || [])
                                        setNewTargetStop({ id: destination?.stopId, name: destination?.stopName })
                                        setShowJourneys(true)
                                    } catch (e) {
                                        setError("Failed to fetch routes")
                                    } finally {
                                        setSaving(false)
                                    }
                                }}
                            >
                                Change preferred route
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Updated route options</h2>
                        <div className="space-y-4">
                            {journeys.map((journey, idx) => {
                                const summary = extractRouteSummary(journey)
                                return (
                                    <Card key={idx} className="cursor-pointer" onClick={() => handleSelectNewRoute(journey)}>
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    {summary.legs.map((leg, li) => (
                                                        <div key={li} className="flex items-center">
                                                            {li > 0 && <MoveRight className="mx-2 h-4 w-4" />}
                                                            <div className="bg-slate-900 text-white rounded px-2 py-1 text-sm font-bold">
                                                                {leg.line || leg.mode}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                        <Button variant="ghost" onClick={() => setShowJourneys(false)} className="w-full">
                            Cancel route selection
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
