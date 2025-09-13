"use client";

import { benefits } from "@/constants";
import Heading from "./Heading";
import Arrow from "@/components/svg/Arrow";
import { GradientLight } from "@/components/design/Benefits";
import ClipPath from "@/components/svg/ClipPath";

const Benefits = () => {
  return (
    <div id="features" className="mt-5">
      <div className="container relative z-2 px-4 md:px-6 pt-5">
        <Heading
          className="md:max-w-md lg:max-w-2xl text-5xl md:text-5xl lg:text-5xl font-bold mb-16 mx-auto text-center mt-5"
          title="Chat Smarter, Not Harder with FreeMindAi"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full">
          {benefits.map((item) => (
            <div
              className="block relative p-0.5 bg-no-repeat bg-[length:100%_100%] w-full max-w-full"
              style={{
                backgroundImage: `url(${item.backgroundUrl})`,
              }}
              key={item.id}
            >
              <div className="relative z-2 flex flex-col min-h-[22rem] p-[2.4rem] pointer-events-none">
                <h5 className="h5 mb-5">{item.title}</h5>
                <p className="body-2 mb-6 text-n-3">{item.text}</p>
                <div className="flex items-center mt-auto">
                  <img
                    src={item.iconUrl}
                    width={48}
                    height={48}
                    alt={item.title}
                  />
                  <p className="ml-auto font-code text-xs font-bold text-n-1 uppercase tracking-wider">
                    Explore more
                  </p>
                  <Arrow />
                </div>
              </div>
              
              {item.light && <GradientLight />}
              
              <div
                className="absolute inset-0.5 bg-n-8"
                style={{ clipPath: "url(#benefits)" }}
              >
                <div className="absolute inset-0 opacity-0 transition-opacity hover:opacity-10">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      width={380}
                      height={362}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
              
              <ClipPath />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Benefits;