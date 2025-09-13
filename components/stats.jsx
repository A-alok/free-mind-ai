"use client";
import React, { useState, useEffect } from 'react';
import { BarChart3, Database, Clock, ShieldCheck } from 'lucide-react';

const MLStatsGlowing = () => {
  // Animation state for counter effect
  const [counts, setCounts] = useState({
    models: 0,
    datasets: 0,
    runtime: 0,
    accuracy: 0
  });

  const stats = [
    {
      id: 'models',
      title: 'Active Models',
      value: 42,
      icon: BarChart3,
      description: 'Production models deployed'
    },
    {
      id: 'datasets',
      title: 'Datasets',
      value: 186,
      icon: Database,
      description: 'Processed datasets'
    },
    {
      id: 'runtime',
      title: 'Processing Time',
      value: 45.8,
      unit: 'ms',
      icon: Clock,
      description: 'Average prediction time'
    },
    {
      id: 'accuracy',
      title: 'Accuracy',
      value: 99.2,
      unit: '%',
      icon: ShieldCheck,
      description: 'Overall prediction accuracy'
    }
  ];

  // Animate the numbers on mount
  useEffect(() => {
    const duration = 2000; // 2 seconds duration
    const interval = 20; // Update every 20ms
    const steps = duration / interval;
    
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setCounts({
        models: Math.floor(progress * stats[0].value),
        datasets: Math.floor(progress * stats[1].value),
        runtime: parseFloat((progress * stats[2].value).toFixed(1)),
        accuracy: parseFloat((progress * stats[3].value).toFixed(1))
      });
      
      if (step >= steps) {
        clearInterval(timer);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
      
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div 
              key={stat.id} 
              className="relative bg-black rounded-2xl p-6 transition-all duration-300 group"
              style={{
                boxShadow: '0 0 15px 1px rgba(139, 92, 246, 0.3)',
                border: '1px solid rgba(139, 92, 246, 0.4)'
              }}
            >
              {/* Glow effect overlay */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  boxShadow: '0 0 25px 3px rgba(155, 81, 224, 0.6)',
                  pointerEvents: 'none'
                }}
              ></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-purple-900/20 flex items-center justify-center border border-purple-500/30">
                    <stat.icon className="w-8 h-8 text-purple-400" />
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <h3 className="text-4xl font-bold text-white">
                      {counts[stat.id]}
                    </h3>
                    {stat.unit && (
                      <span className="text-xl text-purple-400 ml-1">{stat.unit}</span>
                    )}
                  </div>
                  <p className="text-xl font-medium text-gray-100 mt-3">{stat.title}</p>
                  <p className="text-sm text-gray-400 mt-2">{stat.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
};

export default MLStatsGlowing;