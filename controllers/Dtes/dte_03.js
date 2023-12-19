const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/mssql");
const { subtipoDocCCModel, documentoModel } = require("../../models");
const { NumeroLetras } = require("../../config/letrasNumeros");
const { desencrypt } = require("../../utils/handlePassword");

const fs = require("fs");
const path = require("path");
const {
  receptor,
  identificacion,
  emisor,
  firmaMH,
  autorizacionMh,
} = require("../../config/MH");
const {
  SqlFactura,
  SqlFacturaLinea,
  Sqlempresa,
  SqlDocumentoCC,
} = require("../../sqltx/sql");
const {
  guardarDte,
  guardarIdentificacion,
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
//Credito Fiscal
const postDte03 = async (req, res) => {
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
  if (empresa.length === 0) {
    return res.send({
      messaje: "Empresa No existe o no esta activa",
      result: false,
    });
  }
  const _identificacion = await identificacion("03", _empresa, _factura);
  const _emisor = await emisor(_empresa, "03");
  const _receptor = await receptor(_factura, "03");
  const _cuerpo = await cuerpoDoc(_factura);
  const _resumen = await resumen(_factura);
  const _extension = null;
  const _apendice = null;

  const dte = {
    identificacion: _identificacion,
    documentoRelacionado: null,
    emisor: _emisor,
    receptor: _receptor,
    otrosDocumentos: null,
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
    tipoDoc: "03",
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
  await guardarTributoResumen(_resumen.tributos, _factura);
  await guardarPagoResumen(_resumen.pagos, _factura);

  //Realizamos Firma
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

  /*
  //consultamos el token si no esta vencido aun
  const _tokenEmpresa = await sequelize.query(
    `select tokenUser,fechaHoraToken from DTE.dbo.empresa where Empresa_id='${_empresa}' `
  );
  const _fechaHoraToken = _tokenEmpresa[0][0].fechaHoraToken;
  let _token2 = _tokenEmpresa[0][0].tokenUser;
  //Guardamos en token para valdiarlo que esta activo aun
  const _diaHoraHoy = new Date();

  if (Date.parse(_diaHoraHoy) > Date.parse(_fechaHoraToken)) {
    console.log(Date.parse(_diaHoraHoy), Date.parse(_fechaHoraToken));
    const _auth = await getAuthMH();
    _token = _auth.token;

    const inserToken = await sequelize.query(
      "update DTE.dbo.empresa set tokenUser=(:_1), fechaHoraToken=getdate() where nit=(:_2)  ",
      {
        replacements: {
          _1: _token,
          _2: process.env.DTE_NIT,
        },
      },
      { type: QueryTypes.UPDATE }
    );
  }
*/
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
    documentoRelacionado: null,
    emisor: _emisor,
    receptor: _receptor,
    otrosDocumentos: null,
    ventaTercero: null,
    cuerpoDocumento: _cuerpo,
    resumen: _resumen,
    extension: null,
    apendice: null,
    respuestaMh: _respuestaMH,
  };

  if (_respuestaMH.estado === "RECHAZADO") {
    try {
      //  await fac01(_factura);

      const fileName = path.join(
        __dirname,
        "../../storage/json/dte03/rechazados/"
      );
      const newfile = fileName + `${_identificacion.numeroControl}.json`;

      fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
      await emailRechazo(
        _identificacion.numeroControl,
        "cvelasquez@h2cgroup.com",
        "dte03"
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

    //await fac01(_factura);
    const fileName = path.join(
      __dirname,
      "../../storage/json/dte03/aceptados/"
    );
    const newfile = fileName + `${_identificacion.numeroControl}.json`;

    fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
    await emailEnviado(
      _identificacion.numeroControl,
      "cvelasquez@h2cgroup.com",
      "dte03"
    );
    res.send({
      messaje: "Procesado en Hacienda Aceptados",
      result: true,
      hacienda: true,
    });
  }
};
const cuerpoDoc = async (_documento) => {
  const dataFacLinea = await sequelize.query(
    `EXEC dte.dbo.dte_FacturaLinea '${_documento}'`,
    { type: QueryTypes.SELECT }
  );
  const _cuerpoDoc = [];
  let totalLinea = 0;
  let totalDescuento = 0;
  let totalImpuesto1 = 0;
  let ventatotalGravada = 0;
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

    const data = {
      numItem: element.LINEA,
      tipoItem: 1,
      numeroDocumento: null,
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
      psv: 0.0,
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

  const _totalPagar = totalLinea - totalDescuento + totalImpuesto1;
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
    totalNoSuj: 0.0,
    totalExenta: 0.0,
    totalGravada: parseFloat(_fac[0].totalGravada.toFixed(2)),
    subTotalVentas: parseFloat(_fac[0].subTotalVentas.toFixed(2)),
    descuNoSuj: 0.0,
    descuExenta: 0.0,
    descuGravada: 0.0,
    porcentajeDescuento: 0.0,
    totalDescu: parseFloat(totalDescuento.toFixed(2)),
    tributos: [
      {
        codigo: "20",
        descripcion: "Impuesto al Valor Agregado 13%",
        valor: parseFloat(_fac[0].totalImpuesto.toFixed(2)),
      },
    ],
    subTotal: parseFloat(_fac[0].subTotal.toFixed(2)),
    ivaPerci1: 0,
    ivaRete1: 0,
    reteRenta: 0,
    montoTotalOperacion: parseFloat(_fac[0].montoTotalOperacion.toFixed(2)),
    totalNoGravado: 0,
    totalPagar: parseFloat(_fac[0].totalPagar.toFixed(2)),
    totalLetras:
      NumeroLetras(parseFloat(_fac[0].totalPagar.toFixed(2))) + " USD",
    saldoFavor: 0,
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
    numPagoElectronico: null,
  };

  return _resumen;
};

module.exports = { postDte03 };
