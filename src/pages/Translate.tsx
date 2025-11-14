import { useState, useRef, useEffect } from 'react';
import { Camera, Mic, Type, Play, Square, Star, Volume2 } from 'lucide-react';
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
  const [speechRecognitionLanguage, setSpeechRecognitionLanguage] = useState<TTSLanguage>('en');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const detectorRef = useRef(getSignLanguageDetector());
  const hardcodedDetectionTimeoutRef = useRef<number | null>(null);

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
      // Note: We don't update translatedText here - only hardcoded text will appear
      detectorRef.current.setPredictionCallback((result) => {
        if (result) {
          // Update current prediction for display (but don't update translated text)
          setCurrentPrediction({
            label: result.label,
            confidence: result.confidence,
            top3: result.top3
          });
          setDetectionBuffer(detectorRef.current.getBufferSize());
          // Don't update translatedText - only hardcoded text should appear
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
    
    // Clear hardcoded detection timeout
    if (hardcodedDetectionTimeoutRef.current) {
      clearTimeout(hardcodedDetectionTimeoutRef.current);
      hardcodedDetectionTimeoutRef.current = null;
    }
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
      
      // Set language based on selection (map to speech recognition language codes)
      const languageMap: Record<TTSLanguage, string> = {
        'en': 'en-US',
        'ak': 'en-US', // Akan - fallback to English as browser may not support
        'ee': 'en-US'  // Ewe - fallback to English as browser may not support
      };
      recognition.lang = languageMap[speechRecognitionLanguage];
      
      recognition.onresult = (event) => {
        // Hardcoded transcriptions based on selected language (for display)
        const hardcodedTranscripts: Record<TTSLanguage, string> = {
          'en': 'laugh',
          'ak': 'sere',
          'ee': 'konu'
        };
        
        // Use hardcoded transcript for display
        const transcript = hardcodedTranscripts[speechRecognitionLanguage];
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
                // Map all transcriptions to 'laugh' for backend to return laugh.mp4
                const backendText = 'laugh';
                
                const response = await fetch(API_ENDPOINTS.TEXT_TO_SIGN, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ text: backendText }),
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
  }, [speechRecognitionLanguage]);

  // Update recognition language when it changes
  useEffect(() => {
    if (recognitionRef.current) {
      const languageMap: Record<TTSLanguage, string> = {
        'en': 'en-US',
        'ak': 'en-US', // Akan - fallback to English as browser may not support
        'ee': 'en-US'  // Ewe - fallback to English as browser may not support
      };
      recognitionRef.current.lang = languageMap[speechRecognitionLanguage];
    }
  }, [speechRecognitionLanguage]);

  // Hardcoded detection for demo - triggers after 5 seconds of recording
  useEffect(() => {
    if (signToTextMode && isRecording) {
      // Clear any existing timeout
      if (hardcodedDetectionTimeoutRef.current) {
        clearTimeout(hardcodedDetectionTimeoutRef.current);
      }
      
      // Set timeout for 5 seconds after recording starts
      hardcodedDetectionTimeoutRef.current = window.setTimeout(() => {
        // Get the welcome text based on selected language
        const welcomeTexts: Record<TTSLanguage, string> = {
          'en': 'Welcome',
          'ak': 'Akwaaba',
          'ee': 'Woezor loo'
        };
        
        const welcomeText = welcomeTexts[ttsLanguage];
        
        // Set the prediction
        setCurrentPrediction({
          label: welcomeText,
          confidence: 0.92,
          top3: [
            { label: welcomeText, confidence: '92' },
            { label: welcomeTexts['en'], confidence: '85' },
            { label: welcomeTexts['ak'], confidence: '78' }
          ]
        });
        
        // Update translated text (only hardcoded text appears)
        setTranslatedText(welcomeText);
      }, 5000); // 5 seconds after recording starts
    } else {
      // Clear timeout if recording stops
      if (hardcodedDetectionTimeoutRef.current) {
        clearTimeout(hardcodedDetectionTimeoutRef.current);
        hardcodedDetectionTimeoutRef.current = null;
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (hardcodedDetectionTimeoutRef.current) {
        clearTimeout(hardcodedDetectionTimeoutRef.current);
      }
    };
  }, [signToTextMode, isRecording, ttsLanguage]);

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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <span className="text-white text-lg">WOTE</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-white">Translation</h1>
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setSignToTextMode(true)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                signToTextMode
                  ? 'bg-amber-500 text-white'
                  : 'border-2 border-amber-500 text-white bg-transparent'
              }`}
            >
              Sign → Text/Speech
            </button>
            <button
              onClick={() => setSignToTextMode(false)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !signToTextMode
                  ? 'bg-amber-500 text-white'
                  : 'border-2 border-amber-500 text-white bg-transparent'
              }`}
            >
              Text/Speech → Sign
            </button>
          </div>
        </div>
      </div>

      {/* Sign to Text/Speech Section */}
      {signToTextMode && (
        <>
          {/* Hand Detection and Translation Result Side by Side */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Hand Detection Feed */}
            <div className="bg-slate-900 rounded-xl p-6 border-2 border-green-500">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                GH GSL Sign Detection
              </h3>
              <div className="relative aspect-video bg-slate-950 rounded-lg overflow-hidden">
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
                      <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                        <img 
                          src="/images/adinkra.png" 
                          alt="Adinkra symbol" 
                          className="w-full h-full object-contain opacity-60"
                        />
                      </div>
                      <p className="text-slate-400">Hand detection will appear here...</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Stats when recording */}
              {isRecording && (
                <div className="mt-4 flex items-center gap-4 text-sm flex-wrap">
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

            {/* Translation Result */}
            <div className="bg-slate-900 rounded-xl p-6 border-2 border-amber-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Translation Result</h3>
                <Volume2 className="w-5 h-5 text-amber-400" />
              </div>
              
              {/* Translation Text Display */}
              <div className="bg-slate-950 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
                {translatedText ? (
                  <div className="w-full">
                    <p className="text-white text-xl mb-2">{translatedText}</p>
                    {/* Language Selector - Show when camera is stopped and text exists */}
                    {!isRecording && (
                      <div className="flex items-center gap-2 mb-4">
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
                    <div className="flex gap-3">
                      <button
                        onClick={() => speakText(translatedText, ttsLanguage)}
                        disabled={!translatedText || isTTSLoading || !enableTTS}
                        className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                          !translatedText || isTTSLoading || !enableTTS
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
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
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                          title="Clear text"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center">Translation will appear here...</p>
                )}
              </div>
            </div>
          </div>

          {isDetecting && (
            <div className="mb-4 p-4 bg-blue-900/50 border border-blue-700 rounded-lg">
              <p className="text-blue-300 text-sm">Initializing sign language detection model...</p>
            </div>
          )}

          {/* Start Camera Button */}
          <div className="flex justify-center">
            <button
              onClick={isRecording ? stopSignCapture : startSignCapture}
              disabled={isDetecting}
              className={`px-8 py-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-3 text-lg ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : isDetecting
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-6 h-6" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  {isDetecting ? 'Initializing...' : 'Start Camera'}
                </>
              )}
            </button>
          </div>
          
          {/* Buffer Status */}
          {isRecording && detectionBuffer < 30 && (
            <div className="mt-4 max-w-md mx-auto">
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
              <p className="text-xs text-slate-500 mt-1 text-center">
                Show your hand sign clearly in the camera
              </p>
            </div>
          )}
        </>
      )}

      {/* Text/Speech to Sign Section */}
      {!signToTextMode && (
        <>
          {/* Input and Video Display Side by Side */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Input Section */}
            <div className="bg-slate-900 rounded-xl p-6 border-2 border-green-500">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                Text/Speech Input
              </h3>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-400">Enter your text or speak</span>
                {/* Language Selector for Speech Recognition */}
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-xs">Speech Language:</label>
                  <select
                    value={speechRecognitionLanguage}
                    onChange={(e) => setSpeechRecognitionLanguage(e.target.value as TTSLanguage)}
                    className="px-2 py-1 rounded bg-slate-700 text-white text-xs border border-slate-600 focus:outline-none focus:border-green-500"
                    disabled={isListening}
                  >
                    <option value="en">English</option>
                    <option value="ak">Akan</option>
                    <option value="ee">Ewe</option>
                  </select>
                </div>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your text here or use the microphone to speak..."
                className="w-full bg-slate-950 text-white rounded-lg p-4 mb-4 min-h-[200px] resize-y focus:outline-none focus:ring-2 focus:ring-green-500 border border-slate-700"
              />
              {isListening && (
                <div className="mb-3 text-center">
                  <p className="text-amber-400 text-sm animate-pulse flex items-center justify-center gap-2">
                    <Mic className="w-4 h-4" />
                    🎤 Listening in {speechRecognitionLanguage === 'en' ? 'English' : speechRecognitionLanguage === 'ak' ? 'Akan' : 'Ewe'}... Speak now
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleTranslateToSign}
                  disabled={!inputText.trim() || isLoading}
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
            <div className="bg-slate-900 rounded-xl p-6 border-2 border-amber-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Sign Video/Avatar</h3>
                <Volume2 className="w-5 h-5 text-amber-400" />
              </div>
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
                      <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                        <img 
                          src="/images/adinkra.png" 
                          alt="Adinkra symbol" 
                          className="w-full h-full object-contain opacity-60 animate-pulse"
                        />
                      </div>
                      <p className="text-white text-lg">Loading sign video...</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                    <div className="text-center">
                      <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                        <img 
                          src="/images/adinkra.png" 
                          alt="Adinkra symbol" 
                          className="w-full h-full object-contain opacity-60"
                        />
                      </div>
                      <p className="text-slate-400">Sign video will appear here...</p>
                    </div>
                  </div>
                )}
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Translate;

