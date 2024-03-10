import type { APIRoute } from "astro";
import { createClient } from "@vercel/kv";

const { KV_REST_API_URL, KV_REST_API_TOKEN } = import.meta.env;

const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});

export const GET: APIRoute = async () => {
  const viewCount = await kv.hget<number>("site", "views");

  return new Response(JSON.stringify({ views: viewCount }), { status: 200 });
};
