const express = require("express");
const {
  listDocumentMetadata,
  listDocuments,
  createDocument,
  updateDocument,
} = require("../controllers/documentController");

const router = express.Router();

router.get("/metadata", listDocumentMetadata);
router.get("/:collectionName", listDocuments);
router.post("/:collectionName", createDocument);
router.patch("/:collectionName/:documentId", updateDocument);

module.exports = router;