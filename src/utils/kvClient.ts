import type { Env } from "types";
import { VercelKV, createClient } from "@vercel/kv";

const { KV_REST_API_URL, KV_REST_API_TOKEN } = import.meta.env;

export interface KvStore {
  site: KvSite;
}

export interface KvSite {
  views: number;
}

export interface KvClient {
  get<T>(key: keyof KvStore, field: string): Promise<T | null>;
  increment(key: keyof KvStore, field: string, by: number): Promise<number>;
}

export function getKvClient(env: Env): KvClient {
  switch (env) {
    case "prd":
      return new VercelKvClient();

    default:
      return new InMemoryKvClient();
  }
}

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
