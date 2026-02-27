import { kv } from '@vercel/kv';
import { DeviceData, HomeStop } from '@/types';

export async function POST(request: Request) {
    const body = await request.json();
    const { deviceId, home } = body;

    if (!deviceId || !home) {
        return Response.json({ error: 'DeviceId and Home data are required' }, { status: 400 });
    }

    try {
        let data = await kv.get<DeviceData>(`device:${deviceId}`);
        if (!data) {
            data = {
                deviceId,
                home: null,
                destinations: [],
                createdAt: new Date().toISOString()
            };
        }

        data.home = home;
        await kv.set(`device:${deviceId}`, data);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: 'Storage error' }, { status: 500 });
    }
}
