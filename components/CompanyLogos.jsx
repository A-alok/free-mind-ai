"use client";
import { useState } from "react";
import { companyLogos } from "../constants";

const CompanyLogo = ({ logo, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <li
      className="flex items-center justify-center flex-1 h-[8.5rem] min-w-[16rem]"
      key={index}
    >
      <div
        className="transform transition-transform duration-500 ease-in-out hover:cursor-pointer"
        style={{
          transform: isHovered ? "rotate(360deg)" : "rotate(0deg)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={logo}
          width={134}
          height={28}
          alt={logo}
          className="transition-all duration-500 ease-in-out hover:scale-110"
        />
      </div>
    </li>
  );
};

const CompanyLogos = ({ className }) => {
  return (
    <div className={className}>
      <h5 className="tagline mb-10 text-center text-n-1/50">
        Helping people create projects at
      </h5>

      {/* We wrap the scrolling list in an overflow-hidden container */}
      <div className="overflow-hidden">

        {/* The key: We make the <ul> wide enough (200%) for 2 sets of logos,
            and apply our custom animation class to move them from left to right. */}
        <ul className="flex animate-infinite-scroll" style={{ minWidth: "200%" }}>
          {companyLogos.map((logo, index) => (
            <CompanyLogo key={index} logo={logo} index={index} />
          ))}

          {/* Duplicate logos for seamless scrolling */}
          {companyLogos.map((logo, index) => (
            <CompanyLogo key={`duplicate-${index}`} logo={logo} index={index} />
          ))}
        </ul>
      </div>

      {/* Define our custom keyframes and the .animate-infinite-scroll class here */}
      <style jsx>{`
        @keyframes scrollRight {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-infinite-scroll {
          animation: scrollRight 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CompanyLogos;
