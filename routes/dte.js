const express = require("express");
const {
  postDteProveedor,
  getDteProveedor,
  putDteProveedor,
  cargarCPSoftland,
  getCargaCPSoftland,
} = require("../controllers/dte");
const router = express.Router();

router.get("/", getDteProveedor);
router.get("/cp/:id", getCargaCPSoftland);
router.get("/:id", getDteProveedor);
router.put("/:id2/:id3", putDteProveedor);
router.post("/", postDteProveedor);
router.post("/cp/", cargarCPSoftland);

module.exports = router;
