const express = require("express");

const { postDte03 } = require("../controllers/Dtes/dte_03");
const { postDte01 } = require("../controllers/Dtes/dte_01");
const postInvalidar = require("../controllers/Dtes/invalidacion");
const postDte05 = require("../controllers/Dtes/dte_05");
const postDte11 = require("../controllers/Dtes/dte_11");
const { postDte14 } = require("../controllers/Dtes/dte_14");
const postDte07 = require("../controllers/Dtes/dte_07");

const router = express.Router();

router.post("/dte03/:factura/:id", postDte03);
router.post("/dte01/:factura/:id", postDte01);
router.post("/dte05/:factura/:id", postDte05);
router.post("/dte11/:factura/:id", postDte11);
router.post("/dte14/:factura/:id", postDte14);
router.post("/dte07/:factura/:id", postDte07);
router.post("/invalidacion", postInvalidar);

module.exports = router;
