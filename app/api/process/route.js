import { NextResponse } from "next/server"

export async function POST(request) {
  try {
    // Get form data from the request
    const formData = await request.formData()

    // Extract data from the form
    const file = formData.get("file")
    const folderZip = formData.get("folder_zip")
    const textPrompt = formData.get("text_prompt")
    const taskType = formData.get("task_type")

    // Create a new FormData to forward to the Flask backend
    const flaskFormData = new FormData()
    if (file) flaskFormData.append("file", file)
    if (folderZip) flaskFormData.append("folder_zip", folderZip)
    flaskFormData.append("text_prompt", textPrompt)
    flaskFormData.append("task_type", taskType)

    // Forward the request to the Flask backend with a longer timeout
    const controller = new AbortController()
    const signal = controller.signal
    
    // Set timeout to 120 minutes for model training
    const timeout = setTimeout(() => controller.abort(), 120 * 60 * 1000)
    
    const flaskResponse = await fetch("http://localhost:5000/process", {
      method: "POST",
      body: flaskFormData,
      signal
    })
    
    clearTimeout(timeout)

    // Get the response from Flask
    const data = await flaskResponse.json()

    // If there's an error, return it
    if (!flaskResponse.ok || data.error) {
      console.error("Flask API error:", data.error || "Unknown error")
      return NextResponse.json({ error: data.error || "An error occurred during processing" }, { status: flaskResponse.status || 500 })
    }

    // Transform download URL to use our API
    if (data.download_url) {
      const originalUrl = data.download_url
      const filename = originalUrl.split("/").pop()
      data.download_url = `/api/download/${filename}`
    }

    // Ensure visualization data is properly structured
    if (data.visualizations && !data.visualizations.plots) {
      // If backend returns visualizations in a different format, adapt it
      console.log("Transforming visualization data structure")
      const plots = Array.isArray(data.visualizations) 
        ? data.visualizations 
        : Object.values(data.visualizations).flat()
      
      data.visualizations = { plots }
    }
    
    // Forward any detected task type information to the frontend
    if (data.detected_task_type && data.detected_task_type !== taskType) {
      console.log(`Task type was changed from ${taskType} to ${data.detected_task_type} by the backend`)
    }

    // Return the response
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in process API route:", error)
    return NextResponse.json({ 
      error: error.message || "An error occurred during processing. The request may have timed out." 
    }, { status: 500 })
  }
}