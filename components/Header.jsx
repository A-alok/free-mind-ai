"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  
  // Navigation items with their respective paths - keeping only Home, About Us, FAQ and Contact Us
  const navItems = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "FAQ", path: "/faq" },
    { name: "Contact Us", path: "/contact" },
  ]
  
  // Handle scroll effect
  useEffect(() => {
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
  
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/80 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-5">
        <div className="flex justify-between items-center h-16 relative">
          {/* Logo on left */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <img src="/images/brainwave.svg" alt="FreeMindAi" className="w-24 h-8" />
          </Link>

          {/* Desktop Navigation - centered */}
          <nav className="hidden lg:flex items-center absolute left-1/2 transform -translate-x-1/2">
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
          </nav>
          
          {/* Right aligned items */}
          <div className="flex items-center">
            {/* Login Button - Desktop only */}
            <Link href="/login" className="hidden lg:block">
              <button className="bg-[#9340FF] text-white px-4 py-2 rounded-md hover:bg-[#7d35d9] transition-colors duration-300">
                Login
              </button>
            </Link>
            
            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden text-white ml-4"
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
        </div>
        
        {/* Mobile Menu - with darker background */}
        <div 
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMobileMenuOpen ? 'max-h-96' : 'max-h-0'
          } ${isScrolled ? "bg-black/95 backdrop-blur-md" : "bg-black/90 backdrop-blur-sm"}`}
        >
          <ul className="py-4">
            {navItems.map((item) => (
              <li key={item.name} className="py-2 text-center">
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
            {/* Login Button - Mobile only (moved inside toggle menu) */}
            <li className="flex justify-center py-4">
              <Link href="/login">
                <button className="bg-[#9340FF] text-white px-4 py-2 rounded-md hover:bg-[#7d35d9] transition-colors duration-300">
                  Login
                </button>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}