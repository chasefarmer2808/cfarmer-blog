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

Since we need to pull data from the backend every time the client loads the page, we need to tell Astro we aren't building a fully static site anymore. A backend server is needed to handle HTTP requests that fetch data from a remote location, which is in turn used to rerender a new page with the up-to-date data. This is known as Server-side Rendering, or SSR, and Astro does this through Adapters. There are many different platforms that are capable of SSR for a website. These adapters take care of the underlying operations needed to carry out SSR for a specific platform. Vercel is one such platform, and thankfully Astro provides an adapter for it.

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

Our goal now is to create a backend API route that runs some code server-side to connect and fetch the view count value from our KV store. Let's define one route with two endpoints:

- `GET /api/view` - gets the current page view count value.
- `POST /api/view` - Increments the page view count by one.

In Astro, all routes are defined under the `src/pages` directory. To create an API route, we first create a new subdirectory within the `pages` directory called `api`. Next, we need to create another subdirectory within the `api` directory called `view`. Finally, create a TypeScript file within the `view` directory called `site.ts`. This TypeScript file is where all of our server-side code will live.

To allow the Astro server to accept GET and POST requests on our route, we need to export a couple functions from `site.ts`:

```TypeScript
// src/pages/api/views/site.ts

import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  return new Response("hello");
};

export const POST: APIRoute = async () => {}
```

Now, we can send a GET request to `/api/views` and get the string `"hello"` back in the response. We'll come back here later to fill them in with what we really want them to do.

## Creating an In-Memory KV Store

Now that we have our route set up, let's have it return the more useful view count data that we want, instead of just a string.

We'll begin by creating a new file and defining an interface that defines the operations we want to perform against our store:

```TypeScript
// src/utils/kv.ts

export interface KvClient {
  get<T>(key: string, field: string): Promise<T | null>;
  increment(key: string, field: string, by: number): Promise<number>;
}
```

Here, we've defined an interface called `KvClient`. This will be an abstraction of the operations we want to perform against our KV store. Then, we've defined two functions for those operations:

- `get<T>(key: string, field: string): Promise<T | null>` - this function takes the key and field names for the value that we want, and then simply returns a promise containing that value, or null if it didn't find it.
- `increment(key: string, field: string, by: number): Promise<number>` - This function increments the given field by a certain amount, assuming the data type of they value in that field is an integer.

From this interface, we can encapsulate the concrete clients in this contract, and not have out API function worry about which actual remote store it's connecting to.

What we want to happen now is this: when we are in a non-production environment, we want our API function to use an in-memory store. Otherwise, open a connection and use the Vercel KV store. We'll accomplish this by using a factory design pattern and polymorphism.

First, let's create a new function in our `kv.ts` file:

```TypeScript
export function getKvClient(env: string): KvClient {
  switch (env) {
    case "prd":
      return new VercelKvClient();

    default:
      return new InMemoryKvClient();
  }
}
```

This function acts as a factory for instantiating KV clients. When the `env` string passed in is `"prd"`, we'll create a Vercel KV client. Otherwise, we'll create an in-memory KV client so we don't waist those precious calls.

Our last step here is to define the `VercelKvClient` and `InMemoryClient` classes. Both of these classes will of course implement the `KvClient` interface.

```TypeScript
class VercelKvClient implements KvClient {
  client: VercelKV;

  constructor() {
    this.client = createClient({
      url: KV_REST_API_URL,
      token: KV_REST_API_TOKEN,
    });
  }

  async get<T>(key: keyof KvStore, field: string): Promise<T | null> {
    return this.client.hget<T>(key, field);
  }

  async increment(
    key: keyof KvStore,
    field: string,
    by: number
  ): Promise<number> {
    return this.client.hincrby(key, field, by);
  }
}
```

In the `VercelKvClient` class, we start by creating a real Vercel client in the constructor that uses environment variables to connect to the remote Vercel KV store. Then, we implement the `KvClient` methods and use the actual Vercel KV Client API to carry out the `get` and `increment` operations. Since Vercel KV is just Redis under the hood, the API uses familiar `hget` and `hincrby` function names.

