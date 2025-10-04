import { NextResponse } from "next/server"
import zipCacheService from '../../../../lib/zipCacheService.js'

export async function GET(request, { params }) {
  try {
    const { filename } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') // Optional user ID for tracking
    
    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    console.log('🔍 Download request for:', filename)

    // Step 1: Check if file is already cached in Cloudinary
    const cacheResult = await zipCacheService.getZip(filename, userId)
    
    if (cacheResult.source === 'cache' && cacheResult.url) {
      // File is cached - redirect to Cloudinary URL
      console.log('⚡ Redirecting to cached file:', cacheResult.url)
      return NextResponse.redirect(cacheResult.url)
    }

    // Step 2: File not cached - fetch from Flask backend
    console.log('🔄 Fetching from Flask backend:', filename)
    
    const controller = new AbortController()
    const signal = controller.signal
    
    // Set timeout to 2 minutes for download
    const timeout = setTimeout(() => controller.abort(), 2 * 60 * 1000)
    
    let flaskResponse
    let fileData
    
    try {
      flaskResponse = await fetch(`http://127.0.0.1:5000/api/download/${filename}`, {
        signal
      })
      
      clearTimeout(timeout)

      if (!flaskResponse.ok) {
        console.error(`Flask download error: ${flaskResponse.status} ${flaskResponse.statusText}`)
        return NextResponse.json({ 
          error: `File not found or error occurred: ${flaskResponse.statusText}` 
        }, { status: flaskResponse.status })
      }

      // Get the file data as ArrayBuffer
      fileData = await flaskResponse.arrayBuffer()
      
      if (!fileData || fileData.byteLength === 0) {
        return NextResponse.json({ error: "Empty file received from server" }, { status: 500 })
      }

    } catch (fetchError) {
      clearTimeout(timeout)
      console.error('Error fetching from Flask:', fetchError)
      return NextResponse.json({ 
        error: fetchError.message || "Failed to fetch file from backend" 
      }, { status: 500 })
    }

    // Step 3: Cache the file in background (don't wait for it)
    const zipBuffer = Buffer.from(fileData)
    
    // Cache asynchronously - don't block the response
    zipCacheService.cacheFlaskZip(zipBuffer, filename, userId, {
      projectDescription: `Flask generated project: ${filename}`,
      techStack: [], // Will be detected if possible
      tags: ['flask-backend', 'auto-cached'],
      expirationDays: 30
    }).then(cacheResult => {
      if (cacheResult.success) {
        console.log('✅ Successfully cached Flask zip:', filename)
      } else {
        console.error('⚠️ Failed to cache Flask zip:', filename, cacheResult.error)
      }
    }).catch(error => {
      console.error('⚠️ Error caching Flask zip:', filename, error.message)
    })

    // Step 4: Serve the file immediately while caching happens in background
    const response = new NextResponse(fileData)

    // Get original content-type or default to application/zip
    const contentType = flaskResponse.headers.get("Content-Type") || "application/zip"
    
    // Set the content type and disposition headers
    response.headers.set("Content-Type", contentType)
    response.headers.set("Content-Disposition", `attachment; filename="${filename}"`)
    response.headers.set("Content-Length", fileData.byteLength.toString())
    response.headers.set("X-Cache-Status", "MISS")
    response.headers.set("X-Source", "flask-backend")

    console.log('📦 Serving file from Flask (caching in background):', filename)
    return response
    
  } catch (error) {
    console.error("Error in download API route:", error)
    return NextResponse.json({ 
      error: error.message || "An error occurred during download" 
    }, { status: 500 })
  }
}
