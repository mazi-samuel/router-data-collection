import { useEffect } from "react";
import RouterDataCollect from "./RouterDataCollect.jsx";

function App() {
  useEffect(() => {
    document.title = "Ìjènkéọ́mā | Lagos Route Data Collection";

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "Ìjènkéọ́mā helps Lagos commuters track routes, compare fares, and contribute reliable public transport data for better city travel decisions."
    );

    const ogTitle = document.querySelector('meta[property="og:title"]') || document.createElement("meta");
    ogTitle.setAttribute("property", "og:title");
    ogTitle.setAttribute("content", "Ìjènkéọ́mā | Lagos Route Data Collection");
    if (!ogTitle.parentNode) document.head.appendChild(ogTitle);

    const ogDescription = document.querySelector('meta[property="og:description"]') || document.createElement("meta");
    ogDescription.setAttribute("property", "og:description");
    ogDescription.setAttribute(
      "content",
      "Track routes, compare fares, and contribute to a smarter transport database for Lagos."
    );
    if (!ogDescription.parentNode) document.head.appendChild(ogDescription);

    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", "https://ijenkema.com/");
    if (!canonical.parentNode) document.head.appendChild(canonical);
  }, []);

  return <RouterDataCollect />;
}

export default App;
