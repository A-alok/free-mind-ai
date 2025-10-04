"use client";
import React, { useRef, useEffect, useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

// Professional SVG Icons

const ShieldIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

// Professional Data Import Icon
const DataImportIcon = () => (
  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
    <path d="M12,12L16,16H13.5V19H10.5V16H8L12,12Z" fill="white" />
  </svg>
);

// Professional Brain Icon
const BrainIcon = () => (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

// Professional Rocket Icon
const RocketIcon = () => (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// Floating particles component
const FloatingParticles = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      speed: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-violet-600"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.sin(particle.id) * 20, 0],
          }}
          transition={{
            duration: particle.speed * 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

// Neural network visualization
const NeuralNetwork = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrame;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const nodes = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 3 + 1,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw nodes
      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;
        
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
        
        // Draw connections
        nodes.slice(i + 1).forEach((otherNode) => {
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            ctx.strokeStyle = `rgba(79, 70, 229, ${0.3 - distance / 500})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        });
        
        // Draw node
        ctx.fillStyle = 'rgba(79, 70, 229, 0.8)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 opacity-20"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

const ModernHome = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 100]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.8]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled(scrolled);
    };

    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const features = [
    {
      icon: <RocketIcon />,
      title: "Lightning Fast Development",
      description: "Build and deploy ML models in minutes, not months, with our intuitive drag-and-drop interface."
    },
    {
      icon: <BrainIcon />,
      title: "No Code Required",
      description: "Create sophisticated machine learning solutions without writing a single line of code."
    },
    {
      icon: <ShieldIcon />,
      title: "Enterprise Security",
      description: "Bank-grade security with end-to-end encryption and compliance standards."
    },
    {
      icon: <GlobeIcon />,
      title: "Global Deployment",
      description: "Deploy your models worldwide with our distributed cloud infrastructure."
    }
  ];

  const howItWorks = [
    {
      title: "Import Your Data",
      description: "Upload your dataset from various sources including CSV, databases, or APIs.",
      icon: <DataImportIcon />
    },
    {
      title: "Design Your Model",
      description: "Use our visual builder to create custom ML pipelines without coding.",
      icon: <BrainIcon />
    },
    {
      title: "Deploy & Scale",
      description: "Launch your model with one click and scale automatically based on demand.",
      icon: <RocketIcon />
    }
  ];

  const useCases = [
    {
      title: "Predictive Analytics",
      description: "Forecast business trends and customer behavior",
      bgColor: "bg-violet-600"
    },
    {
      title: "Image Recognition",
      description: "Classify and analyze visual content automatically",
      bgColor: "bg-violet-500"
    },
    {
      title: "Natural Language Processing",
      description: "Process and understand text data at scale",
      bgColor: "bg-violet-700"
    },
    {
      title: "Recommendation Systems",
      description: "Personalize user experiences with smart recommendations",
      bgColor: "bg-violet-800"
    }
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
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
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(79, 70, 229, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(79, 70, 229, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        
        <FloatingParticles />
        <NeuralNetwork />
      </div>

      {/* Header */}
      <motion.header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/98 backdrop-blur-lg border-b border-gray-200 shadow-lg py-3' 
            : 'bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm py-4'
        }`}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex justify-between items-center">
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.02 }}
            >
              <Image 
                src="/images/freemindlogo.png" 
                alt="FreeMindAi Logo" 
                width={40} 
                height={40}
                className="object-contain"
              />
              <span className="text-2xl font-bold text-gray-900">FreeMindAi</span>
            </motion.div>
            
            <div className="hidden md:flex items-center space-x-8">
              {['Features', 'How It Works', 'Use Cases', 'FAQ', 'Contact'].map((item) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase().replace(' ', '-')}`}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors relative group"
                  whileHover={{ y: -1 }}
                >
                  {item}
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-violet-600 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
                </motion.a>
              ))}
            </div>
            
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
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
            </motion.div>
          </nav>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        className="relative z-10 pt-32 pb-24 px-6"
        style={{ y, opacity }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 1.2, 
              delay: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 1.0, 
                delay: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <motion.span 
                className="text-violet-600 inline-block"
                initial={{ opacity: 0, rotateX: 90 }}
                animate={{ opacity: 1, rotateX: 0 }}
                transition={{ 
                  duration: 0.8, 
                  delay: 0.7,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
              >
                Future Of No Code
              </motion.span>
              <br />
              <motion.span 
                className="text-gray-900 inline-block"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 0.8, 
                  delay: 0.9,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
              >
                Machine Learning
              </motion.span>
            </motion.h1>
            
            <motion.p
              className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.8, 
                delay: 1.1,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              Transform your data into intelligent insights without coding. Build, train, and deploy 
              machine learning models using our intuitive visual platform designed for everyone.
            </motion.p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.8, 
              delay: 1.3,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.6, 
                delay: 1.5,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(79, 70, 229, 0.3)"
              }} 
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/main"
                className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-violet-600/30 group inline-block"
              >
                Start Building
                <motion.span 
                  className="ml-2 inline-block"
                  initial={{ x: 0 }}
                  animate={{ x: [0, 5, 0] }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  →
                </motion.span>
              </Link>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.6, 
                delay: 1.7,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              whileHover={{ 
                scale: 1.05,
                borderColor: "rgba(79, 70, 229, 1)"
              }} 
              whileTap={{ scale: 0.95 }}
            >
              <a
                href="#features"
                className="border-2 border-gray-300 hover:border-violet-600 text-gray-700 hover:text-violet-600 px-8 py-4 rounded-full text-lg font-semibold transition-all inline-block"
              >
                Watch Demo
              </a>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose <span className="text-violet-600">FreeMindAi</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the power of machine learning without the complexity. Our platform makes AI accessible to everyone.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl hover:border-violet-200 transition-all group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <div className="text-violet-600 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How It <span className="text-violet-600">Works</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started with machine learning in three simple steps. No technical expertise required.
            </p>
          </motion.div>

          <div className="relative max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-12 md:space-y-0 md:space-x-8">
              {howItWorks.map((step, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center text-center relative"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  {/* Icon Circle */}
                  <div className="relative mb-8">
                    <div className="w-28 h-28 bg-gradient-to-br from-violet-500 to-violet-700 rounded-full flex items-center justify-center text-white mx-auto shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border-4 border-white">
                      <div className="text-white">
                        {step.icon}
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="max-w-xs">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Background decoration */}
            <div className="absolute inset-0 -z-10 opacity-5">
              <div className="w-full h-full bg-gradient-to-r from-violet-100 via-transparent to-violet-100 rounded-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="relative z-10 py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Endless <span className="text-violet-600">Possibilities</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover how businesses across industries are leveraging FreeMindAi to drive innovation and growth.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                className={`${useCase.bgColor} rounded-2xl p-8 text-white hover:scale-105 transition-all cursor-pointer`}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <h3 className="text-xl font-bold mb-3">{useCase.title}</h3>
                <p className="text-white/90 leading-relaxed">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className="bg-white rounded-3xl p-12 shadow-2xl border border-gray-200"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses already using FreeMindAi to unlock the power of artificial intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/register"
                  className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-violet-600/30"
                >
                  Start Free Trial
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <a
                  href="#contact"
                  className="border-2 border-gray-300 hover:border-violet-600 text-gray-700 hover:text-violet-600 px-10 py-4 rounded-full text-lg font-semibold transition-all"
                >
                  Contact Sales
                </a>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Frequently Asked <span className="text-violet-600">Questions</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to know about FreeMindAi.
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                question: "What is FreeMindAi and how does it work?",
                answer: "FreeMindAi is a no-code machine learning platform that allows anyone to build, train, and deploy AI models without programming knowledge. Simply upload your data, choose from our pre-built templates, and let our visual interface guide you through the process."
              },
              {
                question: "Do I need any technical background to use FreeMindAi?",
                answer: "Not at all! FreeMindAi is designed for everyone, regardless of technical expertise. Our intuitive drag-and-drop interface, guided workflows, and comprehensive tutorials make machine learning accessible to business users, analysts, and domain experts."
              },
              {
                question: "What types of machine learning models can I build?",
                answer: "You can create a wide range of models including predictive analytics, image recognition, natural language processing, recommendation systems, anomaly detection, and more. Our platform supports both supervised and unsupervised learning approaches."
              },
              {
                question: "How secure is my data on FreeMindAi?",
                answer: "Security is our top priority. We use enterprise-grade encryption, comply with major data protection regulations (GDPR, CCPA), and offer on-premise deployment options. Your data never leaves your control, and all models are trained in secure, isolated environments."
              },
              {
                question: "Can I integrate FreeMindAi with my existing systems?",
                answer: "Absolutely! FreeMindAi offers robust APIs, webhooks, and integrations with popular tools like Salesforce, HubSpot, Slack, and more. You can easily embed AI capabilities into your existing workflows and applications."
              },
              {
                question: "What kind of support do you provide?",
                answer: "We offer comprehensive support including 24/7 technical assistance, dedicated customer success managers for enterprise clients, extensive documentation, video tutorials, and a vibrant community forum where users share best practices."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">{faq.question}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative z-10 py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Get In <span className="text-violet-600">Touch</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ready to transform your business with AI?
              <br />
              Contact our team of experts to get started.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Let's Connect</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-violet-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Email Us</h4>
                      <p className="text-gray-600">hello@freemindai.com</p>
                      <p className="text-gray-600">support@freemindai.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-violet-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Call Us</h4>
                      <p className="text-gray-600">+1 (555) 123-4567</p>
                      <p className="text-gray-600">Monday - Friday, 9AM - 6PM EST</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-violet-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Visit Us</h4>
                      <p className="text-gray-600">123 Innovation Drive</p>
                      <p className="text-gray-600">Tech Valley, CA 94301</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h3>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
                    placeholder="john@company.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
                    placeholder="Your Company"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all resize-none"
                    placeholder="Tell us about your project and how we can help..."
                  ></textarea>
                </div>
                
                <motion.button
                  type="submit"
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-violet-600/30"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Send Message
                </motion.button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-16 px-6 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Image 
                  src="/images/freemindlogo.png" 
                  alt="FreeMindAi Logo" 
                  width={32} 
                  height={32}
                  className="object-contain"
                />
                <span className="text-xl font-bold">FreeMindAi</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Democratizing machine learning for businesses of all sizes.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              © 2024 FreeMindAi. All rights reserved.
            </p>
            <div className="flex space-x-6 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ModernHome;