const mongoose = require("mongoose");

const connectDB = async () => {
	const mongoUri = process.env.MONGO_URI;

	if (!mongoUri) {
		console.warn("MONGO_URI is not set. Running without database connection.");
		return;
	}

	try {
		await mongoose.connect(mongoUri, {
			autoIndex: process.env.NODE_ENV !== "production",
			serverSelectionTimeoutMS: 10000,
		});
		console.log("MongoDB connected");
	} catch (error) {
		console.error("MongoDB connection error:", error.message);
		if (process.env.NODE_ENV === "production") {
			process.exit(1);
		}
	}
};

module.exports = connectDB;
