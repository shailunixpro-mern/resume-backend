const fallbackProfile = {
  fullName: "Your Name",
  headline: "Full Stack Developer",
  bio: "I design reliable web products with thoughtful UX and production-grade engineering.",
  location: "Remote",
  email: "hello@example.com",
  avatarUrl: "",
  resumeUrl: "",
  socials: [
    { label: "GitHub", url: "https://github.com/" },
    { label: "LinkedIn", url: "https://www.linkedin.com/" },
  ],
};

const fallbackProjects = [
  {
    title: "Resume Studio",
    summary: "A responsive portfolio app with polished UI and fast API delivery.",
    technologies: ["Next.js", "Express", "MongoDB"],
    liveUrl: "",
    repoUrl: "",
    imageUrl: "",
    featured: true,
    sortOrder: 1,
  },
  {
    title: "Hiring Dashboard",
    summary: "An internal dashboard to track applications and interview stages.",
    technologies: ["React", "Node.js", "REST API"],
    liveUrl: "",
    repoUrl: "",
    imageUrl: "",
    featured: false,
    sortOrder: 2,
  },
];

const fallbackSkills = [
  { name: "TypeScript", category: "Frontend", level: "Advanced", years: 3 },
  { name: "Next.js", category: "Frontend", level: "Advanced", years: 3 },
  { name: "Node.js", category: "Backend", level: "Advanced", years: 4 },
  { name: "MongoDB", category: "Backend", level: "Intermediate", years: 3 },
  { name: "Docker", category: "DevOps", level: "Intermediate", years: 2 },
];

module.exports = {
  fallbackProfile,
  fallbackProjects,
  fallbackSkills,
};