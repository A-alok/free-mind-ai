import SectionSvg from "@/components/svg/SectionSvg";

const Section = ({ className = "", crosses, crossesOffset, customPadding, children }) => {
  return (
    <div
      className={`
        relative 
        ${customPadding || "py-10 lg:py-16 xl:py-20"} 
        ${crosses ? "lg:py-32 xl:py-40" : ""} 
        ${className}
      `}
    >
      {children}

      {crosses && <SectionSvg crossesOffset={crossesOffset} />}
    </div>
  );
};

export default Section;