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

const FIELD_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

const getCollectionInfo = async (db, collectionName) => {
	return db.listCollections({ name: collectionName }, { nameOnly: false }).toArray();
};

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

const normalizeSchemaBsonType = (definition) => {
	if (!definition || typeof definition !== "object") {
		return "string";
	}

	if (Array.isArray(definition.bsonType)) {
		const nonNullType = definition.bsonType.find((type) => type !== "null");
		return nonNullType || definition.bsonType[0] || "string";
	}

	return definition.bsonType || "string";
};

const parseExistingSchemaFields = (schema) => {
	const properties = schema?.properties || {};
	const requiredSet = new Set(Array.isArray(schema?.required) ? schema.required : []);

	return Object.entries(properties)
		.filter(([fieldName]) => fieldName !== "_id")
		.map(([fieldName, definition]) => ({
			originalName: fieldName,
			name: fieldName,
			bsonType: normalizeSchemaBsonType(definition),
			required: requiredSet.has(fieldName),
			deleted: false,
			isNew: false,
		}));
};

const validateFieldPayload = (field) => {
	const originalName = String(field?.originalName || "").trim();
	const name = String(field?.name || "").trim();
	const bsonType = String(field?.bsonType || "").trim();
	const deleted = Boolean(field?.deleted);
	const required = field?.required !== false;
	const isNew = Boolean(field?.isNew) || !originalName;

	if (!deleted) {
		if (!name || !FIELD_NAME_REGEX.test(name)) {
			const err = new Error(`Invalid field name: ${name || "(empty)"}`);
			err.statusCode = 400;
			throw err;
		}

		if (!SUPPORTED_BSON_TYPES.has(bsonType)) {
			const err = new Error(`Unsupported bsonType for field '${name}': ${bsonType}`);
			err.statusCode = 400;
			throw err;
		}
	}

	return {
		originalName: originalName || null,
		name: name || null,
		bsonType: bsonType || null,
		deleted,
		required,
		isNew,
	};
};

const buildSchemaUpdateCommand = (collectionName, schema, options) => ({
	collMod: collectionName,
	validator: { $jsonSchema: schema },
	validationLevel: options?.validationLevel || "strict",
	validationAction: options?.validationAction || "error",
});

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

		const collectionInfo = await getCollectionInfo(db, collectionName);

		if (collectionInfo.length === 0) {
			res.status(404);
			throw new Error(`Collection not found: ${collectionName}`);
		}

		const options = collectionInfo[0].options || {};
		const validatorSchema = options.validator?.$jsonSchema || null;
		const sampleDoc = await db.collection(collectionName).findOne({});
		const editableFields = validatorSchema ? parseExistingSchemaFields(validatorSchema) : [];

		res.json({
			success: true,
			data: {
				collectionName,
				validatorSchema,
				sampledSchema: inferSchemaFromDocument(sampleDoc),
				editableFields,
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

const updateCollectionSchema = async (req, res, next) => {
	try {
		const db = ensureDbConnection();
		const collectionName = req.params.collectionName;
		validateCollectionName(collectionName);

		const collectionInfo = await getCollectionInfo(db, collectionName);
		if (collectionInfo.length === 0) {
			res.status(404);
			throw new Error(`Collection not found: ${collectionName}`);
		}

		const { fields } = req.body;
		if (!Array.isArray(fields)) {
			res.status(400);
			throw new Error("fields must be an array");
		}

		const currentOptions = collectionInfo[0].options || {};
		const normalizedFields = fields.map(validateFieldPayload);
		const activeFields = normalizedFields.filter((field) => !field.deleted);
		const uniqueNames = new Set();

		for (const field of activeFields) {
			if (uniqueNames.has(field.name)) {
				res.status(400);
				throw new Error(`Duplicate field name detected: ${field.name}`);
			}

			uniqueNames.add(field.name);
		}

		const deletedSourceNames = normalizedFields
			.filter((field) => field.deleted && field.originalName)
			.map((field) => field.originalName);
		const renamedFields = normalizedFields.filter(
			(field) => !field.deleted && field.originalName && field.originalName !== field.name
		);
		const newFields = normalizedFields.filter((field) => !field.deleted && !field.originalName);

		const collisionNames = new Set([...deletedSourceNames, ...renamedFields.map((field) => field.originalName)]);
		for (const field of activeFields) {
			if (collisionNames.has(field.name) && field.originalName !== field.name) {
				res.status(400);
				throw new Error(
					`Field rename conflicts with a deleted field name: ${field.name}. Remove the conflict and try again.`
				);
			}
		}

		const properties = {};
		const required = [];

		for (const field of activeFields) {
			if (field.isNew) {
				properties[field.name] = { bsonType: [field.bsonType, "null"] };
			} else {
				properties[field.name] = { bsonType: field.bsonType };
			}

			if (field.required) {
				required.push(field.name);
			}
		}

		const nextSchema = {
			bsonType: "object",
			required,
			properties,
		};

		const schemaUpdateCommand = buildSchemaUpdateCommand(collectionName, nextSchema, currentOptions);
		await db.command(schemaUpdateCommand);

		const updatePipeline = [];
		const renameTemps = renamedFields.map((field, index) => ({
			originalName: field.originalName,
			finalName: field.name,
			tempName: `__schema_tmp_${index}_${field.originalName}`,
		}));

		if (renameTemps.length > 0) {
			const tempSetStage = {};
			for (const rename of renameTemps) {
				tempSetStage[rename.tempName] = `$${rename.originalName}`;
			}
			updatePipeline.push({ $set: tempSetStage });
		}

		const unsetFields = new Set([...deletedSourceNames, ...renamedFields.map((field) => field.originalName)]);
		if (unsetFields.size > 0) {
			updatePipeline.push({ $unset: Array.from(unsetFields) });
		}

		if (newFields.length > 0) {
			const newFieldStage = {};
			for (const field of newFields) {
				newFieldStage[field.name] = null;
			}
			updatePipeline.push({ $set: newFieldStage });
		}

		if (renameTemps.length > 0) {
			const finalRenameStage = {};
			for (const rename of renameTemps) {
				finalRenameStage[rename.finalName] = `$${rename.tempName}`;
			}
			updatePipeline.push({ $set: finalRenameStage });

			const tempUnsetStage = renameTemps.map((rename) => rename.tempName);
			updatePipeline.push({ $unset: tempUnsetStage });
		}

		let updateResult = null;
		if (updatePipeline.length > 0) {
			updateResult = await db
				.collection(collectionName)
				.updateMany({}, updatePipeline, { bypassDocumentValidation: true });
		}

		const refreshedInfo = await getCollectionInfo(db, collectionName);
		const updatedSchema = refreshedInfo[0]?.options?.validator?.$jsonSchema || null;

		res.json({
			success: true,
			message: `Collection schema updated: ${collectionName}`,
			data: {
				collectionName,
				updatedSchema,
				modifiedDocuments: updateResult?.modifiedCount || 0,
				matchedDocuments: updateResult?.matchedCount || 0,
				commandRan: schemaUpdateCommand,
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
	updateCollectionSchema,
};