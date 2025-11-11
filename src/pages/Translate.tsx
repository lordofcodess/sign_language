import { useState, useRef } from 'react';
import { Camera, Mic, Type, Play, Square } from 'lucide-react';

function Translate() {
  const [signToTextMode, setSignToTextMode] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [inputText, setInputText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startSignCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopSignCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsRecording(false);
    // Simulate translation result
    setTranslatedText('Hello, how are you?');
  };

  const handleTranslateToSign = () => {
    if (inputText.trim()) {
      setIsPlaying(true);
      // In a real app, this would show the sign video/avatar
      setTimeout(() => {
        setIsPlaying(false);
      }, 2000);
    }
  };

  const handleTextToSpeech = () => {
    if (translatedText) {
      const utterance = new SpeechSynthesisUtterance(translatedText);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Translation</h1>
        <p className="text-slate-400">Translate between sign language and text/speech</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setSignToTextMode(true)}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            signToTextMode
              ? 'bg-amber-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Sign → Text/Speech
        </button>
        <button
          onClick={() => setSignToTextMode(false)}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            !signToTextMode
              ? 'bg-amber-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Text/Speech → Sign
        </button>
      </div>

      {/* Sign to Text/Speech Section */}
      {signToTextMode && (
        <div className="bg-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Camera className="w-6 h-6" />
            Sign-to-Text/Speech (AI capturing signs)
          </h2>
          <p className="text-slate-400 mb-6">
            Perform signs in front of your camera, and the app will translate them into text and speech.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Camera View */}
            <div className="bg-slate-900 rounded-xl p-4">
              <div className="relative aspect-video bg-slate-950 rounded-lg overflow-hidden mb-4">
                {!isRecording ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-500">Camera preview will appear here</p>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <button
                onClick={isRecording ? stopSignCapture : startSignCapture}
                className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-5 h-5" />
                    Stop Capturing
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    Start Capturing Signs
                  </>
                )}
              </button>
            </div>

            {/* Translation Result */}
            <div className="bg-slate-900 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Translation Result</h3>
              <div className="bg-slate-950 rounded-lg p-4 min-h-[200px] mb-4">
                <p className="text-white text-lg">
                  {translatedText || 'Translation will appear here...'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleTextToSpeech}
                  disabled={!translatedText}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  Speak Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text/Speech to Sign Section */}
      {!signToTextMode && (
        <div className="bg-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Type className="w-6 h-6" />
            Text/Speech-to-Sign (Showing video)
          </h2>
          <p className="text-slate-400 mb-6">
            Type or speak text, and the app will display the corresponding sign video/avatar.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="bg-slate-900 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Enter Text</h3>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your text here..."
                className="w-full bg-slate-950 text-white rounded-lg p-4 mb-4 min-h-[150px] resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleTranslateToSign}
                  disabled={!inputText.trim()}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Show Sign
                </button>
                <button
                  onClick={async () => {
                    // Speech recognition would go here
                    alert('Speech input feature - would use Web Speech API');
                  }}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sign Video Display */}
            <div className="bg-slate-900 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Sign Video/Avatar</h3>
              <div className="relative aspect-video bg-slate-950 rounded-lg overflow-hidden mb-4">
                {isPlaying ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                        <Play className="w-16 h-16 text-white" />
                      </div>
                      <p className="text-white text-lg">Playing sign for: "{inputText}"</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-500">Sign video will appear here</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-sm">
                {inputText ? `Ready to show signs for: "${inputText}"` : 'Enter text above to see the sign translation'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Translate;

