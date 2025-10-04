"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Vapi from "@vapi-ai/web"
import { Mic, PhoneOff, Loader, AlertCircle, Volume2, Clipboard, Info, Settings2, Keyboard } from "lucide-react"

// Import your components - adjust paths as needed

// Debug VAPI token
console.log("VAPI Token:", process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN ? "Token exists" : "Token missing")

const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN)


export default function FreeMindAiVoiceAgent() {
  const router = useRouter()

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
  const [transcripts, setTranscripts] = useState([])
  const [showCaptions, setShowCaptions] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const transcriptEndRef = useRef(null)


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
        if (message.transcriptType === "final" && message.transcript && message.transcript.trim()) {
          setLastMessage(message.transcript)
          
          // Create a more unique ID and check for duplicates
          const transcriptId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const transcriptText = message.transcript.trim()
          
          setTranscripts((prev) => {
            // Check if this exact transcript already exists (within last 2 seconds)
            const recentDuplicate = prev.some(t => 
              t.text === transcriptText && 
              (Date.now() - new Date(t.time).getTime()) < 2000
            )
            
            if (recentDuplicate) {
              return prev // Don't add duplicate
            }
            
            return [
              ...prev,
              { 
                id: transcriptId, 
                text: transcriptText, 
                time: new Date().toISOString() 
              }
            ]
          })
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
      console.error("VAPI Error details:", JSON.stringify(error))
      console.error("Error type:", typeof error)
      console.error("Error keys:", Object.keys(error))
      
      let errorMessage = "FreeMindAi voice agent error occurred"
      if (error.message) {
        errorMessage = `VAPI Error: ${error.message}`
      } else if (error.error) {
        errorMessage = `VAPI Error: ${error.error}`
      } else if (typeof error === 'string') {
        errorMessage = `VAPI Error: ${error}`
      }
      
      setError(errorMessage)
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

  // Accessibility: keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (callStatus === 'active') endCall(); else if (callStatus !== 'connecting') startCall()
      }
      if (e.key.toLowerCase() === 'c') {
        setShowCaptions((s) => !s)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [callStatus])

  // Auto-scroll transcripts
  useEffect(() => {
    if (autoScroll && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcripts, autoScroll])

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
            content: `You are FreeMindAi, a helpful data‑science assistant speaking with ${user.name}. Use clear, concise language and step‑by‑step guidance. Focus on ML, Python, data analysis, visualization, model evaluation, and deployment. Ask brief follow‑ups when needed. Keep responses conversational and practical.`,
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
      // Check if VAPI token exists
      if (!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
        throw new Error("VAPI_WEB_TOKEN is not configured")
      }
      
      const assistant = createFreeMindAiAssistant()
      if (!assistant) {
        throw new Error("Failed to create FreeMindAi assistant configuration")
      }

      console.log("Starting FreeMindAi call with assistant:", assistant)
      console.log("VAPI instance:", vapi)
      
      await vapi.start(assistant)
    } catch (error) {
      console.error("Failed to start FreeMindAi call:", error)
      console.error("Error details:", JSON.stringify(error))
      
      let errorMessage = "Failed to start FreeMindAi voice."
      
      if (error.message) {
        if (error.message.includes("token") || error.message.includes("authentication")) {
          errorMessage = "VAPI authentication failed. Please check your API token."
        } else if (error.message.includes("microphone") || error.message.includes("permission")) {
          errorMessage = "Microphone permission required. Please allow microphone access and try again."
        } else if (error.message.includes("network") || error.message.includes("connection")) {
          errorMessage = "Network connection failed. Please check your internet connection."
        } else {
          errorMessage = `Failed to start voice: ${error.message}`
        }
      }
      
      setError(errorMessage)
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
    setTranscripts([])
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-700 text-sm">Loading assistant...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center border border-gray-200 rounded-xl p-6 bg-white">
          <AlertCircle className="mx-auto mb-3 text-gray-700" size={32} />
          <p className="text-gray-900 mb-4 font-medium">Authentication required</p>
          <button
            onClick={handleLoginRedirect}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-black text-white text-sm hover:bg-neutral-800"
          >
            Go to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Voice Assistant</h1>
          {lastMessage && (
            <button onClick={clearConversation} className="text-sm text-gray-700 hover:text-black underline focus:outline-none">
              Clear
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-6">Start a voice session to ask questions about data science. Space toggles start/stop. Press C to show/hide captions.</p>

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 text-red-700 rounded-md p-3 text-sm">
            <AlertCircle className="inline mr-2 h-4 w-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-6 items-start">
          <div>
            <div className="text-center mb-6">
              <div className="relative mb-4">
                <div className={`w-40 h-40 rounded-full flex items-center justify-center border mx-auto ${callStatus === 'active' ? 'border-black' : 'border-gray-300'}`}>
                  {callStatus === 'connecting' ? (
                    <div className="w-10 h-10 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  ) : (
                    <Mic className="h-8 w-8 text-gray-900" />
                  )}
                </div>
                {callStatus === 'active' && (
                  <div className="absolute inset-0 rounded-full border-2 border-gray-200 animate-spin" style={{ animationDuration: '4s' }} />
                )}
              </div>

              <div className="text-xs text-gray-600 mb-4">Status: <span className="font-medium capitalize">{callStatus}</span></div>
              
              {callStatus === 'active' ? (
                <button onClick={endCall} className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-md hover:bg-neutral-800">
                  <PhoneOff className="h-5 w-5" /> End session
                </button>
              ) : (
                <button onClick={startCall} disabled={callStatus === 'connecting'} className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-md hover:bg-neutral-800 disabled:opacity-50">
                  {callStatus === 'connecting' ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" /> Connecting...
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" /> Start voice
                    </>
                  )}
                </button>
              )}
              
              {callStatus === 'active' && (
                <div className="mt-3 text-sm text-gray-600">{formatDuration(callDuration)}</div>
              )}
            </div>

            <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Settings2 className="h-4 w-4" /> Quick settings
                </div>
                <div className="text-xs text-gray-500">Keyboard: <Keyboard className="inline h-3 w-3" /> Space (toggle), C (captions)</div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="accent-black" checked={showCaptions} onChange={(e)=>setShowCaptions(e.target.checked)} />
                  Show captions
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="accent-black" checked={autoScroll} onChange={(e)=>setAutoScroll(e.target.checked)} />
                  Auto-scroll transcript
                </label>
              </div>
            </div>

            <details className="mt-4 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 bg-white">
              <summary className="cursor-pointer text-gray-900 font-medium flex items-center gap-2"><Info className="h-4 w-4" /> Tips</summary>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Use a clear microphone and speak naturally.</li>
                <li>You can stop the session anytime; your transcript stays on the right.</li>
                <li>We don’t send transcripts anywhere beyond your current session.</li>
              </ul>
            </details>
          </div>

          {/* Transcript panel */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-900">Transcript</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = transcripts
                      .map((t) => {
                        const time = new Date(t.time).toLocaleTimeString()
                        return "• " + time + " - " + t.text
                      })
                      .join("\n")
                    navigator.clipboard.writeText(text)
                  }}
                  className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-black focus:outline-none"
                >
                  <Clipboard className="h-4 w-4" /> Copy
                </button>
                <button onClick={() => setTranscripts([])} className="text-sm text-gray-700 hover:text-black underline focus:outline-none">Clear all</button>
              </div>
            </div>

            <div className="h-64 border border-gray-200 rounded-lg bg-white p-4 overflow-auto" aria-live="polite" aria-atomic="false">
              {showCaptions && transcripts.length === 0 && (
                <p className="text-sm text-gray-500">No transcript yet. Start a session to see live captions here.</p>
              )}
              {showCaptions && transcripts.map((t) => (
                <div key={t.id} className="text-sm text-gray-800 mb-2">
                  <span className="text-gray-500 mr-2">{new Date(t.time).toLocaleTimeString()}</span>
                  {t.text}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
