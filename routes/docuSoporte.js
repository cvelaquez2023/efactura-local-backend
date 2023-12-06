const express = require("express");

const { postdocsSoporte } = require("../controllers/docsSoporte");

const router = express.Router();

router.post("/", postdocsSoporte);

module.exports = router;
