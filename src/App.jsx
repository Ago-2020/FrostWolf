import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ModPage from "./pages/ModPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/mods/:slug" element={<ModPage />} />
    </Routes>
  );
}

export default App;