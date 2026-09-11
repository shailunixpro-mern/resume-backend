const Profile = require("../models/Profile");
const { fallbackProfile } = require("./fallbackData");

const getProfile = async (req, res, next) => {
	try {
		const profile = await Profile.findOne().sort({ updatedAt: -1 }).lean();

		res.json({
			success: true,
			data: profile || fallbackProfile,
			source: profile ? "database" : "fallback",
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getProfile,
};
