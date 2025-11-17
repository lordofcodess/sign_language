import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Translate from "./pages/Translate";
import Learn from "./pages/Learn";
import Lesson from "./pages/Lesson";
import Practice from "./pages/Practice";
import PracticeComplete from "./pages/PracticeComplete";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/lesson/:category" element={<Lesson />} />
            <Route path="/translate" element={<Translate />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/practice-complete" element={<PracticeComplete />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
