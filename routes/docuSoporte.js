const express = require("express");

const { postdocsSoporte } = require("../controllers/docsSoporte");
const { postdocsSoporte14 } = require("../controllers/docsSoporte14");

const router = express.Router();

router.post("/", postdocsSoporte);
router.post("/dte14", postdocsSoporte14);

module.exports = router;
