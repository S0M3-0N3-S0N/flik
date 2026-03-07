import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchTerm } = await req.json();

        if (!searchTerm) {
            return Response.json({ error: 'Search term is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get("GIPHY_API_KEY");
        if (!apiKey) {
            return Response.json({ error: 'GIPHY_API_KEY not set' }, { status: 500 });
        }

        const giphyUrl = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(searchTerm)}&limit=25`;

        const giphyResponse = await fetch(giphyUrl);
        const giphyData = await giphyResponse.json();

        const gifs = giphyData.data.map(gif => ({
            id: gif.id,
            url: gif.images.fixed_height.url,
            title: gif.title,
        }));

        return Response.json({ gifs });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});