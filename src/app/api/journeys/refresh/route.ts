import { refreshJourney } from '@/lib/bvg';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return Response.json({ error: 'Token is required' }, { status: 400 });
    }

    try {
        const journey = await refreshJourney(token);
        if (!journey) {
            return Response.json({ error: 'Journey not found' }, { status: 404 });
        }
        return Response.json(journey);
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
