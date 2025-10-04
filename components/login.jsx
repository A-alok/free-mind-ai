"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';

const Input = ({ label, type, placeholder, value, onChange, error }) => (
    <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <input
            type={type}
            className={`w-full px-4 py-3 rounded-lg border bg-white text-gray-900 ${
                error ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent text-sm sm:text-base placeholder-gray-400 transition-all`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
);

const Button = ({ children, variant = "primary", onClick, type = "button", disabled = false }) => {
    const baseStyles = "w-full px-6 py-3 text-base font-semibold rounded-lg transition-all duration-200 flex items-center justify-center";
    const variants = {
        primary: "bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-70 shadow-lg hover:shadow-violet-600/30",
        google: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
        admin: "bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-70 mt-4 shadow-lg"
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
        const particleCount = 50;
        const particles = Array.from({ length: particleCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 3 + 1,
            color: "rgba(79, 70, 229, 0.6)",
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
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

                        if (distance < 100) {
                            particle.connected.push(j);
                            otherParticle.connected.push(i);

                            ctx.beginPath();
                            ctx.moveTo(particle.x, particle.y);
                            ctx.lineTo(otherParticle.x, otherParticle.y);
                            ctx.strokeStyle = `rgba(79, 70, 229, ${0.3 - distance / 400})`;
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
        <div className="min-h-screen bg-white" ref={containerRef}>
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                {/* Animated gradient background */}
                <div 
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: `radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(79, 70, 229, 0.1) 0%, transparent 50%)`,
                    }}
                />
                
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(79, 70, 229, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(79, 70, 229, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px',
                    }}
                />
                
                {/* Floating particles */}
                <canvas ref={canvasRef} className="absolute inset-0 opacity-20" />
            </div>
            
            {/* Header */}
            <motion.header 
                className="relative z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
            >
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <nav className="flex justify-between items-center">
                        <Link href="/" className="flex items-center space-x-3">
                            <Image 
                                src="/images/freemindlogo.png" 
                                alt="FreeMindAi Logo" 
                                width={32} 
                                height={32}
                                className="object-contain"
                            />
                            <span className="text-xl font-bold text-gray-900">FreeMindAi</span>
                        </Link>
                        
                        <div className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link href="/register" className="font-semibold text-violet-600 hover:text-violet-700">
                                Sign up
                            </Link>
                        </div>
                    </nav>
                </div>
            </motion.header>
            
            <div className="relative z-10 flex flex-col justify-center min-h-screen py-12 sm:px-6 lg:px-8">
                <motion.div 
                    className="sm:mx-auto sm:w-full sm:max-w-md"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-bold text-gray-900 mb-2">Welcome back</h2>
                        <p className="text-lg text-gray-600">Sign in to your FreeMindAi account</p>
                    </div>
                </motion.div>

                <motion.div 
                    className="sm:mx-auto sm:w-full sm:max-w-md"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                >
                    <div className="bg-white py-8 px-8 shadow-xl rounded-2xl border border-gray-200 sm:px-10">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                error={errors.email}
                            />
                            
                            <Input
                                label="Password"
                                type="password"
                                placeholder="Enter your password"
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
                                        className="h-4 w-4 text-violet-600 focus:ring-violet-600 border-gray-300 rounded"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                        Remember me
                                    </label>
                                </div>
                                <div className="text-sm">
                                    <a href="#" className="font-medium text-violet-600 hover:text-violet-700">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Signing in...' : 'Sign In'}
                                </Button>
                            </motion.div>

                            {errors.submit && (
                                <motion.div 
                                    className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {errors.submit}
                                </motion.div>
                            )}
                        </form>
                        
                        <div className="mt-8">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button variant="google">
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                        Continue with Google
                                    </Button>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                    
                    <motion.div 
                        className="mt-8 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                    >
                        <p className="text-sm text-gray-500">
                            By signing in, you agree to our{' '}
                            <a href="#" className="text-violet-600 hover:text-violet-700 hover:underline">Terms of Service</a>{' '}
                            and{' '}
                            <a href="#" className="text-violet-600 hover:text-violet-700 hover:underline">Privacy Policy</a>
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}