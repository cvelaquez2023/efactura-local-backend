//Comporbante de Retencion

const { QueryTypes } = require("sequelize");
const moment = require("moment");
const {
  identificacion,
  emisor,
  receptor,
  receptor07,
  firmaMH,
  autorizacionMh,
} = require("../../config/MH");
const { sequelize } = require("../../config/mssql");
const { Sqlempresa } = require("../../sqltx/sql");
const { NumeroLetras } = require("../../config/letrasNumeros");
const {
  guardarDte,
  guardarRespuestaMH,
  updateDte,
  guardarObservacionesMH,
} = require("../../sqltx/Sqlguardar");
const { emailRechazo, emailEnviado } = require("../../utils/email");
const fs = require("fs");
const path = require("path");
const postDte07 = async (req, res) => {
  const _factura = req.params.factura;
  const _empresa = req.params.id;

  if (!_factura) {
    return res.send({
      messaje: "Es requerida Numero Factura",
      result: false,
    });
  }
  const empresa = await Sqlempresa(_empresa);
  if (empresa.length === 0) {
    return res.send({
      messaje: "Empresa No existe o no esta activa",
      result: false,
    });
  }

  const _identificacion = await identificacion("07", _empresa, _factura);
  const _emisor = await emisor(_empresa, "07");
  const _receptor = await receptor07(_factura);
  const _cuerpo = await cuerpoDoc(_factura);
  const _resumen = await resumen(_factura);
  const _extesnsion = await extension();
  const dte = {
    identificacion: _identificacion,
    emisor: _emisor,
    receptor: _receptor,
    cuerpoDocumento: _cuerpo,
    resumen: _resumen,
    extension: _extesnsion,
    apendice: null,
  };

  const datafirma = {
    nit: process.env.DTE_NIT,
    activo: true,
    passwordPri: process.env.DTE_PWD_PRIVADA,
    dteJson: dte,
  };
  const dataDte = {
    dte: _factura,
    origen: "CLIENTE",
    nombre: _receptor.nombre,
    procesado: 0,
    mudulo: "CP",
    tipoDoc: "01",
    selloRecibido: "ND",
    codigoGeneracion: _identificacion.codigoGeneracion,
    esatdo: "PENDIENTE",
    fechaemision: _identificacion.fecEmi,
    montoTotal: _resumen.totalIVAretenido,
    Documento: _receptor.nit,
    Empresa_id: _empresa,
  };

  await guardarDte(dataDte);

  const _firma = await firmaMH(datafirma);
  if (_firma == "ERROR") {
    //Se envia corre
    return res.send({
      messaje: "Es Servidor de Firma no responde",
      result: false,
    });
  }

  const _auth = await autorizacionMh();
  if (_auth == "ERROR") {
    //Se envia corre
    return res.send({
      messaje: "Es Servidor de Autenticacion no responde de hacienda",
      result: false,
    });
  } else if (_auth.estado == "RECHAZADO") {
    return res.send({
      messaje: "Problema con autenicacion",
      result: false,
    });
  }
  let _token = "";
  _token = _auth.token;
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", _token);

  var raw = JSON.stringify({
    ambiente: process.env.DTE_AMBIENTE,
    idEnvio: 1,
    version: _identificacion.version,
    tipoDte: _identificacion.tipoDte,
    documento: _firma,
    codigoGeneracion: _identificacion.codigoGeneracion,
  });

  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  const postrecepciondte = async () => {
    try {
      const response = await fetch(
        "https://apitest.dtes.mh.gob.sv/fesv/recepciondte",
        requestOptions
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.log("error", error);
    }
  };

  const _respuestaMH = await postrecepciondte();
  await guardarRespuestaMH(_respuestaMH, _factura);
  await updateDte(_respuestaMH, _factura);
  await guardarObservacionesMH(_respuestaMH.observaciones, _factura);

  const JsonCliente = {
    identificacion: _identificacion,
    emisor: _emisor,
    receptor: _receptor,
    cuerpoDocumento: _cuerpo,
    resumen: _resumen,
    extension: _extesnsion,
    apendice: null,
    respuestaMh: _respuestaMH,
  };

  if (_respuestaMH.estado === "RECHAZADO") {
    try {
      //  await fac01(_factura);
      const fileName = path.join(
        __dirname,
        "../../storage/json/dte07/rechazados/"
      );
      const newfile = fileName + `${_identificacion.numeroControl}.json`;

      fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
      await emailRechazo(
        _identificacion.numeroControl,
        "cvelasquez@h2cgroup.com",
        "dte07"
      );

      res.send({
        messaje: "Procesado en Hacienda Rechazado",
        result: true,
        hacienda: false,
      });
    } catch (error) {
      console.log(error);
    }
    //enviamos correo a contabilidad para que corrigan porque esta rechazado
  } else if (_respuestaMH.estado == "PROCESADO") {
    //enviasmos correo a cliente y pdf

    //await fac03(_factura);
    //await fac01(_factura);
    const fileName = path.join(
      __dirname,
      "../../storage/json/dte07/aceptados/"
    );
    const newfile = fileName + `${_identificacion.numeroControl}.json`;

    fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
    await emailEnviado(
      _identificacion.numeroControl,
      "cvelasquez@h2cgroup.com",
      "dte07"
    );
    res.send({
      messaje: "Procesado en Hacienda Aceptados",
      result: true,
      hacienda: true,
    });
  }
};
const cuerpoDoc = async (documento) => {
  const datos = await sequelize.query(
    `EXEC dte.dbo.dte_AuxiliarCPdebito '${documento}','RET'`,
    {
      type: QueryTypes.SELECT,
    }
  );
  const docCp = await sequelize.query(
    `EXEC dte.dbo.dte_documentoCP '${datos[0].PROVEEDOR}','${datos[0].CREDITO}'`,
    {
      type: QueryTypes.SELECT,
    }
  );
  const notRetencion = await sequelize.query(
    `EXEC dte.dbo.dte_documentoCP '${datos[0].PROVEEDOR}','${datos[0].DEBITO}'`,
    {
      type: QueryTypes.SELECT,
    }
  );

  let cuerpo = [];
  const data = {
    numItem: 1,
    tipoDte: "03",
    tipoDoc: 1,
    numDocumento: docCp[0].DOCUMENTO,
    fechaEmision: moment
      .tz(docCp[0].FECHA_DOCUMENTO, "Amercia/El_Salvador")
      .format("YYYY-MM-DD"),
    montoSujetoGrav: docCp[0].SUBTOTAL,
    codigoRetencionMH: "22",
    ivaRetenido: datos[0].MONTO_DEBITO,
    descripcion: notRetencion[0].APLICACION,
  };
  cuerpo.push(data);
  return cuerpo;
};
const resumen = async (documento) => {
  const datos = await sequelize.query(
    `EXEC dte.dbo.dte_AuxiliarCPdebito '${documento}','RET'`,
    {
      type: QueryTypes.SELECT,
    }
  );
  const docCp = await sequelize.query(
    `EXEC dte.dbo.dte_documentoCP '${datos[0].PROVEEDOR}','${datos[0].CREDITO}'`,
    {
      type: QueryTypes.SELECT,
    }
  );
  const notRetencion = await sequelize.query(
    `EXEC dte.dbo.dte_documentoCP '${datos[0].PROVEEDOR}','${datos[0].DEBITO}'`,
    {
      type: QueryTypes.SELECT,
    }
  );

  const data = {
    totalSujetoRetencion: docCp[0].SUBTOTAL,
    totalIVAretenido: notRetencion[0].MONTO,
    totalIVAretenidoLetras: NumeroLetras(notRetencion[0].MONTO),
  };
  return data;
};
const extension = async () => {
  const data = {
    nombEntrega: null,
    docuEntrega: null,
    nombRecibe: null,
    docuRecibe: null,
    observaciones: null,
  };
  return data;
};
module.exports = postDte07;
