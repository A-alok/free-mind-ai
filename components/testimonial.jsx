"use client";
import React, { useState, useEffect } from 'react';
import { Quote, Star } from 'lucide-react';

const AnimatedTestimonials = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials = [
    {
      name: "Dr. Alex Chen",
      role: "Data Science Director",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
      quote: "This ML System revolutionized how we deploy models in production. The platform's intuitive design and powerful features helped us reduce deployment time by 85%.",
      rating: 5,
      company: "QuantumAI Labs"
    },
    {
      name: "Michael Zhang",
      role: "ML Operations Lead",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
      quote: "The analytics capabilities are outstanding. We can now monitor model drift and performance metrics that have dramatically improved our prediction accuracy.",
      rating: 5,
      company: "TechVision AI"
    },
    {
      name: "Dr. Emma Roberts",
      role: "Research Director",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80",
      quote: "The level of technical support is unmatched. Complex integration questions were answered within minutes, making our research deployment seamless.",
      rating: 5,
      company: "Neural Systems Inc."
    },
    {
      name: "David Wilson",
      role: "CTO",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
      quote: "The ML System has been a game-changer for our business. The automated hyperparameter tuning saved us countless compute hours and model iterations.",
      rating: 5,
      company: "Wilson AI Solutions"
    },
    {
      name: "Jessica Park",
      role: "AI Product Manager",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80",
      quote: "The model explainability features have revolutionized how we present AI solutions to stakeholders. Our client satisfaction scores have never been higher.",
      rating: 5,
      company: "Cognitive Tech"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black overflow-hidden">
      <style jsx global>{`
        @keyframes slideIn {
          0% { transform: translateX(100px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .testimonial-container {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }
        .glow-border {
          box-shadow: 0 0 15px 1px rgba(139, 92, 246, 0.3);
          border: 1px solid rgba(139, 92, 246, 0.4);
        }
        .glow-border:hover {
          box-shadow: 0 0 25px 3px rgba(155, 81, 224, 0.6);
        }
        .glow-ring {
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }
      `}</style>

      <div className="testimonial-container py-8 md:py-20 bg-black mb-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white bg-clip-text  mb-4">
              Our Users' Success Stories
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Real feedback from AI professionals using our ML System
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start md:items-center">
            {/* Main Testimonial */}
            <div className="md:col-span-7 w-full">
              {testimonials.map((testimonial, idx) => (
                <div
                  key={idx}
                  className={`relative transition-all duration-1000 ease-out w-full
                    ${activeTestimonial === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                  style={{
                    animation: activeTestimonial === idx ? 'slideIn 0.8s ease-out' : 'none',
                    display: activeTestimonial === idx ? 'block' : 'none'
                  }}
                >
                  <div className="bg-black p-6 md:p-10 rounded-3xl glow-border">
                    <div className="mb-6 md:mb-8">
                      <Quote className="w-12 h-12 md:w-16 md:h-16 text-purple-500" style={{ animation: 'pulse 3s infinite' }} />
                    </div>
                    
                    <p className="text-xl md:text-3xl font-light text-gray-200 mb-6 md:mb-8 leading-relaxed">
                      "{testimonial.quote}"
                    </p>

                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="relative group flex-shrink-0">
                        <div className="absolute inset-0 bg-purple-600 rounded-full opacity-10 group-hover:opacity-20 transition-opacity" />
                        <img
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-4 ring-purple-900 glow-ring"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-lg md:text-xl font-semibold text-white truncate">
                          {testimonial.name}
                        </h4>
                        <p className="text-sm md:text-base text-purple-300 mb-1">{testimonial.role}</p>
                        <p className="text-sm text-gray-400">{testimonial.company}</p>
                        <div className="flex gap-1 mt-2">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star 
                              key={i} 
                              className="w-4 h-4 md:w-5 md:h-5 text-purple-400 fill-purple-500"
                              style={{ animation: `fadeUp 0.5s ease-out ${i * 0.1}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview Stack */}
            <div className="hidden md:block md:col-span-5 relative h-[600px]">
              {testimonials.map((testimonial, idx) => {
                const position = (idx - activeTestimonial + testimonials.length) % testimonials.length;
                return (
                  <div
                    key={idx}
                    className="absolute w-full transition-all duration-700 ease-out cursor-pointer hover:scale-105"
                    style={{
                      top: `${position * 100}px`,
                      opacity: position < 3 ? 1 - (position * 0.3) : 0,
                      transform: `scale(${1 - (position * 0.1)}) translateY(${position * 10}px)`,
                      zIndex: testimonials.length - position
                    }}
                    onClick={() => setActiveTestimonial(idx)}
                  >
                    <div className="bg-black p-6 rounded-2xl glow-border transition-all">
                      <div className="flex items-center gap-4 mb-3">
                        <img
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-purple-900 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white truncate">{testimonial.name}</h4>
                          <p className="text-sm text-purple-300 truncate">{testimonial.company}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-purple-400 fill-purple-500" />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center gap-2 md:gap-2 mt-4 md:mt-4">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTestimonial(idx)}
                className={`transition-all duration-300 ${
                  activeTestimonial === idx 
                    ? 'w-8 md:w-12 h-1 bg-purple-600' 
                    : 'w-1 h-1 bg-gray-700 hover:bg-purple-400'
                } rounded-full`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedTestimonials;