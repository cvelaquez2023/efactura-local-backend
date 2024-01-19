const express = require("express");

const {
  postDocumentoCp,
  postDocumentoCpSuj,
} = require("../controllers/documentosCp");

const router = express.Router();

router.post("/", postDocumentoCp);
router.post("/sujetoExcluido", postDocumentoCpSuj);
module.exports = router;
