const { QueryTypes } = require("sequelize");
const fs = require("fs");
const path = require("path");
const {
  identificacion,
  emisor,
  receptor,
  firmaMH,
  autorizacionMh,
} = require("../../config/MH");
const { sequelize } = require("../../config/mssql");
const { subtipoDocCCModel } = require("../../models");
const {
  Sqlempresa,
  SqlFactura,
  SqlCliente,
  SqlDocumentoCC,
  SqlFacturaLinea,
} = require("../../sqltx/sql");
const { NumeroLetras } = require("../../config/letrasNumeros");
const {
  guardarDte,
  guardarEmision,
  guardarReceptor,
  guardarIdentificacion,
  guardarcueroDocumento,
  guardarRespuestaMH,
  guardarResumen,
  guardarPagoResumen,
  updateDte,
  guardarObservacionesMH,
} = require("../../sqltx/Sqlguardar");
const { emailRechazo, emailEnviado } = require("../../utils/email");

//Factura Exportacion
const postDte11 = async (req, res) => {
  const _factura = req.params.factura;
  const _empresa = req.params.id;

  if (!_factura) {
    return res.send({ messaje: "Es requerida Numero Factura", result: false });
  }
  const _docExit = await SqlDocumentoCC(_factura);
  if (_docExit.length === 0) {
    return res.send({ messaje: "Documento no existe", result: false });
  }

  const empresa = await Sqlempresa(_empresa);

  if (empresa.length == 0) {
    return res.send({
      messaje: "Empresa No existe o no esta activa",
      result: false,
    });
  }
  const _identificacion = await identificacion("11", _empresa, _factura);
  const _emisor = await emisor(_empresa, "11");
  const _receptor = await receptor(_factura, "11");
  const _cuerpo = await cuerpoDoc(_factura);
  const _resumen = await resumen(_factura);
  const dte = {
    identificacion: _identificacion,
    emisor: _emisor,
    receptor: _receptor,
    otrosDocumentos: null,
    ventaTercero: null,
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
    nombre: _receptor.nombre,
    procesado: 0,
    mudulo: "FA",
    tipoDoc: "11",
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
  await guardarEmision(_emisor, _factura);
  await guardarReceptor(_receptor, _factura);
  await guardarcueroDocumento(_cuerpo, _factura);
  await guardarResumen(_resumen, _factura);
  await guardarPagoResumen(_resumen.pagos, _factura);

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
    ventaTercero: null,
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
        "../../storage/json/dte11/rechazados/"
      );
      const newfile = fileName + `${_identificacion.numeroControl}.json`;

      fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
      await emailRechazo(
        _identificacion.numeroControl,
        "cvelasquez@h2cgroup.com",
        "dte11"
      );

      res.send({
        messaje: "Procesado en Hacienda Rechazado",
        result: JsonCliente,
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
      "../../storage/json/dte11/aceptados/"
    );
    const newfile = fileName + `${_identificacion.numeroControl}.json`;

    fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
    await emailEnviado(
      _identificacion.numeroControl,
      "cvelasquez@h2cgroup.com",
      "dte11"
    );
    res.send({
      messaje: "Procesado en Hacienda Aceptados",
      result: true,
      hacienda: true,
    });
  }
};
const cuerpoDoc = async (_factura) => {
  const dataFacLinea = await sequelize.query(
    `EXEC dte.dbo.dte_FacturaLinea '${_factura}'`,
    { type: QueryTypes.SELECT }
  );

  const _cuerpoDoc = [];
  let totalLinea = 0;
  let totalDescuento = 0;
  let totalImpuesto1 = 0;
  let ventatotalGravada = 0;
  for (let index = 0; index < dataFacLinea.length; index++) {
    const element = dataFacLinea[index];
    const precio = element.PRECIO_UNITARIO.toFixed(4);
    const decLinea = element.DESC_TOT_LINEA.toFixed(4);
    const decVolumen = element.DESCUENTO_VOLUMEN.toFixed(4);
    const totalDesc = parseFloat(decLinea) + parseFloat(decVolumen);
    const cantidad = element.CANTIDAD;
    const precioTotal = parseFloat(precio * cantidad);
    const ventagravada = parseFloat(precioTotal - totalDesc);
    let _tributo = null;
    const data = {
      numItem: element.LINEA,
      codigo: element.ARTICULO,
      descripcion:
        element.DESCRIPCION +
        " LOTE:" +
        element.LOTE +
        " FECHA_VENCE:" +
        element.FECHAVENCE,
      cantidad: element.CANTIDAD,
      uniMedida: 59,
      precioUni: parseFloat(precio),
      montoDescu: parseFloat(totalDesc.toFixed(4)),
      ventaGravada: parseFloat(ventagravada.toFixed(4)),
      tributos: _tributo,
      noGravado: 0,
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

  const _totalPagar = totalLinea - totalDescuento;
  return _cuerpoDoc;
};
const resumen = async (_documento) => {
  const _fac = await SqlFactura(_documento);
  const _facL = await SqlFacturaLinea(_documento);
  let totalDescuento = 0;
  for (let index = 0; index < _facL.length; index++) {
    const element = _facL[index];
    totalDescuento =
      totalDescuento + (element.DESC_TOT_LINEA + element.DESCUENTO_VOLUMEN);
  }
  const _resumen = {
    totalGravada: parseFloat(_fac[0].totalGravada.toFixed(2)),
    descuento: parseFloat( totalDescuento.toFixed(2)),
    porcentajeDescuento: 0.0,
    totalDescu: parseFloat(totalDescuento.toFixed(2)),
    montoTotalOperacion: parseFloat(_fac[0].montoTotalOperacion.toFixed(2)),
    totalNoGravado: 0,
    totalPagar: parseFloat(_fac[0].totalPagar.toFixed(2)),
    totalLetras:
      NumeroLetras(parseFloat(_fac[0].totalPagar.toFixed(2))) + " USD",
    condicionOperacion: 1,
    pagos: [
      {
        codigo: "01",
        montoPago: parseFloat(_fac[0].totalPagar.toFixed(2)),
        plazo: null,
        referencia: null,
        periodo: null,
      },
    ],
    codIncoterms: null,
    descIncoterms: null,
    observaciones: null,
    flete: 0.0,
    numPagoElectronico: null,
    seguro: 0.0,
  };
  return _resumen;
};
module.exports = postDte11;
