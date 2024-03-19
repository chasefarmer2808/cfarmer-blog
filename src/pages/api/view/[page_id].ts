import { getKvClient } from "@utils/kvClient";
import type { APIRoute } from "astro";

const { ENVIRONMENT } = import.meta.env;

export const prerender = false;

const kv = getKvClient(ENVIRONMENT);

export const GET: APIRoute = async ({ params }) => {
  const pageId: string | undefined = params.page_id;

  if (pageId == undefined) {
    return new Response(null, { status: 400 });
  }

  let pageCount = (await kv.get<number>(pageId, "views")) ?? 0;

  return new Response(JSON.stringify({ views: pageCount }), { status: 200 });
};

export const PUT: APIRoute = async ({ params }) => {
  const pageId: string | undefined = params.page_id;

  if (pageId == undefined) {
    return new Response(null, { status: 400 });
  }

  let pageCount = await kv.get<number>(pageId, "views");

  if (pageCount == null) {
    await kv.set<number>(pageId, "views", 1);
    pageCount = 1;
  } else {
    pageCount = await kv.increment(pageId, "views", 1);
  }

  return new Response(JSON.stringify({ views: pageCount }), { status: 200 });
};
