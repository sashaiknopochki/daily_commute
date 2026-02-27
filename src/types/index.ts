export interface DeviceData {
    deviceId: string
    home: HomeStop | null
    destinations: Destination[]
    createdAt: string
}

export interface HomeStop {
    address: string       // original typed address
    stopId: string        // nearest BVG stop ID
    stopName: string      // e.g. "Torstraße"
}

export interface Destination {
    id: string                              // uuid
    name: string                            // user-given name, e.g. "Office"
    address: string                         // original typed address
    stopId: string                          // nearest BVG stop ID
    stopName: string                        // e.g. "Alexanderplatz U"
    preferredRouteToken: string | null      // refreshToken of chosen journey
    preferredRouteSummary: RouteSummary | null
    createdAt: string
}

export interface RouteSummary {
    legs: RouteLeg[]
    duration: number        // minutes
    transfers: number
}

export interface RouteLeg {
    mode: string
    line?: string
    direction?: string
}
