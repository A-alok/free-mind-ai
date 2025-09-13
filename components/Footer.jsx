"use client";
import Image from "next/image";
import Link from "next/link";
import { socials } from "@/constants";
import { useState } from "react";
import Translate from "./TranslateButton";

const FooterSection = ({ title, links }) => {
  return (
    <div className="flex flex-col space-y-5">
      <h3 className="text-[#A277FF] text-xl font-bold">{title}</h3>
      <ul className="space-y-3">
        {links.map((link, index) => (
          <li key={index}>
            <Link 
              href={link.href} 
              className="text-gray-400 hover:text-[#A277FF] transition-colors duration-300 text-base flex items-center group"
            >
              <span className="transform translate-x-0 group-hover:translate-x-2 transition-transform duration-300">
                {link.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const SocialIcon = ({ url, iconUrl, title }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`bg-[#1F1438] p-3 rounded-full transform transition-all duration-300 ${
        isHovered ? "bg-[#3C2E64] scale-110 border border-[#A277FF]" : "border border-[#2F1B5B]"
      }`}>
        <Image src={iconUrl} width={22} height={22} alt={title} className="transition-all" />
      </div>
      {isHovered && (
        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-[#A277FF] opacity-80 whitespace-nowrap">
          {title}
        </span>
      )}
    </a>
  );
};

const NewsletterForm = () => {
  return (
    <div className="mt-8 lg:mt-0">
      <h3 className="text-[#A277FF] text-xl font-bold mb-4">Stay Updated</h3>
      <p className="text-gray-400 mb-5">Get the latest ML System updates delivered to your inbox</p>
      <div className="w-full">
        <div className="relative">
          <input
            type="email"
           
            className="w-full bg-black text-white px-4 py-3 rounded-md focus:outline-none border border-[#2F1B5B] focus:border-[#A277FF] transition-colors duration-200 pr-32"
          />
          <button 
            className="absolute right-1 top-1 bg-[#1F1438] hover:bg-[#3C2E64] text-[#A277FF] border border-[#A277FF] font-medium py-2 px-4 rounded-md transition-all duration-300"
          >
            Subscribe
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2 pl-1">We respect your privacy. No spam, ever.</p>
      </div>
    </div>
  );
};

export default function Footer () {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
        { label: "Use Cases", href: "#use-cases" },
        { label: "Roadmap", href: "#roadmap" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "#about" },
        { label: "Careers", href: "#careers" },
        { label: "Contact", href: "#contact" },
        { label: "Partners", href: "#partners" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Blog", href: "#blog" },
        { label: "Documentation", href: "#docs" },
        { label: "Community", href: "#community" },
        { label: "Support", href: "#support" },
      ],
    },
  ];

  return (
    <footer className="bg-black text-white py-16 px-4 relative">
      {/* Thin glowing border */}
      <div className="absolute top-0 left-0 w-full h-px bg-[#A277FF] shadow-[0_0_8px_1px_rgba(162,119,255,0.6)]"></div>
      
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Logo and description section */}
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center mb-6">
              <Image src="/images/LOGO.svg" alt="ML System Logo" width={180} height={45} />
            </Link>
            <p className="text-gray-400 mb-6 text-lg">
              Build, train, and deploy machine learning models with ease. Automate your entire ML project lifecycle.
            </p>
            <div className="flex space-x-5 mt-8">
              {socials.map((item) => (
                <SocialIcon key={item.id} url={item.url} iconUrl={item.iconUrl} title={item.title} />
              ))}
            </div>
          </div>

          {/* Footer sections */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-10">
            {footerSections.map((section, index) => (
              <FooterSection key={index} title={section.title} links={section.links} />
            ))}
          </div>

          {/* Newsletter section */}
          <div className="lg:col-span-2">
            <NewsletterForm />
          </div>
        </div>

        {/* Bottom section with copyright and links */}
        <div className="border-t border-[#2F1B5B] mt-16 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © {currentYear} ML System. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-gray-400 hover:text-[#A277FF] text-sm transition-colors duration-300">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-[#A277FF] text-sm transition-colors duration-300">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-gray-400 hover:text-[#A277FF] text-sm transition-colors duration-300">
              Cookie Policy
            </Link>
            <div className="translate-footer-container">
                <Translate />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
