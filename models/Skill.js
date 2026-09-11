const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		category: { type: String, required: true, trim: true },
		level: {
			type: String,
			enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
			default: "Intermediate",
		},
		years: { type: Number, default: 1, min: 0 },
	},
	{
		timestamps: true,
		versionKey: false,
	}
);

skillSchema.index({ category: 1, name: 1 });

module.exports = mongoose.model("Skill", skillSchema);
