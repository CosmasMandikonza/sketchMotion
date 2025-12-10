import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CanvasPage } from "./pages/CanvasPage";
import { ExportPage } from "./pages/ExportPage";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen gradient-bg flex items-center justify-center">
          <div className="text-white text-xl font-display">Loading...</div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/canvas/:boardId" element={<CanvasPage />} />
          <Route path="/export/:boardId" element={<ExportPage />} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  );
}

export default App;
