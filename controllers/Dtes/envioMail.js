const { emailEnviado } = require("../../utils/email");

const envioMail = async (req, res) => {
    const dte = req.body.dte;
    const dt01 = dte.replace("-24-", "-");
    const tipo = dte.substring(4, 6);
    const tipo00 = "dte" + tipo;
    const correo = req.body.correo;
    await emailEnviado(dt01, correo, tipo00);
    res.send({ result: 'Correo Enviado', success: true });
};

module.exports = envioMail;