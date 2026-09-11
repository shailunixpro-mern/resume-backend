const Skill = require("../models/Skill");
const { fallbackSkills } = require("./fallbackData");

const groupByCategory = (skills) =>
	skills.reduce((acc, skill) => {
		const key = skill.category || "Other";
		if (!acc[key]) {
			acc[key] = [];
		}
		acc[key].push(skill);
		return acc;
	}, {});

const getSkills = async (req, res, next) => {
	try {
		const skills = await Skill.find().sort({ category: 1, name: 1 }).lean();
		const payload = skills.length > 0 ? skills : fallbackSkills;

		res.json({
			success: true,
			data: payload,
			grouped: groupByCategory(payload),
			source: skills.length > 0 ? "database" : "fallback",
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getSkills,
};
