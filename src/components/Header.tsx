import React from 'react'

interface HeaderProps {
  title?: string;
  token?: string | null;
  onLogout?: () => void;
  onFetchAllHistory?: () => void;
  onRefresh?: () => void;
  onDisconnect?: () => void; // Keep for backward compatibility
}

const Header: React.FC<HeaderProps> = ({ 
  title = "Garden of Tasks",
  token,
  onLogout,
  onFetchAllHistory,
  onRefresh,
  onDisconnect
}) => {
  // Use onLogout if provided, otherwise fall back to onDisconnect for compatibility
  const handleDisconnect = onLogout || onDisconnect;
  
  // Check if user is logged in (either from token prop or based on disconnect function)
  const isLoggedIn = !!token || !!handleDisconnect;
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-green-600 text-2xl">🌱</span>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
        <nav className="flex items-center">
          {isLoggedIn && (
            <div className="flex mr-4 space-x-3">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="text-sm text-green-600 hover:text-green-800 flex items-center"
                >
                  <span className="mr-1">🔄</span> Refresh Recent Tasks
                </button>
              )}
              {onFetchAllHistory && (
                <button
                  onClick={onFetchAllHistory}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <span className="mr-1">📚</span> Fetch All Tasks (1 Year)
                </button>
              )}
              {handleDisconnect && (
                <button
                  onClick={handleDisconnect}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Disconnect
                </button>
              )}
            </div>
          )}
          <ul className="flex space-x-4">
            <li>
              <a href="#" className="text-gray-600 hover:text-green-600">
                About
              </a>
            </li>
            <li>
              <a href="#" className="text-gray-600 hover:text-green-600">
                Help
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header 