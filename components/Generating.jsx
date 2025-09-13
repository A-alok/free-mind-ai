

const Generating = ({ className }) => {
  return (
    <div
    className={`flex items-center h-[3.5rem] px-6 bg-n-8/80 rounded-[1.7rem] border border-purple-500 ${
        className || ""
      } text-base`}
      
    >
      <img className="w-5 h-5 mr-4 animate-spin" src="../images/loading.png" alt="Loading" />
      AI is generating ............
    </div>
  );
};

export default Generating;