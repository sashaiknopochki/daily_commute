import { kv } from '@vercel/kv';
import { DeviceData } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
        return Response.json({ error: 'DeviceId is required' }, { status: 400 });
    }

    try {
        const data = await kv.get<DeviceData>(`device:${deviceId}`);
        return Response.json(data || { deviceId, home: null, destinations: [], createdAt: new Date().toISOString() });
    } catch (error) {
        console.error('KV Error:', error);
        // Return 200 with a marker instead of 500 so the client can fall back to
        // localStorage without SWR throwing. The client ignores this shell and uses
        // its local cache if available, or treats it as a new device if not.
        return Response.json({ deviceId, home: null, destinations: [], createdAt: new Date().toISOString(), _kvUnavailable: true });
    }
}

export async function POST(request: Request) {
    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId) {
        return Response.json({ error: 'DeviceId is required' }, { status: 400 });
    }

    const newData: DeviceData = {
        deviceId,
        home: null,
        destinations: [],
        createdAt: new Date().toISOString(),
        ...body
    };

    try {
        await kv.set(`device:${deviceId}`, newData);
        return Response.json(newData);
    } catch (error) {
        console.error('KV Error:', error);
        return Response.json({ error: 'Storage unreachable' }, { status: 500 });
    }
}