Next, let's create our in-memory KV client:

```TypeScript
class InMemoryKvClient implements KvClient {
  store: KvStore;

  constructor() {
    this.store = {
      site: {
        views: 0,
      },
    };
  }

  async get<T>(key: keyof KvStore, field: string): Promise<T | null> {
    return new Promise((res, rej) => {
      if (Object.keys(this.store).includes(key)) {
        const keyStore = this.store[key];
        const fieldType = field as keyof typeof keyStore;

        res(this.store[key][fieldType] as T);
      } else {
        rej(null);
      }
    });
  }

  async increment(
    key: keyof KvStore,
    field: string,
    by: number
  ): Promise<number> {
    return new Promise((res, rej) => {
      if (Object.keys(this.store).includes(key)) {
        const keyStore = this.store[key];
        const fieldType = field as keyof typeof keyStore;
        const currVal = this.store[key][fieldType];
        const newVal = currVal + by;

        this.store[key][fieldType] = newVal;

        res(newVal);
      } else {
        rej(0);
      }
    });
  }
}
```

To keep things as simple as possible, this class will just use a POJO to represent the KV store and hold its state.

Finally, let's come back to our `GET` and `POST` API functions in our `site.ts` file. Back here, we want to define at a module level the KV client these functions will use.

```TypeScript
const kv = getKvClient(ENV);

export const GET: APIRoute = async () => {}
export const POST: APIRoute = async () => {}
```

Then, let's use our KV client in our API endpoint functions.

```TypeScript
export const GET: APIRoute = async () => {
  const viewCount = await kv.get<number>("site", "views");

  return new Response(JSON.stringify({ views: viewCount }), { status: 200 });
};

export const POST: APIRoute = async () => {
  const newCount = await kv.increment("site", "views", 1);

  return new Response(JSON.stringify({ views: newCount }), { status: 200 });
};
```

Now, when requests come into these endpoints, they will return or increment the count.

## Rendering API Data Efficiently with Islands

Now that our API routes and endpoints are defined and implemented, all that's left to do is...

1. Render the current count on the home page
2. Increment the count on every home page load

To render the current count, we'll use Astro's island architecture because most of the page will be static. Only a small part will need to dynamically render on every page load. This is so the end uses is seeing the most current view count value.

Astro islands are encapsulated in components. We are using React, so to do this, we'll first need to create a new React function component. Let's call it `SiteCount` and define it in a new file in the `src/components` directory.

```tsx
export default function SiteCount() {
  // ...
}
```

Next, let's define a state for this component to store the view count. Let's also increment the count on load by calling our API endpoint, and set the count state with the returned value.

```tsx
export default function SiteCount() {
  const [count, setCount] = useState<number>();

  useEffect(() => {
    (async function () {
      const incrementViewsResponse = await fetch("/api/view/site", {
        method: "POST",
      });

      const data: KvSite = await incrementViewsResponse.json();
      setCount(data.views);
    })();
  }, []);

  // ...
}
```

Notice in the `fetch` function, we don't need to provide the FQDN, only the api route. This is because `fetch` will default to using the current hostname from the browser.

Now, all we need to do is define some JSX to render our value in HTML.

```tsx
export default function SiteCount() {
  const [count, setCount] = useState<number>();

  useEffect(() => {
    ]// ...
  }, []);

  return (
    <section>
      {count && (
        <b>By the way, this site has been visited {count} times. Nice!</b>
      )}
    </section>
  );
}
```

Finally, let's render this component on our home page by defining it in the content of our `index.astro` file.

```tsx
<Layout>
  <SiteCount client:load />
</Layout>
```

Notice we added the `client:load` attribute to our component. This tells Astro to rerender this component on every page load, effectively creating the behavior of the island architecture.

## Conclusion

I hope you've enjoyed this tutorial! It was a fun way to to try our a KV store and practice some OOP and design patterns. I hope to expand on this by adding counts for every blog post, that way end users can get a sense of popularity between posts.

If you liked this post or have any suggestions for improvement, send me a message on LinkedIn.

Happy coding!
