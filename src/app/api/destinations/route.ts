import { kv } from '@vercel/kv';
import { DeviceData, Destination } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    const body = await request.json();
    const { deviceId, destination } = body;

    if (!deviceId || !destination) {
        return Response.json({ error: 'DeviceId and Destination data are required' }, { status: 400 });
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

        const newDestination: Destination = {
            ...destination,
            id: uuidv4(),
            createdAt: new Date().toISOString()
        };

        data.destinations.push(newDestination);
        await kv.set(`device:${deviceId}`, data);
        return Response.json(newDestination);
    } catch (error) {
        return Response.json({ error: 'Storage error' }, { status: 500 });
    }
}
