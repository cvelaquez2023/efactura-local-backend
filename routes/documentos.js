const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/session");
const checkRol = require("../middleware/rol");
const { getDocumentos, putDocumento } = require("../controllers/documentos");

router.get("/", authMiddleware, checkRol(["User"]), getDocumentos);
router.put("/:fac", authMiddleware, checkRol(["User", "Admin"]), putDocumento);

module.exports = router;
