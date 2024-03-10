import type { APIRoute } from "astro";
import { getKvClient } from "@utils/kvClient";

const { ENVIRONMENT } = import.meta.env;

const kv = getKvClient(ENVIRONMENT);

export const GET: APIRoute = async () => {
  const viewCount = await kv.get<number>("site", "views");

  return new Response(JSON.stringify({ views: viewCount }), { status: 200 });
};
