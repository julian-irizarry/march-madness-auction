import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import LobbyPage from "./LobbyPage";
import GamePage from "./GamePage";
import ViewPage from "./ViewPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/view" element={<ViewPage />} />
      </Routes>
    </Router>
  );
}

export default App;
