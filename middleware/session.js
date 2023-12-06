const { handleHttpError } = require("../utils/handleError");
const { verifyToken } = require("../utils/handleJwt");
const { clienteModel } = require("../models");

const authMiddleware = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      handleHttpError(res, "NEED_SESSION", 401);
      return;
    }
    const token = req.headers.authorization.split(" ").pop();
    const dataToken = await verifyToken(token);

    if (!dataToken.cliente) {
      handleHttpError(res, "ERROR_ID_TOKEN", 401);
      return;
    }
    const cliente = await clienteModel.findOne({
      attributes: [
        "CLIENTE",
        "NOMBRE",
        "ROL",
        "DIRECCION",
        "USA_TARJETA",
        "TARJETA_CREDITO",
      ],
      where: { CLIENTE: dataToken.cliente },
    });
    nuevo = JSON.stringify(cliente);
    nuevo = JSON.parse(nuevo);

    req.cliente = nuevo;
    next();
  } catch (error) {
    handleHttpError(res, "NOT_SESSION", 401);
  }
};
module.exports = authMiddleware;
