import { getNearbyStops } from '@/lib/bvg';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return Response.json({ error: 'Lat and Lon are required' }, { status: 400 });
    }

    try {
        const stops = await getNearbyStops(lat, lon);
        return Response.json(stops);
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
