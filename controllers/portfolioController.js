const Profile = require("../models/Profile");
const Project = require("../models/Project");
const Skill = require("../models/Skill");
const {
  fallbackProfile,
  fallbackProjects,
  fallbackSkills,
} = require("./fallbackData");

const getPortfolio = async (req, res, next) => {
  try {
    const [profile, projects, skills] = await Promise.all([
      Profile.findOne().sort({ updatedAt: -1 }).lean(),
      Project.find().sort({ featured: -1, sortOrder: 1, createdAt: -1 }).lean(),
      Skill.find().sort({ category: 1, name: 1 }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        profile: profile || fallbackProfile,
        projects: projects.length > 0 ? projects : fallbackProjects,
        skills: skills.length > 0 ? skills : fallbackSkills,
      },
      source:
        profile || projects.length > 0 || skills.length > 0 ? "database" : "fallback",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPortfolio,
};