import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductEditor from "./pages/ProductEditor";
import TaxonomyPage from "./pages/TaxonomyPage";
import Categories from "./pages/Categories";
import ProductImport from "./pages/ProductImport";
import Settings from "./pages/Settings";
import Campaigns from "./pages/Campaigns";
import CampaignEditor from "./pages/CampaignEditor";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <Toaster position="bottom-right" closeButton toastOptions={{ classNames: { toast: "font-sans text-[13px] rounded-xl border-border" } }} />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="produtos" element={<Products />} />
              <Route path="produtos/novo" element={<ProductEditor />} />
              <Route path="produtos/importar" element={<ProductImport />} />
              <Route path="produtos/:id" element={<ProductEditor key="edit" />} />
              <Route path="categorias" element={<Categories />} />
              <Route path="colecoes" element={<TaxonomyPage key="collections" kind="collections" />} />
              <Route path="campanhas" element={<Campaigns />} />
              <Route path="campanhas/nova" element={<CampaignEditor />} />
              <Route path="campanhas/:id" element={<CampaignEditor key="edit" />} />
              <Route path="configuracoes" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
