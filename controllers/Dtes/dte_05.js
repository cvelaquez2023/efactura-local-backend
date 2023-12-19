const doc = require("pdfkit");
const {
  identificacion,
  emisor,
  receptor,
  firmaMH,
  autorizacionMh,
} = require("../../config/MH");
const {
  auxiliarCCModel,
  documentoModel,
  facturaModel,
} = require("../../models");
const moment = require("moment");
const { sequelize } = require("../../config/mssql");
const { QueryTypes } = require("sequelize");
const { NumeroLetras } = require("../../config/letrasNumeros");
const {
  guardarDte,
  guardarIdentificacion,
  guardarDocumentoRelacionas,
  guardarEmision,
  guardarReceptor,
  guardarcueroDocumento,
  guardarResumen,
  guardarTributoResumen,
  guardarPagoResumen,
  guardarRespuestaMH,
  updateDte,
  guardarObservacionesMH,
} = require("../../sqltx/Sqlguardar");
const { emailRechazo, emailEnviado } = require("../../utils/email");

const fs = require("fs");
const path = require("path");
//Nota Credito
const postDte05 = async (req, res) => {
  const _factura = req.params.factura;
  const _empresa = req.params.id;

  if (!_factura) {
    return res.send({ messaje: "Es requerida Numero Factura", result: false });
  }

  const _docExit = await documentoModel.findAll(
    {
      where: { DOCUMENTO: _factura },
    },
    (raw = true)
  );
  if (_docExit.length === 0) {
    return res.send({ messaje: "Documento no existe", result: false });
  }

  const _auxiliarCC = await auxiliarCCModel.findAll({
    where: { CREDITO: _factura },
    raw: true,
  });
  const _identificacion = await identificacion("05", _empresa, _factura);
  const _docRela = await docRelacionados(_auxiliarCC);
  const _emisor = await emisor(_empresa, "05");
  const _receptor = await receptor(_factura, "05");
  const _cuerpo = await cuerpoDoc(_factura);
  const _resumen = await resumen(_factura);

  const _extension = null;
  const _apendice = null;

  const dte = {
    identificacion: _identificacion,
    documentoRelacionado: _docRela,
    emisor: _emisor,
    receptor: _receptor,
    ventaTercero: null,
    cuerpoDocumento: _cuerpo,
    resumen: _resumen,
    extension: _extension,
    apendice: _apendice,
  };

  const datafirma = {
    nit: process.env.DTE_NIT,
    activo: true,
    passwordPri: process.env.DTE_PWD_PRIVADA,
    dteJson: dte,
  };

  //guardamos en base de datos dte
  const dataDte = {
    dte: _factura,
    origen: "CLIENTE",
    nombre: _receptor.nombre,
    procesado: 0,
    mudulo: "FA",
    tipoDoc: "05",
    selloRecibido: "ND",
    codigoGeneracion: _identificacion.codigoGeneracion,
    esatdo: "PENDIENTE",
    fechaemision: _identificacion.fecEmi,
    montoTotal: _resumen.totalGravada,
    Documento: _receptor.nit,
    Empresa_id: _empresa,
  };

  await guardarDte(dataDte);
  await guardarIdentificacion(_identificacion, _factura);
  await guardarDocumentoRelacionas(_docRela, _factura);
  await guardarEmision(_emisor, _factura);
  await guardarReceptor(_receptor, _factura);
  await guardarcueroDocumento(_cuerpo, _factura);
  await guardarResumen(_resumen, _factura);
  await guardarTributoResumen(_resumen.tributos, _factura);

  ///Realizamos firma
  const _firma = await firmaMH(datafirma);
  if (_firma == "ERROR") {
    //Se envia corre
    return res.send({
      messaje: "Es Servidor de Firma no responde",
      result: false,
    });
  }

  //Atutenticamos
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

  //enviamos el documento a la direccion del ministerio de Hacienda para que nos regrese el sello
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
    documentoRelacionado: _docRela,
    emisor: _emisor,
    receptor: _receptor,
    ventaTercero: null,
    cuerpoDocumento: _cuerpo,
    resumen: _resumen,
    extension: null,
    apendice: null,
    respuestamh: _respuestaMH,
  };

  if (_respuestaMH.estado === "RECHAZADO") {
    try {
      //  await fac01(_factura);

      const fileName = path.join(
        __dirname,
        "../../storage/json/dte05/rechazados/"
      );
      const newfile = fileName + `${_factura}.json`;

      fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
      await emailRechazo(_factura, "cvelasquez@h2cgroup.com", "dte05");

      res.send({ data: _respuestaMH, result: true });
    } catch (error) {
      console.log(error);
    }
    //enviamos correo a contabilidad para que corrigan porque esta rechazado
  } else if (_respuestaMH.estado == "PROCESADO") {
    //enviasmos correo a cliente y pdf

    //await fac01(_factura);
    const fileName = path.join(
      __dirname,
      "../../storage/json/dte05/aceptados/"
    );
    const newfile = fileName + `${_factura}.json`;

    fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
    await emailEnviado(_factura, "cvelasquez@h2cgroup.com", "dte05");
    res.send({ data: _respuestaMH, result: true });
  }
};

