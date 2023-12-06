const { handleHttpError } = require("../utils/handleError");

/**
 * Array con los roles permitidos
 * @param {*} rol
 * @returns
 */
const checkRol = (rol) => (req, res, next) => {
  try {
    const { cliente } = req;
    const rolesByUser = cliente.ROL;
    const MayrolesByUser = rolesByUser.toUpperCase();
    const checkValueRol = rol.some((rolSingle) =>
      rolesByUser.includes(rolSingle)
    );
    if (!checkValueRol) {
      handleHttpError(res, "USER_NOT_PERMISSIONS", 403);
      return;
    }
    /*
    if (rol.toUpperCase() !== MayrolesByUser) {
      console.log("cuando no es admin");
      handleHttpError(res, "USER_NOT_PERMISSIONS", 403);
      return;
    }
    */
    next();
  } catch (error) {
    handleHttpError(res, "ERROR_PERMISSION", 403);
  }
};
module.exports = checkRol;
