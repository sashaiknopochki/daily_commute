// Device ID is now managed server-side via the 'device_id' cookie.
// The cookie bootstrap script in layout.tsx migrates any existing
// localStorage ID and sets the cookie on the first page load.
//
// These helpers remain as utilities if needed by API routes.

export function getLocalStorageData<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
        return JSON.parse(data) as T;
    } catch {
        return null;
    }
}

export function setLocalStorageData<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
}
