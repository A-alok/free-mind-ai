"use client";

import { collabApps } from "@/constants";
import { LeftCurve, RightCurve } from "@/components/design/Collaboration";

// Inline Button component with the styling matching the image
const InlineButton = ({ href, onClick, className = "", children }) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md px-6 py-3 uppercase tracking-wider text-sm font-medium transition-colors ${className}`}
    >
      {children}
    </a>
  );
};

// Check icon component
const CheckIcon = () => (
  <div className="w-6 h-6 rounded-full bg-[#9B51E0] flex items-center justify-center flex-shrink-0">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

// Feature item that matches the image
const FeatureItem = ({ title }) => (
  <li className="mb-8 last:mb-0 flex items-start">
    <CheckIcon />
    <h6 className="ml-4 text-white text-lg font-medium">{title}</h6>
  </li>
);

// Collaboration features array
const CollaborationFeatures = [
  {
    title: "End-to-End Pipeline Automation",
  },
  {
    title: "Interactive Data Analysis with LLaMA 3 and Pandas AI",
  },
  {
    title: "Custom Synthetic Dataset Generation",
  },
  {
    title: "AI-Driven Visualization and Explanations",
  },
  {
    title: "Personalized AI Chatbot",
  },
];

const Collaboration = () => {
  return (
    <div className="px-6 sm:px-8 md:px-12 lg:px-16 py-16 mt-12 mb-10 bg-black text-white min-h-screen">
      <div className="container mx-auto max-w-7xl">
        <div className="lg:flex items-start gap-8 xl:gap-16">
          {/* Left Content Section */}
          <div className="max-w-full lg:max-w-[34rem] flex-shrink-0 mb-12 lg:mb-0">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-10 md:mb-16 leading-tight">
              Platform for Seamless<br />Automation
            </h2>

            <ul className="mb-12">
              {CollaborationFeatures.map((feature, index) => (
                <FeatureItem
                  key={index}
                  title={feature.title}
                />
              ))}
            </ul>

            {/* Button with gradient matching the image */}
            <InlineButton
              className="
                w-auto 
                bg-gradient-to-r
                from-[#FF6B6B]
                to-[#9B51E0]
                text-white
                hover:opacity-90
                border-none
              "
            >
              TRY IT NOW
            </InlineButton>
          </div>

          {/* Right Visual Section */}
          <div className="lg:flex-1">
            <p className="text-gray-400 mb-12 mt-5 md:mb-16 lg:mb-24 xl:mb-32 lg:max-w-[34rem] lg:mx-auto">
              Empowering users of all skill levels to create machine learning projects effortlessly with a fully automated platform that delivers
              professional-grade results.
            </p>

            {/* Circular Integration Diagram */}
            <div className="relative mx-auto flex w-[18rem] sm:w-[20rem] md:w-[22rem] aspect-square border border-gray-800 rounded-full">
              {/* Central Brain Symbol */}
              <div className="flex w-48 sm:w-52 md:w-60 aspect-square m-auto border border-gray-800 rounded-full">
                <div className="w-[4rem] sm:w-[5rem] md:w-[6rem] aspect-square m-auto bg-gradient-to-r from-[#FF6B6B] to-[#9B51E0] p-0.5 rounded-full">
                  <div className="flex items-center justify-center w-full h-full bg-[#0F0F19] rounded-full">
                    <div className="text-center">
                      <span className="text-xs font-bold text-yellow-500">FreeMindAi</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rotating App Icons */}
              <div className="absolute inset-0 animate-spin-slow">
                <ul className="w-full h-full">
                  {collabApps.map((app, index) => {
                    const angle = (360 / collabApps.length) * index;
                    return (
                      <li
                        key={app.id || index}
                        className="absolute top-0 left-1/2 h-1/2 -ml-[1.6rem] origin-bottom"
                        style={{
                          transform: `rotate(${angle}deg)`
                        }}
                      >
                        <div
                          className="relative -top-[1.6rem] flex w-[3.2rem] h-[3.2rem] bg-[#1A1A2E] border border-gray-800 rounded-xl hover:border-gray-600 transition-colors"
                          style={{
                            transform: `rotate(-${angle}deg)`
                          }}
                        >
                          <img
                            className="m-auto transform hover:scale-110 transition-transform"
                            width={app.width || 24}
                            height={app.height || 24}
                            alt={app.title || `App ${index + 1}`}
                            src={app.icon || `/images/app-icon-${index + 1}.svg`}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <LeftCurve />
              <RightCurve />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Collaboration;