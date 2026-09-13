const mongoose = require("mongoose");

const introSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		dateOfBirth: { type: Date, required: true },
		address: { type: String, required: true, trim: true },
		phone: { type: String, required: true, trim: true },
	},
	{
		timestamps: true,
		versionKey: false,
		collection: "intro_schema",
	}
);

introSchema.index({ name: 1, dateOfBirth: 1 });

module.exports = mongoose.model("Intro", introSchema);