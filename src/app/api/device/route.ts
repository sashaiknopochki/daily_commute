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
        return Response.json({ error: 'Storage unreachable', fallback: true }, { status: 500 });
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
