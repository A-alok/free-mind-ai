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
  const [deploymentStatus, setDeploymentStatus] = useState(null)
  const router = useRouter()

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
    formData.append("model_zip", file)

    try {
      // Deploy pre-trained model ZIP to GitHub & Render
      setStatus("Uploading model to deployment service...")
      const submitResponse = await fetch("/api/deploy", {
        method: "POST",
        body: formData,
      })

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json()
        throw new Error(errorData.error || "Failed to deploy model")
      }

      const deployData = await submitResponse.json()
      
      // Update progress through deployment stages
      setProgress(20)
      setStatus("Extracting ZIP file and validating contents...")
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setProgress(40)
      setStatus("Creating GitHub repository...")
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      setProgress(65)
      setStatus("Uploading model files to GitHub...")
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setProgress(85)
      setStatus("Setting up deployment configuration...")
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setProgress(100)
      setStatus(deployData.message || "GitHub deployment completed successfully!")
      
      // Set deployment result from actual GitHub API response
      setResult(deployData)
    } catch (error) {
      setErrorLog((prev) => [...prev, error.message])
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsDeploying(false)
    }
  }
  
  const deployTrainedModel = async (mlResult) => {
    // This function handles the deployment part after ML training is complete
    // For now, we'll return the ML result with simulated deployment status
    // In the future, this could call a separate deployment API
    return {
      ...mlResult,
      render_status: "created",
      github_repo: "your-username/ml-project",
      deployment_message: "Model trained successfully! Ready for deployment."
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 pt-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <RocketIcon className="h-5 w-5" />
                </span>
                Deploy your project
              </h1>
              <p className="text-gray-600 mt-2">
                Upload your trained ZIP and deploy to GitHub & Render with a clean, professional UI.
              </p>
            </div>
          </div>
        </div>

        {/* Content card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6 md:p-8">
            {/* GitHub Configuration Hint */}
            <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-start gap-3">
                <GithubIcon className="h-5 w-5 text-violet-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">GitHub configuration</h3>
                  <p className="text-sm text-gray-700 mt-1">Make sure your server has a GitHub token configured.</p>
                  <pre className="mt-3 bg-white border border-gray-200 p-3 rounded text-xs text-gray-800 overflow-x-auto">
{`[github]
token = "your-github-personal-access-token"
username = "your-github-username"`}
                  </pre>
                </div>
              </div>
            </div>

            {/* File upload */}
            {!result && (
              <div
                className="rounded-xl border-2 border-dashed border-violet-200 p-10 text-center hover:bg-violet-50 transition cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".zip" className="hidden" />
                <ArrowUpIcon className="mx-auto h-10 w-10 text-violet-600" />
                <p className="mt-2 text-sm text-gray-800">Drag and drop your trained ML Project ZIP file here, or click to browse</p>
                <p className="text-xs text-gray-600 mt-1">Only .zip files are accepted</p>
              </div>
            )}

            {/* File details */}
            {fileDetails && !result && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="font-semibold text-gray-900 mb-3">File details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {Object.entries(fileDetails).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="font-medium text-gray-700">{key}:</span>
                      <span className="ml-2 text-gray-700">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center text-green-700 text-sm">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" /> ZIP file uploaded successfully
                </div>
              </div>
            )}

            {/* Deploy button */}
            {file && !result && (
              <div className="mt-6">
                <button
                  onClick={deployProject}
                  disabled={isDeploying}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                >
                  {isDeploying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <RocketIcon className="h-5 w-5" /> Deploy to GitHub & Render
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Progress */}
            {isDeploying && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                  <div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-sm text-gray-700">{status}</p>
              </div>
            )}

            {/* Error log */}
            {errorLog.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowErrorLog(!showErrorLog)}
                  className="flex items-center text-sm text-red-600 hover:text-red-700"
                >
                  <AlertCircleIcon className="h-5 w-5 mr-1" />
                  {showErrorLog ? "Hide error log" : "Show error log"}
                </button>
                {showErrorLog && (
                  <div className="mt-2 p-3 bg-red-50 rounded border border-red-200 text-xs font-mono text-red-700 overflow-x-auto">
                    {errorLog.map((error, index) => (
                      <div key={index} className="mb-1">{error}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {result && !result.error && (
              <div className="mt-8 space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    {deploymentComplete ? "Deployment complete" : "Deployment in progress"}
                  </h2>

                  {result.github_url && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-600">Repository</p>
                          <p className="text-sm font-medium text-gray-900">{result.deployment_id || 'ml-model'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-600">Files uploaded</p>
                          <p className="text-sm font-medium text-gray-900">{result.files_uploaded || 'Multiple'} files</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-600">Model size</p>
                          <p className="text-sm font-medium text-gray-900">{result.model_size || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-600">Status</p>
                          <p className="text-sm font-medium text-green-700">Deployed</p>
                        </div>
                      </div>

                      <div className="flex items-center rounded-lg border border-gray-200 p-3">
                        <GithubIcon className="h-5 w-5 text-gray-700 mr-2" />
                        <span className="text-gray-700 truncate flex-1">{result.github_url}</span>
                        <a
                          href={result.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
                        >
                          <GithubIcon className="mr-2 h-4 w-4" /> View repository
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Render section */}
                  <div className="mt-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Render deployment</h3>

                    <div className="rounded-lg border border-gray-200 p-4 mb-4">
                      <div className="flex items-center mb-3">
                        <ServerIcon className="h-5 w-5 text-gray-700 mr-2" />
                        <span className="text-gray-800 font-medium">Status:</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                          result.render_status === 'live' ? 'bg-green-100 text-green-700' :
                          result.render_status === 'created' ? 'bg-yellow-100 text-yellow-700' : 'bg-violet-100 text-violet-700'
                        }`}>
                          {result.render_status === 'live' ? 'Live' : result.render_status === 'created' ? 'Building' : 'Setup Required'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{status}</p>

                      {result.render_status === 'created' && !deploymentComplete && (
                        <div>
                          <div className="h-2 w-full rounded bg-gray-100 overflow-hidden mb-1">
                            <div className="w-full h-full bg-violet-500 animate-pulse" />
                          </div>
                          <p className="text-xs text-gray-600">Deployment in progress. This may take a few minutes.</p>
                        </div>
                      )}

                      {result.render_url && (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <span className="text-gray-700 text-sm">Dashboard URL:</span>
                            <a href={result.render_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-violet-700 hover:text-violet-900 text-sm flex items-center">
                              {result.render_url.slice(0, 40)}...
                              <ExternalLinkIcon className="ml-1 h-3 w-3" />
                            </a>
                          </div>
                          {deploymentComplete && result.render_app_url && (
                            <div className="flex items-center">
                              <span className="text-gray-700 text-sm">Application URL:</span>
                              <a href={result.render_app_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-violet-700 hover:text-violet-900 text-sm flex items-center">
                                {result.render_app_url}
                                <ExternalLinkIcon className="ml-1 h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {result.render_url && (
                      <a
                        href={result.render_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700"
                      >
                        <ServerIcon className="mr-2 h-4 w-4" /> {deploymentComplete ? 'View app on Render' : 'View deployment on Render'}
                      </a>
                    )}
                  </div>

                  <div className="mt-6">
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
                      className="w-full rounded-lg border border-violet-300 px-4 py-2 text-violet-700 hover:bg-violet-50"
                    >
                      Start new deployment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            {!file && !result && (
              <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-gray-900 font-semibold mb-2">Upload your trained ML project ZIP</h3>
                <p className="text-sm text-gray-700 mb-3">Download from the ML training page, then upload here for deployment.</p>
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">How to get your ZIP</p>
                  <ol className="list-decimal pl-4 space-y-1 text-sm text-gray-700">
                    <li>Go to the ML page and train a model</li>
                    <li>Download the generated ZIP file</li>
                    <li>Upload that ZIP file here for deployment</li>
                  </ol>
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">The ZIP should contain</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center"><FileIcon className="h-4 w-4 text-violet-600 mr-2" /> <code className="bg-gray-100 px-1 py-0.5 rounded">load_model.py</code> - model loading app</li>
                  <li className="flex items-center"><FileIcon className="h-4 w-4 text-violet-600 mr-2" /> <code className="bg-gray-100 px-1 py-0.5 rounded">requirements.txt</code> - dependencies</li>
                  <li className="flex items-center"><FileIcon className="h-4 w-4 text-violet-600 mr-2" /> Trained model file: <code className="bg-gray-100 px-1 py-0.5 rounded">best_model.pkl</code> / <code className="bg-gray-100 px-1 py-0.5 rounded">best_model.keras</code> / <code className="bg-gray-100 px-1 py-0.5 rounded">best_model.pt</code></li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="py-6 text-center text-gray-500 text-sm">Deploy your ML projects with a clean, consistent UI.</div>
      </div>
    </div>
  )
}

