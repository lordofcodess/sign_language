import { Hand, Video, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero Section */}
      <div className="relative h-[600px] md:h-[700px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/kids.jpg"
            alt="Group of people using sign language"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900"></div>
        
        {/* Scattered Adinkra and Ese symbols with animations - randomized positions */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Randomly positioned symbols */}
          <div className="absolute top-[8%] left-[5%] opacity-22 animate-float-slow">
            <img src="/images/adinkra.png" alt="Adinkra" className="w-14 h-14 object-contain" />
          </div>
          <div className="absolute top-[15%] right-[12%] opacity-18 animate-float-delayed">
            <img src="/images/ese.png" alt="Ese" className="w-16 h-16 object-contain" />
          </div>
          <div className="absolute top-[22%] left-[18%] opacity-25 animate-pulse-slow">
            <img src="/images/adinkra.png" alt="Adinkra" className="w-12 h-12 object-contain" />
          </div>
          <div className="absolute top-[28%] right-[28%] opacity-15 animate-float-slow">
            <img src="/images/ese.png" alt="Ese" className="w-14 h-14 object-contain" />
          </div>
          <div className="absolute top-[35%] left-[32%] opacity-20 animate-float-delayed">
            <img src="/images/adinkra.png" alt="Adinkra" className="w-16 h-16 object-contain" />
          </div>
          <div className="absolute top-[42%] right-[8%] opacity-17 animate-pulse-slow">
            <img src="/images/ese.png" alt="Ese" className="w-12 h-12 object-contain" />
          </div>
          <div className="absolute top-[48%] left-[8%] opacity-16 animate-pulse-slow">
            <img src="/images/adinkra.png" alt="Adinkra" className="w-12 h-12 object-contain" />
          </div>
          <div className="absolute top-[52%] right-[18%] opacity-21 animate-float-slow">
            <img src="/images/ese.png" alt="Ese" className="w-16 h-16 object-contain" />
          </div>
          <div className="absolute top-[58%] left-[28%] opacity-18 animate-float-delayed">
            <img src="/images/adinkra.png" alt="Adinkra" className="w-14 h-14 object-contain" />
          </div>
          <div className="absolute top-[62%] right-[35%] opacity-15 animate-pulse-slow">
            <img src="/images/ese.png" alt="Ese" className="w-12 h-12 object-contain" />
          </div>
          <div className="absolute top-[68%] left-[15%] opacity-20 animate-float-slow">
            <img src="/images/adinkra.png" alt="Adinkra" className="w-16 h-16 object-contain" />
          </div>
          <div className="absolute top-[72%] right-[22%] opacity-17 animate-float-delayed">
            <img src="/images/ese.png" alt="Ese" className="w-14 h-14 object-contain" />
          </div>
          <div className="absolute top-[78%] left-[38%] opacity-19 animate-pulse-slow">
            <img src="/images/adinkra.png" alt="Adinkra" className="w-12 h-12 object-contain" />
          </div>
          <div className="absolute top-[82%] right-[48%] opacity-22 animate-float-slow">
            <img src="/images/ese.png" alt="Ese" className="w-16 h-16 object-contain" />
          </div>
        </div>
        
        <div className="relative h-full flex flex-col items-center justify-center px-6 z-10">
          <div className="text-center text-white mb-8">
            <h2 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">Ghanaian Sign Language</h2>
            <p className="text-2xl md:text-4xl font-light drop-shadow-lg mb-4">Connect in Your Local Language</p>
            <p className="text-lg md:text-2xl font-light drop-shadow-lg">English • Akan • Ewe</p>
          </div>
          <button
            onClick={() => navigate('/practice')}
            className="mt-8 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg"
          >
            Start Your Journey
          </button>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="bg-slate-900 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Learn & Communicate in Local Languages
          </h3>
          <p className="text-slate-400 text-lg mb-12 max-w-3xl">
            Practice Ghanaian Sign Language (GSL) and translate between sign language and local spoken languages with ease.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Practice GSL Card */}
            <div className="bg-slate-800 rounded-xl p-8 border-2 border-blue-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <Hand className="w-8 h-8 text-blue-400" strokeWidth={2} />
                </div>
                <h4 className="text-2xl font-bold text-blue-400">Practice GSL</h4>
              </div>
              <p className="text-slate-300 mb-6">
                Start learning phrases and build your fluency.
              </p>
              <button
                onClick={() => navigate('/practice')}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Start Practicing
              </button>
            </div>

            {/* Translate Language Card */}
            <div className="bg-slate-800 rounded-xl p-8 border-2 border-amber-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-amber-500/20 p-3 rounded-lg">
                  <MessageSquare className="w-8 h-8 text-amber-400" strokeWidth={2} />
                </div>
                <h4 className="text-2xl font-bold text-amber-400">Translate Language</h4>
              </div>
              <p className="text-slate-300 mb-6">
                Convert sign to text/speech and vice-versa in real-time.
              </p>
              <button
                onClick={() => navigate('/translate')}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
              >
                Start Translating
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;

