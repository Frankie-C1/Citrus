const ALLOWED_HOSTS = new Set(["cdn.pixabay.com", "pixabay.com", "www.pixabay.com"]);

export default async (req: Request) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const requestUrl = new URL(req.url);
  const rawUrl = requestUrl.searchParams.get("url") || "";
  let imageUrl: URL;

  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return Response.json({ error: "Ungültige Bild-URL." }, { status: 400 });
  }

  if (imageUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(imageUrl.hostname)) {
    return Response.json({ error: "Bildquelle ist nicht erlaubt." }, { status: 400 });
  }

  const response = await fetch(imageUrl);
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.startsWith("image/")) {
    return Response.json({ error: "Bild konnte nicht geladen werden." }, { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
};

export const config = {
  path: "/api/pixabay-image",
};
