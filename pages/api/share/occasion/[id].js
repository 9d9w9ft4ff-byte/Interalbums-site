export const config = { runtime: "edge" };

const SUPABASE_URL = 'https://ffibgowmvmtgnogcenso.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaWJnb3dtdm10Z25vZ2NlbnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNTYyNjgsImV4cCI6MjA5NjczMjI2OH0.Ag46jjF-jNJDfSrzbJao3hb3rmZnop2oP22ilSP-2_E';

const OCCASION_TYPE_LABELS = {
  album_debut:      "Album Debut",
  listening_room:   "Listening Room",
  anniversary:      "Anniversary Experience",
  secret_session:   "Secret Session",
  commentary_night: "Commentary Night",
  festival_room:    "Festival Room",
};

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
    year:    "numeric",
  });
}

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey:        SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept:        "application/json",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function handler(req) {
  const url = new URL(req.url);
  const id  = url.pathname.split("/").pop();

  if (!id) {
    return new Response("Not found", { status: 404 });
  }

  const appUrl = `https://app.interalbums.com/occasions/${id}`;

  // 1. Fetch occasion
  const occasions = await sbFetch(
    `occasions?id=eq.${id}&select=title,scheduled_at,occasion_type,artist_id&limit=1`
  );
  const occasion = occasions?.[0];

  if (!occasion) {
    return new Response(null, {
      status: 302,
      headers: { Location: appUrl },
    });
  }

  // 2. Fetch artist
 const artists = await sbFetch(
  `artists?id=eq.${occasion.artist_id}&select=band_name,avatar_url&limit=1`
);
  const artist   = artists?.[0];
  const bandName = artist?.band_name ?? "Interalbums Artist";
  const imageUrl = artist?.avatar_url ?? "https://interalbums.com/og-default.jpg";

  // 3. Fetch cheapest active pass
  const passes = await sbFetch(
    `occasion_passes?occasion_id=eq.${id}&is_active=eq.true&select=price_cents&order=price_cents.asc&limit=1`
  );
  const cheapestCents = passes?.[0]?.price_cents ?? null;
  const priceStr = cheapestCents !== null
    ? `From $${Math.round(cheapestCents / 100)}`
    : null;

  const typeLabel = OCCASION_TYPE_LABELS[occasion.occasion_type] ?? "Live Event";
  const dateStr   = occasion.scheduled_at ? formatShortDate(occasion.scheduled_at) : null;

  const ogTitle = `${bandName} — ${occasion.title}`;
  const ogDesc  = [
    `Join ${bandName} for a live ${typeLabel.toLowerCase()} on ${dateStr ?? "an upcoming date"}.`,
    priceStr,
    "Interalbums",
  ].filter(Boolean).join(" · ");

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${ogTitle}</title>
    <!-- Open Graph -->
    <meta property="og:type"        content="music.song" />
    <meta property="og:title"       content="${ogTitle}" />
    <meta property="og:description" content="${ogDesc}" />
    <meta property="og:image"       content="${imageUrl}" />
    <meta property="og:url"         content="${appUrl}" />
    <meta property="og:site_name"   content="Interalbums" />
    <!-- Twitter Card -->
    <meta name="twitter:card"        content="summary_large_image" />
    <meta name="twitter:title"       content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDesc}" />
    <meta name="twitter:image"       content="${imageUrl}" />
    <meta http-equiv="refresh" content="0; url=${appUrl}" />
    <link rel="canonical" href="${appUrl}" />
  </head>
  <body>
    <script>window.location.replace("${appUrl}");</script>
    <p>Redirecting to <a href="${appUrl}">${ogTitle}</a>…</p>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
