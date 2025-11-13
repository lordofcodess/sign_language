import { useState, useRef, useEffect } from 'react';
import { Camera, Mic, Type, Play, Square } from 'lucide-react';
import { API_ENDPOINTS, API_BASE_URL, TTSLanguage } from '../config/api';
import { getSignLanguageDetector } from '../services/signLanguageDetection';

function Translate() {
  const [signToTextMode, setSignToTextMode] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [inputText, setInputText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [signVideoUrl, setSignVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionBuffer, setDetectionBuffer] = useState(0);
  const [currentPrediction, setCurrentPrediction] = useState<{ label: string; confidence: number; top3?: Array<{ label: string; confidence: string }> } | null>(null);
  const [fps, setFps] = useState(0);
  const [enableTTS, setEnableTTS] = useState(true);
  const [ttsLanguage, setTtsLanguage] = useState<TTSLanguage>('en');
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const detectorRef = useRef(getSignLanguageDetector());

  // Text-to-speech function that supports multiple languages
  const speakText = async (text: string, language: TTSLanguage) => {
    if (!text) return; // Removed enableTTS check - user controls via button

    try {
      // Stop any ongoing speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Use browser TTS for English
      if (language === 'en') {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        }
      } else {
        // Use FastAPI backend for Akan (ak) or Ewe (ee)
        setIsTTSLoading(true);
        
        // Determine the correct endpoint and payload based on language
        const endpoint = language === 'ak' 
          ? API_ENDPOINTS.TEXT_TO_SPEECH_AKAN 
          : API_ENDPOINTS.TEXT_TO_SPEECH_EWE;
        
        // Different payload structures for Akan vs Ewe
        const payload = language === 'ak'
          ? {
              text: text,
              model_type: 'ms', // Microsoft model
              speaker: 'PT', // Speaker ID
            }
          : {
              text: text,
              model: 'best_model.pth', // Ewe model file
            };
        
        // Make request to TTS API
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.statusText}`);
        }

        // Parse JSON response to get audio_url
        const data = await response.json();
        
        if (!data.success || !data.audio_url) {
          throw new Error(data.message || 'Failed to generate audio');
        }

        // Construct full audio URL (audio_url is relative path like /static/audio/...)
        const audioUrl = `${API_BASE_URL}${data.audio_url}`;
        
        // Fetch the audio file
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error('Failed to fetch audio file');
        }
        
        const audioBlob = await audioResponse.blob();
        const blobUrl = URL.createObjectURL(audioBlob);
        
        // Create audio element and play
        const audio = new Audio(blobUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(blobUrl);
          audioRef.current = null;
          setIsTTSLoading(false);
        };
        
        audio.onerror = () => {
          console.error('Error playing TTS audio');
          URL.revokeObjectURL(blobUrl);
          audioRef.current = null;
          setIsTTSLoading(false);
        };

        await audio.play();
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      setIsTTSLoading(false);
      // Fallback to browser TTS if API fails
      if ('speechSynthesis' in window && language !== 'en') {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Initialize detector on mount
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        await detectorRef.current.initialize();
        console.log('Sign language detector ready');
      } catch (error) {
        console.error('Failed to initialize detector:', error);
        setError('Failed to initialize sign language detection. Please refresh the page.');
      }
    };

    initializeDetector();

    // Cleanup on unmount
    return () => {
      detectorRef.current.dispose();
      if ((detectorRef.current as any).bufferInterval) {
        clearInterval((detectorRef.current as any).bufferInterval);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startSignCapture = async () => {
    try {
      // Initialize detector if not already done
      if (!detectorRef.current.isReady()) {
        setIsDetecting(true);
        await detectorRef.current.initialize();
        setIsDetecting(false);
      }

      if (!videoRef.current) {
        setError('Video element not found. Please refresh the page.');
        return;
      }

      // Clear previous state
      detectorRef.current.clearBuffer();
      setDetectionBuffer(0);
      setTranslatedText('');
      setCurrentPrediction(null);

      // Set up FPS callback
      detectorRef.current.setFpsCallback((fpsValue) => {
        setFps(fpsValue);
      });

      // Set up real-time prediction callback
      detectorRef.current.setPredictionCallback((result) => {
        if (result) {
          // Update current prediction for real-time display
          setCurrentPrediction({
            label: result.label,
            confidence: result.confidence,
            top3: result.top3
          });
          setDetectionBuffer(detectorRef.current.getBufferSize());
          
          // Text-to-speech removed - user will manually trigger via button
          
          // Only append to translated text if confidence is high and it's stable
          // This prevents too many duplicate characters
          if (result.confidence > 0.7) {
            setTranslatedText((prev) => {
              // Only add if it's different from the last character and confidence is high
              if (prev.length === 0 || prev[prev.length - 1] !== result.label) {
                return prev + result.label;
              }
              return prev;
            });
          }
        } else {
          // Clear prediction if no result
          setCurrentPrediction(null);
        }
      });

      // Set up canvas callback for hand detection visualization
      detectorRef.current.setCanvasCallback((canvas) => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = canvas.width;
            canvasRef.current.height = canvas.height;
            ctx.drawImage(canvas, 0, 0);
          }
        }
      });

      // Start camera using MediaPipe Camera utility
      setIsRecording(true);
      await detectorRef.current.startCamera(videoRef.current);
      
      // Update buffer size periodically
      const bufferInterval = setInterval(() => {
        setDetectionBuffer(detectorRef.current.getBufferSize());
      }, 100);
      
      // Store interval for cleanup
      (detectorRef.current as any).bufferInterval = bufferInterval;
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please check permissions.');
      setIsRecording(false);
    }
  };

  const stopSignCapture = () => {
    // Stop camera using MediaPipe Camera utility
    detectorRef.current.stopCamera();
    
    // Stop any buffer interval
    if ((detectorRef.current as any).bufferInterval) {
      clearInterval((detectorRef.current as any).bufferInterval);
      (detectorRef.current as any).bufferInterval = null;
    }
    
    // Stop text-to-speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Stop stream if still exists
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsRecording(false);
    detectorRef.current.clearBuffer();
    setDetectionBuffer(0);
    setCurrentPrediction(null);
  };

  const handleTranslateToSign = async () => {
    if (inputText.trim()) {
      setIsLoading(true);
      setIsPlaying(true);
      setSignVideoUrl(null);
      setError(null);
      
      try {
        const response = await fetch(API_ENDPOINTS.TEXT_TO_SIGN, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: inputText }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Translation failed' }));
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.sign_video_url) {
          // Construct full URL if relative path is returned
          const fullUrl = data.sign_video_url.startsWith('http') 
            ? data.sign_video_url 
            : `${API_BASE_URL}${data.sign_video_url}`;
          setSignVideoUrl(fullUrl);
          
          // Auto-play the video when it loads
          if (signVideoRef.current) {
            signVideoRef.current.load();
          }
        } else {
          setError('No video found for this text. Please try a different phrase.');
        }
        
      } catch (error) {
        console.error('Translation error:', error);
        setError(error instanceof Error ? error.message : 'Failed to translate. Please try again.');
      } finally {
        setIsLoading(false);
        setIsPlaying(false);
      }
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
      
      recognition.continuous = false; // Stop after one result
      recognition.interimResults = false; // Only final results
      recognition.lang = 'en-US'; // Adjust for your language
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        // Automatically translate after getting speech input
        // Use setTimeout to ensure state is updated first
        setTimeout(() => {
          // Call translation with the transcript directly
          const translateWithText = async (text: string) => {
            if (text.trim()) {
              setIsLoading(true);
              setIsPlaying(true);
              setSignVideoUrl(null);
              setError(null);
              
              try {
                const response = await fetch(API_ENDPOINTS.TEXT_TO_SIGN, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ text }),
                });
                
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ detail: 'Translation failed' }));
                  throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.sign_video_url) {
                  const fullUrl = data.sign_video_url.startsWith('http') 
                    ? data.sign_video_url 
                    : `${API_BASE_URL}${data.sign_video_url}`;
                  setSignVideoUrl(fullUrl);
                  
                  if (signVideoRef.current) {
                    signVideoRef.current.load();
                  }
                } else {
                  setError('No video found for this text. Please try a different phrase.');
                }
                
              } catch (error) {
                console.error('Translation error:', error);
                setError(error instanceof Error ? error.message : 'Failed to translate. Please try again.');
              } finally {
                setIsLoading(false);
                setIsPlaying(false);
              }
            }
          };
          translateWithText(transcript);
        }, 100);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
          setError('No speech detected. Please try again.');
        } else if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone access.');
        } else {
          setError('Speech recognition failed. Please try again.');
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
      }
    } catch (error) {
      console.warn('Speech recognition not available in this browser:', error);
      // Speech recognition is not supported, but the app should still work
    }
  }, []);

  const handleSpeechInput = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
        setError('Failed to start speech recognition. Please try again.');
      }
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Camera className="w-6 h-6" />
              GH GSL Sign Detection
            </h2>
            {isRecording && (
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className="text-slate-300">FPS: {fps}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-300">Buffer: {detectionBuffer}/30</span>
                
                {/* TTS Language Selector */}
                {enableTTS && (
                  <div className="flex items-center gap-2">
                    <label className="text-slate-400 text-xs">TTS Language:</label>
                    <select
                      value={ttsLanguage}
                      onChange={(e) => setTtsLanguage(e.target.value as TTSLanguage)}
                      className="px-2 py-1 rounded bg-slate-700 text-white text-xs border border-slate-600 focus:outline-none focus:border-green-500"
                      disabled={isTTSLoading}
                    >
                      <option value="en">English</option>
                      <option value="ak">Akan</option>
                      <option value="ee">Ewe</option>
                    </select>
                    {isTTSLoading && (
                      <span className="text-xs text-amber-400 animate-pulse">Loading...</span>
                    )}
                  </div>
                )}
                
                {/* TTS Toggle Button */}
                <button
                  onClick={() => setEnableTTS(!enableTTS)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    enableTTS
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title={enableTTS ? 'Audio controls enabled' : 'Audio controls disabled'}
                >
                  🔊 {enableTTS ? 'Audio On' : 'Audio Off'}
                </button>
              </div>
            )}
          </div>

          {isDetecting && (
            <div className="mb-4 p-4 bg-blue-900/50 border border-blue-700 rounded-lg">
              <p className="text-blue-300 text-sm">Initializing sign language detection model...</p>
            </div>
          )}

          {/* Hand Detection Feed */}
          <div className="mb-6">
            <div className="bg-slate-900 rounded-xl p-4 max-w-2xl mx-auto">
              <h3 className="text-sm font-semibold text-white mb-2">Hand Detection</h3>
              <div className="relative aspect-video bg-slate-950 rounded-lg overflow-hidden border-2 border-green-500">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
                {!isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-500">Hand detection will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detection Results */}
          {isRecording && currentPrediction && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 mb-6 border border-green-200 dark:border-green-800">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-green-700 dark:text-green-400 mb-2">
                  Sign: {currentPrediction.label}
                </div>
                <div className="text-lg text-green-600 dark:text-green-300 mb-3">
                  Confidence: {Math.round(currentPrediction.confidence * 100)}%
                </div>
                
                {/* Play Audio Button for Current Sign */}
                <button
                  onClick={() => speakText(currentPrediction.label, ttsLanguage)}
                  disabled={isTTSLoading || !enableTTS}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto ${
                    isTTSLoading || !enableTTS
                      ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={
                    !enableTTS 
                      ? 'Enable audio controls to play' 
                      : `Play audio in ${ttsLanguage === 'en' ? 'English' : ttsLanguage === 'ak' ? 'Akan' : 'Ewe'}`
                  }
                >
                  {isTTSLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Loading...
                    </>
                  ) : (
                    <>
                      🔊 Play Audio
                    </>
                  )}
                </button>
              </div>
              
              {currentPrediction.top3 && currentPrediction.top3.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                    Top 3 Predictions:
                  </h4>
                  <div className="space-y-1">
                    {currentPrediction.top3.map((pred, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-green-700 dark:text-green-400">
                          {index + 1}. {pred.label}:
                        </span>
                        <span className="text-green-600 dark:text-green-300 font-medium">
                          {pred.confidence}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* No detection message when recording but no prediction */}
          {isRecording && !currentPrediction && detectionBuffer >= 30 && (
            <div className="bg-slate-700 rounded-lg p-4 mb-6 text-center">
              <p className="text-slate-300">Show a sign to see detection results</p>
            </div>
          )}

          {/* Controls and Translation Result */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="bg-slate-900 rounded-xl p-4">
              <button
                onClick={isRecording ? stopSignCapture : startSignCapture}
                disabled={isDetecting}
                className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : isDetecting
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-5 h-5" />
                    Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    {isDetecting ? 'Initializing...' : 'Start Camera'}
                  </>
                )}
              </button>
              
              {/* Buffer Status */}
              {isRecording && detectionBuffer < 30 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400">Initializing detection...</span>
                    <span className="text-xs text-slate-400">{detectionBuffer}/30</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(detectionBuffer / 30) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Show your hand sign clearly in the camera
                  </p>
                </div>
              )}
            </div>

            {/* Translation Result */}
            <div className="bg-slate-900 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Translation Result</h3>
                
                {/* Language Selector - Show when camera is stopped and text exists */}
                {!isRecording && translatedText && (
                  <div className="flex items-center gap-2">
                    <label className="text-slate-400 text-sm">Audio Language:</label>
                    <select
                      value={ttsLanguage}
                      onChange={(e) => setTtsLanguage(e.target.value as TTSLanguage)}
                      className="px-3 py-1 rounded bg-slate-700 text-white text-sm border border-slate-600 focus:outline-none focus:border-blue-500"
                      disabled={isTTSLoading}
                    >
                      <option value="en">English</option>
                      <option value="ak">Akan</option>
                      <option value="ee">Ewe</option>
                    </select>
                    {isTTSLoading && (
                      <span className="text-xs text-amber-400 animate-pulse">Loading...</span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Editable Translation Text */}
              <textarea
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                placeholder="Translation will appear here..."
                className="w-full bg-slate-950 rounded-lg p-4 min-h-[200px] mb-4 text-white text-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700"
                disabled={isRecording}
                title={isRecording ? "Stop camera to edit text" : "Edit the translated text"}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => speakText(translatedText, ttsLanguage)}
                  disabled={!translatedText || isTTSLoading || !enableTTS}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    !translatedText || isTTSLoading || !enableTTS
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title={
                    !enableTTS 
                      ? 'Enable audio controls to play' 
                      : !translatedText 
                      ? 'No text to play' 
                      : `Play translated text in ${ttsLanguage === 'en' ? 'English' : ttsLanguage === 'ak' ? 'Akan' : 'Ewe'}`
                  }
                >
                  {isTTSLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Loading...
                    </>
                  ) : (
                    <>
                      🔊 Play Audio
                    </>
                  )}
                </button>
                {translatedText && (
                  <button
                    onClick={() => setTranslatedText('')}
                    className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    title="Clear text"
                  >
                    Clear
                  </button>
                )}
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
                placeholder="Type your text here or use the microphone to speak..."
                className="w-full bg-slate-950 text-white rounded-lg p-4 mb-4 min-h-[150px] resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {isListening && (
                <div className="mb-3 text-center">
                  <p className="text-amber-400 text-sm animate-pulse flex items-center justify-center gap-2">
                    <Mic className="w-4 h-4" />
                    🎤 Listening... Speak now
                  </p>
                </div>
              )}
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
                  onClick={handleSpeechInput}
                  className={`px-4 py-3 ${
                    isListening 
                      ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2`}
                  title={isListening ? 'Click to stop listening' : 'Click to speak'}
                >
                  <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>

            {/* Sign Video Display */}
            <div className="bg-slate-900 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Sign Video/Avatar</h3>
              <div className="relative aspect-video bg-slate-950 rounded-lg overflow-hidden mb-4">
                {signVideoUrl ? (
                  <video
                    ref={signVideoRef}
                    src={signVideoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                    onError={() => {
                      setError('Failed to load video. Please check if the video file exists.');
                      setSignVideoUrl(null);
                    }}
                  />
                ) : isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                        <Play className="w-16 h-16 text-white" />
                      </div>
                      <p className="text-white text-lg">Loading sign video...</p>
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
              {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
              <p className="text-slate-400 text-sm">
                {inputText 
                  ? signVideoUrl 
                    ? `Showing sign for: "${inputText}"` 
                    : `Ready to show signs for: "${inputText}"`
                  : 'Enter text above to see the sign translation'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Translate;

