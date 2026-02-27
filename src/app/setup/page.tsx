"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getDeviceId } from "@/lib/storage"

const formSchema = z.object({
    address: z.string().min(5, {
        message: "Address must be at least 5 characters.",
    }),
})

export default function SetupPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            address: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        setError(null)

        try {
            // 1. Geocode
            const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(values.address)}`)
            if (!geoRes.ok) throw new Error("Address not found, try being more specific")
            const geoData = await geoRes.json()

            // 2. Find nearby stops
            const stopRes = await fetch(`/api/stops/nearby?lat=${geoData.lat}&lon=${geoData.lon}`)
            if (!stopRes.ok) throw new Error("Could not find any BVG stops nearby")
            const stops = await stopRes.json()

            if (!stops || stops.length === 0) {
                throw new Error("No BVG stops found for this address")
            }

            const homeStop = {
                address: values.address,
                stopId: stops[0].id,
                stopName: stops[0].name,
            }

            // 3. Save to KV (with local fallback)
            const deviceId = getDeviceId()
            try {
                const saveRes = await fetch("/api/home", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deviceId, home: homeStop }),
                })

                if (!saveRes.ok) throw new Error("API save failed")
            } catch (err) {
                console.warn("Storage unreachable, falling back to local storage")
                // On failure, we at least save it locally so the dashboard can find it
                const existingData = JSON.parse(localStorage.getItem(`device:${deviceId}`) || '{"destinations":[]}')
                localStorage.setItem(`device:${deviceId}`, JSON.stringify({
                    ...existingData,
                    deviceId,
                    home: homeStop,
                    createdAt: existingData.createdAt || new Date().toISOString()
                }))
            }

            router.push("/")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Where do you live?</CardTitle>
                    <CardDescription className="text-lg">
                        Enter your home address to find the nearest BVG stop.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-lg">Home Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Torstraße 1, Berlin" className="text-lg h-12" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {error && (
                                <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md">
                                    {error}
                                </div>
                            )}
                            <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
                                {isSubmitting ? "Setting up..." : "Continue"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
