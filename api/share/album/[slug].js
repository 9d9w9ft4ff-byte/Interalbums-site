export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = parts[parts.length - 1].replace(/[?#].*$/, '');

  const SUPABASE_URL = 'https://ffibgowmvmtgnogcenso.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaWJnb3dtdm10Z25vZ2NlbnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNTYyNjgsImV4cCI6MjA5NjczMjI2OH0.Ag46jjF-jNJDfSrzbJao3hb3rmZnop2oP22ilSP-2_E';

  const albumRes = await fetch(
    `${SUPABASE_URL}/rest/v1/albums?slug=eq.${slug}&is_active=eq.true&select=id,title,cover_image_url,booth_art_url,artist_id&limit=1`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  const albums = await albumRes.json();
  if (!albums?.length) return new Response('Not found', { status: 404 });
  const album = albums[0];

  const artistRes = await fetch(
    `${SUPABASE_URL}/rest/v1/artists?id=eq.${album.artist_id}&select=band_name&limit=1`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  const artists = await artistRes.json();
  const bandName = artists?.[0]?.band_name ?? 'An artist on Interalbums';

  const isSupabaseUrl = (u) => !!u && u.includes('supabase.co/storage');
  const ogImage = isSupabaseUrl(album.cover_image_url)
    ? album.cover_image_url
    : isSupabaseUrl(album.booth_art_url)
    ? album.booth_art_url
    : null;

  const title = `${bandName} \u2013 ${album.title}`;
  const description = `Listen to ${album.title} by ${bandName} on Interalbums \u2013 a social music venue platform built for album experiences.`;
  const pageUrl = `https://app.interalbums.com/album/${slug}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta property="og:type" content="music.album" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="https://interalbums.com/share/album/${slug}" />
  <meta property="og:site_name" content="Interalbums" />
  ${ogImage ? `
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="1200" />
  <meta property="og:image:type" content="image/jpeg" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}" />` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0d0d10;
      color: #f0eef5;
      font-family: 'Helvetica Neue', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      text-align: center;
      padding: 2rem;
      max-width: 480px;
    }
    .album-art {
      width: 280px;
      height: 280px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }
    .site {
      font-size: 0.7rem;
      letter-spacing: 0.2em;
      color: #7a7a85;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .band {
      font-size: 1.1rem;
      color: #C9A84C;
      margin-bottom: 0.25rem;
    }
    .album {
      font-size: 1.6rem;
      font-weight: bold;
      margin-bottom: 0.75rem;
    }
    .desc {
      font-size: 0.85rem;
      color: #7a7a85;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    ${ogImage ? `<img class="album-art" src="${ogImage}" alt="${album.title} album art" />` : ''}
    <div class="site">Interalbums</div>
    <div class="band">${bandName}</div>
    <div class="album">${album.title}</div>
    <div class="desc">${description}</div>
  </div>
  <script>window.location.replace("${pageUrl}");</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
