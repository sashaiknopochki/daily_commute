import { getJourneys } from '@/lib/bvg';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
        return Response.json({ error: 'From and To stop IDs are required' }, { status: 400 });
    }

    try {
        const journeys = await getJourneys(from, to);
        return Response.json(journeys);
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
