"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Camera, ArrowLeft, Brain } from 'lucide-react';

const ProfilePage = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user');
        const data = await response.json();

        if (!response.ok) {
          throw new Error('Not authenticated');
        }

        setUser(data.user);
        if (data.user.profilePicture) {
          setImagePreview(data.user.profilePicture);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        // Redirect to login page if not authenticated
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrameId;

    // Set canvas dimensions
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", resize);
    resize();

    // Create particles with purple theme
    const particleCount = 80;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? "rgba(147, 64, 255, 0.5)" : "rgba(255, 255, 255, 0.5)",
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      connected: [],
    }));

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();

        // Reset connections
        particle.connected = [];
      });

      // Draw connections
      particles.forEach((particle, i) => {
        particles.forEach((otherParticle, j) => {
          if (i !== j && !particle.connected.includes(j)) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 120) {
              particle.connected.push(j);
              otherParticle.connected.push(i);

              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.strokeStyle = `rgba(147, 64, 255, ${1 - distance / 120})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        });
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Parallax effect for background
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = e;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const x = (clientX / width - 0.5) * 20;
      const y = (clientY / height - 0.5) * 20;
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should not exceed 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return;
      }
      
      setError(''); // Clear previous errors
      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!profileImage) return;
    
    setUploading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('profileImage', profileImage);
      
      const response = await fetch('/api/user/update-profile-picture', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to upload image');
      }
      
      const data = await response.json();
      
      // Update user data with new profile picture
      setUser(prev => ({
        ...prev,
        profilePicture: data.profilePicture
      }));
      
      // Update cached user in localStorage for navbar
      const cachedUser = localStorage.getItem('cachedUser');
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);
        parsedUser.profilePicture = data.profilePicture;
        localStorage.setItem('cachedUser', JSON.stringify(parsedUser));
      }
      
      // Also update image preview with the Cloudinary URL
      setImagePreview(data.profilePicture);
      
      // Clear the selected file
      setProfileImage(null);
      
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      // Clear cached user from localStorage
      localStorage.removeItem('cachedUser');
      
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-black">
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9340FF]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black" ref={containerRef}>
      {/* Particle Animation Background */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
      
      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black to-black/60 z-0"
        style={{
          backgroundImage: `radial-gradient(circle at center, rgba(147,64,255,0.15) 0%, rgba(0,0,0,0) 70%)`,
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
        }}
      />
      
      <main className="flex-grow py-10 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <button 
              onClick={() => router.push('/main')}
              className="mb-6 flex items-center text-[#9340FF] hover:text-[#7d35d9] transition-colors"
            >
              <ArrowLeft size={18} className="mr-1" />
              <span>Back to Main Page</span>
            </button>
            
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#9340FF]/30 bg-[#9340FF]/10 text-[#9340FF] text-sm animate-fadeIn">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9340FF] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9340FF]"></span>
                </span>
                Member Profile
              </div>
            </div>
            
            <div className="bg-black/40 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-[#9340FF]/20 shadow-[#9340FF]/5 animate-slideUp">
              <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Brain className="text-[#9340FF]" size={24} />
                My FreeMindAi Profile
              </h1>
              
              <div className="flex flex-col md:flex-row gap-8">
                {/* Profile Picture Section */}
                <div className="flex flex-col items-center">
                  <div className="w-36 h-36 rounded-full bg-black/60 flex items-center justify-center overflow-hidden border-4 border-[#9340FF]/50 shadow-lg shadow-[#9340FF]/20">
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-20 w-20 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="mt-4 flex flex-col items-center">
                    <label htmlFor="profile-upload" className="cursor-pointer px-4 py-2 bg-gradient-to-r from-[#9340FF] via-[#7d35d9] to-[#9340FF] text-white rounded-md hover:opacity-90 flex items-center gap-2 transform hover:scale-105 transition-all duration-200 shadow-lg shadow-[#9340FF]/20">
                      <Camera size={18} />
                      <span>Change Photo</span>
                    </label>
                    <input 
                      type="file" 
                      id="profile-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageChange} 
                    />
                    
                    {profileImage && (
                      <button 
                        className="mt-2 px-4 py-2 bg-black/60 text-white rounded-md hover:bg-[#9340FF]/20 disabled:opacity-50 border border-[#9340FF]/30"
                        onClick={handleUpload}
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading...' : 'Save Photo'}
                      </button>
                    )}
                    
                    {error && (
                      <p className="mt-2 text-red-400 text-sm">{error}</p>
                    )}
                  </div>
                </div>
                
                {/* User Info Section */}
                <div className="flex-grow">
                  <div className="space-y-4">
                    <div className="bg-black/20 p-3 rounded-lg border border-[#9340FF]/10 hover:border-[#9340FF]/30 transition-all duration-300">
                      <h3 className="text-sm font-medium text-[#9340FF]">Full Name</h3>
                      <p className="text-lg font-medium text-white">{user?.name}</p>
                    </div>
                    
                    <div className="bg-black/20 p-3 rounded-lg border border-[#9340FF]/10 hover:border-[#9340FF]/30 transition-all duration-300">
                      <h3 className="text-sm font-medium text-[#9340FF]">Email Address</h3>
                      <p className="text-lg font-medium text-white">{user?.email}</p>
                    </div>
                    
                    <div className="bg-black/20 p-3 rounded-lg border border-[#9340FF]/10 hover:border-[#9340FF]/30 transition-all duration-300">
                      <h3 className="text-sm font-medium text-[#9340FF]">Member Type</h3>
                      <p className="text-lg font-medium capitalize text-white">{user?.role || 'Member'}</p>
                    </div>
                    
                    <div className="bg-black/20 p-3 rounded-lg border border-[#9340FF]/10 hover:border-[#9340FF]/30 transition-all duration-300">
                      <h3 className="text-sm font-medium text-[#9340FF]">Member Since</h3>
                      <p className="text-lg font-medium text-white">{formatDate(user?.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <button 
                      onClick={handleLogout}
                      className="px-4 py-2 bg-red-900/60 border border-red-500/40 text-white rounded-md hover:bg-red-700/40 hover:border-red-500/60 transition-all duration-300"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
        
        .animate-slideUp {
          animation: slideUp 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;