import React, { useState, useEffect, useRef } from 'react'
import tokenStorage from '../services/tokenStorage'

interface AsanaConnectProps {
  onConnect: (token: string) => void
}

const AsanaConnect: React.FC<AsanaConnectProps> = ({ onConnect }) => {
  const [token, setToken] = useState('')
  const [_, setIsLoaded] = useState(false)
  const [hasSavedToken, setHasSavedToken] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check for saved token on component mount
  useEffect(() => {
    // Check for a saved token in localStorage
    const savedToken = tokenStorage.getToken()
    console.log("🔑 Checking for saved token on mount:", savedToken ? "Found" : "None")
    
    if (savedToken) {
      setToken(savedToken)
      setHasSavedToken(true)
      
      // Auto-connect if token is present
      setTimeout(() => {
        console.log("🔄 Auto-connecting with saved token")
        onConnect(savedToken)
      }, 100)
    } else {
      console.log("No saved token found, staying on login screen")
    }
    
    setIsLoaded(true)
    
    // Focus on the input if no token exists
    setTimeout(() => {
      if (!savedToken && inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
  }, [])

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value
    console.log("Token changed to:", newToken ? "New value" : "Empty")
    setToken(newToken)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleConnect()
  }

  const handleConnect = () => {
    // Always allow connection even with empty token for demo
    const tokenToUse = token.trim() || 'demo'
    console.log("Connecting with token:", tokenToUse === 'demo' ? 'Demo mode' : 'User token')
    
    // Save token if it's not empty or demo
    if (tokenToUse !== 'demo') {
      tokenStorage.saveToken(tokenToUse)
      setHasSavedToken(true)
    }
    
    onConnect(tokenToUse)
  }

  const handleDemoConnect = () => {
    console.log("Connecting with demo token")
    onConnect('demo')
  }

  const handleClearToken = () => {
    console.log("Clearing token")
    tokenStorage.clearToken()
    setToken('')
    setHasSavedToken(false)
    
    // Force focus on the input after clearing
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }
  
  const handleForceReset = () => {
    console.log("Force resetting component state")
    setToken('')
    setHasSavedToken(false)
    tokenStorage.clearToken()
    
    // Force focus on the input after resetting
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Connect to Asana</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your Asana Personal Access Token to start growing your garden of completed tasks.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700">
            Personal Access Token
          </label>
          <div className="mt-1">
            <input
              ref={inputRef}
              type="text"
              id="token"
              value={token}
              onChange={handleTokenChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
              placeholder="Enter your Asana token"
              autoComplete="off"
            />
          </div>
          {hasSavedToken && (
            <div className="mt-1 text-xs text-green-600 flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Token saved in browser
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            You can find your Personal Access Token in Asana under My Profile Settings → Apps → Manage Developer Apps → Create New Access Token
          </p>
        </div>

        <div className="flex flex-col space-y-2">
          <button
            type="submit"
            className="w-full rounded-md py-2 px-4 text-sm font-medium text-white shadow-sm bg-green-600 hover:bg-green-700"
          >
            Connect with Token
          </button>
          
          <button
            type="button"
            onClick={handleDemoConnect}
            className="w-full rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Demo: Connect with Example Data
          </button>
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleClearToken}
              className="flex-1 rounded-md border border-red-300 bg-white py-2 px-4 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
            >
              Clear Token
            </button>
            
            <button
              type="button"
              onClick={handleForceReset}
              className="flex-1 rounded-md border border-blue-300 bg-white py-2 px-4 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50"
            >
              Force Reset
            </button>
          </div>
        </div>
      </form>

      <div className="mt-4 px-4 py-3 bg-blue-50 rounded text-blue-800 text-sm">
        <h3 className="font-medium">Troubleshooting Connection Issues:</h3>
        <ul className="mt-1 list-disc list-inside">
          <li>Make sure you've copied the entire token</li>
          <li>Tokens start with <code className="bg-blue-100 px-1 rounded">1/</code> followed by numbers</li>
          <li>Check your internet connection</li>
          <li>Create a new token if yours has expired</li>
        </ul>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-700">What is Garden of Tasks?</h3>
        <p className="mt-2 text-xs text-gray-500">
          Garden of Tasks is a visualization tool that turns your completed Asana tasks into a beautiful garden. 
          Each plant represents a task you've completed, growing over time to create a visual representation of your productivity.
        </p>
      </div>
    </div>
  )
}

export default AsanaConnect 