"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

const Input = ({ label, type, placeholder, value, onChange, error }) => (
    <div className="w-full">
        <label className="block text-sm font-medium text-[#9340FF] mb-1">{label}</label>
        <input
            type={type}
            className={`w-full px-3 sm:px-4 py-2 rounded border bg-black/60 text-white ${
                error ? 'border-red-500' : 'border-[#9340FF]/30'
            } focus:outline-none focus:ring-2 focus:ring-[#9340FF] focus:border-transparent text-sm sm:text-base placeholder-gray-500`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
);

const Button = ({ children, variant = "primary", onClick, type = "button", disabled = false }) => {
    const baseStyles = "w-full px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium rounded transition-colors duration-200 flex items-center justify-center";
    const variants = {
        primary: "bg-gradient-to-r from-[#9340FF] via-[#7d35d9] to-[#9340FF] text-white hover:opacity-90 disabled:opacity-70",
        google: "bg-black/40 text-white border border-[#9340FF]/30 hover:bg-[#9340FF]/20",
        admin: "bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700 text-white hover:opacity-90 disabled:opacity-70 mt-4"
    };
    
    return (
        <button 
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]}`}
        >
            {children}
        </button>
    );
};

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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

        // Create particles
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

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        }
        
        if (!formData.password) {
            newErrors.password = 'Password is required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        try {
            const result = await login(formData.email, formData.password);
            
            if (!result.success) {
                setErrors(prev => ({
                    ...prev,
                    submit: result.error || 'Login failed. Please try again.'
                }));
            }
            // If successful, AuthContext will handle the redirect
        } catch (error) {
            setErrors(prev => ({
                ...prev,
                submit: 'Login failed. Please try again.'
            }));
        }
    };

    const handleAdminLogin = () => {
        router.push('/admin/login');
    };

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
            
            <section className="flex-grow relative py-12 md:py-20 z-10">
                <div className="container mx-auto px-4 sm:px-6 relative">
                    <div className="max-w-md mx-auto">
                       
                    
                        <div className="bg-black/40 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-[#9340FF]/20 shadow-[#9340FF]/5">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                                <p className="text-gray-400">Sign in to access your FreeMindAi account</p>
                            </div>
                            
                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="your.email@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    error={errors.email}
                                />
                                
                                <Input
                                    label="Password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    error={errors.password}
                                />
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input 
                                            id="remember-me" 
                                            name="remember-me" 
                                            type="checkbox"
                                            className="h-4 w-4 text-[#9340FF] focus:ring-[#9340FF] border-gray-700 bg-black/60 rounded"
                                        />
                                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                                            Remember me
                                        </label>
                                    </div>
                                    <div className="text-sm">
                                        <a href="#" className="font-medium text-[#9340FF] hover:text-[#7d35d9]">
                                            Forgot password?
                                        </a>
                                    </div>
                                </div>

                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Signing in...' : 'Sign In'}
                                </Button>

                                {errors.submit && (
                                    <div className="p-3 bg-red-900/40 text-red-400 text-sm rounded-md border border-red-500/50">
                                        {errors.submit}
                                    </div>
                                )}
                            </form>
                            
                            <p className="mt-8 text-center text-gray-400 text-sm">
                                Don't have an account?{' '}
                                <Link href="/register" className="font-semibold text-[#9340FF] hover:text-[#7d35d9]">
                                    Create an account
                                </Link>
                            </p>
                        </div>
                        
                        <div className="mt-8 text-center">
                            <p className="text-sm text-gray-500">
                                By signing in, you agree to our{' '}
                                <a href="#" className="text-[#9340FF] hover:underline">Terms of Service</a>{' '}
                                and{' '}
                                <a href="#" className="text-[#9340FF] hover:underline">Privacy Policy</a>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

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
}