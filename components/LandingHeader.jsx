"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function LandingHeader({ mode = "full" }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Clear any cached user used elsewhere
      try { localStorage.removeItem("cachedUser"); } catch (e) {}
      router.push("/");
    } catch (e) {
      router.push("/");
    }
  };

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/98 backdrop-blur-lg border-b border-gray-200 shadow-lg py-3"
          : "bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm py-4"
      }`}
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex justify-between items-center">
          {/* Left section */}
          <motion.div className="flex items-center space-x-3" whileHover={{ scale: 1.02 }}>
            {mode === "back" ? (
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 text-gray-700 hover:text-violet-700"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            ) : (
              <>
                <Image
                  src="/images/freemindlogo.png"
                  alt="FreeMindAi Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
                <span className="text-2xl font-bold text-gray-900">FreeMindAi</span>
              </>
            )}
          </motion.div>

          {/* Center nav (hidden for minimal modes) */}
          {mode === "full" && (
            <div className="hidden md:flex items-center space-x-8">
              {["Features", "How It Works", "Use Cases", "FAQ", "Contact"].map((item) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors relative group"
                  whileHover={{ y: -1 }}
                >
                  {item}
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-violet-600 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
                </motion.a>
              ))}
            </div>
          )}

          {/* Right actions */}
          <motion.div className="flex items-center space-x-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {mode === "logout" && (
              <button
                onClick={handleLogout}
                className="rounded-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm shadow"
              >
                Logout
              </button>
            )}

            {mode === "back" && <div className="w-10" />}

            {mode === "full" && (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  Sign In
                </Link>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/register"
                    className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-lg hover:shadow-violet-600/25"
                  >
                    Get Started
                  </Link>
                </motion.div>
              </>
            )}
          </motion.div>
        </nav>
      </div>
    </motion.header>
  );
}
