import { NextResponse } from "next/server"

export async function GET(request, { params }) {
  try {
    const { filename } = params
    
    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    // Forward the download request to the Flask backend
    const controller = new AbortController()
    const signal = controller.signal
    
    // Set timeout to 2 minutes for download
    const timeout = setTimeout(() => controller.abort(), 2 * 60 * 1000)
    
    const flaskResponse = await fetch(`http://localhost:5000/api/download/${filename}`, {
      signal
    })
    
    clearTimeout(timeout)

    if (!flaskResponse.ok) {
      console.error(`File download error: ${flaskResponse.status} ${flaskResponse.statusText}`)
      return NextResponse.json({ 
        error: `File not found or error occurred: ${flaskResponse.statusText}` 
      }, { status: flaskResponse.status })
    }

    // Get the file data as ArrayBuffer
    const fileData = await flaskResponse.arrayBuffer()
    
    if (!fileData || fileData.byteLength === 0) {
      return NextResponse.json({ error: "Empty file received from server" }, { status: 500 })
    }

    // Create a response with the file data
    const response = new NextResponse(fileData)

    // Get original content-type or default to application/zip
    const contentType = flaskResponse.headers.get("Content-Type") || "application/zip"
    
    // Set the content type and disposition headers
    response.headers.set("Content-Type", contentType)
    response.headers.set("Content-Disposition", `attachment; filename="${filename}"`)
    response.headers.set("Content-Length", fileData.byteLength.toString())

    return response
  } catch (error) {
    console.error("Error in download API route:", error)
    return NextResponse.json({ 
      error: error.message || "An error occurred during download" 
    }, { status: 500 })
  }
}