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

    const firstLeg = journey.legs[0];
    const lastLeg = journey.legs[journey.legs.length - 1];

    const depTime = firstLeg.prognosedDeparture || firstLeg.departure;
    const arrTime = lastLeg.prognosedArrival || lastLeg.arrival;

    let duration = 0;
    if (depTime && arrTime) {
        const departure = new Date(depTime);
        const arrival = new Date(arrTime);
        duration = Math.round((arrival.getTime() - departure.getTime()) / 60000);
    }

    // Sanity check for duration
    if (isNaN(duration) || duration < 0 || duration > 1440) {
        duration = 0;
    }

    const transfers = journey.legs.filter((leg: any) => leg.mode !== 'walking').length - 1;

    return {
        legs,
        duration,
        transfers: transfers < 0 ? 0 : transfers,
    };
}

export function detectDisruption(journey: any) {
    if (!journey || !journey.legs) return { isDisrupted: false };

    let disruptionReason: string | undefined;

    // Check journey-level remarks first (common for strikes)
    const allRemarks = [
        ...(journey.remarks || []),
        ...journey.legs.flatMap((l: any) => l.remarks || [])
    ];

    const criticalRemark = allRemarks.find((r: any) =>
        r.type === 'warning' ||
        r.type === 'status' ||
        r.text?.toLowerCase().includes('streik') ||
        r.text?.toLowerCase().includes('strike') ||
        r.text?.toLowerCase().includes('ausfall') ||
        r.text?.toLowerCase().includes('cancelled')
    );

    if (criticalRemark) {
        disruptionReason = criticalRemark.text;
    }

    const hasCancelled = journey.legs.some((leg: any) => leg.cancelled === true);
    const isUnreachable = journey.legs.some((leg: any) => leg.reachable === false);

    const isDisrupted = hasCancelled || !!criticalRemark || isUnreachable;

    if (isDisrupted && !disruptionReason) {
        if (hasCancelled) disruptionReason = 'Leg cancelled';
        if (isUnreachable) disruptionReason = 'Leg unreachable';
    }

    return {
        isDisrupted,
        reason: disruptionReason,
    };
}
