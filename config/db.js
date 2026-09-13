const mongoose = require("mongoose");

const Profile = require("../models/Profile");
const Project = require("../models/Project");
const Skill = require("../models/Skill");

const DEFAULT_DB_NAME = "resume_db";

const READY_STATE = {
	0: "disconnected",
	1: "connected",
	2: "connecting",
	3: "disconnecting",
};

const dbStatus = {
	configured: false,
	dbName: DEFAULT_DB_NAME,
	mongoUri: null,
	mongoUriVisible: false,
	host: null,
	state: READY_STATE[mongoose.connection.readyState],
	lastConnectedAt: null,
	lastError: null,
};

const parseMongoHost = (mongoUri) => {
	try {
		const parsed = new URL(mongoUri);
		return parsed.host || null;
	} catch {
		return null;
	}
};

const currentState = () => READY_STATE[mongoose.connection.readyState] || "unknown";

const getDbStatus = () => ({
	configured: dbStatus.configured,
	dbName: dbStatus.dbName,
	mongoUri: dbStatus.mongoUriVisible ? dbStatus.mongoUri : null,
	mongoUriVisible: dbStatus.mongoUriVisible,
	host: dbStatus.host,
	state: currentState(),
	lastConnectedAt: dbStatus.lastConnectedAt,
	lastError: dbStatus.lastError,
});

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

	dbStatus.configured = Boolean(mongoUri);
	dbStatus.dbName = dbName;
	dbStatus.mongoUriVisible = process.env.EXPOSE_MONGO_URI_TO_CLIENT === "true";
	dbStatus.mongoUri = mongoUri || null;
	dbStatus.host = mongoUri ? parseMongoHost(mongoUri) : null;
	dbStatus.lastError = null;

	if (!mongoUri) {
		console.warn("MONGO_URI is not set. Running without database connection.");
		dbStatus.state = currentState();
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
		dbStatus.lastConnectedAt = new Date().toISOString();
		dbStatus.state = currentState();
		console.log("MongoDB connected");
		console.log(`Database ready: ${mongoose.connection.name}`);
	} catch (error) {
		dbStatus.lastError = error.message;
		dbStatus.state = currentState();
		console.error("MongoDB connection error:", error.message);
		if (process.env.NODE_ENV === "production") {
			process.exit(1);
		}
	}
};

mongoose.connection.on("connected", () => {
	dbStatus.state = currentState();
	dbStatus.lastConnectedAt = new Date().toISOString();
	dbStatus.lastError = null;
});

mongoose.connection.on("error", (error) => {
	dbStatus.state = currentState();
	dbStatus.lastError = error.message;
});

mongoose.connection.on("disconnected", () => {
	dbStatus.state = currentState();
});

module.exports = {
	connectDB,
	getDbStatus,
};
