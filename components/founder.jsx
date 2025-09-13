"use client";
import React from 'react';
import { Linkedin, Twitter, Github } from 'lucide-react';

const FoundersSection = () => {
  const founders = [
    {
      name: 'Sarah Johnson',
      role: 'CEO & Co-Founder',
      image: '/images/person_1.jpg',
      bio: 'Visionary leader with 15+ years experience in tech innovation',
      social: {
        linkedin: '#',
        twitter: '#',
        github: '#'
      }
    },
    {
      name: 'Michael Chen',
      role: 'CTO & Co-Founder',
      image: '/images/person_2.jpg',
      bio: 'Tech pioneer specializing in AI and machine learning',
      social: {
        linkedin: '#',
        twitter: '#',
        github: '#'
      }
    },
    {
      name: 'Elena Rodriguez',
      role: 'COO & Co-Founder',
      image: '/images/person_3.jpg',
      bio: 'Operations expert with focus on scaling global teams',
      social: {
        linkedin: '#',
        twitter: '#',
        github: '#'
      }
    },
    {
      name: 'David Kim',
      role: 'CPO & Co-Founder',
      image: '/images/person_4.jpg',
      bio: 'Product strategist passionate about user-centered design',
      social: {
        linkedin: '#',
        twitter: '#',
        github: '#'
      }
    }
  ];

  return (
    <section className="py-24 bg-black mb-20 relative">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#A277FF15_1px,transparent_1px)] [background-size:20px_20px] opacity-30"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">
            Meet Our <span className="bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-transparent bg-clip-text">Founders</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Passionate innovators dedicated to transforming our vision into reality
          </p>
          <div className="h-1 w-32 bg-[#A277FF] rounded-full mt-6 mx-auto shadow-[0_0_15px_5px_rgba(162,119,255,0.3)]"></div>
        </div>

        {/* Founders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {founders.map((founder, index) => (
            <div
              key={index}
              className="bg-[#1F0A3B]/20 backdrop-blur-lg rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_-15px_rgba(162,119,255,0.5)] border border-[#2F1B5B] hover:border-[#A277FF] group"
            >
              {/* Founder Image with glow effect */}
              <div className="aspect-square overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1F0A3B] opacity-0 group-hover:opacity-50 transition-opacity duration-300 z-10"></div>
                <img
                  src={founder.image}
                  alt={founder.name}
                  className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              {/* Founder Info */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-1">
                  {founder.name}
                </h3>
                <p className="text-sm text-[#A277FF] font-medium mb-3">
                  {founder.role}
                </p>
                <p className="text-gray-400 text-sm mb-4 group-hover:text-gray-300 transition-colors duration-300">
                  {founder.bio}
                </p>

                {/* Social Links */}
                <div className="flex gap-4">
                  <a
                    href={founder.social.linkedin}
                    className="text-gray-400 hover:text-[#A277FF] transition-colors duration-300"
                  >
                    <Linkedin size={20} />
                  </a>
                  <a
                    href={founder.social.twitter}
                    className="text-gray-400 hover:text-[#A277FF] transition-colors duration-300"
                  >
                    <Twitter size={20} />
                  </a>
                  <a
                    href={founder.social.github}
                    className="text-gray-400 hover:text-[#A277FF] transition-colors duration-300"
                  >
                    <Github size={20} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FoundersSection;