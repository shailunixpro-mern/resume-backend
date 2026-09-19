const mongoose = require("mongoose");

const COLLECTION_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/;

const ensureDbConnection = () => {
  if (!mongoose.connection?.db) {
    const err = new Error("Database is not connected");
    err.statusCode = 503;
    throw err;
  }

  return mongoose.connection.db;
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

const getCollectionInfo = async (db, collectionName) => {
  return db.listCollections({ name: collectionName }, { nameOnly: false }).toArray();
};

const normalizeSchemaBsonType = (definition) => {
  if (!definition || typeof definition !== "object") {
    return "string";
  }

  if (Array.isArray(definition.bsonType)) {
    return definition.bsonType.find((type) => type !== "null") || definition.bsonType[0] || "string";
  }

  return definition.bsonType || "string";
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

  if (value instanceof mongoose.Types.ObjectId) {
    return "objectId";
  }

  if (value instanceof mongoose.Types.Decimal128) {
    return "decimal";
  }

  if (Buffer.isBuffer(value) || value?._bsontype === "Binary") {
    return "binData";
  }

  if (value?._bsontype === "Timestamp") {
    return "timestamp";
  }

  if (value instanceof RegExp || value?._bsontype === "BSONRegExp") {
    return "regex";
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
    properties[key] = { bsonType: inferBsonType(value) };
  });

  return {
    bsonType: "object",
    properties,
  };
};

const getCollectionSchema = async (db, collectionName) => {
  const collectionInfo = await getCollectionInfo(db, collectionName);

  if (collectionInfo.length === 0) {
    const err = new Error(`Collection not found: ${collectionName}`);
    err.statusCode = 404;
    throw err;
  }

  const validatorSchema = collectionInfo[0]?.options?.validator?.$jsonSchema || null;
  if (validatorSchema) {
    return validatorSchema;
  }

  const sampleDoc = await db.collection(collectionName).findOne({});
  return inferSchemaFromDocument(sampleDoc);
};

const serializeValue = (value) => {
  if (value === null || value === undefined) {
    return value ?? null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toHexString();
  }

  if (value instanceof mongoose.Types.Decimal128) {
    return value.toString();
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }

  if (value?._bsontype === "Binary" && Buffer.isBuffer(value.buffer)) {
    return value.buffer.toString("base64");
  }

  if (value?._bsontype === "Timestamp") {
    return value.toString();
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, serializeValue(nested)]));
  }

  return value;
};

const serializeDocument = (document) => {
  return Object.fromEntries(
    Object.entries(document).map(([key, value]) => [key, serializeValue(value)])
  );
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }

    if (value.toLowerCase() === "false") {
      return false;
    }
  }

  throw new Error("Expected a boolean value");
};

const parseJsonValue = (value, expectedLabel) => {
  if (typeof value === "object" && value !== null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    throw new Error(`Expected JSON input for ${expectedLabel}`);
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON supplied for ${expectedLabel}`);
  }
};

const coerceValue = (value, bsonType, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "" && bsonType !== "string") {
    return null;
  }

  switch (bsonType) {
    case "string":
      return String(value);
    case "bool":
      return parseBoolean(value);
    case "int": {
      const parsed = Number.parseInt(String(value), 10);
      if (Number.isNaN(parsed)) {
        throw new Error(`Invalid integer for field '${fieldName}'`);
      }
      return parsed;
    }
    case "long": {
      const parsed = Number(String(value));
      if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid number for field '${fieldName}'`);
      }
      return parsed;
    }
    case "double": {
      const parsed = Number(String(value));
      if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid decimal number for field '${fieldName}'`);
      }
      return parsed;
    }
    case "decimal":
      return mongoose.Types.Decimal128.fromString(String(value));
    case "date": {
      const parsed = new Date(String(value));
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid date for field '${fieldName}'`);
      }
      return parsed;
    }
    case "objectId": {
      const normalized = String(value).trim();
      if (!mongoose.Types.ObjectId.isValid(normalized)) {
        throw new Error(`Invalid ObjectId for field '${fieldName}'`);
      }
      return new mongoose.Types.ObjectId(normalized);
    }
    case "array": {
      const parsed = parseJsonValue(value, fieldName);
      if (!Array.isArray(parsed)) {
        throw new Error(`Expected an array for field '${fieldName}'`);
      }
      return parsed;
    }
    case "object": {
      const parsed = parseJsonValue(value, fieldName);
      if (Array.isArray(parsed) || typeof parsed !== "object" || parsed === null) {
        throw new Error(`Expected an object for field '${fieldName}'`);
      }
      return parsed;
    }
    case "null":
      return null;
    case "regex":
      return new RegExp(String(value));
    case "binData":
      return Buffer.from(String(value), "base64");
    case "timestamp": {
      const parsed = parseJsonValue(value, fieldName);
      const seconds = Number(parsed?.t);
      const increment = Number(parsed?.i);
      if (!Number.isInteger(seconds) || !Number.isInteger(increment)) {
        throw new Error(`Timestamp field '${fieldName}' must be JSON like {"t": 1, "i": 1}`);
      }
      return new mongoose.mongo.Timestamp({ t: seconds, i: increment });
    }
    default:
      return value;
  }
};

