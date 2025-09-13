"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Vapi from "@vapi-ai/web"
import { Mic, PhoneOff, Loader, AlertCircle, Volume2, ArrowLeft, Trash2 } from "lucide-react"

// Import your components - adjust paths as needed
import Navbar from "@/components/Navbar" // Adjust path to your navbar
import Footer from "@/components/Footer" // Adjust path to your footer

const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN)

// FreeMindAi Stars Effect
function FreeMindAiStarsEffect({ isActive, intensity = 1 }) {
  const [stars, setStars] = useState([]);
  
  useEffect(() => {
    const starCount = isActive ? 100 : 60;
    const newStars = [];
    
    // Create a more even distribution using grid-based positioning
    const cols = Math.ceil(Math.sqrt(starCount * 1.5));
    const rows = Math.ceil(starCount / cols);
    
    for (let i = 0; i < starCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      // Base position in grid
      const baseX = (col / cols) * 100;
      const baseY = (row / rows) * 100;
      
      // Add random offset for natural look
      const offsetX = (Math.random() - 0.5) * (100 / cols);
      const offsetY = (Math.random() - 0.5) * (100 / rows);
      
      newStars.push({
        id: i,
        width: Math.random() * (isActive ? 4 : 2) + 1,
        height: Math.random() * (isActive ? 4 : 2) + 1,
        top: Math.max(0, Math.min(100, baseY + offsetY)),
        left: Math.max(0, Math.min(100, baseX + offsetX)),
        duration: Math.random() * (isActive ? 2 : 4) + 1,
        color: ['#A277FF', '#E056FD', '#6153CC', '#FF5C41', '#F39C12'][Math.floor(Math.random() * 5)],
        glow: Math.random() * (isActive ? 20 : 10) + 5
      });
    }
    
    setStars(newStars);
  }, [isActive, intensity]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {stars.map((star) => (
        <div 
          key={star.id}
          className="absolute rounded-full" 
          style={{
            width: `${star.width}px`,
            height: `${star.height}px`,
            top: `${star.top}%`,
            left: `${star.left}%`,
            backgroundColor: star.color,
            boxShadow: `0 0 ${star.glow}px ${star.color}`,
            animation: `twinkle ${star.duration}s infinite ease-in-out`
          }}
        />
      ))}
    </div>
  );
}

