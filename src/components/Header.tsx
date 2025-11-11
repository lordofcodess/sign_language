import { Hand } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

function Header() {
  const location = useLocation();

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Hand className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-xl font-bold text-white">SIGN & CONNECT</h1>
              <p className="text-sm text-slate-400">Your Journey to Fluency</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`transition-colors ${
                location.pathname === '/'
                  ? 'text-white font-medium border-b-2 border-white pb-1'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              to="/translate"
              className={`transition-colors ${
                location.pathname === '/translate'
                  ? 'text-white font-medium border-b-2 border-white pb-1'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Translate
            </Link>
            <a href="#" className="text-slate-300 hover:text-white transition-colors">
              Settings
            </a>
            <a href="#" className="text-slate-300 hover:text-white transition-colors">
              Profile
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;

