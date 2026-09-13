const mongoose = require("mongoose");

const SUPPORTED_BSON_TYPES = new Set([
	"double",
	"string",
	"object",
	"array",
	"binData",
	"objectId",
	"bool",
	"date",
	"null",
	"regex",
	"int",
	"timestamp",
	"long",
	"decimal",
]);

const COLLECTION_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/;

const ensureDbConnection = () => {
	if (!mongoose.connection?.db) {
		const err = new Error("Database is not connected");
		err.statusCode = 503;
		throw err;
	}
	return mongoose.connection.db;
};

const inferBsonType = (value) => {
	if (value === null) {
		return "null";
	}

	if (Array.isArray(value)) {
		return "array";
	}

	if (value instanceof Date) {
		return "date";
	}

	switch (typeof value) {
		case "string":
			return "string";
		case "boolean":
			return "bool";
		case "number":
			return Number.isInteger(value) ? "int" : "double";
		case "object":
			return "object";
		default:
			return "unknown";
	}
};

const inferSchemaFromDocument = (doc) => {
	if (!doc || typeof doc !== "object") {
		return null;
	}

	const properties = {};
	Object.entries(doc).forEach(([key, value]) => {
		if (key === "_id") {
			properties[key] = { bsonType: "objectId" };
			return;
		}

		properties[key] = { bsonType: inferBsonType(value) };
	});

	return {
		bsonType: "object",
		properties,
	};
};

const validateCollectionName = (collectionName) => {
	if (!collectionName || !COLLECTION_NAME_REGEX.test(collectionName)) {
		const err = new Error(
			"Invalid collectionName. Use letters, numbers, underscore, or dash; start with a letter/underscore."
		);
		err.statusCode = 400;
		throw err;
	}
};

const listCollections = async (req, res, next) => {
	try {
		const db = ensureDbConnection();
		const collections = await db.listCollections({}, { nameOnly: true }).toArray();

		res.json({
			success: true,
			count: collections.length,
			data: collections.map((item) => item.name).sort(),
		});
	} catch (error) {
		next(error);
	}
};

const describeCollection = async (req, res, next) => {
	try {
		const db = ensureDbConnection();
		const collectionName = req.params.collectionName;
		validateCollectionName(collectionName);

		const collectionInfo = await db
			.listCollections({ name: collectionName }, { nameOnly: false })
			.toArray();

		if (collectionInfo.length === 0) {
			res.status(404);
			throw new Error(`Collection not found: ${collectionName}`);
		}

		const options = collectionInfo[0].options || {};
		const validatorSchema = options.validator?.$jsonSchema || null;
		const sampleDoc = await db.collection(collectionName).findOne({});

		res.json({
			success: true,
			data: {
				collectionName,
				validatorSchema,
				sampledSchema: inferSchemaFromDocument(sampleDoc),
				validationLevel: options.validationLevel || null,
				validationAction: options.validationAction || null,
			},
		});
	} catch (error) {
		next(error);
	}
};

const createCollection = async (req, res, next) => {
	try {
		const db = ensureDbConnection();
		const { collectionName, fields } = req.body;
		validateCollectionName(collectionName);

		if (!Array.isArray(fields) || fields.length === 0) {
			res.status(400);
			throw new Error("fields must be a non-empty array");
		}

		const existing = await db
			.listCollections({ name: collectionName }, { nameOnly: true })
			.toArray();

		if (existing.length > 0) {
			res.status(409);
			throw new Error(`Collection already exists: ${collectionName}`);
		}

		const properties = {};
		const required = [];

		for (const field of fields) {
			const key = String(field?.name || "").trim();
			const bsonType = String(field?.bsonType || "").trim();
			const isRequired = field?.required !== false;

			if (!key || !/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(key)) {
				res.status(400);
				throw new Error(`Invalid field name: ${key || "(empty)"}`);
			}

			if (!SUPPORTED_BSON_TYPES.has(bsonType)) {
				res.status(400);
				throw new Error(`Unsupported bsonType for field '${key}': ${bsonType}`);
			}

			properties[key] = { bsonType };
			if (isRequired) {
				required.push(key);
			}
		}

		const jsonSchema = {
			bsonType: "object",
			required,
			properties,
		};

		const command = {
			create: collectionName,
			validator: { $jsonSchema: jsonSchema },
			validationLevel: "strict",
			validationAction: "error",
		};

		const commandResult = await db.command(command);

		const schemaCheck = await db
			.listCollections({ name: collectionName }, { nameOnly: false })
			.toArray();
		const createdSchema = schemaCheck[0]?.options?.validator?.$jsonSchema || null;

		res.status(201).json({
			success: true,
			returnCode: 0,
			message: `Collection created: ${collectionName}`,
			commandRan: command,
			commandResult,
			data: {
				collectionName,
				schema: createdSchema,
			},
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	SUPPORTED_BSON_TYPES: Array.from(SUPPORTED_BSON_TYPES),
	listCollections,
	describeCollection,
	createCollection,
};