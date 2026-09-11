const express = require("express");
const { getPortfolio } = require("../controllers/portfolioController");

const router = express.Router();

router.get("/", getPortfolio);

module.exports = router;