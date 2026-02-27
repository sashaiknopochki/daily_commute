import { kv } from '@vercel/kv';
import { DeviceData } from '@/types';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const id = (await params).id;
    const body = await request.json();
    const { deviceId, updates } = body;

    if (!deviceId) {
        return Response.json({ error: 'DeviceId is required' }, { status: 400 });
    }

    try {
        const data = await kv.get<DeviceData>(`device:${deviceId}`);
        if (!data) return Response.json({ error: 'Device not found' }, { status: 404 });

        const index = data.destinations.findIndex(d => d.id === id);
        if (index === -1) return Response.json({ error: 'Destination not found' }, { status: 404 });

        data.destinations[index] = { ...data.destinations[index], ...updates };
        await kv.set(`device:${deviceId}`, data);
        return Response.json(data.destinations[index]);
    } catch (error) {
        return Response.json({ error: 'Storage error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const id = (await params).id;
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
        return Response.json({ error: 'DeviceId is required' }, { status: 400 });
    }

    try {
        const data = await kv.get<DeviceData>(`device:${deviceId}`);
        if (!data) return Response.json({ error: 'Device not found' }, { status: 404 });

        data.destinations = data.destinations.filter(d => d.id !== id);
        await kv.set(`device:${deviceId}`, data);
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: 'Storage error' }, { status: 500 });
    }
}
