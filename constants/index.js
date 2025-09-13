// Benefit Icons
const benefitIcon1 = "/images/benefits/icon-1.svg";
const benefitIcon2 = "/images/benefits/icon-2.svg";
const benefitIcon3 = "/images/benefits/icon-3.svg";
const benefitIcon4 = "/images/benefits/icon-4.svg";
const benefitImage3 = "/images/benefits/image-3.avif";

// App Icons
const chromecast = "/images/chrome-cast.svg";
const disc02 = "/images/disc-02.svg";
const file02 = "/images/file-02.svg";
const homeSmile = "/images/home-smile.svg";
const plusSquare = "/images/plus-square.svg";
const searchMd = "/images/search-md.svg";
const sliders04 = "/images/sliders-04.svg";

// Notification Images
const notification2 = "/images/notification/image-2.png";
const notification3 = "/images/notification/image-3.png";
const notification4 = "/images/notification/image-4.png";

// Company Logos
const logo1 = "/images/logo-1.png";
const logo2 = "/images/logo-2.webp";
const logo3 = "/images/logo-3.png";
const logo4 = "/images/logo-4.png";
const logo5 = "/images/logo-5.png";

// Recording Icons
const recording01 = "/images/recording-01.svg";
const recording03 = "/images/recording-03.svg";

// Roadmap Images
const roadmap1 = "/images/roadmap/image-1.png";
const roadmap2 = "/images/roadmap/image-2.png";
const roadmap3 = "/images/roadmap/image-3.png";
const roadmap4 = "/images/roadmap/image-4.png";

// Integration Apps
const figma = "/images/collaboration/figma.png";
const notion = "/images/collaboration/notion.png";
const discord = "/images/collaboration/discord.png";
const slack = "/images/collaboration/slack.png";
const photoshop = "/images/collaboration/photoshop.png";
const protopie = "/images/collaboration/protopie.png";
const framer = "/images/collaboration/framer.png";
const raindrop = "/images/collaboration/raindrop.png";

// Social Media Icons
const discordBlack = "/images/socials/discord.svg";
const twitter = "/images/socials/twitter.svg";
const instagram = "/images/socials/instagram.svg";
const telegram = "/images/socials/telegram.svg";
const facebook = "/images/socials/facebook.svg";

export const navigation = [
  {
    id: "0",
    title: "Home",
    url: "/main",
  },
  {
    id: "1",
    title: "About Us",
    url: "/about",
  },
  {
    id: "2",
    title: "Faq",
    url: "/faq",
  },
  {
    id: "3",
    title: "Contact Us",
    url: "/contact",
  },
  
];

export const heroIcons = [homeSmile, file02, searchMd, plusSquare];

export const notificationImages = [notification4, notification3, notification2];

export const companyLogos = [logo1, logo2, logo3, logo4, logo5];

export const brainwaveServices = [
  "Photo generating",
  "Photo enhance",
  "Seamless Integration",
];

export const brainwaveServicesIcons = [
  recording03,
  recording01,
  disc02,
  chromecast,
  sliders04,
];

export const roadmap = [
  {
    id: "0",
    title: "Voice recognition",
    text: "Enable the chatbot to understand and respond to voice commands, making it easier for users to interact with the app hands-free.",
    date: "May 2023",
    status: "done",
    imageUrl: roadmap1,
    colorful: true,
  },
  {
    id: "1",
    title: "Gamification",
    text: "Add game-like elements, such as badges or leaderboards, to incentivize users to engage with the chatbot more frequently.",
    date: "May 2023",
    status: "progress",
    imageUrl: roadmap2,
  },
  {
    id: "2",
    title: "Chatbot customization",
    text: "Allow users to customize the chatbot's appearance and behavior, making it more engaging and fun to interact with.",
    date: "May 2023",
    status: "done",
    imageUrl: roadmap3,
  },
  {
    id: "3",
    title: "Integration with APIs",
    text: "Allow the chatbot to access external data sources, such as weather APIs or news APIs, to provide more relevant recommendations.",
    date: "May 2023",
    status: "progress",
    imageUrl: roadmap4,
  },
];

export const collabContent = [
  {
    id: "0",
    title: "Seamless Integration",
    text: "With smart automation and top-notch security, it's the perfect solution for teams looking to work smarter.",
  },
  {
    id: "1",
    title: "Smart Automation",
  },
  {
    id: "2",
    title: "Top-notch Security",
  },
];

