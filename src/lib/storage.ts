import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'bvg_board_device_id';

export function getDeviceId(): string {
    if (typeof window === 'undefined') return '';

    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}

export function getLocalStorageData<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
        return JSON.parse(data) as T;
    } catch (e) {
        console.error('Error parsing local storage data', e);
        return null;
    }
}

export function setLocalStorageData<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
}
