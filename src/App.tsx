import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Translate from './pages/Translate';
import Practice from './pages/Practice';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/translate" element={<Translate />} />
            <Route path="/practice" element={<Practice />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
