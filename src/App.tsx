import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Fields from "@/pages/Fields";
import FieldDetail from "@/pages/Fields/FieldDetail";
import Seasons from "@/pages/Seasons";
import SeasonDetail from "@/pages/Seasons/SeasonDetail";
import Operations from "@/pages/Operations";
import Harvest from "@/pages/Harvest";
import Costs from "@/pages/Costs";
import Analytics from "@/pages/Analytics";
import Weather from "@/pages/Weather";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fields" element={<Fields />} />
          <Route path="/fields/:id" element={<FieldDetail />} />
          <Route path="/seasons" element={<Seasons />} />
          <Route path="/seasons/:id" element={<SeasonDetail />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/harvest" element={<Harvest />} />
          <Route path="/costs" element={<Costs />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/weather" element={<Weather />} />
        </Route>
      </Routes>
    </Router>
  );
}
