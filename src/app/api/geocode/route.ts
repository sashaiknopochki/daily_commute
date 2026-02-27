import { geocode } from '@/lib/bvg';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q) {
        return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    try {
        const result = await geocode(q);
        if (!result) {
            return Response.json({ error: 'Address not found' }, { status: 404 });
        }
        return Response.json(result);
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
