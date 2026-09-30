// Site content and settings. Edit here, then run `npm run build`.

export const CONFIG = {
  siteName: "IT Academy STEP Institute",
  city: "Phnom Penh",
  // TODO: replace with the real contacts before launch
  phone: "+855 00 000 000",
  phoneHref: "tel:+85500000000",
  telegram: "https://t.me/itstep_cambodia",
  messenger: "https://m.me/itstepcambodia",
  email: "info@cambodia.itstep.org",
  // Pages kept from the current website (per the brief)
  legacy: {
    enrol: "https://cambodia.itstep.org/enrol-now",
    news: "https://cambodia.itstep.org/blog",
    vacancies: "https://cambodia.itstep.org/vacancy",
    stories: "https://cambodia.itstep.org/review",
    courses: "https://cambodia.itstep.org/education-adults",
  },
  sistersOfCode: "https://sistersofcode.org/",
  // Optional: URL that receives enquiry form JSON (CRM webhook, Formspree, etc.)
  formEndpoint: "",
};

export const MAJORS = {
  software: {
    slug: "software",
    name: "Software Development",
    short: "Build coding and software skills.",
    page: "bachelor-software-development.html",
    pdf: "files/curriculum-bachelor-software-development.pdf",
    intro:
      "Learn to build websites, mobile apps and software that people can use. The curriculum is focused on AI skills, professional development and most relevant technical skills to prepare students for successful careers.",
    study:
      "Python and C#; databases; HTML, CSS and JavaScript; web and mobile development; cloud solutions; AI applications; cybersecurity and project management.",
    build: "Web applications, mobile apps, and team projects. The final stage includes research and a thesis.",
    credits: 120,
    certs: "Cisco IT Essentials certificate exam",
    years: [
      [
        "English for IT",
        "Introduction to Information Technology",
        "Digital Literacy",
        "IT Essentials with CISCO certificate exam",
        "Python Core",
        "Microsoft .NET and programming C#",
        "Database Theory and MS SQL programming",
        "Entity Framework Core",
        "Basic Entrepreneurship",
      ],
      [
        "HTML and CSS in web development",
        "JavaScript Programming Language",
        "Web Application Development with ASP.NET Core",
        "Term project .NET",
        "Developing Web applications using Python",
        "Cloud Solutions for applications development",
        "Web applications development with PHP and MS SQL",
        "Development Mobile Apps Using React Native",
        "Web development team project",
      ],
      [
        "Android Mobile applications development: Java and Kotlin",
        "AI applications development with Python",
        "Mobile app term project",
        "Introduction to Cyber Security",
        "Digital Awareness",
        "Digital Entrepreneurship / CISCO",
        "IT Project Management",
      ],
      [
        "Professional Report Development",
        "Introduction to Modern AI and Generative AI tools",
        "AI Ethics",
        "User Experience Design",
        "Communication skills & Personality Dynamics",
        "Problem Solving and Process Control",
        "Academic Research in IT",
        "Thesis",
      ],
    ],
  },
  design: {
    slug: "design",
    name: "Computer Graphics and Design",
    short: "Develop visual and digital design skills.",
    page: "bachelor-computer-graphics-design.html",
    pdf: "files/curriculum-bachelor-computer-graphics-design.pdf",
    intro:
      "Turn ideas into visual design, digital experiences, 3D work, and motion. The curriculum includes relevant AI skills, creative and professional development and most relevant technical skills to prepare students for successful careers.",
    study:
      "Drawing and design; Photoshop and Illustrator; branding; UX/UI; 3D modelling with Autodesk tools; animation; video and visual effects.",
    build: "Brand identity, advertising materials, interfaces, and 3D portfolio work. The final stage includes research and a thesis.",
    credits: 121,
    certs: "Autodesk certificate exams (3ds Max, AutoCAD, Maya)",
    years: [
      [
        "English for IT",
        "Introduction to Information Technology",
        "Digital Literacy",
        "Adobe Photoshop",
        "Drawing",
        "Adobe Illustrator",
        "Theory of Design",
        "History of Art",
        "Corporate Identity",
        "Basic Entrepreneurship",
      ],
      [
        "Advertising Design",
        "Adobe InDesign",
        "UX/UI design",
        "Digital Marketing",
        "Autodesk 3ds Max: Fundamentals of 3D modeling",
        "Autodesk 3ds Max: Texturing",
        "Autodesk 3ds Max: Modeling of Complex objects",
        "Autodesk 3ds Max: Photorealistic Visualization",
        "Autodesk AutoCAD",
        "Interior Design",
      ],
      [
        "Autodesk Maya 3D Modeling and Visualization",
        "Autodesk Maya 3D Animation and Special Effects",
        "Autodesk Maya 3D Animation of a character",
        "Video editing with Adobe Premiere",
        "Special Effects with Adobe After Effects",
        "Digital Entrepreneurship / CISCO",
        "Project Management",
      ],
      [
        "Professional IT Report Development",
        "Introduction to Modern AI and Generative AI tools in Creative industries",
        "AI Ethics",
        "User Experience Design",
        "Communication skills & Personality Dynamics",
        "Problem Solving and Process Control",
        "Academic Research in IT",
        "Thesis",
      ],
    ],
  },
  marketing: {
    slug: "marketing",
    name: "Digital Marketing and Communication",
    short: "Learn content, campaigns and communication.",
    page: "bachelor-digital-marketing-communication.html",
    pdf: "files/curriculum-bachelor-digital-marketing-communication.pdf",
    intro:
      "Create digital content, build brands, and plan marketing that connects with people. The curriculum includes relevant AI skills, creative and professional development and most relevant technical skills to prepare students for successful careers.",
    study:
      "Design and brand identity; UX/UI and website development; digital marketing; video; generative AI in communication; digital strategy and content.",
    build: "A brandbook, a website/app concept, and a digital marketing strategy, and run successful campaigns. The final stage includes research and a thesis.",
    credits: 120,
    certs: "Cisco digital skills certificates",
    years: [
      [
        "English for IT",
        "Introduction to Information Technology",
        "Digital Literacy",
        "Using Computer and Mobile Devices",
        "History of Art",
        "Adobe Photoshop",
        "Adobe Illustrator",
        "Theory of Design",
        "Corporate Identity",
        "Term project: Brandbook development",
        "Basic Entrepreneurship",
      ],
      [
        "Advertising Design",
        "UX/UI design",
        "Website Development",
        "Term project: website development and app design",
        "Digital Marketing",
        "Creating compelling report",
        "Digital Awareness",
        "Create Digital Content, Communicate and Collaborate Online",
      ],
      [
        "Business Pitching and Presentation skills",
        "Video editing with Adobe Premiere",
        "Special Effects with Adobe After Effects",
        "Engaging Stakeholders for Success",
        "Generative AI in Communication",
        "Term project: Digital Marketing strategy and content",
      ],
      [
        "Professional Report Development",
        "Introduction to Modern AI and Generative AI tools in Creative Industries",
        "AI Ethics",
        "User Experience Design",
        "Communication skills & Personality Dynamics",
        "Problem Solving and Process Control",
        "Academic Research in IT",
        "Thesis",
      ],
    ],
  },
};

