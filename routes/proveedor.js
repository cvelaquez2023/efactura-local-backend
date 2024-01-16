const express = require("express");
const { getProveedorSoftland } = require("../controllers/Dtes/proveedor");

const router = express.Router();

router.get("/:id", getProveedorSoftland);


module.exports = router;
