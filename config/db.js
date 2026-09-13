const mongoose = require("mongoose");

const Profile = require("../models/Profile");
const Project = require("../models/Project");
const Skill = require("../models/Skill");

const DEFAULT_DB_NAME = "resume_db";

const ensureCollections = async () => {
	const db = mongoose.connection.db;
	const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
	const existingNames = new Set(existingCollections.map((collection) => collection.name));

	for (const collectionName of [
		Profile.collection.collectionName,
		Project.collection.collectionName,
		Skill.collection.collectionName,
	]) {
		if (!existingNames.has(collectionName)) {
			await db.createCollection(collectionName);
		}
	}
};

const connectDB = async () => {
	const mongoUri = process.env.MONGO_URI;
	const dbName = process.env.MONGO_DB_NAME || DEFAULT_DB_NAME;

	if (!mongoUri) {
		console.warn("MONGO_URI is not set. Running without database connection.");
		return;
	}

	try {
		await mongoose.connect(mongoUri, {
			dbName,
			autoIndex: process.env.NODE_ENV !== "production",
			autoCreate: true,
			serverSelectionTimeoutMS: 10000,
		});
		await ensureCollections();
		console.log("MongoDB connected");
		console.log(`Database ready: ${mongoose.connection.name}`);
	} catch (error) {
		console.error("MongoDB connection error:", error.message);
		if (process.env.NODE_ENV === "production") {
			process.exit(1);
		}
	}
};

module.exports = connectDB;