const docRelacionados = async (datos) => {
  const datosRelacionados = [];
  for (let x = 0; x < datos.length; x++) {
    const element = datos[x];

    const _documentosCC = await documentoModel.findAll({
      where: { DOCUMENTO: element.CREDITO },
      raw: true,
    });

    if (_documentosCC[0].CARGADO_DE_FACT == "S") {
      const factura = await facturaModel.findAll({
        where: { FACTURA: element.DEBITO },
        raw: true,
      });
      const date = moment(new Date(factura[0].FECHA_HORA));
      const momentDate = moment(date).format("YYYY-MM-DD");
      const dataFactura = {
        tipoDocumento: "03",
        tipoGeneracion: 1,
        numeroDocumento: factura[0].FACTURA,
        fechaEmision: momentDate,
      };
      datosRelacionados.push(dataFactura);
    } else {
      const documentosCC = await documentoModel.findAll({
        where: { DOCUMENTO: element.DEBITO },
        raw: true,
      });

      const dataFactura = {
        tipoDocumento: "03",
        tipoGeneracion: 1,
        numeroDocumento: documentosCC[0].DOCUMENTO,
        fechaEmision: moment(documentosCC[0].FECHA_DOCUMENTO).format(
          "YYYY-MM-DD"
        ),
      };
      datosRelacionados.push(dataFactura);
    }
  }
  return datosRelacionados;
};

