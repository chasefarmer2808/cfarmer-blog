import type { APIRoute } from "astro";
import { getKvClient } from "@utils/kvClient";

const { ENVIRONMENT } = import.meta.env;

export const prerender = false;

const kv = getKvClient(ENVIRONMENT);

export const GET: APIRoute = async () => {
  const viewCount = await kv.get<number>("site", "views");

  return new Response(JSON.stringify({ views: viewCount }), { status: 200 });
};

export const POST: APIRoute = async () => {
  const newCount = await kv.increment("site", "views", 1);

  return new Response(JSON.stringify({ views: newCount }), { status: 200 });
};