const buildTypedDocument = (values, schema) => {
  const properties = schema?.properties || {};
  const typed = {};

  Object.entries(values || {}).forEach(([fieldName, value]) => {
    if (fieldName === "_id") {
      return;
    }

    const bsonType = normalizeSchemaBsonType(properties[fieldName]);
    typed[fieldName] = coerceValue(value, bsonType, fieldName);
  });

  return typed;
};

const listDocumentMetadata = async (req, res, next) => {
  try {
    const db = ensureDbConnection();
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();

    res.json({
      success: true,
      data: {
        databaseName: db.databaseName,
        collections: collections.map((item) => item.name).sort(),
      },
    });
  } catch (error) {
    next(error);
  }
};

const listDocuments = async (req, res, next) => {
  try {
    const db = ensureDbConnection();
    const collectionName = req.params.collectionName;
    validateCollectionName(collectionName);

    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || "25"), 10) || 25, 1), 100);
    const schema = await getCollectionSchema(db, collectionName);
    const documents = await db.collection(collectionName).find({}).sort({ _id: -1 }).limit(limit).toArray();

    res.json({
      success: true,
      count: documents.length,
      data: {
        collectionName,
        fields: schema?.properties || {},
        documents: documents.map(serializeDocument),
      },
    });
  } catch (error) {
    next(error);
  }
};

const createDocument = async (req, res, next) => {
  try {
    const db = ensureDbConnection();
    const collectionName = req.params.collectionName;
    validateCollectionName(collectionName);

    const schema = await getCollectionSchema(db, collectionName);
    const typedDocument = buildTypedDocument(req.body?.values, schema);
    const result = await db.collection(collectionName).insertOne(typedDocument);
    const insertedDocument = await db.collection(collectionName).findOne({ _id: result.insertedId });

    res.status(201).json({
      success: true,
      message: `Document created in ${collectionName}`,
      data: {
        insertedId: result.insertedId.toHexString(),
        document: insertedDocument ? serializeDocument(insertedDocument) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateDocument = async (req, res, next) => {
  try {
    const db = ensureDbConnection();
    const collectionName = req.params.collectionName;
    const documentId = req.params.documentId;
    validateCollectionName(collectionName);

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      res.status(400);
      throw new Error("Invalid document id");
    }

    const schema = await getCollectionSchema(db, collectionName);
    const typedDocument = buildTypedDocument(req.body?.values, schema);
    const _id = new mongoose.Types.ObjectId(documentId);

    const result = await db.collection(collectionName).updateOne({ _id }, { $set: typedDocument });
    if (result.matchedCount === 0) {
      res.status(404);
      throw new Error(`Document not found: ${documentId}`);
    }

    const updatedDocument = await db.collection(collectionName).findOne({ _id });

    res.json({
      success: true,
      message: `Document updated in ${collectionName}`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        document: updatedDocument ? serializeDocument(updatedDocument) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDocumentMetadata,
  listDocuments,
  createDocument,
  updateDocument,
};