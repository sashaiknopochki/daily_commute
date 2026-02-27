import { Destination, RouteSummary } from "@/types";

const BVG_API_BASE = 'https://v6.bvg.transport.rest';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function geocode(address: string) {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'bvg-board/1.0',
        },
    });
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return {
        lat: data[0].lat,
        lon: data[0].lon,
        display_name: data[0].display_name,
    };
}

export async function getNearbyStops(lat: string, lon: string) {
    const url = `${BVG_API_BASE}/locations/nearby?latitude=${lat}&longitude=${lon}&results=3`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetching stops failed');
    return await res.json();
}

export async function getJourneys(fromId: string, toId: string) {
    const url = `${BVG_API_BASE}/journeys?from=${fromId}&to=${toId}&results=6`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetching journeys failed');
    return await res.json();
}

export async function refreshJourney(refreshToken: string) {
    const url = `${BVG_API_BASE}/journeys/${encodeURIComponent(refreshToken)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
}

export function extractRouteSummary(journey: any): RouteSummary {
    const legs = journey.legs.map((leg: any) => ({
        mode: leg.mode,
        line: leg.line?.name,
        direction: leg.direction,
    }));

    const departure = new Date(journey.legs[0].departure);
    const arrival = new Date(journey.legs[journey.legs.length - 1].arrival);
    const duration = Math.round((arrival.getTime() - departure.getTime()) / 60000);

    const transfers = journey.legs.filter((leg: any) => leg.mode !== 'walking').length - 1;

    return {
        legs,
        duration,
        transfers: transfers < 0 ? 0 : transfers,
    };
}

export function detectDisruption(journey: any) {
    if (!journey || !journey.legs) return { isDisrupted: false };

    // Any leg.cancelled === true
    const hasCancelled = journey.legs.some((leg: any) => leg.cancelled === true);

    // Any remarks entry with type === "warning" or type === "status"
    let disruptionReason: string | undefined;
    const hasWarning = journey.legs.some((leg: any) => {
        if (leg.remarks) {
            const warning = leg.remarks.find((r: any) => r.type === 'warning' || r.type === 'status');
            if (warning) {
                disruptionReason = warning.text;
                return true;
            }
        }
        return false;
    });

    // Any leg.reachable === false
    const isUnreachable = journey.legs.some((leg: any) => leg.reachable === false);

    const isDisrupted = hasCancelled || hasWarning || isUnreachable;

    if (isDisrupted && !disruptionReason) {
        if (hasCancelled) disruptionReason = 'Leg cancelled';
        if (isUnreachable) disruptionReason = 'Destination unreachable';
    }

    return {
        isDisrupted,
        reason: disruptionReason,
    };
}
