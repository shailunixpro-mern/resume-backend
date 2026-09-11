const Project = require("../models/Project");
const { fallbackProjects } = require("./fallbackData");

const getProjects = async (req, res, next) => {
	try {
		const projects = await Project.find()
			.sort({ featured: -1, sortOrder: 1, createdAt: -1 })
			.lean();

		res.json({
			success: true,
			data: projects.length > 0 ? projects : fallbackProjects,
			source: projects.length > 0 ? "database" : "fallback",
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getProjects,
};