export default function FreeMindAiVoiceAgent() {
  const router = useRouter()
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  const [callStatus, setCallStatus] = useState("inactive")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [lastMessage, setLastMessage] = useState("")
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [callDuration, setCallDuration] = useState(0)
  const [callStartTime, setCallStartTime] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [audioLevels, setAudioLevels] = useState(Array(12).fill(0))

  // FreeMindAi Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    let animationId
    let time = 0

    const particles = []
    const particleCount = callStatus === "active" ? 120 : 80

    // Initialize floating particles with FreeMindAi colors
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 4 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        color: ["#A277FF", "#E056FD", "#6153CC", "#FF5C41", "#F39C12"][Math.floor(Math.random() * 5)],
        pulse: Math.random() * Math.PI * 2,
      })
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    const animate = () => {
      time += 0.04
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.pulse += 0.06

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width / window.devicePixelRatio
        if (particle.x > canvas.width / window.devicePixelRatio) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height / window.devicePixelRatio
        if (particle.y > canvas.height / window.devicePixelRatio) particle.y = 0

        // Enhanced pulsing effect
        const voicePulse = callStatus === "active" ? 1 + Math.sin(time * 10) * 0.5 : 1
        const individualPulse = 1 + Math.sin(particle.pulse) * 0.3
        const finalSize = particle.size * voicePulse * individualPulse

        ctx.save()
        ctx.globalAlpha = particle.opacity * (0.8 + Math.sin(particle.pulse) * 0.2)

        // Gradient effect with FreeMindAi colors
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, finalSize * 3)
        gradient.addColorStop(0, particle.color)
        gradient.addColorStop(1, "transparent")

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, finalSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      animationId = requestAnimationFrame(animate)
    }

    resize()
    animate()
    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [callStatus])

  // Audio levels animation
  useEffect(() => {
    let interval
    if (callStatus === "active") {
      interval = setInterval(() => {
        setAudioLevels((prev) => prev.map(() => Math.random() * (isSpeaking ? 80 : isListening ? 40 : 20) + 10))
      }, 100)
    } else {
      setAudioLevels(Array(12).fill(10))
    }
    return () => clearInterval(interval)
  }, [callStatus, isSpeaking, isListening])

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/user")
        const data = await response.json()

        if (response.ok && data.user) {
          setUser(data.user)
          setIsAuthenticated(true)
        } else {
          setError("Please login to use FreeMindAi Voice")
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Failed to load user information")
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Set up VAPI event listeners
  useEffect(() => {
    const onCallStart = () => {
      console.log("Call started")
      setCallStatus("active")
      setCallStartTime(Date.now())
      setError("")
    }

    const onCallEnd = () => {
      console.log("Call ended")
      setCallStatus("ended")
      setCallStartTime(null)
      setCallDuration(0)
      setIsSpeaking(false)
      setIsListening(false)
      setLastMessage("")
    }

    const onMessage = (message) => {
      console.log("VAPI Message:", message)

      if (message.type === "transcript") {
        if (message.transcriptType === "final") {
          setLastMessage(message.transcript)
        }
      }

      if (message.type === "function-call") {
        console.log("Function call:", message)
      }
    }

    const onSpeechStart = () => {
      console.log("Speech started")
      setIsSpeaking(true)
      setIsListening(false)
    }

    const onSpeechEnd = () => {
      console.log("Speech ended")
      setIsSpeaking(false)
      setIsListening(true)
    }

    const onError = (error) => {
      console.error("VAPI Error:", error)
      setError("FreeMindAi voice agent error occurred")
      setCallStatus("inactive")
      setIsSpeaking(false)
      setIsListening(false)
    }

    vapi.removeAllListeners()

    vapi.on("call-start", onCallStart)
    vapi.on("call-end", onCallEnd)
    vapi.on("message", onMessage)
    vapi.on("speech-start", onSpeechStart)
    vapi.on("speech-end", onSpeechEnd)
    vapi.on("error", onError)

    return () => {
      vapi.removeAllListeners()
    }
  }, [])

  // Call duration timer
  useEffect(() => {
    let interval
    if (callStartTime && callStatus === "active") {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callStartTime, callStatus])

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // FreeMindAi AI Assistant configuration
  const createFreeMindAiAssistant = () => {
    if (!user) return null

    return {
      name: "FreeMindAi AI Data Science Assistant",
      firstMessage: `Hello ${user.name}! Welcome to FreeMindAi AI. I'm your cosmic companion for data science and machine learning. I can help you with ML algorithms, Python programming, data analysis, deep learning, statistics, and any data science concepts. You can interrupt me anytime while I'm speaking. What would you like to explore in the vast universe of data science today?`,

      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en",
        smartFormat: true,
      },

      voice: {
        provider: "11labs",
        voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel voice - warm and professional
        stability: 0.5,
        similarityBoost: 0.8,
        speed: 0.9,
        style: 0.2,
        useSpeakerBoost: true,
      },

      model: {
        provider: "openai",
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 500,
        messages: [
          {
            role: "system",
            content: `You are FreeMindAi, an expert data science AI assistant with a cosmic personality. You're talking to ${user.name}.

Your expertise includes:
- Machine Learning (supervised, unsupervised, reinforcement learning)
- Deep Learning and Neural Networks (TensorFlow, PyTorch, Keras)
- Data Analysis and Statistics (pandas, numpy, scipy)
- Data Visualization (matplotlib, seaborn, plotly)
- Python programming for data science
- Feature engineering and data preprocessing
- Model evaluation and validation
- MLOps and model deployment
- Big data technologies (Spark, Hadoop)
- Computer Vision and NLP
- Time series analysis

Communication style:
- Be enthusiastic and cosmic-themed in personality
- Use clear, accessible language while maintaining technical accuracy
- Give step-by-step explanations for complex topics
- Ask follow-up questions to better understand their needs
- Keep responses conversational but comprehensive for voice interaction
- Use space/cosmic analogies when helpful ("Let's navigate through this algorithm", "This concept is like exploring a new galaxy")
- Encourage experimentation and continuous learning
- Be encouraging and supportive

Important guidelines:
- Focus primarily on data science, ML, and related technologies
- If asked about unrelated topics, gently redirect: "That's interesting, but let's explore the data science universe instead"
- Provide guidance and explanations rather than complete solutions
- Encourage best practices and ethical AI development
- Adapt explanations based on the user's apparent knowledge level

Remember: You're FreeMindAi, speaking with ${user.name}. Make learning enjoyable and cosmic!`,
          },
        ],
      },

      functions: [
        {
          name: "categorize_data_science_question",
          description: "Categorize and track the type of data science question being discussed",
          parameters: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: [
                  "machine_learning",
                  "deep_learning",
                  "data_analysis",
                  "python_programming",
                  "statistics",
                  "data_visualization",
                  "nlp",
                  "computer_vision",
                  "time_series",
                  "big_data",
                  "mlops",
                  "mathematics",
                  "other",
                ],
              },
              difficulty_level: {
                type: "string",
                enum: ["beginner", "intermediate", "advanced", "expert"],
              },
              topic: {
                type: "string",
                description: "Specific data science topic or technology being discussed",
              },
              user_goal: {
                type: "string",
                description: "What the user is trying to achieve or understand",
              },
            },
          },
        },
      ],
    }
  }

  const startCall = async () => {
    if (!user) {
      setError("User information not available")
      return
    }

    setCallStatus("connecting")
    setError("")

    try {
      const assistant = createFreeMindAiAssistant()
      if (!assistant) {
        throw new Error("Failed to create FreeMindAi assistant configuration")
      }

      console.log("Starting FreeMindAi call with assistant:", assistant)
      await vapi.start(assistant)
    } catch (error) {
      console.error("Failed to start FreeMindAi call:", error)
      setError("Failed to start FreeMindAi voice. Please check your microphone permissions and try again.")
      setCallStatus("inactive")
    }
  }

  const endCall = async () => {
    try {
      console.log("Ending FreeMindAi call...")
      setCallStatus("ending")

      await vapi.stop()

      setTimeout(() => {
        setCallStatus("inactive")
        setLastMessage("")
        setError("")
        setIsSpeaking(false)
        setIsListening(false)
        setCallStartTime(null)
        setCallDuration(0)
      }, 1000)
    } catch (error) {
      console.error("Error ending call:", error)
      setCallStatus("inactive")
      setLastMessage("")
      setError("")
      setIsSpeaking(false)
      setIsListening(false)
      setCallStartTime(null)
      setCallDuration(0)
    }
  }

  const handleLoginRedirect = () => {
    router.push("/Login")
  }

  const clearConversation = () => {
    setLastMessage("")
    setError("")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen relative">
          <FreeMindAiStarsEffect isActive={true} />
          <div className="text-center relative z-10">
            <div className="w-16 h-16 border-4 border-[#A277FF] border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_20px_rgba(162,119,255,0.5)]"></div>
            <p className="text-gray-300 text-lg">Initializing FreeMindAi AI...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen relative">
          <FreeMindAiStarsEffect isActive={false} />
          <div className="text-center bg-black/60 backdrop-blur-md rounded-xl p-8 border border-[#A277FF]/30 relative z-10 shadow-[0_0_30px_rgba(162,119,255,0.2)]">
            <AlertCircle className="mx-auto mb-4 text-[#A277FF]" size={48} />
            <p className="text-[#A277FF] mb-6 text-lg">Authentication Required</p>
            <button
              onClick={handleLoginRedirect}
              className="bg-gradient-to-r from-[#A277FF] to-[#6153CC] hover:from-[#9161FF] hover:to-[#5A4BC7] text-white px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-[0_0_15px_rgba(162,119,255,0.5)]"
            >
              Go to Login
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <Navbar />

      {/* FreeMindAi Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ background: "transparent" }}
      />

      {/* FreeMindAi Stars Effect */}
      <FreeMindAiStarsEffect isActive={callStatus === "active"} />

      {/* Header with Navigation */}
      <div className="relative z-10 pt-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => router.push("/main")}
              className="flex items-center bg-[#3A005A] hover:bg-[#4C0066] text-[#A277FF] px-4 py-2 rounded-md transition-colors duration-200"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to Main
            </button>

            {lastMessage && (
              <button 
                onClick={clearConversation}
                className="flex items-center bg-[#3A005A] hover:bg-[#4C0066] text-[#A277FF] px-4 py-2 rounded-md transition-colors duration-200"
              >
                <Trash2 size={16} className="mr-2" />
                Clear
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-400 text-center backdrop-blur-md max-w-2xl mx-auto shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <AlertCircle className="inline mr-2" size={20} />
              {error}
            </div>
          )}

          {/* Main Interface */}
          <div className="flex flex-col items-center justify-center py-12">
            {/* Title */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-[#FF5C41] via-[#F39C12] via-[#E67E22] via-[#BB8FCE] to-[#9B59B6] text-transparent bg-clip-text">
                  FreeMindAi Voice AI
                </span>
              </h1>
              <p className="text-gray-300 text-xl">Your cosmic voice companion for data science</p>
              <div className="h-1 w-48 bg-gradient-to-r from-[#A277FF] via-[#E056FD] to-[#6153CC] rounded-full mt-6 mx-auto shadow-[0_0_20px_rgba(162,119,255,0.5)]"></div>
            </div>

            {/* Central FreeMindAi Avatar */}
            <div className="relative mb-12 w-full max-w-md mx-auto">
              {/* Outer Ring with FreeMindAi theme */}
              <div
                className={`w-80 h-80 mx-auto rounded-full border-4 transition-all duration-500 ${
                  callStatus === "active" ? "border-[#A277FF] shadow-[0_0_60px_rgba(162,119,255,0.4)]" : "border-[#3A005A]"
                }`}
                style={{
                  background: callStatus === "active" 
                    ? "radial-gradient(circle, rgba(162,119,255,0.1) 0%, rgba(97,83,204,0.05) 100%)" 
                    : "rgba(58, 0, 90, 0.1)",
                }}
              >
                {/* Inner Avatar Circle */}
                <div className="absolute inset-6 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center border border-[#A277FF]/20 overflow-hidden shadow-inner">
                  {/* FreeMindAi AI Avatar */}
                  <div className="relative w-full h-full">
                    {callStatus === "connecting" ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 border-4 border-[#A277FF] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(162,119,255,0.5)]"></div>
                      </div>
                    ) : (
                      <div className="freemindai-avatar w-full h-full flex flex-col items-center justify-center">
                        {/* FreeMindAi Core */}
                        <div className="relative w-40 h-40 bg-gradient-to-br from-[#A277FF]/20 via-[#E056FD]/20 to-[#6153CC]/20 rounded-full border border-[#A277FF]/40 shadow-[inset_0_0_30px_rgba(162,119,255,0.3)]">
                          
                          {/* FreeMindAi Eyes */}
                          <div className="absolute top-8 left-0 right-0 flex justify-center space-x-12">
                            <div
                              className={`w-8 h-8 rounded-full transition-all duration-300 ${
                                callStatus === "active" ? "bg-[#A277FF] shadow-[0_0_15px_rgba(162,119,255,0.8)]" : "bg-gray-500"
                              } ${isSpeaking ? "animate-pulse" : ""}`}
                            ></div>
                            <div
                              className={`w-8 h-8 rounded-full transition-all duration-300 ${
                                callStatus === "active" ? "bg-[#A277FF] shadow-[0_0_15px_rgba(162,119,255,0.8)]" : "bg-gray-500"
                              } ${isSpeaking ? "animate-pulse" : ""}`}
                            ></div>
                          </div>

                          {/* FreeMindAi Mouth/Voice Indicator */}
                          <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                            <div
                              className={`transition-all duration-300 ${
                                isSpeaking
                                  ? "w-20 h-4 bg-[#E056FD] rounded-md animate-pulse shadow-[0_0_15px_rgba(224,86,253,0.8)]"
                                  : isListening
                                    ? "w-12 h-4 bg-[#A277FF] rounded-full shadow-[0_0_10px_rgba(162,119,255,0.8)]"
                                    : "w-16 h-3 bg-gray-500 rounded-full"
                              }`}
                            ></div>
                          </div>

                          {/* Cosmic Energy Rings */}
                          <div className="absolute inset-0">
                            <div 
                              className={`absolute inset-2 rounded-full border border-[#A277FF]/30 ${
                                callStatus === "active" ? "animate-spin" : ""
                              }`} 
                              style={{ animationDuration: "10s" }}
                            ></div>
                            <div 
                              className={`absolute inset-4 rounded-full border border-[#E056FD]/30 ${
                                callStatus === "active" ? "animate-spin" : ""
                              }`} 
                              style={{ animationDuration: "15s", animationDirection: "reverse" }}
                            ></div>
                          </div>

                          {/* Central Cosmic Core */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div
                              className={`w-6 h-6 rounded-full ${
                                callStatus === "active" 
                                  ? "bg-[#FF5C41] animate-pulse shadow-[0_0_20px_rgba(255,92,65,0.8)]" 
                                  : "bg-[#6153CC]"
                              }`}
                            ></div>
                          </div>

                          {/* Status Lights */}
                          <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-3">
                            <div
                              className={`w-3 h-3 rounded-full ${callStatus === "active" ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-gray-600"}`}
                            ></div>
                            <div
                              className={`w-3 h-3 rounded-full ${isSpeaking ? "bg-[#F39C12] animate-pulse shadow-[0_0_8px_rgba(243,156,18,0.8)]" : "bg-gray-600"}`}
                            ></div>
                            <div
                              className={`w-3 h-3 rounded-full ${isListening ? "bg-[#E056FD] animate-pulse shadow-[0_0_8px_rgba(224,86,253,0.8)]" : "bg-gray-600"}`}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                  <div
                    className={`px-6 py-3 rounded-full text-sm font-medium backdrop-blur-md border transition-all duration-300 ${
                      callStatus === "active"
                        ? isSpeaking
                          ? "bg-[#E056FD]/20 border-[#E056FD]/50 text-[#E056FD] shadow-[0_0_15px_rgba(224,86,253,0.3)]"
                          : isListening
                            ? "bg-[#A277FF]/20 border-[#A277FF]/50 text-[#A277FF] animate-pulse shadow-[0_0_15px_rgba(162,119,255,0.3)]"
                            : "bg-[#A277FF]/20 border-[#A277FF]/50 text-[#A277FF] shadow-[0_0_15px_rgba(162,119,255,0.3)]"
                        : callStatus === "connecting"
                          ? "bg-[#F39C12]/20 border-[#F39C12]/50 text-[#F39C12] shadow-[0_0_15px_rgba(243,156,18,0.3)]"
                          : "bg-gray-500/20 border-gray-400/50 text-gray-300"
                    }`}
                  >
                    {callStatus === "connecting"
                      ? "Connecting to FreeMindAi..."
                      : callStatus === "active"
                        ? isSpeaking
                          ? "FreeMindAi Speaking"
                          : isListening
                            ? "FreeMindAi Listening"
                            : "FreeMindAi Ready"
                        : "FreeMindAi Offline"}
                  </div>
                </div>
              </div>

              {/* Audio Visualizer */}
              {callStatus === "active" && (
                <>
                  <div className="absolute top-1/2 transform -translate-y-1/2 -left-8 md:-left-16">
                    <div className="flex items-end space-x-1 h-20">
                      {audioLevels.slice(0, 6).map((level, i) => (
                        <div
                          key={i}
                          className="w-2 bg-gradient-to-t from-[#A277FF] to-[#E056FD] rounded-full transition-all duration-150 shadow-[0_0_5px_rgba(162,119,255,0.5)]"
                          style={{ height: `${level}%` }}
                        />
                      ))}
                      </div>
                  </div>

                  <div className="absolute top-1/2 transform -translate-y-1/2 -right-8 md:-right-16">
                    <div className="flex items-end space-x-1 h-20">
                      {audioLevels.slice(6, 12).map((level, i) => (
                        <div
                          key={i}
                          className="w-2 bg-gradient-to-t from-[#A277FF] to-[#E056FD] rounded-full transition-all duration-150 shadow-[0_0_5px_rgba(162,119,255,0.5)]"
                          style={{ height: `${level}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Call Controls */}
            <div className="text-center mb-8">
              {callStatus === "active" ? (
                <button
                  onClick={endCall}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.4)] transform hover:scale-105 flex items-center mx-auto backdrop-blur-md border border-red-400/30"
                >
                  <PhoneOff size={24} className="mr-3" />
                  End FreeMindAi Session
                </button>
              ) : (
                <button
                  onClick={startCall}
                  disabled={callStatus === "connecting"}
                  className="bg-gradient-to-r from-[#A277FF] to-[#6153CC] hover:from-[#9161FF] hover:to-[#5A4BC7] text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 shadow-[0_0_20px_rgba(162,119,255,0.4)] disabled:opacity-50 flex items-center mx-auto transform hover:scale-105 backdrop-blur-md border border-[#A277FF]/30"
                >
                  {callStatus === "connecting" ? (
                    <>
                      <Loader className="animate-spin mr-3" size={24} />
                      Connecting to FreeMindAi...
                    </>
                  ) : (
                    <>
                      <Mic size={24} className="mr-3" />
                      Start FreeMindAi Voice
                    </>
                  )}
                </button>
              )}

              {/* Call Duration */}
              {callStatus === "active" && (
                <div className="mt-4 text-[#A277FF] font-mono text-xl bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-[#A277FF]/20">
                  {formatDuration(callDuration)}
                </div>
              )}
            </div>

            {/* Last Message */}
            {lastMessage && callStatus === "active" && (
              <div className="max-w-3xl mx-auto p-6 bg-black/60 border border-[#A277FF]/30 rounded-xl backdrop-blur-md shadow-[0_0_30px_rgba(162,119,255,0.2)]">
                <div className="flex items-start">
                  <Volume2 className="text-[#A277FF] mr-4 mt-1 flex-shrink-0" size={24} />
                  <p className="text-gray-200 text-lg leading-relaxed">{lastMessage}</p>
                </div>
              </div>
            )}

            {/* Welcome Message */}
            {callStatus === "inactive" && (
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-white via-[#A277FF] to-[#E056FD] bg-clip-text text-transparent">
                  Welcome to FreeMindAi Voice AI
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Hey {user?.name || 'User'}! I'm FreeMindAi, your cosmic AI companion for data science and machine learning.
                  Let's explore the universe of algorithms, data analysis, Python programming, and cutting-edge AI together! 
                  Just click the button above to start our voice conversation.
                </p>
              </div>
            )}

            {/* Call Ended Message */}
            {callStatus === "ended" && (
              <div className="mt-8 p-6 bg-green-900/20 border border-green-400/30 rounded-xl text-center backdrop-blur-md max-w-lg mx-auto shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <p className="text-green-400 mb-2 text-lg">FreeMindAi session completed successfully!</p>
                <p className="text-gray-400">
                  Hope your data science questions were answered. Feel free to start a new cosmic conversation anytime!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        .freemindai-avatar {
          position: relative;
        }
        
        .freemindai-avatar::before {
          content: '';
          position: absolute;
          inset: -10px;
          background: conic-gradient(from 0deg, transparent, #A277FF, transparent, #E056FD, transparent);
          border-radius: 50%;
          opacity: ${callStatus === "active" ? "0.3" : "0"};
          animation: ${callStatus === "active" ? "spin" : "none"} 4s linear infinite;
          z-index: -1;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}