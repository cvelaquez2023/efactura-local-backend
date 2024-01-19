const express = require("express");
const {
  postDteProveedor,
  getDteProveedor,
  putDteProveedor,
  cargarCPSoftland,
  getCargaCPSoftland,
  getDteCliente,
  getDteObservaciones,
  getDteDescargarPdf,
  getCliente,
  getProveedor,
  getConsecutivo,
  putConsecutivo,
} = require("../controllers/dte");
const authMiddleware = require("../middleware/session");
const checkRol = require("../middleware/rol");
const router = express.Router();

router.get("/", authMiddleware, checkRol(["User", "Admin"]), getDteProveedor);
router.get(
  "/cliente/:ano/:mes",
  authMiddleware,
  checkRol(["User", "Admin"]),
  getDteCliente
);
router.get(
  "/proveedor/:ano/:mes/:tipo",
  authMiddleware,
  checkRol(["User", "Admin"]),
  getProveedor
);
router.get("/observaciones/:dteId", getDteObservaciones);
router.get("/cp/:id", getCargaCPSoftland);
router.get("/:id", getDteProveedor);
router.put("/:id2/:id3", putDteProveedor);
router.post("/", postDteProveedor);
router.post("/cp/", cargarCPSoftland);
router.get("/descargar/:dte", getDteDescargarPdf);
router.get("/clientes/:dte", getCliente);
router.get("/consecutivo/:consecutivo", getConsecutivo);
router.post("/consUpdate/:consecutivo", putConsecutivo);

module.exports = router;
