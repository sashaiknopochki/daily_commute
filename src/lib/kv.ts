import { kv } from '@vercel/kv';
import { DeviceData } from '@/types';
import { getLocalStorageData, setLocalStorageData } from './storage';

export async function getDeviceData(deviceId: string): Promise<DeviceData | null> {
    try {
        const data = await kv.get<DeviceData>(`device:${deviceId}`);
        if (data) {
            // Sync to local storage
            if (typeof window !== 'undefined') {
                setLocalStorageData(`device:${deviceId}`, data);
            }
            return data;
        }
    } catch (error) {
        console.error('KV get error:', error);
    }

    // Fallback to local storage
    return getLocalStorageData<DeviceData>(`device:${deviceId}`);
}

export async function saveDeviceData(deviceId: string, data: DeviceData): Promise<boolean> {
    try {
        await kv.set(`device:${deviceId}`, data);
        setLocalStorageData(`device:${deviceId}`, data);
        return true;
    } catch (error) {
        console.error('KV set error:', error);
        setLocalStorageData(`device:${deviceId}`, data);
        return false;
    }
}
