"use client";
import Footer from '@/components/Footer';
import Founder from '@/components/founder';
import Header from '@/components/Header';
import Stats from '@/components/stats';
import { Award, Building, Coffee, Globe, Heart, Lightbulb, Rocket, Sparkles, Target, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

const videoUrl = '/images/b.mp4';
const videoUrl2 = '/images/cyberpunk-medical-element-ae-08.webm';
const videoUrl3 = '/images/c.mp4';

export default function AboutUsPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const values = [
    {
      icon: <Heart className="h-12 w-12" />,
      title: "Customer First",
      description: "We put our customers at the heart of everything we do, ensuring their success is our top priority"
    },
    {
      icon: <Lightbulb className="h-12 w-12" />,
      title: "Innovation",
      description: "Constantly pushing boundaries and exploring new possibilities to deliver cutting-edge solutions"
    },
    {
      icon: <Rocket className="h-12 w-12" />,
      title: "Excellence",
      description: "Committed to delivering the highest quality in every aspect of our work and services"
    }
  ];

  return (
    <main className="min-h-screen bg-black">
      <Header />
      
      {/* Hero Section with Parallax */}
      <section className="relative h-[40rem] overflow-hidden">
        <div className="absolute inset-0">
          <video 
            autoPlay 
            loop 
            muted 
            className="w-full h-full object-cover"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
          {/* Dark overlay for better text visibility */}
          <div className="absolute inset-0 bg-black opacity-40" />
        </div>
        <div className="container mx-auto px-4 relative z-10 h-full">
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            <h1 className="text-8xl font-bold text-white text-center mb-4 animate-fade-in">
              About
              <span className="bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-transparent bg-clip-text"> Us</span>
            </h1>
            <p className="text-2xl text-gray-300 max-w-2xl text-center">
              Pioneering the future of ML Systems with passion and innovation
            </p>
            <div className="h-1 w-32 bg-[#A277FF] rounded-full mt-4 shadow-[0_0_15px_5px_rgba(162,119,255,0.3)]"></div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="relative rounded-lg overflow-hidden">
                <video 
                  autoPlay 
                  loop 
                  muted 
                  className="w-full h-full object-cover rounded-lg transform hover:scale-105 transition-transform duration-500"
                >
                  <source src={videoUrl2} type="video/mp4" />
                </video>
              </div>
            </div>
            <div className="space-y-6">
              <span className="text-[#A277FF] font-semibold tracking-wider uppercase">Who We Are</span>
              <h2 className="text-4xl font-bold text-white">
                Transforming Ideas <span className="bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-transparent bg-clip-text">into Reality</span>
              </h2>
              <p className="text-gray-400 text-lg">
                Founded in 2018, we've grown from a small startup to a global technology leader in ML Systems. Our mission is to empower businesses and individuals with innovative machine learning solutions that drive success and growth.
              </p>
              <div className="flex gap-4 pt-4 bg-[#1F0A3B]/30 p-6 rounded-lg border border-[#2F1B5B]">
                <Target className="text-[#A277FF] h-8 w-8" />
                <div>
                  <h3 className="text-white font-semibold text-xl">Our Mission</h3>
                  <p className="text-gray-400">To revolutionize the ML technology landscape through innovation and excellence, making artificial intelligence accessible to all.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Stats />
     
      {/* Values Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <video 
            autoPlay 
            loop 
            muted 
            className="w-full h-full object-cover"
          >
            <source src={videoUrl3} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black opacity-60" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-transparent bg-clip-text animate-pulse">
              Our Values
            </h2>
            <p className="text-xl mx-auto font-semibold max-w-2xl text-white">
              The principles that guide everything we do
            </p>
            <div className="h-1 w-32 bg-[#A277FF] rounded-full mt-4 mx-auto shadow-[0_0_15px_5px_rgba(162,119,255,0.3)]"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div 
                key={index}
                className="bg-[#1F0A3B]/30 backdrop-blur-lg rounded-xl p-8 transform hover:scale-105 transition-all duration-300 border border-[#2F1B5B] hover:border-[#A277FF] group"
              >
                <div className="text-[#A277FF] mb-6 group-hover:text-white transition-colors duration-300">{value.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-4">{value.title}</h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
     
      {/* Join Us Section */}
      <section className="py-28 bg-black relative overflow-hidden">
        {/* Animated background dots */}
        <div className="absolute inset-0 bg-[radial-gradient(#A277FF33_1px,transparent_1px)] [background-size:16px_16px] opacity-25"></div>
  
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-white mb-6">
                Join Our <span className="bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-transparent bg-clip-text">Journey</span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Be part of a team that's shaping the future of ML Systems. We offer more than just a job - we offer a mission.
              </p>
              <div className="h-1 w-32 bg-[#A277FF] rounded-full mt-4 mx-auto shadow-[0_0_15px_5px_rgba(162,119,255,0.3)]"></div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-[#1F0A3B]/30 backdrop-blur-lg rounded-xl p-6 hover:bg-[#1F0A3B]/50 transition-all duration-300 border border-[#2F1B5B] hover:border-[#A277FF] group">
                <Building className="w-8 h-8 text-[#A277FF] mb-4 group-hover:text-white transition-colors duration-300" />
                <h3 className="text-xl font-semibold text-white mb-2">Growth Opportunities</h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Continuous learning and career advancement paths for every team member</p>
              </div>

              <div className="bg-[#1F0A3B]/30 backdrop-blur-lg rounded-xl p-6 hover:bg-[#1F0A3B]/50 transition-all duration-300 border border-[#2F1B5B] hover:border-[#A277FF] group">
                <Coffee className="w-8 h-8 text-[#A277FF] mb-4 group-hover:text-white transition-colors duration-300" />
                <h3 className="text-xl font-semibold text-white mb-2">Great Culture</h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Work with passionate people in an environment that promotes creativity</p>
              </div>

              <div className="bg-[#1F0A3B]/30 backdrop-blur-lg rounded-xl p-6 hover:bg-[#1F0A3B]/50 transition-all duration-300 border border-[#2F1B5B] hover:border-[#A277FF] group">
                <Sparkles className="w-8 h-8 text-[#A277FF] mb-4 group-hover:text-white transition-colors duration-300" />
                <h3 className="text-xl font-semibold text-white mb-2">Innovation Focus</h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Work on cutting-edge projects that push technological boundaries</p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <button className="px-8 py-4 bg-[#1F0A3B] text-[#A277FF] font-semibold rounded-lg border border-[#A277FF] hover:bg-[#3C2E64] transition-all duration-300 shadow-[0_0_15px_rgba(162,119,255,0.3)] transform hover:scale-105">
                View Open Positions
              </button>
            </div>
          </div>
        </div>
      </section>

      <Founder />
      <Footer />
    </main>
  );
}