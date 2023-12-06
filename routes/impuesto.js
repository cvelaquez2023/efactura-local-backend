const express = require("express");
const { getImpuesto } = require("../controllers/impuesto");

const router = express.Router();

router.get("/", getImpuesto);
module.exports = router;
