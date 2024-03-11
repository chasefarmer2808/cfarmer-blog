import { useEffect, useState } from "react";
import type { KvSite } from "@utils/kvClient";

export default function SiteCount() {
  const [count, setCount] = useState<number>();

  useEffect(() => {
    (async function () {
      const incrementViewsResponse = await fetch("/api/view/site", {
        method: "POST",
      });
      console.log(incrementViewsResponse);
      const data: KvSite = await incrementViewsResponse.json();
      setCount(data.views);
    })();
  }, []);

  return (
    <section>
      <b>By the way, this site has been visited {count} times. Nice!</b>
    </section>
  );
}
