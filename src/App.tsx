import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { Game2048Page } from "./pages/Game2048Page";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/games/2048" element={<Game2048Page />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