const cuerpoDoc = async (_documento) => {
  const _documentosCC = await documentoModel.findAll({
    where: { DOCUMENTO: _documento },
    raw: true,
  });

  const _auxiliarCC = await auxiliarCCModel.findAll({
    where: { CREDITO: _documento },
    raw: true,
  });

  if (_documentosCC[0].CARGADO_DE_FACT == "N") {
    const _cuerpoDoc = [];
    const _doc = await documentoModel.findAll({
      where: { DOCUMENTO: _documento },
      raw: true,
    });
    const data = {
      numItem: 1,
      tipoItem: 1,
      numeroDocumento: _auxiliarCC[0].DEBITO,
      codigo: null,
      codTributo: null,
      descripcion: _doc[0].APLICACION,
      cantidad: 1,
      uniMedida: 59,
      precioUni: parseFloat(_doc[0].MONTO.toFixed(4)),
      montoDescu: 0,
      ventaNoSuj: 0.0,
      ventaExenta: 0.0,
      ventaGravada: parseFloat(_doc[0].MONTO.toFixed(4)),
      tributos: ["20"],
    };
    _cuerpoDoc.push(data);

    return _cuerpoDoc;
  } else {
    const dataFacLinea = await sequelize.query(
      `EXEC dte.dbo.dte_FacturaLinea '${_documento}'`,
      { type: QueryTypes.SELECT }
    );
    const _cuerpoDoc = [];
    let totalLinea = 0;
    let totalDescuento = 0;
    let totalImpuesto1 = 0;
    let ventatotalGravada = 0;
    const _auxi = await auxiliarCCModel.findAll({
      where: { CREDITO: _documento },
      raw: true,
    });

    for (let index = 0; index < dataFacLinea.length; index++) {
      const element = dataFacLinea[index];
      const precio = element.PRECIO_UNITARIO;
      const decLinea = element.DESC_TOT_LINEA;
      const decVolumen = element.DESCUENTO_VOLUMEN;
      const totalDesc = decLinea + decVolumen;
      const cantidad = element.CANTIDAD;
      const precioTotal = precio * cantidad;
      const ventagravada = precioTotal - totalDesc;

      let _tributo = "";
      if (parseFloat(ventagravada.toFixed(4)) == 0) {
        _tributo = null;
      } else {
        _tributo = ["20"];
      }

      let _facturaCC;

      if (_auxi.length > index) {
        _facturaCC = _auxi[index].DEBITO;
      } else {
        _facturaCC = _auxi[_auxi.length - 1].DEBITO;
      }
      const data = {
        numItem: element.LINEA,
        tipoItem: 1,
        numeroDocumento: _facturaCC,
        codigo: element.ARTICULO,
        codTributo: null,
        descripcion:
          element.DESCRIPCION +
          " LOTE:" +
          element.LOTE +
          " FECHA_VENCE:" +
          element.FECHAVENCE,
        cantidad: element.CANTIDAD,
        uniMedida: 59,
        precioUni: precio,
        montoDescu: totalDesc,
        ventaNoSuj: 0.0,
        ventaExenta: 0.0,
        ventaGravada: parseFloat(ventagravada.toFixed(4)),
        tributos: _tributo,
      };
      const _totalLinea = precioTotal;
      const _totalDescuento = totalDesc;
      const _totalImpuesto1 = element.TOTAL_IMPUESTO1;
      const _totalVentaGRavada = precioTotal - totalDesc;
      totalLinea = totalLinea + _totalLinea;
      totalDescuento = totalDescuento + _totalDescuento;
      totalImpuesto1 = totalImpuesto1 + _totalImpuesto1;

      ventatotalGravada = ventatotalGravada + _totalVentaGRavada;
      _cuerpoDoc.push(data);
    }

    const _totalPagar = totalLinea - totalDescuento + totalImpuesto1;
    return _cuerpoDoc;
  }
};
const resumen = async (_documento) => {
  const _documentosCC = await documentoModel.findAll({
    where: { DOCUMENTO: _documento },
    raw: true,
  });

  const _resumen = {
    totalNoSuj: 0.0,
    totalExenta: 0.0,
    totalGravada: parseFloat(
      (_documentosCC[0].MONTO - _documentosCC[0].IMPUESTO1).toFixed(2)
    ),
    subTotalVentas: parseFloat(
      (_documentosCC[0].MONTO - _documentosCC[0].IMPUESTO1).toFixed(2)
    ),
    descuNoSuj: 0.0,
    descuExenta: 0.0,
    descuGravada: 0.0,
    totalDescu: 0,
    tributos: [
      {
        codigo: "20",
        descripcion: "Impuesto al Valor Agregado 13%",
        valor: parseFloat(_documentosCC[0].IMPUESTO1.toFixed(2)),
      },
    ],
    subTotal: parseFloat(
      (_documentosCC[0].MONTO - _documentosCC[0].IMPUESTO1).toFixed(2)
    ),
    ivaPerci1: 0,
    ivaRete1: 0,
    reteRenta: 0,
    montoTotalOperacion: parseFloat(_documentosCC[0].MONTO.toFixed(2)),
    totalLetras:
      NumeroLetras(parseFloat(_documentosCC[0].MONTO.toFixed(2))) + " USD",

    condicionOperacion: 1,
  };
  return _resumen;
};
module.exports = postDte05;
