import PlusSvg from "./PlusSvg";

const SectionSvg = ({ crossesOffset }) => {
  return (
    <div className="relative">
      {/* Top left cross */}
      <PlusSvg
        className={`hidden absolute -top-[0.3125rem] left-[1.5625rem] ${
          crossesOffset ? crossesOffset : ""
        } pointer-events-none lg:block xl:left-[2.1875rem]`}
      />
      
      {/* Top horizontal line */}
      <div className="hidden lg:block absolute top-0 h-px bg-white/20 left-[3.75rem] right-[3.75rem] xl:left-[4.375rem] xl:right-[4.375rem]" />
      
      {/* Top right cross */}
      <PlusSvg
        className={`hidden absolute -top-[0.3125rem] right-[1.5625rem] ${
          crossesOffset ? crossesOffset : ""
        } pointer-events-none lg:block xl:right-[2.1875rem]`}
      />
      
      {/* Left vertical line */}
      <div className="hidden lg:block absolute left-0 w-px bg-white/20 top-[0.9375rem] bottom-[0.9375rem] ml-[2.1875rem]" />
      
      {/* Right vertical line */}
      <div className="hidden lg:block absolute right-0 w-px bg-white/20 top-[0.9375rem] bottom-[0.9375rem] mr-[2.1875rem]" />
      
      {/* Bottom left cross */}
      <PlusSvg
        className={`hidden absolute -bottom-[0.3125rem] left-[1.5625rem] ${
          crossesOffset ? crossesOffset : ""
        } pointer-events-none lg:block xl:left-[2.1875rem]`}
      />
      
      {/* Bottom horizontal line */}
      <div className="hidden lg:block absolute bottom-0 h-px bg-white/20 left-[3.75rem] right-[3.75rem] xl:left-[4.375rem] xl:right-[4.375rem]" />
      
      {/* Bottom right cross */}
      <PlusSvg
        className={`hidden absolute -bottom-[0.3125rem] right-[1.5625rem] ${
          crossesOffset ? crossesOffset : ""
        } pointer-events-none lg:block xl:right-[2.1875rem]`}
      />
    </div>
  );
};

export default SectionSvg;