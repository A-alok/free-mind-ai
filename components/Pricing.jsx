import Heading from "./Heading";
import PricingList from "./PricingList";
import { LeftLine, RightLine } from "@/components/design/Pricing";

const Pricing = () => {
  return (
    <div className="overflow-hidden" id="pricing">
      <div className="container relative z-2">
        <div className="hidden relative justify-center mb-4 lg:flex">
          {/* <img
            src={smallSphere}
            className="relative z-1"
            width={255}
            height={255}
            alt="Sphere"
          /> */}
          <div className="absolute top-1/2 left-1/2 w-[60rem] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <img
              src="/images/stars.svg"
              className="w-full"
              width={950}
              height={400}
              alt="Stars"
            />
          </div>
        </div>
        
        <div className="relative">
          <PricingList />
          <LeftLine />
          <RightLine />
        </div>
        
        <div className="flex justify-center ">
          <a
            className="text-xs font-code font-bold tracking-wider uppercase border-b"
            href="/pricing"
          >
            
          </a>
        </div>
      </div>
    </div>
  );
};

export default Pricing;