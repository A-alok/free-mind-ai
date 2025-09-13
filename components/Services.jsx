import { brainwaveServicesIcons } from "@/constants";

const Services = () => {
  const platformFeatures = [
    "End-to-End ML Pipeline Automation",
    "Intelligent Dataset Generation",
    "Interactive Data Analysis", 
    "AI-Powered Visualization",
    "Comprehensive Model Training"
  ];

  return (
    <div className="py-20">
      <div className="container mx-auto px-8 md:px-16 lg:px-24">
        <div className="relative">
          <div className="absolute top-1/2 left-1/2 w-[50rem] -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-60">
            <img
              src="/images/pricing/stars.svg"
              className="w-full"
              width={850}
              height={350}
              alt="Stars"
            />
          </div>
        </div>

        {/* Enlarged Title Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-5xl lg:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Revolutionize Your Machine Learning Workflow
          </h1>
          <p className="text-xl md:text-2xl text-n-3 max-w-3xl mx-auto">
            Automate, Accelerate, and Innovate with FreeMindAi
          </p>
        </div>

        <div className="relative">
          {/* First Feature Section: Comprehensive Automation - Smaller Size */}
          <div className="relative z-1 flex items-center h-[30rem] mb-5 p-6 rounded-3xl overflow-hidden transition-all duration-300 shadow-lg border-2 border-purple-500/40 shadow-purple-500/30 hover:shadow-purple-500/50 hover:border-purple-500/70 mt-5" style={{boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)'}}>

            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-80 md:w-3/5 xl:w-auto">
              <img
                className="w-full h-full object-cover md:object-right"
                width={700}
                height={600}
                src="/images/services/service-1.png"
                alt="End-to-End ML Automation"
              />
            </div>

            <div className="relative z-1 max-w-[20rem] ml-auto bg-black/50 p-6 rounded-xl backdrop-blur">
              <h4 className="text-2xl font-bold mb-3">Complete ML Project Automation</h4>
              <p className="text-base mb-6 text-n-3">
                Transform your ideas into fully functional machine learning projects with zero complexity
              </p>
              <ul className="space-y-2">
                {platformFeatures.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-start py-2 border-t border-n-6"
                  >
                    <img 
                      src="/images/check.svg"
                      width={20} 
                      height={20} 
                      alt="check" 
                      className="mr-3 mt-1" 
                    />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Two-Column Feature Showcase - Same Height for Both Boxes */}
          <div className="relative z-1 grid gap-8 md:grid-cols-2 mt-5">
            {/* Synthetic Data Generation */}
            <div className="relative h-[32rem] rounded-3xl overflow-hidden transition-all duration-300 shadow-lg border-2 border-purple-500/40 shadow-purple-500/30 hover:shadow-purple-500/50 hover:border-purple-500/70" style={{boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)'}}>
              <div className="absolute inset-0">
                <img
                  src="/images/services/service-2.png"
                  className="h-full w-full object-cover"
                  width={530}
                  height={650}
                  alt="Synthetic Data Generation"
                />
              </div>

              <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-b from-n-8/0 to-n-8/90">
                <h4 className="text-2xl font-bold mb-3">Synthetic Dataset Creation</h4>
                <p className="text-base mb-4 text-n-3">
                  Generate high-quality, custom synthetic datasets tailored to your specific machine learning needs
                </p>
              </div>
            </div>

            {/* Interactive AI Guidance */}
            <div className="h-[32rem] bg-n-7 rounded-3xl overflow-hidden transition-all duration-300 shadow-lg border-2 border-purple-500/40 shadow-purple-500/30 hover:shadow-purple-500/50 hover:border-purple-500/70" style={{boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)'}}>
              <div className="py-8 px-6 xl:px-8">
                <h4 className="text-2xl font-bold mb-3">AI-Powered Guidance</h4>
                <p className="text-base mb-6 text-n-3">
                  Intelligent chatbot assistance to guide you through every step of your machine learning journey
                </p>

                <ul className="flex items-center justify-between">
                  {brainwaveServicesIcons.slice(0, 3).map((item, index) => (
                    <li
                      key={index}
                      className={`rounded-2xl flex items-center justify-center ${
                        index === 2
                          ? "w-[2.5rem] h-[2.5rem] p-0.25 bg-conic-gradient md:w-[3.5rem] md:h-[3.5rem]"
                          : "flex w-8 h-8 bg-n-6 md:w-12 md:h-12"
                      }`}
                    >
                      <div
                        className={
                          index === 2
                            ? "flex items-center justify-center w-full h-full bg-n-7 rounded-[0.8rem]"
                            : ""
                        }
                      >
                        <img src={item} width={20} height={20} alt={`Service icon ${index + 1}`} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative h-[18rem] bg-n-8 rounded-xl overflow-hidden mx-4 mt-4">
                <img
                  src="/images/services/service-3.png"
                  className="w-full h-full object-cover"
                  width={420}
                  height={300}
                  alt="AI Guidance"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services;