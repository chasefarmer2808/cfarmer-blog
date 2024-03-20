import type { KvSite } from "@utils/kvClient";
import { useState, useEffect } from "react";

export interface PageCountProps {
  pageSlug: string;
}

export default function PageCount({ pageSlug }: PageCountProps) {
  const [count, setCount] = useState<number>();

  useEffect(() => {
    (async function () {
      const incrementViewsResponse = await fetch(`/api/view/${pageSlug}`, {
        method: "PUT",
      });

      const data: KvSite = await incrementViewsResponse.json();
      setCount(data.views);
    })();
  }, []);

  return count && <i>Views: {count}</i>;
}
