"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    BarChart,
    BarChart3,
    Box,
    BrainCircuit,
    CheckCircle,
    Cpu,
    Database,
    Download,
    Eye,
    FileText,
    Image,
    Info,
    LayoutDashboard,
    LineChart,
    MessageSquare,
    PieChart,
    Plus,
    Rocket,
    Search,
    Sparkles,
    Table,
    Upload,
    X,
    Zap,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

// All task type icons are still defined for display purposes
const taskTypeIcons = {
  classification: <PieChart className="h-5 w-5" />,
  regression: <LineChart className="h-5 w-5" />,
  nlp: <MessageSquare className="h-5 w-5" />,
  image_classification: <Image className="h-5 w-5" />,
  object_detection: <Box className="h-5 w-5" />,
}

const taskTypeColors = {
  classification: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  regression: "bg-green-500/10 text-green-500 border-green-500/20",
  nlp: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  image_classification: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  object_detection: "bg-rose-500/10 text-rose-500 border-rose-500/20",
}

const taskTypeOptions = [
  {
    id: 'classification',
    name: 'Classification',
    description: 'Categorize data into different classes',
    icon: <PieChart className="w-6 h-6" />,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'regression',
    name: 'Regression',
    description: 'Predict continuous numerical values',
    icon: <LineChart className="w-6 h-6" />,
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 'nlp',
    name: 'Natural Language Processing',
    description: 'Process and analyze text data',
    icon: <MessageSquare className="w-6 h-6" />,
    color: 'from-purple-500 to-violet-600'
  },
  {
    id: 'image_classification',
    name: 'Image Classification',
    description: 'Classify images into categories',
    icon: <Image className="w-6 h-6" />,
    color: 'from-orange-500 to-red-600'
  },
  {
    id: 'object_detection',
    name: 'Object Detection',
    description: 'Detect and locate objects in images',
    icon: <Box className="w-6 h-6" />,
    color: 'from-pink-500 to-rose-600'
  }
];

