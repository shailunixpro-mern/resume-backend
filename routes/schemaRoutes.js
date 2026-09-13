const express = require("express");
const {
	SUPPORTED_BSON_TYPES,
	listCollections,
	describeCollection,
	createCollection,
} = require("../controllers/schemaController");

const router = express.Router();

router.get("/types", (req, res) => {
	res.json({
		success: true,
		data: SUPPORTED_BSON_TYPES,
	});
});

router.get("/collections", listCollections);
router.get("/collections/:collectionName", describeCollection);
router.post("/collections", createCollection);

module.exports = router;