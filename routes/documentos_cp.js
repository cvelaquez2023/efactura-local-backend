const express = require("express");

const { postDocumentoCp } = require("../controllers/documentosCp");

const router = express.Router();

router.post("/", postDocumentoCp);
module.exports = router;
