const { SqlProveedor } = require("../../sqltx/sql");

const getProveedorSoftland = async (req, res) => {
    try {
        const proveedor = await SqlProveedor(req.params.id)
        if (proveedor.length > 0) {
            res.send({ result: proveedor, success: true });
        } else {
            res.send({ result: ['no existe'], success: false });
        }

    } catch (error) {
        console.log(error);
    }
};

module.exports = { getProveedorSoftland };