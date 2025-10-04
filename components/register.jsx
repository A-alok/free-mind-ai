"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Code, Database, Rocket, ArrowLeft } from 'lucide-react';

const Input = ({ label, type, placeholder, value, onChange, error }) => (
    <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type={type}
            className={`w-full px-3 sm:px-4 py-2 rounded border bg-white text-gray-900 ${
                error ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent text-sm sm:text-base placeholder-gray-400`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
);

const Button = ({ children, variant = "primary", onClick, type = "button", disabled = false }) => {
    const baseStyles = "w-full px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium rounded transition-all duration-300 flex items-center justify-center";
    const variants = {
        primary: "bg-gradient-to-r from-[#9340FF] via-[#7d35d9] to-[#9340FF] text-white hover:opacity-90 disabled:opacity-70 transform hover:scale-105 shadow-lg shadow-[#9340FF]/20",
        secondary: "bg-black/40 text-white border border-[#9340FF]/30 hover:bg-[#9340FF]/20 transform hover:scale-105"
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

const FeatureCard = ({ icon, title, description }) => (
    <div className="flex flex-col items-center text-center p-4 md:p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-violet-300 transition-colors">
        <div className="bg-violet-50 text-violet-600 mb-3 flex items-center justify-center rounded-full h-10 w-10">
            {icon}
        </div>
        <h3 className="text-gray-900 font-semibold text-base md:text-lg mb-1">{title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{description}</p>
    </div>
);

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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
        
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            router.push('/login');
        } catch (error) {
            setErrors(prev => ({
                ...prev,
                submit: error.message || 'Registration failed. Please try again.'
            }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white text-gray-900" ref={containerRef}>
            
            <section className="flex-grow relative py-12 z-10">
                <div className="container mx-auto px-4 sm:px-6 relative">
                   
                    {/* Local back button (no header) */}
                    <div className="max-w-5xl mx-auto">
                        <button
                            onClick={() => router.push('/')}
                            className="mb-4 inline-flex items-center gap-2 text-gray-600 hover:text-violet-700"
                            aria-label="Back to home"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            Back
                        </button>
                        <div className="grid md:grid-cols-5 gap-8">
                            {/* Left side - Benefits */}
                            <div className="md:col-span-2 bg-white backdrop-blur-md p-6 rounded-xl shadow-2xl border border-gray-200 shadow-[#9340FF]/5 hidden md:block">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">What you get</h2>
                                    <p className="text-gray-600 text-sm md:text-base">Build, analyze, and deploy ML projects — all in one place.</p>
                                </div>
                                
                                <div className="space-y-5">
                                    <FeatureCard 
                                        icon={<Code className="h-5 w-5" />}
                                        title="Projects & ML Builder"
                                        description="Create projects and auto‑train models from CSVs or images."
                                    />
                                    <FeatureCard 
                                        icon={<Database className="h-5 w-5" />}
                                        title="CSV Analysis"
                                        description="Upload CSVs and ask questions for instant insights."
                                    />
                                    <FeatureCard 
                                        icon={<Rocket className="h-5 w-5" />}
                                        title="One‑click Deploy"
                                        description="Push to GitHub and auto‑deploy to Render."
                                    />
                                </div>
                            </div>
                            
                            {/* Right side - Registration form */}
                            <div className="md:col-span-3 bg-white backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 shadow-[#9340FF]/5">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create Your Account</h2>
                                    <p className="text-gray-600">Get started with FreeMindAi</p>
                                </div>
                                
                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    <Input
                                        label="Full Name"
                                        type="text"
                                        placeholder="Your Full Name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        error={errors.name}
                                    />
                                    
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
                                        placeholder="Create a password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        error={errors.password}
                                    />
                                    
                                    <Input
                                        label="Confirm Password"
                                        type="password"
                                        placeholder="Confirm your password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                        error={errors.confirmPassword}
                                    />

                                    <div className="flex items-start mt-4">
                                        <input
                                            id="terms"
                                            name="terms"
                                            type="checkbox"
                                            className="h-4 w-4 text-violet-600 focus:ring-violet-600 border-gray-300 bg-white rounded mt-1"
                                        />
                                        <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                                            I agree to the{' '}
                                            <a href="#" className="text-[#9340FF] hover:underline">
                                                Terms of Service
                                            </a>{' '}
                                            and{' '}
                                            <a href="#" className="text-[#9340FF] hover:underline">
                                                Privacy Policy
                                            </a>
                                        </label>
                                    </div>

                                    {errors.submit && (
                                        <div className="p-3 bg-red-900/40 text-red-400 text-sm rounded-md border border-red-500/50">
                                            {errors.submit}
                                        </div>
                                    )}

                                    <div className="mt-6">
                                        <Button type="submit" disabled={isLoading}>
                                            {isLoading ? 'Creating Account...' : 'Create Account'}
                                        </Button>
                                    </div>
                                </form>
                                
                                <p className="mt-6 text-center text-sm text-gray-600">
                                    Already have an account?{' '}
                                    <Link href="/login" className="font-semibold text-violet-700 hover:text-violet-800">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
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