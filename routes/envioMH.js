const express = require("express");

const { postDte03 } = require("../controllers/Dtes/dte_03");
const { postDte01 } = require("../controllers/Dtes/dte_01");
const postInvalidar = require("../controllers/Dtes/invalidacion");
const postDte05 = require("../controllers/Dtes/dte_05");
const postDte11 = require("../controllers/Dtes/dte_11");
const { postDte14 } = require("../controllers/Dtes/dte_14");
const postDte07 = require("../controllers/Dtes/dte_07");
const { postDte04 } = require("../controllers/Dtes/dte_04");
const { contingencia } = require("../controllers/Dtes/contingencia");
const authMiddleware = require("../middleware/session");
const checkRol = require("../middleware/rol");
const envioMail = require("../controllers/Dtes/envioMail");

const router = express.Router();

router.post("/dte03/:factura/:id", postDte03);
router.post("/dte01/:factura/:id", postDte01);
router.post("/dte04/:factura/:id", postDte04);
router.post("/dte05/:factura/:id", postDte05);
router.post("/dte11/:factura/:id", postDte11);
router.post("/dte14/:id", postDte14);
router.post("/dte07/:factura/:id", postDte07);
router.post(
  "/invalidacion",
  authMiddleware,
  checkRol(["User", "Admin"]),
  postInvalidar
);
router.post("/contingencia", contingencia);
router.post("/envioMail", envioMail);

module.exports = router;
