const express = require("express");
const { createIntro, listIntros } = require("../controllers/introController");

const router = express.Router();

router.get("/", listIntros);
router.post("/", createIntro);

module.exports = router;