const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
	{
		title: { type: String, required: true, trim: true },
		summary: { type: String, required: true, trim: true },
		technologies: { type: [String], default: [] },
		liveUrl: { type: String, default: "" },
		repoUrl: { type: String, default: "" },
		imageUrl: { type: String, default: "" },
		featured: { type: Boolean, default: false },
		sortOrder: { type: Number, default: 0 },
	},
	{
		timestamps: true,
		versionKey: false,
	}
);

projectSchema.index({ featured: -1, sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model("Project", projectSchema);
