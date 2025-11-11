import { Hand, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <div className="relative h-[500px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900">
          <img
            src="/images/kids.jpg"
            alt="Group of people using sign language"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900"></div>
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center text-white px-6">
            <h2 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">Connect Through Sign.</h2>
            <p className="text-3xl md:text-4xl font-light drop-shadow-lg">Start Your Journey</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-12 shadow-2xl">
          <h3 className="text-4xl font-bold text-center text-slate-800 mb-12">
            What would you like to do?
          </h3>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <button
              onClick={() => navigate('/practice')}
              className="group relative overflow-hidden bg-gradient-to-br from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-3xl p-12 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="bg-white/20 p-6 rounded-2xl backdrop-blur-sm">
                  <Hand className="w-16 h-16 text-white" strokeWidth={2} />
                </div>
                <span className="text-3xl font-bold text-white">Practice</span>
              </div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
            </button>

            <button
              onClick={() => navigate('/translate')}
              className="group relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 rounded-3xl p-12 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="bg-white/20 p-6 rounded-2xl backdrop-blur-sm">
                  <Video className="w-16 h-16 text-white" strokeWidth={2} />
                </div>
                <span className="text-3xl font-bold text-white">Translate</span>
              </div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;

