// 1. Go to Cloudflare Dashboard > Workers & Pages > Create Application > Create Worker
// 2. Name it something like "ph-proxy" (or whatever you like)
// 3. Click "Deploy"
// 4. Click "Edit code"
// 5. Paste this entire file content there
// 6. Click "Deploy" again

const API_HOST = "us.i.posthog.com"
const ASSET_HOST = "us-assets.i.posthog.com"

async function handleRequest(request, ctx) {
  const url = new URL(request.url)
  const pathname = url.pathname
  const search = url.search
  const pathWithParams = pathname + search

  if (pathname.startsWith("/static/")) {
      return retrieveStatic(request, pathWithParams, ctx)
  } else {
      return forwardRequest(request, pathWithParams)
  }
}

async function retrieveStatic(request, pathname, ctx) {
  let response = await caches.default.match(request)
  if (!response) {
      response = await fetch(`https://${ASSET_HOST}${pathname}`)
      ctx.waitUntil(caches.default.put(request, response.clone()))
  }
  return response
}

async function forwardRequest(request, pathWithSearch) {
  const originRequest = new Request(request)
  originRequest.headers.delete("cookie")
  return await fetch(`https://${API_HOST}${pathWithSearch}`, originRequest)
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, ctx);
  }
};
