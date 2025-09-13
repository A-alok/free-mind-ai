"use client";

const pricing = [
  {
    id: 1,
    title: "Starter Package",
    description: "Perfect for small businesses starting their digital journey",
    price: "999",
    features: [
      "Basic website setup",
      "Social media integration",
      "24/7 email support",
      "Monthly performance report",
    ],
  },
  {
    id: 2,
    title: "Business Growth",
    description: "Ideal for growing businesses seeking advanced solutions",
    price: "2499",
    features: [
      "Advanced website development",
      "SEO optimization",
      "Priority support",
      "Weekly analytics",
      "Custom integrations"
    ],
  },
  {
    id: 3,
    title: "Enterprise Solutions",
    description: "Tailored solutions for large-scale operations",
    features: [
      "Full-scale digital transformation",
      "Dedicated support team",
      "Custom development",
      "Advanced security features",
      "24/7 priority support"
    ],
  }
];

const InlineButton = ({ href, onClick, className = "", children }) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 transition-colors ${className}`}
    >
      {children}
    </a>
  );
};

const PricingList = () => {
  return (
    <div className="px-5 py-10">
      <h2 className="text-4xl font-bold text-center mb-3">Pricing Plans</h2>
      <p className="text-xl text-center mb-10 text-gray-400">Pay once, use forever</p>
      
      <div className="flex gap-[1rem] max-lg:flex-wrap">
        {pricing.map((item) => (
          <div
            key={item.id}
            className="w-[19rem] max-lg:w-full h-full px-6 bg-n-8 rounded-[2rem] lg:w-auto even:py-14 odd:py-8 odd:my-4 [&>h4]:first:text-color-2 [&>h4]:even:text-color-1 [&>h4]:last:text-color-3 transition-all duration-300 shadow-lg border-2 border-purple-500/40 shadow-purple-500/30 hover:shadow-purple-500/50 hover:border-purple-500/70"
            style={{boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)'}}
          >
            <h4 className="h4 mb-4">{item.title}</h4>
            
            <p className="body-2 min-h-[4rem] mb-3 text-n-1/50">
              {item.description}
            </p>
            
            <div className="flex items-center h-[5.5rem] mb-6">
              {item.price && (
                <>
                  <div className="h3">₹</div>
                  <div className="text-[5.5rem] leading-none font-bold">
                    {item.price}
                  </div>
                </>
              )}
            </div>
            
            <InlineButton
              href={item.price ? "/pricing" : "mailto:contact@example.in"}
              className={item.price
                ? "w-full mb-6 bg-gradient-to-r from-[#FF6B6B] to-[#9B51E0] text-white hover:opacity-90"
                : "w-full mb-6 bg-transparent border border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white"
              }
            >
              {item.price ? "Get started" : "Contact us"}
            </InlineButton>
            
            <ul>
              {item.features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start py-5 border-t border-n-6"
                >
                  <img src="/images/check.svg" width={24} height={24} alt="Check" />
                  <p className="body-2 ml-4">{feature}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingList;