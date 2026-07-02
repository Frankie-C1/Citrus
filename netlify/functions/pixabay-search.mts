declare const Netlify: {
  env: {
    get(name: string): string | undefined;
  };
};

type PixabayHit = {
  id: number;
  previewURL: string;
  webformatURL: string;
  largeImageURL?: string;
  user: string;
  tags: string;
};

const PIXABAY_ENDPOINT = "https://pixabay.com/api/";

export default async (req: Request) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = Netlify.env.get("PIXABAY_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "PIXABAY_API_KEY ist nicht gesetzt." }, { status: 500 });
  }

  const url = new URL(req.url);
  const query = (url.searchParams.get("q") || "").trim();
  if (!query) {
    return Response.json({ images: [] });
  }

  const pixabayUrl = new URL(PIXABAY_ENDPOINT);
  pixabayUrl.searchParams.set("key", apiKey);
  pixabayUrl.searchParams.set("q", query);
  pixabayUrl.searchParams.set("image_type", "photo");
  pixabayUrl.searchParams.set("safesearch", "true");
  pixabayUrl.searchParams.set("orientation", "all");
  pixabayUrl.searchParams.set("per_page", "24");

  const response = await fetch(pixabayUrl);
  if (!response.ok) {
    return Response.json({ error: "Pixabay-Suche fehlgeschlagen." }, { status: response.status });
  }

  const payload = await response.json() as { hits?: PixabayHit[] };
  const images = (payload.hits ?? []).map((hit) => ({
    id: hit.id,
    previewUrl: hit.previewURL,
    webformatUrl: hit.webformatURL,
    largeImageUrl: hit.largeImageURL,
    user: hit.user,
    tags: hit.tags,
  }));

  return Response.json({ images });
};

export const config = {
  path: "/api/pixabay-search",
};
