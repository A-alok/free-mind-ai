"use client";
import { useState } from 'react';
import Footer from "./Footer";
import Navbar from "./Header";

export default function ContactPage() {
  // Video URL constant
  const videoUrl = "/images/d.mp4"; // Replace with your actual video path

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Add your form submission logic here
      console.log('Form submitted:', formData);
      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      
      {/* Hero Section with Parallax */}
      <section className="relative h-[35rem] overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" /> {/* Overlay */}
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Hero Content */}
        <div className="container mx-auto px-4 relative z-20 h-full">
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold text-white text-center mb-4">
              Contact
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text"> Us</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl text-center">
              Get in touch with our team - we're here to help you succeed
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 md:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Contact Information */}
            <div className="space-y-12">
              <div>
                <h3 className="text-white text-lg mb-3">Find Our Office</h3>
                <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Connect with the team
                </h2>
                <p className="text-gray-300 text-lg leading-relaxed">
                  Get in touch with our expert team for any questions, inquiries, or assistance. 
                  We're here to help you with all your needs.
                </p>
              </div>

              <div className="space-y-10">
                {[
                  { 
                    title: 'Location',
                    content: '1/13 Vijay Garden Ghodbunder Road, Thane West, Maharashtra',
                    icon: '📍'
                  },
                  { 
                    title: 'Phone',
                    content: '(+91) 9619104761',
                    icon: '📞'
                  },
                  { 
                    title: 'Email',
                    content: 'sawant.parth@gmail.com',
                    icon: '📧'
                  }
                ].map(({ title, content, icon }) => (
                  <div key={title} className="flex items-start space-x-6">
                    <span className="text-3xl">{icon}</span>
                    <div>
                      <h4 className="font-semibold mb-2 text-purple-300 text-lg">{title}</h4>
                      <p className="text-gray-300 text-lg">{content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-black p-8 rounded-xl shadow-2xl border border-purple-500 backdrop-blur-lg">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your Name"
                    className="w-full px-4 py-3 bg-gray-700 text-white border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-400 transition-all duration-300"
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Your Email"
                    className="w-full px-4 py-3 bg-gray-700 text-white border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-400 transition-all duration-300"
                    required
                  />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone Number"
                  className="w-full px-4 py-3 bg-gray-700 text-white border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-400 transition-all duration-300"
                  required
                />
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Subject"
                  className="w-full px-4 py-3 bg-gray-700 text-white border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-400 transition-all duration-300"
                  required
                />
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Your Message"
                  rows="4"
                  className="w-full px-4 py-3 bg-gray-700 text-white border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-400 transition-all duration-300 resize-none"
                  required
                ></textarea>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#9B51E0] text-white px-6 py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg text-lg"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="h-[400px] w-full mt-16">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3767.0897485978728!2d72.96563837486543!3d19.234633982006723!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7b90f03e23585%3A0x1e7b2ded7eea66b!2sVijay%20Garden%2C%20Ghodbunder%20Rd%2C%20Thane%20West%2C%20Thane%2C%20Maharashtra%20400615!5e0!3m2!1sen!2sin!4v1705067287411!5m2!1sen!2sin"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Vijay Garden, Ghodbunder Road Location"
          ></iframe>
        </div>
      </main>

      <Footer />
    </div>
  );
}