"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { User, LogOut, ChevronDown, Calendar } from "lucide-react"
import { AnimatePresence, motion } from 'framer-motion'

export default function Navbar() {
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const pathname = usePathname()
  
  // Navigation items with their respective paths
  const navItems = [
    { name: "Home", path: "/main" },
    
   
  ]
  
  // Handle scroll effect
  useEffect(() => {
    // Check scroll position immediately on mount
    if (typeof window !== 'undefined') {
      setIsScrolled(window.scrollY > 10)
    }
    
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Auth check - MODIFIED to persist user data between page navigations
  useEffect(() => {
    // Retrieve cached user from localStorage first for immediate display
    const cachedUser = localStorage.getItem('cachedUser')
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser))
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to parse cached user:', error)
      }
    }
    
    // Then still verify with server
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          // Cache the user data
          localStorage.setItem('cachedUser', JSON.stringify(data.user))
        } else {
          // Clear cached user if auth check fails
          localStorage.removeItem('cachedUser')
          setUser(null)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        // Don't clear cached user on network errors to maintain UI stability
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  // Handle click outside profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  // Handle logout - MODIFIED to clear cached user
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
      // Clear cached user
      localStorage.removeItem('cachedUser')
      setUser(null)
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }
  
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/80 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-5">
        <div className="flex justify-between items-center h-16">
          <Link href="/main" className="flex items-center gap-2 text-xl font-bold">
            <img src="/images/LOGO.svg" alt="FreeMindAi" className="w-24 h-8" />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center">
            <ul className="flex gap-8">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.path}
                    className={`text-white hover:text-[#9340FF] transition-colors duration-300 relative py-1
                     after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-[#9340FF]
                     after:transition-all after:duration-300 hover:after:w-full ${
                       pathname === item.path ? "text-[#9340FF] after:w-full" : ""
                     }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* User Profile Section (Desktop) - MODIFIED to always show when user exists */}
            {user && (
              <div className="relative ml-8" ref={profileMenuRef}>
                <button 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 text-white hover:text-[#9340FF] focus:outline-none"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-[#9340FF] overflow-hidden flex items-center justify-center">
                    {user.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={20} className="text-gray-300" />
                    )}
                  </div>
                  <span className="font-medium">{user.name?.split(' ')[0]}</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isProfileMenuOpen && (
                  <motion.div 
                    className="absolute right-0 mt-2 w-48 bg-gray-900/90 backdrop-blur-md rounded-lg shadow-xl py-2 z-10 border border-gray-700"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 py-2 border-b border-gray-700">
                      <p className="text-sm font-medium text-white truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    
                    <Link href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#9340FF]/20 hover:text-[#9340FF]">
                      <User size={16} className="mr-2" />
                      <span>My Profile</span>
                    </Link>
                    
                    <Link href="/registered-events" className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#9340FF]/20 hover:text-[#9340FF]">
                      <Calendar size={16} className="mr-2" />
                      <span>Registered Events</span>
                    </Link>
                    
                    <button 
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-red-900/20 hover:text-red-400"
                    >
                      <LogOut size={16} className="mr-2" />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </div>
            )}
            
            {/* Login button - MODIFIED to show only when user definitely doesn't exist */}
            {!isLoading && !user && (
              <div className="ml-8">
                <Link href="/login" className="text-white hover:text-[#9340FF] px-4 py-2 rounded-md border border-[#9340FF] hover:bg-[#9340FF]/10 transition-all">
                  Login
                </Link>
              </div>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <div className="space-y-2">
              <span className={`block w-8 h-0.5 bg-[#9340FF] transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2.5' : ''}`}></span>
              <span className={`block w-8 h-0.5 bg-[#9340FF] transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
              <span className={`block w-8 h-0.5 bg-[#9340FF] transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
            </div>
          </button>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 top-16 z-40 bg-black bg-opacity-95 backdrop-blur-md lg:hidden overflow-y-auto">
            <div className="container mx-auto px-5 py-6">
              <ul className="flex flex-col">
                {navItems.map((item) => (
                  <li key={item.name} className="py-3 border-b border-gray-800">
                    <Link
                      href={item.path}
                      className={`text-white text-lg font-medium hover:text-[#9340FF] block py-1 ${
                        pathname === item.path ? "text-[#9340FF]" : ""
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* User Profile Section (Mobile) - MODIFIED to match desktop changes */}
              {user && (
                <div className="mt-6 pt-4 pb-2 border-t border-gray-800">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-[#9340FF] overflow-hidden flex items-center justify-center">
                      {user.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={user.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-gray-300" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  
                  <Link 
                    href="/profile" 
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-md text-center transition-all duration-300 font-medium mb-3 flex items-center justify-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User size={16} className="mr-2" />
                    My Profile
                  </Link>
                  
                  <Link 
                    href="/registered-events" 
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-md text-center transition-all duration-300 font-medium mb-3 flex items-center justify-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Calendar size={16} className="mr-2" />
                    Registered Events
                  </Link>
                  
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full bg-red-900/40 hover:bg-red-900/60 text-white px-4 py-3 rounded-md text-center transition-all duration-300 font-medium flex items-center justify-center"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              )}

              {!isLoading && !user && (
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <Link 
                    href="/login" 
                    className="w-full bg-[#9340FF]/20 hover:bg-[#9340FF]/40 text-white border border-[#9340FF] px-4 py-3 rounded-md text-center transition-all duration-300 font-medium block"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}