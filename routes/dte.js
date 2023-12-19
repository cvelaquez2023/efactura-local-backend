const express = require("express");
const {
  postDteProveedor,
  getDteProveedor,
  putDteProveedor,
  cargarCPSoftland,
  getCargaCPSoftland,
  getDteCliente,
  getDteObservaciones,
} = require("../controllers/dte");
const router = express.Router();

router.get("/", getDteProveedor);
router.get("/cliente/:ano/:mes", getDteCliente);
router.get("/observaciones/:dteId", getDteObservaciones);
router.get("/cp/:id", getCargaCPSoftland);
router.get("/:id", getDteProveedor);
router.put("/:id2/:id3", putDteProveedor);
router.post("/", postDteProveedor);
router.post("/cp/", cargarCPSoftland);

module.exports = router;
