---
title: "Saving API Calls to Vercel KV With an In-Memory KV Store"
pubDatetime: 2024-03-12T00:00:00Z
description: ""
---

# Saving API Calls to Vercel KV With an In-Memory KV Store

I wanted a simple way to persist some data for this blog site, such as storing page view counts. This site is hosted on Vercel, and they conveniently have a Key-Value (KV) store PaaS called Vercel KV. It used Redis under the hood, and should allow me to persist any JSON-like data. The only problem is their 30K/month request limit for their free tier is a bit low, especially if requests are made on every page load. In order to not waist precious API calls during development, I'm going to tell my site to use an in-memory KV store during local development, and then switch to the live Vercel KV in production.

## What is a KV Store?

A KV store is a special kind of database that let's you store data as key-value pairs. This can be used to persist data for a website, such as user settings or configurations. Key-value pairs have an advantage over traditional table and row based databases in that reads and writes are fast given simple, non-relational data formats. The underlying platform in Vercel KV is Redis, which can do a lot more than store key-value pairs. But for this post, we'll use it's main functionality to track how many times the blog site has been visited.

## Setup: Adding Astro's Vercel Adapter

Since we need to pull data from the backend everytime the client loads the page, we need to tell Astro we aren't building a fully static site anymore. A backend server is needed to handle HTTP requests that fetch data from a remote location, which is in turn used to rerender a new page with the up-to-date data. This is known as Server-side Rendering, or SSR, and Astro does this through Adapters. There are many different platforms that are capable of SSR for a website. These adapters take care of the underlying operations needed to carry out SSR for a specific platform. Vercel is one such platform, and thankfully Astro provides an adapter for it.

To tell Astro we want to use the Vercel adapter, we need to install some dependencies and make some configuration tweaks. The following command can be run to do most of the work for us:

`npx astro add vercel`

This command installs the `@astrojs/vercel` dependency, and adds the following to our `astro.config.ts`:

```TypeScript
export default defineConfig({
  // ...
  output: "server",
  adapter: vercel()
})
```

This tells Astro that when it goes to build the site, all pages and routes are going to opt-into SSR. Since we only want SSR on the landing page, we can flip this so every page is opt-out except for the ones we select. We can do this by setting the `output` field to `"hybrid"`.

## Next, Creating API Endpoints

## Rendering API Data Efficiently with Islands

## Creating an In-Memory KV Store
