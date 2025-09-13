"use client";
import { ChevronDown, ChevronUp, Mail, MessageSquare, Phone, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import Footer from './Footer';
import Navbar from './Header';

const videoUrl = '/images/e.mp4';

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredFaqs, setFilteredFaqs] = useState([]);

  const categories = [
    { id: 'all', name: 'All Questions' },
    { id: 'tech', name: 'Technology' },
    { id: 'security', name: 'Security' },
    { id: 'process', name: 'Process' },
    { id: 'support', name: 'Support' }
  ];

  const faqs = [
    {
      category: 'tech',
      question: "What technologies do you specialize in?",
      answer: "We specialize in cutting-edge technologies including Artificial Intelligence, Machine Learning, Cloud Computing, Blockchain, IoT, and Full-Stack Development. Our expertise spans across multiple platforms and frameworks to deliver comprehensive solutions."
    },
    {
      category: 'security',
      question: "How do you ensure project security?",
      answer: "We implement industry-leading security protocols including end-to-end encryption, regular security audits, and strict access controls. Our development process follows security best practices, and we maintain compliance with international data protection standards."
    },
    {
      category: 'process',
      question: "What is your development process?",
      answer: "Our development process follows an agile methodology with iterative cycles. We begin with thorough requirement analysis, followed by design, development, testing, and deployment phases. Regular client communication and feedback are integral to our process."
    },
    {
      category: 'support',
      question: "Do you provide post-launch support?",
      answer: "Yes, we offer comprehensive post-launch support and maintenance services. This includes bug fixes, performance optimization, security updates, and feature enhancements. We provide different support packages tailored to your specific needs."
    },
    {
      category: 'tech',
      question: "What makes your solutions unique?",
      answer: "Our solutions stand out through our innovative approach, custom-tailored strategies, and focus on scalability. We combine technical expertise with industry insights to create solutions that not only meet current needs but are also future-ready."
    },
    {
      category: 'process',
      question: "How do you handle project timelines?",
      answer: "We follow strict project management methodologies with clear milestones and deadlines. Regular progress updates, transparent communication, and proactive risk management ensure projects stay on track and deliver on time."
    },
    {
      category: 'tech',
      question: "Which programming languages do you work with?",
      answer: "We are proficient in a wide range of programming languages including JavaScript (React, Node.js), Python, Java, C++, Ruby, and more. We choose the most suitable technology stack based on project requirements and scalability needs."
    },
    {
      category: 'security',
      question: "How do you handle data privacy?",
      answer: "We follow GDPR, CCPA, and other relevant data protection regulations. Our systems implement strict data encryption, secure access controls, and regular security audits to ensure your data remains protected at all times."
    }
  ];

  useEffect(() => {
    const filtered = faqs.filter(faq => {
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
      const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
    setFilteredFaqs(filtered);
  }, [searchQuery, selectedCategory]);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      {/* Hero Section with Video Background */}
      <section className="relative h-[35rem] overflow-hidden">
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        </div>
        <div className="relative z-10 h-[35rem] container mx-auto px-4">
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <h1 className="text-7xl font-bold text-white text-center mb-4">
              Help &
              <span className="bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-transparent bg-clip-text"> Support</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl text-center">
              Find answers to your questions and get the support you need
            </p>
            <div className="h-1 w-32 bg-[#A277FF] rounded-full mt-4 shadow-[0_0_15px_5px_rgba(162,119,255,0.3)]"></div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="relative mt-12 py-8 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#A277FF]" />
              <input
                type="text"
                placeholder="Search your question..."
                className="w-full pl-12 pr-4 py-4 bg-[#1F0A3B]/30 border border-[#2F1B5B] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#A277FF] transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="py-8 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-2 rounded-full transition-all ${
                  selectedCategory === category.id
                    ? 'bg-[#A277FF] text-white shadow-[0_0_10px_rgba(162,119,255,0.5)]'
                    : 'bg-[#1F0A3B]/30 text-gray-300 hover:bg-[#1F0A3B]/50 border border-[#2F1B5B]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-24 bg-black">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">
              Frequently Asked
              <span className="bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-transparent bg-clip-text"> Questions</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Find answers to common questions about our services and solutions
            </p>
            <div className="h-1 w-32 bg-[#A277FF] rounded-full mt-6 mx-auto shadow-[0_0_15px_5px_rgba(162,119,255,0.3)]"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="bg-[#1F0A3B]/20 backdrop-blur-lg rounded-xl border border-[#2F1B5B] overflow-hidden transition-all duration-300 hover:border-[#A277FF] group"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <h3 className="text-lg font-semibold text-white pr-4">{faq.question}</h3>
                  {openIndex === index ? (
                    <ChevronUp className="h-6 w-6 text-[#A277FF]" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-[#A277FF]" />
                  )}
                </button>
                <div
                  className={`px-6 transition-all duration-300 ${
                    openIndex === index ? 'pb-6 opacity-100' : 'h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="relative py-24 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(#A277FF15_1px,transparent_1px)] [background-size:20px_20px] opacity-30"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">
              Still Have
              <span className="bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-transparent bg-clip-text"> Questions?</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Our support team is here to help you 24/7
            </p>
            <div className="h-1 w-32 bg-[#A277FF] rounded-full mt-6 mx-auto shadow-[0_0_15px_5px_rgba(162,119,255,0.3)]"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-[#1F0A3B]/20 backdrop-blur-lg rounded-xl border border-[#2F1B5B] p-8 text-center hover:border-[#A277FF] hover:shadow-[0_10px_30px_-15px_rgba(162,119,255,0.5)] transition-all duration-300 group">
              <Mail className="w-12 h-12 text-[#A277FF] mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold text-white mb-2">Email Support</h3>
              <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">support@company.com</p>
            </div>
            <div className="bg-[#1F0A3B]/20 backdrop-blur-lg rounded-xl border border-[#2F1B5B] p-8 text-center hover:border-[#A277FF] hover:shadow-[0_10px_30px_-15px_rgba(162,119,255,0.5)] transition-all duration-300 group">
              <Phone className="w-12 h-12 text-[#A277FF] mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold text-white mb-2">Phone Support</h3>
              <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">+1 (555) 123-4567</p>
            </div>
            <div className="bg-[#1F0A3B]/20 backdrop-blur-lg rounded-xl border border-[#2F1B5B] p-8 text-center hover:border-[#A277FF] hover:shadow-[0_10px_30px_-15px_rgba(162,119,255,0.5)] transition-all duration-300 group">
              <MessageSquare className="w-12 h-12 text-[#A277FF] mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold text-white mb-2">Live Chat</h3>
              <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Available 24/7</p>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default FAQSection;