export default function MLSystem() {
  // Project Configuration states
  const [configurationStep, setConfigurationStep] = useState(1)
  const [isConfigured, setIsConfigured] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [hasDataset, setHasDataset] = useState(null)
  const [dataDescription, setDataDescription] = useState('')
  
  // Original ML system states
  const [file, setFile] = useState(null)
  const [folderZip, setFolderZip] = useState(null)
  const [textPrompt, setTextPrompt] = useState("")
  const [taskType, setTaskType] = useState("classification")
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [dataPreview, setDataPreview] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)
  const [visualizations, setVisualizations] = useState(null)
  const [datasetInfo, setDatasetInfo] = useState("")
  const [downloadUrl, setDownloadUrl] = useState("")
  const [activeSection, setActiveSection] = useState(null)
  const [detectedTaskType, setDetectedTaskType] = useState(null)
  const [taskTypeChanged, setTaskTypeChanged] = useState(false)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const router = useRouter()

  // Project Configuration handlers
  const handleDatasetChoice = (choice) => {
    setHasDataset(choice)
    // Move directly to step 2 for both choices
  }

  const handleImageTaskTypeSelection = (selectedTaskType) => {
    setTaskType(selectedTaskType)
    completeConfiguration() // Complete configuration
  }

  const handleCSVUpload = (event) => {
    const uploadedFile = event.target.files[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      // Auto-detect task type for CSV/structured data
      setTaskType('classification') // Default, will be auto-detected by backend
      completeConfiguration() // Complete configuration
    }
  }

  const handleZipUpload = (event) => {
    const uploadedFile = event.target.files[0]
    if (uploadedFile) {
      setFolderZip(uploadedFile)
      // For image data, we need to ask user about classification vs detection
      setConfigurationStep(2.5) // Go to image task selection
    }
  }

  const handleDataDescription = () => {
    if (dataDescription.trim()) {
      setTextPrompt(dataDescription)
      setTaskType('classification') // Default for generated data
      completeConfiguration() // Complete configuration
    }
  }

  const completeConfiguration = () => {
    // Set default project name if not provided
    if (!projectName.trim()) {
      const taskName = taskTypeOptions.find(t => t.id === taskType)?.name || 'ML'
      setProjectName(`${taskName} Project`)
    }
    setIsConfigured(true)
  }

  const resetConfiguration = () => {
    setConfigurationStep(1)
    setIsConfigured(false)
    setProjectName('')
    setHasDataset(null)
    setDataDescription('')
    setFile(null)
    setFolderZip(null)
    setTextPrompt('')
    setTaskType('classification')
    setResult(null)
    setDataPreview(null)
    setModelInfo(null)
    setVisualizations(null)
    setDatasetInfo("")
    setDownloadUrl("")
    setDetectedTaskType(null)
    setTaskTypeChanged(false)
  }

  // Navigation handlers
  const navigateToChatbot = () => {
    router.push("/chatbot")
  }

  const navigateToDataAnalysis = () => {
    router.push("/analysis")
  }

  const navigateToGenerate = () => {
    router.push("/alter_expand")
  }

  const navigateToDeploy = () => {
    router.push("/deploy")
  }

  // Clear task type change notification when user manually changes task type
  useEffect(() => {
    setTaskTypeChanged(false)
    setDetectedTaskType(null)
  }, [taskType])

  // Simulate progress when loading
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + Math.random() * 10
          return newProgress >= 95 ? 95 : newProgress
        })
      }, 500)
      return () => {
        clearInterval(interval)
        setProgress(0)
      }
    }
  }, [isLoading])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      // Reset task type change notification when new file is uploaded
      setTaskTypeChanged(false)
      setDetectedTaskType(null)
    }
  }

  const handleFolderChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFolderZip(e.target.files[0])
      // Reset task type change notification when new folder is uploaded
      setTaskTypeChanged(false)
      setDetectedTaskType(null)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setResult(null)
    setDataPreview(null)
    setModelInfo(null)
    setVisualizations(null)
    setDatasetInfo("")
    setDownloadUrl("")
    setProgress(0)
    setTaskTypeChanged(false)
    setDetectedTaskType(null)

    const formData = new FormData()
    if (file) formData.append("file", file)
    if (folderZip) formData.append("folder_zip", folderZip)
    formData.append("text_prompt", textPrompt)
    formData.append("task_type", taskType)

    try {
      // Add a longer timeout for the fetch operation since model training can take time
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120 * 60 * 1000) // 2-hour timeout (same as backend)

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      }).catch((error) => {
        console.error("Fetch error:", error)
        throw new Error("Network error occurred. The server might still be processing your request.")
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Server error:", errorText)
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json().catch((error) => {
        console.error("JSON parsing error:", error)
        throw new Error("Error parsing server response. The model might still be training.")
      })

      setProgress(100)

      if (data.error) {
        setResult({ error: data.error })
        return
      }

      setResult(data)

      // Check if task type was changed by the backend
      // The backend is sending back the actual task type that was used
      // We need to make sure we're using this task type for model display

      // If detected_task_type is present in response, use it
      if (data.detected_task_type && data.detected_task_type !== taskType) {
        setDetectedTaskType(data.detected_task_type)
        setTaskType(data.detected_task_type) // Update the UI to show new task type
        setTaskTypeChanged(true)
      }

      // Otherwise, ensure the task type is consistent with the model_info
      else if (data.model_info && data.model_info.task_type && data.model_info.task_type !== taskType) {
        setDetectedTaskType(data.model_info.task_type)
        setTaskType(data.model_info.task_type)
        setTaskTypeChanged(true)
      }

      if (data.data_preview) {
        try {
          // Validate data structure before setting
          const isValidPreview =
            data.data_preview && Array.isArray(data.data_preview.data) && Array.isArray(data.data_preview.columns)

          if (isValidPreview) {
            setDataPreview(data.data_preview)
            setActiveSection("data")
          } else {
            console.warn("Invalid data preview structure:", data.data_preview)
          }
        } catch (previewError) {
          console.error("Error processing data preview:", previewError)
        }
      }

      if (data.model_info) {
        // Fix for object detection tasks with zero score
        const currentTaskType = data.detected_task_type || data.model_info.task_type || taskType

        // Update the task type in modelInfo to ensure it's displayed correctly
        data.model_info.task_type = currentTaskType

        if (currentTaskType === "object_detection") {
          // If score is zero, use mAP or other metrics instead
          if (data.model_info.score === 0 || data.model_info.score < 0.001) {
            // Try to use mAP first
            if (data.model_info.mAP && data.model_info.mAP > 0) {
              data.model_info.score = data.model_info.mAP
            }
            // Then try precision
            else if (data.model_info.precision && data.model_info.precision > 0) {
              data.model_info.score = data.model_info.precision
            }
            // Then try recall
            else if (data.model_info.recall && data.model_info.recall > 0) {
              data.model_info.score = data.model_info.recall
            }
            // Default fallback - use the actual score from backend
            else {
              // Keep the original score from backend instead of hardcoding 0.75
              console.log("Using original score from backend for object detection:", data.model_info.score)
            }
          }
        }
        setModelInfo(data.model_info)
      }

      // Rest of the function remains the same
      if (data.visualizations && data.visualizations.plots) {
        setVisualizations(data.visualizations)
      }

      if (data.dataset_info) {
        setDatasetInfo(data.dataset_info)
      }

      if (data.download_url) {
        setDownloadUrl(data.download_url)
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      setResult({
        error:
          error.message || "An error occurred during processing. The model might still be training in the background.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      window.location.href = downloadUrl
    }
  }


  // Function to create Plotly visualizations from backend data
  const createPlotlyVisualization = (plot) => {
    // Base64 image visualization
    if (plot.image) {
      return (
        <div className="aspect-video bg-gray-900/70 rounded-lg overflow-hidden flex items-center justify-center">
          <img
            src={`data:image/png;base64,${plot.image}`}
            alt={plot.title}
            className="object-contain max-h-full max-w-full"
          />
        </div>
      )
    }

    // Fallback to placeholder visualization in case something is wrong with the image
    return (
      <div className="aspect-video bg-gray-900/70 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-purple-400 text-center p-4">
          <BarChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Visualization data not available</p>
        </div>
      </div>
    )
  }

  // Error message component
  const ErrorMessage = ({ message }) => (
    <div className="bg-purple-900/30 border border-purple-700/50 rounded-xl p-6 shadow-xl backdrop-blur-sm animate-pulse-slow">
      <div className="flex items-start">
        <X className="h-6 w-6 text-purple-400 mr-3 mt-0.5" />
        <div>
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-gray-300">{message}</p>
          <div className="mt-4 bg-purple-950/50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Troubleshooting Tips:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>For image classification, make sure TensorFlow is installed on the server</li>
              <li>For object detection, make sure ultralytics and torch are installed</li>
              <li>Check that your dataset is in the correct format for the selected task</li>
              <li>For Kaggle datasets, ensure the Kaggle API is properly configured</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  // Define custom styles for the component
  const styles = {
    container: "min-h-screen bg-black text-white mt-18",
    gradient:
      "absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,30,255,0.2),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(70,0,150,0.15),transparent_50%)] pointer-events-none",
    content: "container mx-auto px-4 py-4 relative z-10",
    header: "text-center mb-8",
    title:
      "text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600 drop-shadow-[0_2px_5px_rgba(147,51,234,0.5)]",
    subtitle: "text-xl text-purple-300 drop-shadow-sm",
    configCard:
      "lg:col-span-1 bg-black/50 border border-purple-500/30 backdrop-blur-md shadow-[0_10px_50px_-12px_rgba(147,51,234,0.25)] rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_20px_80px_-12px_rgba(147,51,234,0.35)] hover:border-purple-500/50",
    configHeader: "bg-gradient-to-b from-purple-900/40 to-purple-800/20 pt-0 pb-3",
    configTitle: "flex items-center gap-2 text-purple-300",
    configDescription: "text-purple-200 drop-shadow-sm",
    uploadArea:
      "border-2 border-dashed border-purple-500/50 rounded-lg p-6 text-center cursor-pointer hover:bg-purple-900/30 hover:border-purple-500/70 transition-all duration-300 group backdrop-blur-sm",
    uploadIcon:
      "mx-auto h-8 w-8 text-purple-300 mb-2 group-hover:text-purple-400 transition-colors group-hover:scale-110 duration-300",
    uploadText: "text-sm text-purple-300 group-hover:text-purple-200 transition-colors",
    uploadBadge: "bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(147,51,234,0.3)]",
    textareaWrapper: "relative",
    textareaIcon: "absolute left-3 top-3 h-5 w-5 text-purple-300",
    textarea:
      "w-full rounded-lg bg-black/60 border-purple-500/50 text-white pl-10 p-3 focus:ring-purple-500 focus:border-purple-500 shadow-inner backdrop-blur-sm transition-all duration-300 focus:shadow-[0_0_15px_rgba(147,51,234,0.3)]",
    taskTypeButton: {
      active:
        "bg-gradient-to-r from-purple-600 to-purple-600 text-white border-none shadow-[0_0_15px_rgba(147,51,234,0.3)]",
      inactive: "bg-black/60 hover:bg-purple-900/30 border-purple-500/50 text-purple-300 backdrop-blur-sm",
    },
    buildButton:
      "w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-medium shadow-[0_10px_20px_-10px_rgba(147,51,234,0.5)] py-3 rounded-lg transition-all duration-300 hover:shadow-[0_15px_30px_-8px_rgba(147,51,234,0.6)] transform hover:-translate-y-1",
    dashboardCard:
      "bg-black/60 border border-purple-500/30 backdrop-blur-md shadow-[0_10px_50px_-12px_rgba(147,51,234,0.25)] rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_20px_80px_-12px_rgba(147,51,234,0.35)] hover:border-purple-500/50",
    dashboardHeader: "bg-gradient-to-b from-purple-900/40 to-purple-800/20",
    dashboardTitle: "flex items-center gap-2 text-purple-300",
    dashboardDescription: "text-purple-200 drop-shadow-sm",
    loadingContainer: "flex flex-col items-center justify-center py-16 space-y-6",
    loadingIcon: "h-12 w-12 text-purple-400 filter drop-shadow-[0_0_8px_rgba(147,51,234,0.5)]",
    progressContainer: "w-full max-w-md space-y-2",
    progressText: "flex justify-between text-sm text-purple-300",
    progressBar: "h-2 bg-gray-700/70 rounded-full overflow-hidden backdrop-blur-sm",
    progressFill:
      "h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(147,51,234,0.5)]",
    loadingTitle: "text-lg font-medium text-purple-200 drop-shadow-sm",
    loadingSubtitle: "text-sm text-purple-300",
    emptyStateContainer: "flex flex-col items-center justify-center py-16 space-y-6 text-center",
    emptyStateIcon:
      "p-6 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 shadow-[0_0_30px_rgba(147,51,234,0.3)]",
    emptyStateTitle: "text-xl font-medium mb-2 text-purple-200 drop-shadow-sm",
    emptyStateText: "text-gray-400 max-w-md",
    stepsContainer: "grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md",
    stepItem:
      "flex flex-col items-center p-4 bg-black/60 rounded-lg border border-purple-500/50 hover:border-purple-600/80 hover:bg-purple-900/40 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-[0_10px_25px_-5px_rgba(147,51,234,0.3)] transform hover:-translate-y-1",
    stepIcon:
      "w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/30 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]",
    stepText: "text-sm text-purple-200",
    dataPreviewContainer:
      "bg-black/60 rounded-lg border border-purple-500/30 overflow-hidden shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-[0_15px_30px_-5px_rgba(147,51,234,0.25)] hover:border-purple-500/50",
    dataPreviewHeader:
      "flex items-center justify-between px-4 py-3 border-b border-purple-500/50 bg-gradient-to-b from-purple-900/40 to-purple-800/20",
    dataPreviewTitle: "font-medium flex items-center gap-2 text-purple-300",
    dataPreviewButton: "h-8 border-purple-500/50 hover:bg-purple-900/30 backdrop-blur-sm",
    tableContainer: "p-4 overflow-auto",
    table: "min-w-full divide-y divide-purple-500/50",
    tableHeader: "bg-black/60",
    tableHeaderCell:
      "px-3 py-2 text-left text-xs font-medium text-purple-300 uppercase tracking-wider border-r border-purple-500/50 last:border-r-0",
    tableBody: "bg-black/40 divide-y divide-purple-500/50",
    tableRow: "hover:bg-purple-900/30 transition-colors backdrop-blur-sm",
    tableCell: "px-3 py-2 whitespace-nowrap text-sm text-purple-200 border-r border-purple-500/50 last:border-r-0",
    datasetInfoContainer:
      "bg-black/60 rounded-lg border border-purple-500/30 overflow-hidden shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-[0_15px_30px_-5px_rgba(147,51,234,0.25)] hover:border-purple-500/50",
    datasetInfoHeader:
      "flex items-center justify-between px-4 py-3 border-b border-purple-500/50 bg-gradient-to-b from-purple-900/40 to-purple-800/20",
    datasetInfoTitle: "font-medium flex items-center gap-2 text-purple-300",
    datasetInfoContent: "p-4",
    preText: "text-sm text-purple-200 font-mono whitespace-pre-wrap",
    modelInfoContainer:
      "bg-black/60 rounded-lg border border-purple-500/30 overflow-hidden shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-[0_15px_30px_-5px_rgba(147,51,234,0.25)] hover:border-purple-500/50",
    modelInfoHeader:
      "flex items-center justify-between px-4 py-3 border-b border-purple-500/50 bg-gradient-to-b from-purple-900/40 to-purple-800/20",
    modelInfoTitle: "font-medium flex items-center gap-2 text-purple-300",
    modelInfoGrid: "grid grid-cols-1 md:grid-cols-2 gap-4 p-4",
    modelInfoCard:
      "bg-black/60 rounded-lg p-4 border border-purple-500/30 backdrop-blur-sm shadow-md hover:shadow-[0_10px_20px_-5px_rgba(147,51,234,0.2)] transition-all duration-300 hover:border-purple-500/50",
    modelInfoLabel: "text-sm text-purple-300 mb-1",
    modelInfoValue: "text-3xl font-bold text-purple-400 drop-shadow-[0_2px_4px_rgba(147,51,234,0.3)]",
    modelInfoScale: "text-sm text-purple-300 mb-1",
    visualizationsContainer:
      "bg-black/60 rounded-lg border border-purple-500/30 overflow-hidden shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-[0_15px_30px_-5px_rgba(147,51,234,0.25)] hover:border-purple-500/50",
    visualizationsHeader:
      "flex items-center justify-between px-4 py-3 border-b border-purple-500/50 bg-gradient-to-b from-purple-900/40 to-purple-800/20",
    visualizationsTitle: "font-medium flex items-center gap-2 text-purple-300",
    visualizationsGrid: "grid grid-cols-1 md:grid-cols-2 gap-4 p-4",
    plotContainer:
      "bg-black/60 rounded-lg border border-purple-500/30 overflow-hidden backdrop-blur-sm shadow-lg hover:shadow-[0_10px_20px_-5px_rgba(147,51,234,0.2)] transition-all duration-300 hover:border-purple-500/50",
    plotHeader: "px-3 py-2 border-b border-purple-500/50 flex items-center justify-between",
    plotTitle: "text-sm font-medium text-purple-200",
    plotBadge: "bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs shadow-[0_0_8px_rgba(147,51,234,0.2)]",
    plotContent: "p-2",
    explanationTrigger:
      "py-2 px-3 text-xs font-medium text-purple-400 hover:text-purple-300 hover:no-underline transition-colors duration-200",
    explanationContent: "px-3 pb-3 pt-0",
    explanationText:
      "text-xs text-purple-200 bg-black/60 p-2.5 rounded-md border border-purple-500/30 shadow-inner backdrop-blur-sm",
    footer:
      "mt-12 text-center text-purple-400 text-sm font-light tracking-wider opacity-80 hover:opacity-100 transition-opacity duration-300",
    taskTypeChangedAlert: "mb-4 border-amber-500/50 bg-amber-900/20 text-amber-300",
    autoDetectionBadge:
      "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] text-xs",
  }

  // Show Project Configuration if not configured yet
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
            >
              Project Configuration
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-400 text-lg"
            >
              Configure your machine learning project
            </motion.p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    configurationStep >= step 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {configurationStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-1 mx-2 rounded-full transition-all duration-300 ${
                      configurationStep > step ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Steps */}
          <div className="max-w-4xl mx-auto">
            {/* Step 1: Dataset Choice */}
            {configurationStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <h2 className="text-2xl font-semibold mb-6">Do you have a dataset?</h2>
                <p className="text-gray-400 mb-8">Choose whether you already have data or need help finding/generating it</p>
                
                <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setHasDataset(true)
                      setConfigurationStep(2)
                    }}
                    className="p-8 bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl cursor-pointer hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    <Database className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-green-400">Yes, I have data</h3>
                    <p className="text-gray-400">Upload your existing dataset to get started with training</p>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setHasDataset(false)
                      setConfigurationStep(2)
                    }}
                    className="p-8 bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl cursor-pointer hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    <Search className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-blue-400">No, I need data</h3>
                    <p className="text-gray-400">Describe what you want to build and we'll help find or generate data</p>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Upload Data or Describe Requirements */}
            {configurationStep === 2 && hasDataset && (
              <motion.div
                key="step2-upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <h2 className="text-2xl font-semibold mb-6">Upload Your Dataset</h2>
                <p className="text-gray-400 mb-8">Upload your data - we'll automatically detect the task type</p>
                
                <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {/* CSV/XML Upload */}
                  <div className="p-6 bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-blue-400" />
                      Structured Data
                    </h3>
                    <div className="border-2 border-dashed border-blue-500/30 rounded-lg p-8 hover:border-blue-500/50 transition-colors">
                      <Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-400 mb-4">CSV, Excel, or XML files</p>
                      <input
                        type="file"
                        onChange={handleCSVUpload}
                        className="hidden"
                        id="csv-upload"
                        accept=".csv,.xlsx,.xml,.json"
                      />
                      <label
                        htmlFor="csv-upload"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:opacity-90 transition-opacity inline-block text-sm"
                      >
                        Choose File
                      </label>
                      <p className="text-xs text-blue-300 mt-3">
                        ✨ Auto-detects: Classification, Regression, or NLP
                      </p>
                    </div>
                  </div>

                  {/* ZIP Upload */}
                  <div className="p-6 bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Image className="w-6 h-6 text-orange-400" />
                      Image Data
                    </h3>
                    <div className="border-2 border-dashed border-orange-500/30 rounded-lg p-8 hover:border-orange-500/50 transition-colors">
                      <Upload className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-400 mb-4">ZIP with organized folders</p>
                      <input
                        type="file"
                        onChange={handleZipUpload}
                        className="hidden"
                        id="zip-upload"
                        accept=".zip"
                      />
                      <label
                        htmlFor="zip-upload"
                        className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:opacity-90 transition-opacity inline-block text-sm"
                      >
                        Choose ZIP
                      </label>
                      <p className="text-xs text-orange-300 mt-3">
                        📋 Will ask: Classification or Detection
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => setConfigurationStep(1)}
                    className="flex items-center gap-2 px-6 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Describe Data Requirements (for users without data) */}
            {configurationStep === 2 && !hasDataset && (
              <motion.div
                key="step2-describe"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <h2 className="text-2xl font-semibold mb-6">Describe Your Data Needs</h2>
                <p className="text-gray-400 mb-8">Tell us what you want to build and we'll find or generate the data</p>
                
                <div className="max-w-2xl mx-auto">
                  <div className="bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6">
                    <textarea
                      value={dataDescription}
                      onChange={(e) => setDataDescription(e.target.value)}
                      placeholder="Describe your project. For example:\n- Predict house prices based on location and size\n- Classify customer reviews as positive/negative\n- Detect objects in retail store images\n- Analyze sentiment in social media posts"
                      className="w-full h-40 bg-black/60 border border-purple-500/30 rounded-lg p-4 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    />
                  </div>
                  
                  <div className="flex justify-center gap-4 mt-8">
                    <button
                      onClick={() => setConfigurationStep(1)}
                      className="flex items-center gap-2 px-6 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={handleDataDescription}
                      disabled={!dataDescription.trim()}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2.5: Image Task Type Selection (only for ZIP uploads) */}
            {configurationStep === 2.5 && (
              <motion.div
                key="step2-5-image-task"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <h2 className="text-2xl font-semibold mb-6">Select Image Task Type</h2>
                <p className="text-gray-400 mb-8">What do you want to do with your images?</p>
                
                <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleImageTaskTypeSelection('image_classification')}
                    className="p-8 bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl cursor-pointer hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    <Image className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-amber-400">Image Classification</h3>
                    <p className="text-gray-400">Single label per image (e.g., cat vs dog, product categories)</p>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleImageTaskTypeSelection('object_detection')}
                    className="p-8 bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl cursor-pointer hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    <Box className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-rose-400">Object Detection</h3>
                    <p className="text-gray-400">Multiple objects per image with bounding boxes</p>
                  </motion.div>
                </div>
                
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => setConfigurationStep(2)}
                    className="flex items-center gap-2 px-6 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              </motion.div>
            )}

          </div>
          
          {/* Reset Button */}
          <div className="text-center mt-12">
            <button
              onClick={resetConfiguration}
              className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gradient}></div>
      <div className={styles.content}>
        <header className={styles.header}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {projectName || `${taskTypeOptions.find(t => t.id === taskType)?.name} Project`}
                </h1>
                <p className="text-purple-300">Task: {taskTypeOptions.find(t => t.id === taskType)?.name}</p>
              </div>
              <button
                onClick={resetConfiguration}
                className="text-purple-400 hover:text-purple-300 transition-colors text-sm"
              >
                Reconfigure Project
              </button>
            </div>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className={styles.configCard}>
              <CardHeader className={styles.configHeader} style={{ marginTop: 0, paddingTop: "1rem" }}>
                <CardTitle className={styles.configTitle}>
                  <Cpu className="h-5 w-5 text-purple-400 filter drop-shadow-[0_0_5px_rgba(147,51,234,0.5)]" />
                  Build ML Model
                </CardTitle>
                <CardDescription className={styles.configDescription}>
                  Configure and train your {taskTypeOptions.find(t => t.id === taskType)?.name.toLowerCase()} model
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {taskTypeChanged && (
                  <Alert className={styles.taskTypeChangedAlert}>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      The system automatically detected that this dataset is better suited for{" "}
                      <span className="font-semibold">{detectedTaskType.replace("_", " ")}</span> tasks. The task type
                      has been changed accordingly.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Project Configuration Summary */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Project Configuration
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400">Task Type:</span>
                      <div className="flex items-center gap-2 mt-1">
                        {taskTypeIcons[taskType]}
                        <span className="text-white font-medium">{taskTypeOptions.find(t => t.id === taskType)?.name}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Dataset:</span>
                      <div className="text-white font-medium mt-1">
                        {hasDataset ? (file ? file.name : 'User provided') : 'AI Generated'}
                      </div>
                    </div>
                  </div>
                  {!hasDataset && textPrompt && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20">
                      <span className="text-gray-400 text-xs">Requirements:</span>
                      <p className="text-white text-xs mt-1 bg-black/30 p-2 rounded">
                        {textPrompt.length > 100 ? `${textPrompt.substring(0, 100)}...` : textPrompt}
                      </p>
                    </div>
                  )}
                </div>

                {/* Conditional Upload Section */}
                {hasDataset && !file && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-purple-100">
                      {taskType.includes('image') ? 'Upload Dataset (.zip)' : 'Upload Dataset File'}
                    </label>
                    <div className={styles.uploadArea} onClick={() => {
                      if (taskType.includes('image')) {
                        folderInputRef.current?.click()
                      } else {
                        fileInputRef.current?.click()
                      }
                    }}>
                      <Upload className={styles.uploadIcon} />
                      <p className={styles.uploadText}>
                        Click to upload {taskType.includes('image') ? 'ZIP file' : 'CSV/dataset file'}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt,.json"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <input
                        ref={folderInputRef}
                        type="file"
                        accept=".zip"
                        className="hidden"
                        onChange={handleFolderChange}
                      />
                    </div>
                    <p className="mt-2 text-xs text-purple-300">
                      {taskType.includes('image') 
                        ? 'Upload a zip file with organized class folders or YOLO format'
                        : 'Upload your dataset in CSV, TXT, or JSON format'
                      }
                    </p>
                  </div>
                )}

                {/* Data Requirements (for non-dataset users) */}
                {!hasDataset && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-purple-100">
                      Data Requirements (Configured)
                    </label>
                    <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Search className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-white mb-2">The system will search/generate data based on:</p>
                          <p className="text-sm text-purple-200 bg-black/60 p-3 rounded border border-purple-500/20">
                            {textPrompt || 'Your project requirements'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Options */}
                <div className="border-t border-purple-500/20 pt-4">
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-purple-300 hover:text-purple-200 flex items-center gap-2 mb-3">
                      <Plus className="w-4 h-4 group-open:rotate-45 transition-transform" />
                      Advanced Configuration
                    </summary>
                    <div className="space-y-3 pl-6">
                      {!hasDataset && (
                        <div>
                          <label className="block text-sm font-medium mb-2 text-purple-100">
                            Additional Requirements (Optional)
                          </label>
                          <textarea
                            rows={3}
                            className="w-full rounded-lg bg-black/60 border border-purple-500/30 text-white p-3 text-sm focus:border-purple-500 focus:outline-none resize-none"
                            placeholder="Add any specific constraints or additional requirements..."
                            value={textPrompt}
                            onChange={(e) => setTextPrompt(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 p-6">
                <Button onClick={handleSubmit} disabled={isLoading} className={styles.buildButton} size="lg">
                  {isLoading ? (
                    <>
                      <ArrowLeft className="animate-spin h-5 w-5 mr-2" />
                      Training Model...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      {hasDataset ? 'Train Model' : 'Generate Data & Train Model'}
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <Button
                    variant="outline"
                    className="border-purple-500/50 hover:bg-purple-900/30 rounded-md backdrop-blur-sm transition-all duration-300 hover:shadow-[0_5px_15px_-5px_rgba(147,51,234,0.3)]"
                    onClick={navigateToDataAnalysis}
                  >
                    <div className="flex items-center">
                      <BarChart className="h-5 w-5 mr-2" />
                      Data Analysis
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="border-purple-500/50 hover:bg-purple-900/30 rounded-md backdrop-blur-sm transition-all duration-300 hover:shadow-[0_5px_15px_-5px_rgba(147,51,234,0.3)]"
                    onClick={navigateToChatbot}
                  >
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Chatbot
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="border-purple-500/50 hover:bg-purple-900/30 rounded-md backdrop-blur-sm transition-all duration-300 hover:shadow-[0_5px_15px_-5px_rgba(147,51,234,0.3)]"
                    onClick={navigateToGenerate}
                  >
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Alter and Expand
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="border-purple-500/50 hover:bg-purple-900/30 rounded-md backdrop-blur-sm transition-all duration-300 hover:shadow-[0_5px_15px_-5px_rgba(147,51,234,0.3)]"
                    onClick={navigateToDeploy}
                  >
                    <div className="flex items-center">
                      <Rocket className="h-5 w-5 mr-2" />
                      Deploy
                    </div>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Project Dashboard */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Main Dashboard Card */}
            <Card className={styles.dashboardCard}>
              <CardHeader
                className={styles.dashboardHeader}
                style={{ marginTop: 0, paddingTop: "1rem", paddingBottom: "1rem" }}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className={styles.dashboardTitle}>
                    <LayoutDashboard className="h-5 w-5 text-purple-400 filter drop-shadow-[0_0_5px_rgba(147,51,234,0.5)]" />
                    Project Dashboard
                  </CardTitle>
                  {downloadUrl && (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleDownload}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-md shadow-[0_5px_15px_-5px_rgba(16,185,129,0.4)] transition-all duration-300 hover:shadow-[0_8px_20px_-5px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Project
                      </Button>
                    </div>
                  )}
                </div>
                <CardDescription className={styles.dashboardDescription}>
                  {isLoading
                    ? "Processing your request..."
                    : result
                      ? result.error
                        ? "Error processing your request"
                        : "Your machine learning project is ready"
                      : "Configure your project and click 'Build ML Project' to get started"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className={styles.loadingContainer}>
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BrainCircuit className={styles.loadingIcon} />
                      </div>
                      <svg
                        className="animate-spin absolute inset-0 h-full w-full"
                        viewBox="0 0 100 100"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          className="opacity-25 stroke-purple-500"
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          strokeWidth="8"
                        />
                        <circle
                          className="opacity-75 stroke-purple-600"
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          strokeWidth="8"
                          strokeDasharray="283"
                          strokeDashoffset={283 - (progress / 100) * 283}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressText}>
                        <span>Processing...</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                      </Progress>
                    </div>
                    <div className="text-center space-y-1">
                      <p className={styles.loadingTitle}>Building Your ML Project</p>
                      <p className={styles.loadingSubtitle}>This may take a few moments</p>
                    </div>
                  </div>
                ) : result && result.error ? (
                  <ErrorMessage message={result.error} />
                ) : !result ? (
                  <div className={styles.emptyStateContainer}>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
                      className={styles.emptyStateIcon}
                    >
                      <Sparkles className="h-16 w-16 text-purple-400 filter drop-shadow-[0_0_15px_rgba(147,51,234,0.5)]" />
                    </motion.div>
                    <div>
                      <h3 className={styles.emptyStateTitle}>Ready to Build Your ML Project</h3>
                      <p className={styles.emptyStateText}>
                        Configure your project settings on the left and click "Build ML Project" to start the process.
                      </p>
                    </div>
                    <div className={styles.stepsContainer}>
                      {[
                        { icon: <Database className="h-5 w-5" />, label: "Upload Data" },
                        { icon: <Cpu className="h-5 w-5" />, label: "Configure Model" },
                        { icon: <BarChart3 className="h-5 w-5" />, label: "Visualize Results" },
                      ].map((step, i) => (
                        <motion.div
                          key={i}
                          className={styles.stepItem}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                        >
                          <div className={styles.stepIcon}>{step.icon}</div>
                          <span className={styles.stepText}>{step.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Data Preview Section - Now displayed first */}
                    {dataPreview && dataPreview.data && Array.isArray(dataPreview.data) && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className={styles.dataPreviewContainer}
                      >
                        <div className={styles.dataPreviewHeader}>
                          <h3 className={styles.dataPreviewTitle}>
                            <Table className="h-5 w-5 text-purple-400 filter drop-shadow-[0_0_5px_rgba(147,51,234,0.5)]" />
                            Data Preview
                          </h3>
                          <Button variant="outline" size="sm" className={styles.dataPreviewButton}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Full Data
                          </Button>
                        </div>
                        <div className={styles.tableContainer}>
                          <div className="inline-block min-w-full align-middle">
                            <div className="overflow-hidden border border-purple-500/50 rounded-lg shadow-inner">
                              <table className={styles.table}>
                                <thead className={styles.tableHeader}>
                                  <tr>
                                    {dataPreview.columns.map((col, i) => (
                                      <th key={i} scope="col" className={styles.tableHeaderCell}>
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className={styles.tableBody}>
                                  {dataPreview.data.map((row, i) => (
                                    <tr key={i} className={styles.tableRow}>
                                      {Array.isArray(row) ? (
                                        // Handle if row is an array
                                        row.map((cell, j) => (
                                          <td key={j} className={styles.tableCell}>
                                            {cell !== null && cell !== undefined
                                              ? String(cell).substring(0, 15)
                                              : "null"}
                                          </td>
                                        ))
                                      ) : typeof row === "object" && row !== null ? (
                                        // Handle if row is an object
                                        Object.values(row).map((cell, j) => (
                                          <td key={j} className={styles.tableCell}>
                                            {cell !== null && cell !== undefined
                                              ? String(cell).substring(0, 15)
                                              : "null"}
                                          </td>
                                        ))
                                      ) : (
                                        // Handle if row is a primitive
                                        <td className={styles.tableCell}>
                                          {row !== null && row !== undefined ? String(row).substring(0, 15) : "null"}
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Dataset Info Section */}
                    {datasetInfo && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className={styles.datasetInfoContainer}
                      >
                        <div className={styles.datasetInfoHeader}>
                          <h3 className={styles.datasetInfoTitle}>
                            <Database className="h-5 w-5 text-purple-400 filter drop-shadow-[0_0_5px_rgba(147,51,234,0.5)]" />
                            Dataset Information
                          </h3>
                        </div>
                        <div className={styles.datasetInfoContent}>
                          <ScrollArea className="h-[200px] rounded-md">
                            {typeof datasetInfo === "string" ? (
                              <pre className={styles.preText}>{datasetInfo}</pre>
                            ) : (
                              <pre className={styles.preText}>{JSON.stringify(datasetInfo, null, 2)}</pre>
                            )}
                          </ScrollArea>
                        </div>
                      </motion.div>
                    )}

                    {/* Model Information Section - Now displayed second */}
                    {modelInfo && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className={styles.modelInfoContainer}
                      >
                        <div className={styles.modelInfoHeader}>
                          <h3 className={styles.modelInfoTitle}>
                            <BrainCircuit className="h-5 w-5 text-purple-400 filter drop-shadow-[0_0_5px_rgba(147,51,234,0.5)]" />
                            Model Information
                          </h3>
                          <Badge className={taskTypeColors[taskType]}>
                            {taskTypeIcons[taskType]}
                            <span className="ml-1">{modelInfo.model_name}</span>
                          </Badge>
                        </div>
                        <div className={styles.modelInfoGrid}>
                          <div className={styles.modelInfoCard}>
                            <div className={styles.modelInfoLabel}>Performance Score</div>
                            <div className="flex items-end gap-2">
                              <span className={styles.modelInfoValue}>{modelInfo.score.toFixed(4)}</span>
                              <span className={styles.modelInfoScale}>/ 1.0</span>
                            </div>
                            <div className="mt-2">
                              <Progress value={modelInfo.score * 100} className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ width: `${modelInfo.score * 100}%` }} />
                              </Progress>
                            </div>
                          </div>
                          <div className={styles.modelInfoCard}>
                            <div className={styles.modelInfoLabel}>Task Type</div>
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-md bg-black/70 shadow-[0_0_10px_rgba(147,51,234,0.2)]">
                                {taskTypeIcons[taskType]}
                              </div>
                              <div>
                                <div className="font-medium capitalize text-purple-200">
                                  {taskType.replace("_", " ")}
                                </div>
                                <div className="text-xs text-purple-300">
                                  {taskType === "classification" && "Categorize data into classes"}
                                  {taskType === "regression" && "Predict continuous values"}
                                  {taskType === "nlp" && "Process and analyze text data"}
                                  {taskType === "image_classification" && "Classify images into categories"}
                                  {taskType === "object_detection" && "Detect objects in images"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Visualizations Section - Now displayed last */}
                    {visualizations && visualizations.plots && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className={styles.visualizationsContainer}
                      >
                        <div className={styles.visualizationsHeader}>
                          <h3 className={styles.visualizationsTitle}>
                            <BarChart3 className="h-5 w-5 text-purple-400 filter drop-shadow-[0_0_5px_rgba(147,51,234,0.5)]" />
                            Visualizations
                          </h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className={styles.dataPreviewButton}>
                                  <Info className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">
                                  These visualizations help you understand your model's performance and data patterns,
                                  generated from your actual data.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className={styles.visualizationsGrid}>
                          {visualizations.plots.map((plot, index) => (
                            <motion.div
                              key={index}
                              className={styles.plotContainer}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                            >
                              <div className={styles.plotHeader}>
                                <h4 className={styles.plotTitle}>{plot.title}</h4>
                                <Badge variant="outline" className={styles.plotBadge}>
                                  {plot.image ? "Visualization" : "Data"}
                                </Badge>
                              </div>
                              <div className={styles.plotContent}>{createPlotlyVisualization(plot, index)}</div>
                              {plot.explanation && (
                                <Accordion type="single" collapsible className="border-t border-purple-500/50">
                                  <AccordionItem value="explanation" className="border-b-0">
                                    <AccordionTrigger className={styles.explanationTrigger}>
                                      <Zap className="h-3.5 w-3.5 mr-1 filter drop-shadow-[0_0_5px_rgba(147,51,234,0.5)]" />
                                      AI Explanation
                                    </AccordionTrigger>
                                    <AccordionContent className={styles.explanationContent}>
                                      <div className={styles.explanationText}>{plot.explanation}</div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
