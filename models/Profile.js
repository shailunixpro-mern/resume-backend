const mongoose = require("mongoose");

const socialSchema = new mongoose.Schema(
	{
		label: { type: String, required: true, trim: true },
		url: { type: String, required: true, trim: true },
	},
	{ _id: false }
);

const profileSchema = new mongoose.Schema(
	{
		fullName: { type: String, required: true, trim: true },
		headline: { type: String, required: true, trim: true },
		bio: { type: String, required: true, trim: true },
		location: { type: String, default: "Remote" },
		email: { type: String, required: true, trim: true, lowercase: true },
		avatarUrl: { type: String, default: "" },
		resumeUrl: { type: String, default: "" },
		socials: { type: [socialSchema], default: [] },
	},
	{
		timestamps: true,
		versionKey: false,
	}
);

module.exports = mongoose.model("Profile", profileSchema);
