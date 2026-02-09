const express = require("express");
const router = express.Router();
const statsController = require("../controllers/statsController");

// Public route - anyone can view stats
router.get("/", statsController.getStats);

module.exports = router;