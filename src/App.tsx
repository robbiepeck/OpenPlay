import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { Game2048Page } from "./pages/Game2048Page";
import { GameMinesweeperPage } from "./pages/GameMinesweeperPage";
import { GamePokemonBrisbanePage } from "./pages/GamePokemonBrisbanePage";
import { GameSnakePage } from "./pages/GameSnakePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/games/2048" element={<Game2048Page />} />
      <Route path="/games/minesweeper" element={<GameMinesweeperPage />} />
      <Route path="/games/pokemon-brisbane" element={<GamePokemonBrisbanePage />} />
      <Route path="/games/snake" element={<GameSnakePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
