'use client'

import { useState } from 'react'

type Category = 'lecture' | 'meditation' | 'video' | 'show'

interface Video {
  title: string
  link: string
  thumbnail: string
  duration?: string
}

interface CategorizedVideo extends Video {
  category: Category
}

export default function VideoSelector() {
  const [inputArray, setInputArray] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [categories, setCategories] = useState<Map<number, Category>>(new Map())
  const [error, setError] = useState('')
  const [showOutput, setShowOutput] = useState(false)

  const parseDuration = (duration: string | undefined): number => {
    if (!duration || duration === 'UPCOMING') return -1
    const parts = duration.split(':').map(p => parseInt(p))
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
    return parts[0] || 0
  }

  const loadVideos = () => {
    const input = inputArray.trim()
    
    if (!input) {
      setError('Please paste your video array first')
      return
    }

    try {
      const parsed = JSON.parse(input)
      
      if (!Array.isArray(parsed)) {
        throw new Error('Input must be an array')
      }
      
      if (parsed.length === 0) {
        throw new Error('Array is empty')
      }
      
      const isValid = parsed.every((v: any) => 
        v.title && v.link && v.thumbnail
      )
      
      if (!isValid) {
        throw new Error('Each video must have title, link, and thumbnail properties')
      }

      setVideos(parsed)
      
      // Pre-select videos (exclude shorts < 1 min) and pre-categorize
      const newSelected = new Set<number>()
      const newCategories = new Map<number, Category>()
      
      parsed.forEach((video: Video, index: number) => {
        const seconds = parseDuration(video.duration)
        const titleLower = video.title.toLowerCase()
        
        // Pre-categorize based on title or default to lecture
        let category: Category = 'lecture'
        if (titleLower.includes('nidra') || titleLower.includes('meditation')) {
          category = 'meditation'
        }
        newCategories.set(index, category)
        
        // Pre-select based on duration (exclude shorts < 1 min and UPCOMING)
        if (video.duration !== 'UPCOMING' && seconds >= 60) {
          newSelected.add(index)
        }
      })
      
      setSelectedIndices(newSelected)
      setCategories(newCategories)
      setError('')
      
    } catch (e) {
      setError('Invalid JSON: ' + (e as Error).message)
    }
  }

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIndices(newSelected)
  }

  const selectAll = () => {
    setSelectedIndices(new Set(videos.map((_, i) => i)))
  }

  const deselectAll = () => {
    setSelectedIndices(new Set())
  }

  const getSelected = () => {
    const selected = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(index => videos[index])
    setShowOutput(true)
    return selected
  }

  const copyToClipboard = () => {
    const selected = getSelected()
    navigator.clipboard.writeText(JSON.stringify(selected, null, 2))
  }

  const clearInput = () => {
    setInputArray('')
    setVideos([])
    setSelectedIndices(new Set())
    setCategories(new Map())
    setError('')
    setShowOutput(false)
  }

  const setVideoCategory = (index: number, category: Category) => {
    const newCategories = new Map(categories)
    newCategories.set(index, category)
    setCategories(newCategories)
  }

  const getVideoId = (video: Video) => {
    let videoId = ''
    if (video.thumbnail.includes('ytimg.com')) {
      const match = video.thumbnail.match(/\/vi\/([^\/]+)\//)
      if (match) videoId = match[1]
    } else if (video.link) {
      const match = video.link.match(/[?&]v=([^&]+)/)
      if (match) videoId = match[1]
    }
    return videoId
  }

  const categoryOrder: Category[] = ['lecture', 'meditation', 'video', 'show']
  
  const selectedVideos = Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map(index => ({
      ...videos[index],
      category: categories.get(index) || 'lecture'
    } as CategorizedVideo))
    .sort((a, b) => {
      const aOrder = categoryOrder.indexOf(a.category)
      const bOrder = categoryOrder.indexOf(b.category)
      return aOrder - bOrder
    })

  return (
    <div className="bg-gray-50 p-6 h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">
          🎬 Video Selector
        </h1>
        
        {/* Input Section */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Paste your video array here:</h2>
          <textarea
            value={inputArray}
            onChange={(e) => setInputArray(e.target.value)}
            className="w-full min-h-[150px] p-3 bg-gray-50 text-gray-800 font-mono text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
            placeholder='[{"title": "...", "link": "...", "thumbnail": "..."}, ...]'
          />
          <div className="flex gap-3 mt-4 flex-wrap">
            <button
              onClick={loadVideos}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors"
            >
              Load Videos
            </button>
            <button
              onClick={clearInput}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded transition-colors"
            >
              Clear Input
            </button>
          </div>
          {error && (
            <div className="mt-3 text-red-600 font-semibold">{error}</div>
          )}
        </div>

        {/* Video Section */}
        {videos.length > 0 && (
          <div className="mb-8">
            <div className="bg-white shadow-md rounded-lg p-4 mb-6 text-center">
              <span className="text-gray-700 text-lg">
                Selected: <span className="text-2xl font-bold text-blue-600">{selectedIndices.size}</span> / <span className="text-2xl font-bold text-gray-600">{videos.length}</span>
              </span>
            </div>
            
            <div className="flex gap-3 mb-6 flex-wrap justify-center">
              <button
                onClick={selectAll}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded transition-colors"
              >
                Deselect All
              </button>
              <button
                onClick={() => setShowOutput(true)}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-colors"
              >
                Get Selected Array
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video, index) => {
                const videoId = getVideoId(video)
                const simpleThumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : video.thumbnail
                const isSelected = selectedIndices.has(index)
                
                return (
                  <div
                    key={index}
                    className={`bg-white border-2 rounded-lg overflow-hidden transition-all hover:shadow-lg ${
                      isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                    } relative`}
                  >
                    {/* Category selector in top right */}
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                      <div className="bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full flex">
                        {(['lecture', 'meditation', 'video', 'show'] as const).map((cat) => {
                          const letters = { lecture: 'L', meditation: 'M', video: 'V', show: 'S' }
                          const currentCategory = categories.get(index) || 'lecture'
                          return (
                            <button
                              key={cat}
                              onClick={(e) => {
                                e.stopPropagation()
                                setVideoCategory(index, cat)
                              }}
                              className={`px-2 py-1 text-xs font-bold transition-colors first:rounded-l-full last:rounded-r-full ${
                                currentCategory === cat
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {letters[cat]}
                            </button>
                          )
                        })}
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    <div 
                      onClick={() => toggleSelection(index)}
                      className="cursor-pointer"
                    >
                      <div className="relative pb-[56.25%] bg-gray-100">
                        <img
                          src={simpleThumbnail}
                          alt={video.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.onerror = null
                            target.src = video.thumbnail
                          }}
                        />
                        {video.duration && (
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                            {video.duration}
                          </div>
                        )}
                      </div>
                      <div className="p-3 min-h-[60px] flex items-center">
                        <a 
                          href={video.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-gray-700 line-clamp-2 font-medium hover:text-blue-600 hover:underline"
                        >
                          {video.title}
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Output Section */}
        {showOutput && selectedVideos.length > 0 && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Selected Videos Array:</h2>
            <textarea
              readOnly
              value={JSON.stringify(selectedVideos, null, 2)}
              className="w-full min-h-[200px] p-3 bg-gray-50 text-gray-800 font-mono text-sm border border-gray-300 rounded"
            />
            <div className="flex gap-3 mt-4 flex-wrap">
              <button
                onClick={copyToClipboard}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowOutput(false)}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded transition-colors"
              >
                Hide Output
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}