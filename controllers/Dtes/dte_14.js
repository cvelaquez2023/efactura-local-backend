//Factura de Sujecto Excluido

const doc = require("pdfkit");
const {
  identificacion,
  emisor,
  receptor,
  firmaMH,
  autorizacionMh,
} = require("../../config/MH");
const {
  Sqlempresa,
  SqlDocumentoCPDte14,
  SqlProveedorCodigo,
} = require("../../sqltx/sql");
const { sequelize } = require("../../config/mssql");
const { QueryTypes } = require("sequelize");
const { NumeroLetras } = require("../../config/letrasNumeros");
const {
  guardarDte,
  guardarIdentificacion,
  guardarEmision,
  guardarSubjectoExcluido,
  guardarcueroDocumento,
  guardarResumen,
  guardarRespuestaMH,
  updateDte,
  guardarObservacionesMH,
} = require("../../sqltx/Sqlguardar");
const { emailRechazo, emailEnviado } = require("../../utils/email");
const fs = require("fs");
const path = require("path");

const postDte14 = async (req, res) => {
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
  const _identificacion = await identificacion("14", _empresa, _factura);
  const _emisior = await emisor(_empresa, "14");
  const _subjectoExcluido = await subjectoexculido(_factura, "14");
  const _cuerpo = await cuerpoDoc(_factura);
  const _resumen = await resumen(_factura);
  const dte = {
    identificacion: _identificacion,
    emisor: _emisior,
    sujetoExcluido: _subjectoExcluido,
    cuerpoDocumento: _cuerpo,
    resumen: _resumen,
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
    nombre: _subjectoExcluido.nombre,
    procesado: 0,
    mudulo: "CP",
    tipoDoc: "01",
    selloRecibido: "ND",
    codigoGeneracion: _identificacion.codigoGeneracion,
    esatdo: "PENDIENTE",
    fechaemision: _identificacion.fecEmi,
    montoTotal: _resumen.totalCompra,
    Documento: _subjectoExcluido.numDocumento,
    Empresa_id: _empresa,
  };
  await guardarDte(dataDte);
  await guardarIdentificacion(_identificacion, _factura);
  await guardarEmision(_emisior, _factura);
  await guardarSubjectoExcluido(_subjectoExcluido, _factura);
  await guardarcueroDocumento(_cuerpo, _factura);
  await guardarResumen(_resumen, _factura);

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
    emisor: _emisior,
    subjectoExcluido: _subjectoExcluido,
    cuerpoDocumento: _cuerpo,
    resumen: _resumen,
    apendice: null,
    respuestaMh: _respuestaMH,
  };
  if (_respuestaMH.estado === "RECHAZADO") {
    try {
      //  await fac01(_factura);
      const fileName = path.join(
        __dirname,
        "../../storage/json/dte14/rechazados/"
      );
      const newfile = fileName + `${_identificacion.numeroControl}.json`;

      fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
      await emailRechazo(
        _identificacion.numeroControl,
        "cvelasquez@h2cgroup.com",
        "dte14"
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
      "../../storage/json/dte14/aceptados/"
    );
    const newfile = fileName + `${_identificacion.numeroControl}.json`;

    fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
    await emailEnviado(
      _identificacion.numeroControl,
      "cvelasquez@h2cgroup.com",
      "dte14"
    );
    res.send({
      messaje: "Procesado en Hacienda Aceptados",
      result: true,
      hacienda: true,
    });
  }
};
const subjectoexculido = async (_factura) => {
  const docCp = await SqlDocumentoCPDte14(_factura);
  const prove = await SqlProveedorCodigo(docCp[0].PROVEEDOR);
  let tipoDoc = "";
  if (prove[0].CONTRIBUYENTE.length === 9) {
    tipoDoc = "13";
  } else if (prove[0].CONTRIBUYENTE.length === 14) {
    tipoDoc = "36";
  } else {
    tipoDoc = "37";
  }

  const data = {
    tipoDocumento: tipoDoc,
    numDocumento: prove[0].CONTRIBUYENTE,
    nombre: prove[0].NOMBRE,
    codActividad: null,
    descActividad: null,
    direccion: {
      departamento: prove[0].DEPA,
      municipio: prove[0].MUNI,
      complemento: prove[0].DIRECCION.replace("DETALLE:", ""),
    },
    telefono: prove[0].TELEFONO1,
    correo: prove[0].E_MAIL,
  };
  return data;
};
const cuerpoDoc = async (_factura) => {
  const datos = await SqlDocumentoCPDte14(_factura);
  const _cuerpoDoc = [];
  const data = {
    numItem: 1,
    tipoItem: 2,
    cantidad: 1,
    codigo: null,
    uniMedida: 59,
    descripcion: datos[0].APLICACION,
    precioUni: datos[0].MONTO,
    montoDescu: 0,
    compra: datos[0].MONTO * 1,
  };
  _cuerpoDoc.push(data);
  return _cuerpoDoc;
};
const resumen = async (_factura) => {
  const docCo = await SqlDocumentoCPDte14(_factura);
  const auxCp = await sequelize.query(
    `EXEC DTE.dbo.dte_AuxiliarCpCredito '${_factura}','RET'`,
    {
      type: QueryTypes.SELECT,
    }
  );
  const datos = {
    totalCompra: docCo[0].MONTO,
    descu: 0.0,
    totalDescu: 0.0,
    subTotal: docCo[0].MONTO,
    ivaRete1: 0.0,
    reteRenta: auxCp[0].MONTO_DEBITO,
    totalPagar: docCo[0].MONTO - auxCp[0].MONTO_DEBITO,
    totalLetras: NumeroLetras(docCo[0].MONTO - auxCp[0].MONTO_DEBITO) + " USD",
    condicionOperacion: 1,
    pagos: [
      {
        codigo: "01",
        montoPago: parseFloat(
          (docCo[0].MONTO - auxCp[0].MONTO_DEBITO).toFixed(2)
        ),
        plazo: null,
        referencia: null,
        periodo: null,
      },
    ],
    observaciones: null,
  };
  return datos;
};

module.exports = { postDte14 };
