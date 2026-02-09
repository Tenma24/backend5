const express = require("express");
const router = express.Router();
const currencyController = require("../controllers/currencyController");

router.get("/rates", currencyController.getRates);

router.get("/convert", currencyController.convertPrice);

module.exports = router;