export const DBAI = {
  slug: "business-ai",
  name: "Digital Business and AI",
  short: "Explore digital tools, business processes and AI applications.",
};

// Sample catalogue — replace with the live course list from cambodia.itstep.org/education-adults
export const COURSES = [
  { title: "Python Programming", topic: "programming", level: "beginner", schedule: "weekend", campus: "toulkork", open: true, length: "3 months" },
  { title: "Web Development: HTML, CSS, JavaScript", topic: "programming", level: "beginner", schedule: "evening", campus: "olympic", open: true, length: "4 months" },
  { title: "AI Applications with Python", topic: "programming", level: "intermediate", schedule: "evening", campus: "toulkork", open: false, length: "3 months" },
  { title: "Graphic Design: Photoshop & Illustrator", topic: "design", level: "beginner", schedule: "weekend", campus: "olympic", open: true, length: "3 months" },
  { title: "UX/UI Design", topic: "design", level: "intermediate", schedule: "evening", campus: "toulkork", open: true, length: "2 months" },
  { title: "3D Modelling with Autodesk 3ds Max", topic: "design", level: "intermediate", schedule: "weekend", campus: "toulkork", open: false, length: "3 months" },
  { title: "Digital Marketing & Social Media", topic: "marketing", level: "beginner", schedule: "evening", campus: "olympic", open: true, length: "2 months" },
  { title: "Generative AI Tools for Business", topic: "business", level: "beginner", schedule: "weekend", campus: "olympic", open: true, length: "1 month" },
  { title: "Excel and Data for Business", topic: "tools", level: "beginner", schedule: "morning", campus: "toulkork", open: true, length: "1 month" },
  { title: "Video Editing: Premiere & After Effects", topic: "design", level: "intermediate", schedule: "evening", campus: "olympic", open: false, length: "2 months" },
];

export const FAQ = [
  ["Can I study a Bachelor’s Degree directly?", "Ask admissions to check your eligibility and the current intake. The programme comprises Years 1–4 in one major."],
  ["Can I stop after Year 2?", "Yes. Students who meet the Associate Degree requirements, including the graduation project and final exams, can graduate with that award."],
  ["Can I continue after the Associate Degree?", "The transition plan provides continuation into Years 3–4 in the same major. Admissions will confirm your record and progression requirements."],
  ["I did not pass BAC II. What can I do?", "The transition plan describes an Associate Degree entry route and later continuation to the Bachelor pathway. Admissions must confirm the approved eligibility conditions for your case before you apply."],
  ["Is the Professional Diploma the same as the Associate Degree?", "The curriculum is the same. However, if you choose the International Professional Diploma, you do not need to take exams with MoEYS; instead you work on a graduation project for 3 months. The International Diploma is issued by IT Academy STEP Head Office and is verified at <a href=\"https://diploma.itstep.org/\" target=\"_blank\" rel=\"noopener\">diploma.itstep.org</a>."],
  ["What do I receive after a short course?", "After a short course, you receive a certificate for that course. Some courses also include international certification."],
];
