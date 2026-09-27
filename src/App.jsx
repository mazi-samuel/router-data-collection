import { Helmet } from "react-helmet-async";
import RouterDataCollect from "./RouterDataCollect.jsx";

function App() {
  return (
    <>
      <Helmet>
        <title>Ìjènkéọ́mā | Lagos Route Data Collection</title>
        <meta
          name="description"
          content="Ìjènkéọ́mā helps Lagos commuters track routes, compare fares, and contribute reliable public transport data for better city travel decisions."
        />
        <meta
          name="keywords"
          content="Lagos transport app, route data collection, commuter map, fare tracking, public transport, Lagos mobility, transit data"
        />
        <meta property="og:title" content="Ìjènkéọ́mā | Lagos Route Data Collection" />
        <meta
          property="og:description"
          content="Track routes, compare fares, and contribute to a smarter transport database for Lagos."
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Ìjènkéọ́mā" />
        <meta property="og:url" content="https://ijenkema.com/" />
        <meta property="og:image" content="https://ijenkema.com/davinci_design_a_modern__minimal_app_icon_logo_for__ijenke.svg" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Ìjènkéọ́mā | Lagos Route Data Collection" />
        <meta
          property="twitter:description"
          content="A commuter-first route and fare platform for Lagos transport data collection."
        />
        <link rel="canonical" href="https://ijenkema.com/" />
      </Helmet>
      <RouterDataCollect />
    </>
  );
}

export default App;
