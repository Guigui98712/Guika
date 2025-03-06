import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Obras from "./pages/Obras";
import ObraDetalhes from "./pages/ObraDetalhes";
import DiarioObra from "./pages/DiarioObra";
import Relatorios from "./pages/Relatorios";
import Orcamentos from "./pages/Orcamentos";
import NovoOrcamento from "./pages/NovoOrcamento";
import ComparativoOrcamento from "./pages/ComparativoOrcamento";
import NotFound from "./pages/NotFound";
import SelecionarObraDiario from "./pages/SelecionarObraDiario";
import SelecionarObraRelatorio from "./pages/SelecionarObraRelatorio";
import PendenciasObra from "./pages/PendenciasObra";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/obras" replace />} />
          <Route path="/obras" element={<Obras />} />
          <Route path="/obras/:id" element={<ObraDetalhes />} />
          <Route path="/obras/:id/pendencias" element={<PendenciasObra />} />
          <Route path="/diario" element={<SelecionarObraDiario />} />
          <Route path="/obras/:id/diario" element={<DiarioObra />} />
          <Route path="/relatorios" element={<SelecionarObraRelatorio />} />
          <Route path="/obras/:id/relatorios" element={<Relatorios />} />
          <Route path="/orcamentos" element={<Orcamentos />} />
          <Route path="/orcamentos/novo/:obraId" element={<NovoOrcamento />} />
          <Route path="/orcamentos/:id" element={<ComparativoOrcamento />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
