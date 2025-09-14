"use client"

import { useState, useRef, useEffect } from "react"
import {
  ArrowUpIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RocketIcon,
  GithubIcon,
  ServerIcon,
  FileIcon,
  ExternalLinkIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"

export default function Deploy() {
  const [file, setFile] = useState(null)
  const [fileDetails, setFileDetails] = useState(null)
  const [taskType, setTaskType] = useState("ml")
  const [isDeploying, setIsDeploying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("")
  const [result, setResult] = useState(null)
  const [errorLog, setErrorLog] = useState([])
  const [showErrorLog, setShowErrorLog] = useState(false)
  const [deploymentComplete, setDeploymentComplete] = useState(false)
  const fileInputRef = useRef(null)
  const [stars, setStars] = useState([])
  const [deploymentStatus, setDeploymentStatus] = useState(null)
  const router = useRouter()

  // Generate stars for the background with improved visibility
  useEffect(() => {
    const generateStars = () => {
      const newStars = []
      const count = 150  // Increased count for more stars

      for (let i = 0; i < count; i++) {
        newStars.push({
          id: i,
          left: Math.random() * 100,
          top: Math.random() * 100,
          size: Math.random() * 3 + 1,  // Slightly larger stars
          animationDuration: Math.random() * 4 + 3,
          opacity: Math.random() * 0.5 + 0.5  // Higher base opacity
        })
      }

      setStars(newStars)
    }

    generateStars()
  }, [])

  // Simulate progress during deployment
  useEffect(() => {
    if (isDeploying && progress < 95) {
      const timer = setTimeout(() => {
        setProgress((prev) => {
          const increment = Math.random() * 10
          return Math.min(prev + increment, 95)
        })
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [isDeploying, progress])

  // Poll Render deployment status if we have a service ID
  useEffect(() => {
    if (result?.render_service_id && result?.render_status !== "live" && !deploymentComplete) {
      const intervalId = setInterval(async () => {
        try {
          const response = await fetch(`/api/render-status/${result.render_service_id}`);
          if (response.ok) {
            const statusData = await response.json();
            setDeploymentStatus(statusData);
            
            if (statusData.status === "live") {
              setDeploymentComplete(true);
              setStatus("Deployment complete! Your app is now live on Render.");
              // Update the result with the live status
              setResult(prev => ({
                ...prev,
                render_status: "live",
                render_app_url: `https://${result.render_service_id}.onrender.com` // Simulated app URL
              }));
              clearInterval(intervalId);
            } else if (statusData.status === "building") {
              setStatus(`Building application on Render... (${Math.round(statusData.progress)}%)`);
            } else if (statusData.status === "deploying") {
              setStatus("Deploying application to Render...");
            }
          }
        } catch (error) {
          console.error("Error checking deployment status:", error);
        }
      }, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [result, deploymentComplete]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.name.endsWith(".zip")) {
      setFile(selectedFile)
      const fileSizeMB = selectedFile.size / (1024 * 1024)
      const fileSizeStr = fileSizeMB < 1024 ? `${fileSizeMB.toFixed(2)} MB` : `${(fileSizeMB / 1024).toFixed(2)} GB`

      setFileDetails({
        Filename: selectedFile.name,
        "File size": fileSizeStr,
      })
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith(".zip")) {
      setFile(droppedFile)
      const fileSizeMB = droppedFile.size / (1024 * 1024)
      const fileSizeStr = fileSizeMB < 1024 ? `${fileSizeMB.toFixed(2)} MB` : `${(fileSizeMB / 1024).toFixed(2)} GB`

      setFileDetails({
        Filename: droppedFile.name,
        "File size": fileSizeStr,
      })
    }
  }

  const deployProject = async () => {
    setIsDeploying(true)
    setProgress(0)
    setStatus("Preparing to deploy...")
    setErrorLog([])
    setDeploymentComplete(false)
    setDeploymentStatus(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("task_type", taskType)

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Deployment failed")
      }

      const data = await response.json()
      setResult(data)
      setProgress(100)
      
      if (data.render_status === "live") {
        setStatus("Deployment complete! Your app is now live on Render.")
        setDeploymentComplete(true)
      } else if (data.render_status === "created") {
        setStatus("GitHub deployment complete! Render deployment in progress...")
      } else {
        setStatus("GitHub deployment complete! Manual Render setup required.")
      }
    } catch (error) {
      setErrorLog((prev) => [...prev, error.message])
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pt-16">
      {/* Stars background */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDuration: `${star.animationDuration}s`,
            boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,0.8)`,
          }}
        />
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#A277FF]/10 to-transparent pointer-events-none"></div>

      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#FF5C41] via-[#F39C12] via-[#E67E22] via-[#BB8FCE] to-[#9B59B6] text-transparent bg-clip-text">
            FreeMindAi Deploy
          </h1>
          <p className="text-xl text-gray-300">Your cosmic companion for ML project deployment</p>
          <div className="h-1 w-32 bg-gradient-to-r from-[#A277FF] via-[#E056FD] to-[#6153CC] rounded-full mx-auto mt-4 shadow-[0_0_15px_5px_rgba(162,119,255,0.3)]"></div>
        </div>

        <div className="bg-black backdrop-blur-sm rounded-xl shadow-lg shadow-[#A277FF]/20 overflow-hidden border border-[#A277FF]/30 relative">
          {/* Glowing border effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border border-[#A277FF] rounded-xl opacity-50 blur-[2px]"></div>
          </div>
          
          <div className="p-8 relative z-10">
            {/* GitHub Configuration Check */}
            <div className="mb-8 p-4 bg-[#3A005A]/40 rounded-lg border border-[#A277FF]/30">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <GithubIcon className="h-5 w-5 text-[#A277FF]" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-[#A277FF]">GitHub Configuration Required</h3>
                  <div className="mt-2 text-sm text-[#A277FF]/80">
                    <p>Make sure your GitHub credentials are configured on the server. The server needs:</p>
                    <pre className="mt-2 bg-black p-2 rounded text-xs overflow-x-auto text-[#A277FF]/90 border border-[#A277FF]/30">
                      {`[github]
token = "your-github-personal-access-token"
username = "your-github-username"`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload */}
            {!result && (
              <div
                className="border-2 border-dashed border-[#A277FF]/50 rounded-lg p-12 text-center cursor-pointer hover:bg-[#3A005A]/20 transition-colors mb-6 group"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".zip" className="hidden" />
                <ArrowUpIcon className="mx-auto h-12 w-12 text-[#A277FF] group-hover:text-[#A277FF]/80 transition-colors" />
                <p className="mt-2 text-sm text-[#A277FF] group-hover:text-[#A277FF]/80 transition-colors">
                  Drag and drop your ML Project ZIP file here, or click to browse
                </p>
                <p className="text-xs text-[#A277FF]/60 mt-1">Only .zip files are accepted</p>
              </div>
            )}

            {/* File Details */}
            {fileDetails && !result && (
              <div className="mb-6 p-4 bg-[#3A005A]/40 rounded-lg border border-[#A277FF]/30">
                <h3 className="font-medium text-[#A277FF] mb-2">File Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(fileDetails).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="font-medium text-[#A277FF]">{key}:</span>
                      <span className="ml-2 text-[#A277FF]/80">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                  <span className="text-green-300 text-sm">ZIP file uploaded successfully!</span>
                </div>
              </div>
            )}

            {/* Task Type Selection */}
            {file && !result && (
              <div className="mb-6">
                <label htmlFor="task-type" className="block text-sm font-medium text-[#A277FF] mb-2">
                  Select the ML task type:
                </label>
                <select
                  id="task-type"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="block w-full px-3 py-2 border border-[#A277FF]/50 rounded-md shadow-sm bg-black text-[#A277FF]/90 focus:outline-none focus:ring-2 focus:ring-[#A277FF] focus:border-[#A277FF]"
                >
                  <option value="ml">General ML</option>
                  <option value="regression">Regression</option>
                  <option value="classification">Classification</option>
                  <option value="nlp">NLP</option>
                  <option value="image_classification">Image Classification</option>
                  <option value="object_detection">Object Detection</option>
                </select>
              </div>
            )}

            {/* Deploy Button */}
            {file && !result && (
              <button
                onClick={deployProject}
                disabled={isDeploying}
                className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-gradient-to-r from-[#A277FF] to-[#6153CC] hover:from-[#A277FF]/90 hover:to-[#6153CC]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A277FF] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(162,119,255,0.3)] flex items-center justify-center"
              >
                {isDeploying ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <RocketIcon className="mr-2 h-5 w-5" /> Deploy to GitHub & Render
                  </>
                )}
              </button>
            )}

            {/* Progress and Status */}
            {isDeploying && (
              <div className="mt-6">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-[#A277FF] bg-[#3A005A]">
                        Progress
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-[#A277FF]">{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-[#3A005A]/50">
                    <div
                      style={{ width: `${progress}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-[#A277FF] to-[#6153CC] transition-all duration-500"
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-[#A277FF]">{status}</p>
              </div>
            )}

            {/* Error Log */}
            {errorLog.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowErrorLog(!showErrorLog)}
                  className="flex items-center text-sm text-red-400 hover:text-red-300"
                >
                  <AlertCircleIcon className="h-5 w-5 mr-1" />
                  {showErrorLog ? "Hide Error Log" : "Show Error Log"}
                </button>
                {showErrorLog && (
                  <div className="mt-2 p-3 bg-red-900/20 rounded border border-red-500/30 text-xs font-mono overflow-x-auto text-red-300">
                    {errorLog.map((error, index) => (
                      <div key={index} className="mb-1">
                        {error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Deployment Result */}
            {result && !result.error && (
              <div className="mt-8 p-6 bg-[#3A005A]/30 rounded-lg border border-[#A277FF]/30">
                <h2 className="text-xl font-semibold text-[#A277FF] mb-4">
                  {deploymentComplete ? "🎉 Deployment Complete!" : "🚀 Deployment in Progress"}
                </h2>

                {/* GitHub Repository */}
                {result.github_url && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-[#A277FF] mb-2">GitHub Repository</h3>
                    <div className="flex items-center p-3 bg-black rounded-lg border border-[#A277FF]/30 mb-4">
                      <GithubIcon className="h-5 w-5 text-[#A277FF] mr-2" />
                      <span className="text-[#A277FF]/80 truncate">{result.github_url}</span>
                    </div>
                    <a
                      href={result.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#3A005A] hover:bg-[#4C0066] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A277FF]"
                    >
                      <GithubIcon className="mr-2 h-4 w-4" /> View GitHub Repository
                    </a>
                  </div>
                )}

                {/* Render Status */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-[#A277FF] mb-2">Render Deployment</h3>
                  
                  {/* Status Indicator */}
                  <div className="p-4 bg-black rounded-lg border border-[#A277FF]/30 mb-4">
                    <div className="flex items-center mb-4">
                      <ServerIcon className="h-5 w-5 text-[#A277FF] mr-2" />
                      <span className="text-[#A277FF] font-medium">Status: </span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium 
                        ${result.render_status === 'live' ? 'bg-green-900/50 text-green-300' : 
                          result.render_status === 'created' ? 'bg-yellow-900/50 text-yellow-300' : 
                          'bg-[#3A005A] text-[#A277FF]'}`}
                      >
                        {result.render_status === 'live' ? 'Live' : 
                         result.render_status === 'created' ? 'Building' : 
                         'Setup Required'}
                      </span>
                    </div>
                    
                    {/* Status Message */}
                    <p className="text-[#A277FF]/80 mb-4">{status}</p>
                    
                    {/* Progress Bar for Building Status */}
                    {result.render_status === 'created' && !deploymentComplete && (
                      <div className="mb-4">
                        <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-[#3A005A]/50">
                          <div className="w-full bg-[#A277FF] animate-pulse h-full rounded"></div>
                        </div>
                        <p className="text-xs text-[#A277FF]">Deployment in progress. This may take a few minutes.</p>
                      </div>
                    )}
                    
                    {/* Render URLs */}
                    {result.render_url && (
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center">
                          <span className="text-[#A277FF] text-sm">Dashboard URL:</span>
                          <a 
                            href={result.render_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 text-[#A277FF]/80 hover:text-[#A277FF] text-sm flex items-center"
                          >
                            {result.render_url.slice(0, 40)}...
                            <ExternalLinkIcon className="ml-1 h-3 w-3" />
                          </a>
                        </div>
                        
                        {deploymentComplete && result.render_app_url && (
                          <div className="flex items-center">
                            <span className="text-[#A277FF] text-sm">Application URL:</span>
                            <a 
                              href={result.render_app_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 text-[#A277FF]/80 hover:text-[#A277FF] text-sm flex items-center"
                            >
                              {result.render_app_url}
                              <ExternalLinkIcon className="ml-1 h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Render Dashboard Button */}
                  {result.render_url && (
                    <a
                      href={result.render_url}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-[#A277FF] to-[#6153CC] hover:from-[#A277FF]/90 hover:to-[#6153CC]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A277FF] shadow-[0_0_15px_rgba(162,119,255,0.3)]"
                    >
                      <ServerIcon className="mr-2 h-4 w-4" /> 
                      {deploymentComplete ? "View App on Render" : "View Deployment on Render"}
                    </a>
                  )}
                </div>
                
                {/* Start New Deployment Button */}
                <button
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                    setFileDetails(null);
                    setDeploymentComplete(false);
                    setDeploymentStatus(null);
                    setStatus("");
                    setErrorLog([]);
                  }}
                  className="w-full py-2 px-4 border border-[#A277FF] rounded-md shadow-sm text-[#A277FF] bg-transparent hover:bg-[#3A005A]/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A277FF]"
                >
                  Start New Deployment
                </button>
              </div>
            )}

            {/* Instructions */}
            {!file && !result && (
              <div className="mt-6 p-4 bg-[#3A005A]/20 rounded-lg border border-[#A277FF]/30">
                <h3 className="font-medium text-[#A277FF] mb-2">
                  Please upload a ZIP file containing your ML project. The ZIP should include:
                </h3>
                <ul className="space-y-2 text-sm text-[#A277FF]/80">
                  <li className="flex items-center">
                    <FileIcon className="h-4 w-4 text-[#A277FF] mr-2" />
                    <span>
                      <code className="bg-[#3A005A]/50 px-1 py-0.5 rounded">load_model.py</code> - App for model
                      loading and visualization
                    </span>
                  </li>
                  <li className="flex items-center">
                    <FileIcon className="h-4 w-4 text-[#A277FF] mr-2" />
                    <span>
                      <code className="bg-[#3A005A]/50 px-1 py-0.5 rounded">requirements.txt</code> - Python package
                      dependencies
                    </span>
                  </li>
                  <li className="flex items-center">
                    <FileIcon className="h-4 w-4 text-[#A277FF] mr-2" />
                    <span>
                      Model file (one of): <code className="bg-[#3A005A]/50 px-1 py-0.5 rounded">best_model.pkl</code>,{" "}
                      <code className="bg-[#3A005A]/50 px-1 py-0.5 rounded">best_model.keras</code>,{" "}
                      <code className="bg-[#3A005A]/50 px-1 py-0.5 rounded">best_model.pt</code>, or{" "}
                      <code className="bg-[#3A005A]/50 px-1 py-0.5 rounded">best_model.h5</code>
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[#A277FF] text-sm">
          <p>FreeMindAi Deploy • Your cosmic companion for ML project deployment</p>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}