export const collabApps = [
  {
    id: "0",
    title: "Figma",
    icon: figma,
    width: 26,
    height: 36,
  },
  {
    id: "1",
    title: "Notion",
    icon: notion,
    width: 34,
    height: 36,
  },
  {
    id: "2",
    title: "Discord",
    icon: discord,
    width: 36,
    height: 28,
  },
  {
    id: "3",
    title: "Slack",
    icon: slack,
    width: 34,
    height: 35,
  },
  {
    id: "4",
    title: "Photoshop",
    icon: photoshop,
    width: 34,
    height: 34,
  },
  {
    id: "5",
    title: "Protopie",
    icon: protopie,
    width: 34,
    height: 34,
  },
  {
    id: "6",
    title: "Framer",
    icon: framer,
    width: 26,
    height: 34,
  },
  {
    id: "7",
    title: "Raindrop",
    icon: raindrop,
    width: 38,
    height: 32,
  },
];
export const pricing = [
  {
    id: "0",
    title: "Basic",
    description: "AI chatbot, personalized recommendations",
    price: "0",
    features: [
      "An AI chatbot that can understand your queries",
      "Personalized recommendations based on your preferences",
      "Ability to explore the app and its features without any cost",
    ],
  },
  {
    id: "1",
    title: "Premium",
    description: "Advanced AI chatbot, priority support, analytics dashboard",
    price: "9.99",
    features: [
      "An advanced AI chatbot that can understand complex queries",
      "An analytics dashboard to track your conversations",
      "Priority support to solve issues quickly",
    ],
  },
  {
    id: "2",
    title: "Enterprise",
    description: "Custom AI chatbot, advanced analytics, dedicated account",
    price: null,
    features: [
      "An AI chatbot that can understand your queries",
      "Personalized recommendations based on your preferences",
      "Ability to explore the app and its features without any cost",
    ],
  },
];

export const benefits = [
  {
    id: "0",
    title: "Ask anything",
    text: "Lets users quickly find answers to their questions without having to search through multiple sources.",
    backgroundUrl: "/images/benefits/card-1.svg",
    iconUrl: benefitIcon1,
    imageUrl: benefitImage3,
  },
  {
    id: "1",
    title: "Improve everyday",
    text: "The app uses natural language processing to understand user queries and provide accurate and relevant responses.",
    backgroundUrl: "/images/benefits/card-2.svg",
    iconUrl: benefitIcon2,
    imageUrl: benefitImage3,
    light: true,
  },
  {
    id: "2",
    title: "Connect everywhere",
    text: "Connect with the AI chatbot from anywhere, on any device, making it more accessible and convenient.",
    backgroundUrl: "/images/benefits/card-3.svg",
    iconUrl: benefitIcon3,
    imageUrl: benefitImage3,
  },
  {
    id: "3",
    title: "Fast responding",
    text: "Lets users quickly find answers to their questions without having to search through multiple sources.",
    backgroundUrl: "/images/benefits/card-4.svg",
    iconUrl: benefitIcon4,
    imageUrl: benefitImage3,
    light: true,
  },
  {
    id: "4",
    title: "Ask anything",
    text: "Lets users quickly find answers to their questions without having to search through multiple sources.",
    backgroundUrl: "/images/benefits/card-5.svg",
    iconUrl: benefitIcon1,
    imageUrl: benefitImage3,
  },
  {
    id: "5",
    title: "Improve everyday",
    text: "The app uses natural language processing to understand user queries and provide accurate and relevant responses.",
    backgroundUrl: "/images/benefits/card-6.svg",
    iconUrl: benefitIcon2,
    imageUrl: benefitImage3,
  },
];

export const socials = [
  {
    id: "0",
    title: "Discord",
    iconUrl: discordBlack,
    url: "#",
  },
  {
    id: "1",
    title: "Twitter",
    iconUrl: twitter,
    url: "#",
  },
  {
    id: "2",
    title: "Instagram",
    iconUrl: instagram,
    url: "#",
  },
  {
    id: "3",
    title: "Telegram",
    iconUrl: telegram,
    url: "#",
  },
  {
    id: "4",
    title: "Facebook",
    iconUrl: facebook,
    url: "#",
  },
];