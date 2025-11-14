import { Hand } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

function Header() {
  const location = useLocation();

  return (
    <header className="bg-white border-b border-green-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Hand className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-xl font-bold text-green-600">WOTE</h1>
              <p className="text-sm text-gray-600">Your Journey to Fluency</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`transition-colors ${
                location.pathname === '/'
                  ? 'text-green-600 font-medium border-b-2 border-green-500 pb-1'
                  : 'text-gray-600 hover:text-green-600'
              }`}
            >
              Home
            </Link>
            <Link
              to="/translate"
              className={`transition-colors ${
                location.pathname === '/translate'
                  ? 'text-green-600 font-medium border-b-2 border-green-500 pb-1'
                  : 'text-gray-600 hover:text-green-600'
              }`}
            >
              Translate
            </Link>
            <Link
              to="/practice"
              className={`transition-colors ${
                location.pathname === '/practice'
                  ? 'text-green-600 font-medium border-b-2 border-green-500 pb-1'
                  : 'text-gray-600 hover:text-green-600'
              }`}
            >
              Practice
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;

