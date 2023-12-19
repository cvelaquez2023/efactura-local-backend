const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/mssql");
const { NumeroLetras } = require("../../config/letrasNumeros");
const Sql = require("../../sqltx/sql");

const {
  firmaMH,
  autorizacionMh,
  identificacion,
  emisor,
  receptor,
} = require("../../config/MH");
const { emailRechazo, emailEnviado } = require("../../utils/email");
const fs = require("fs");
const path = require("path");
const { transporter } = require("../../config/mailer");
const { error } = require("console");
const { fac01, fac03 } = require("../../storage/pdf/dte01/factura");
const {
  guardarIdentificacion,
  guardarEmision,
  guardarReceptor,
  guardarcueroDocumento,
  guardarRespuestaMH,
  guardarTributoResumen,
  guardarPagoResumen,
  updateDte,
  guardarObservacionesMH,
  guardarDte,
  guardarResumen,
} = require("../../sqltx/Sqlguardar");
//Factura
const postDte01 = async (req, res) => {
  const _factura = req.params.factura;
  const _empresa = req.params.id;

  if (!_factura) {
    return res.send({
      messaje: "Es requerida Numero Factura",
      result: false,
    });
  }

  const _docExit = await Sql.SqlDocumentoCC(_factura);
  if (_docExit.length === 0) {
    return res.send({ messaje: "Documento no existe", result: false });
  }

  const empresa = await Sql.Sqlempresa(_empresa);

  if (empresa.length === 0) {
    return res.send({
      messaje: "Empresa No existe o no esta activa",
      result: false,
    });
  }

  const _identificacion = await identificacion("01", _empresa, _factura);
  const _documentoRelacionado = null;
  const _emisor = await emisor(_empresa, "01");
  const _receptor = await receptor(_factura, "01");
  const _otrosDocumentos = null;
  const _ventaTercero = null;
  const _cuerpo = await cuerpoDoc(_factura);
  const _resumen = await resumen(_factura);
  const _extension = null;
  const _apendice = null;

  const dte = {
    identificacion: _identificacion,
    documentoRelacionado: _documentoRelacionado,
    emisor: _emisor,
    receptor: _receptor,
    otrosDocumentos: _otrosDocumentos,
    ventaTercero: _ventaTercero,
    cuerpoDocumento: _cuerpo,
    resumen: _resumen,
    extension: _extension,
    apendice: _apendice,
  };

  //procedemos a recibir la firma del documento
  //convertimos descodificamos firma

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
    tipoDoc: "01",
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

  //consultamos el token si no esta vencido aun
  /*
  const _tokenEmpresa = await sequelize.query(
    `select tokenUser,fechaHoraToken from DTE.dbo.parametros where nit='${_nit}' `
  );

  const _fechaHoraToken = _tokenEmpresa[0][0].fechaHoraToken;
  let _token = _tokenEmpresa[0][0].tokenUser;

  //Guardamos en token para valdiarlo que esta activo aun
  const _diaHoraHoy = new Date();

  if (Date.parse(_diaHoraHoy) > Date.parse(_fechaHoraToken)) {
    // console.log(Date.parse(_diaHoraHoy), Date.parse(_fechaHoraToken));
    const _auth = await autorizacionMh(
      process.env.DTE_USER_API,
      process.env.DTE_PWD_API
    );
    _token = _auth.token;

    const inserToken = await sequelize.query(
      "update DTE.dbo.parametros set tokenUser=(:_1), fechaHoraToken=getdate() where nit=(:_2)  ",
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
    documentoRelacionado: _documentoRelacionado,
    emisor: _emisor,
    receptor: _receptor,
    otrosDocumentos: _otrosDocumentos,
    ventaTercero: _ventaTercero,
    cuerpoDocumento: _cuerpo,
    resumen: _resumen,
    extension: _extension,
    apendice: _apendice,
    respuestaMh: _respuestaMH,
  };

  if (_respuestaMH.estado === "RECHAZADO") {
    try {
      //  await fac01(_factura);
      const fileName = path.join(
        __dirname,
        "../../storage/json/dte01/rechazados/"
      );
      const newfile = fileName + `${_identificacion.numeroControl}.json`;

      fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
      await emailRechazo(
        _identificacion.numeroControl,
        "cvelasquez@h2cgroup.com",
        "dte01"
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
      "../../storage/json/dte01/aceptados/"
    );
    const newfile = fileName + `${_identificacion.numeroControl}.json`;

    fs.writeFileSync(newfile, JSON.stringify(JsonCliente));
    await emailEnviado(
      _identificacion.numeroControl,
      "cvelasquez@h2cgroup.com",
      "dte01"
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
    const precio =
      element.PRECIO_UNITARIO * parseFloat(process.env.DTE_IMPUESTO);
    const decLinea =
      element.DESC_TOT_LINEA * parseFloat(process.env.DTE_IMPUESTO);
    const decVolumen =
      element.DESCUENTO_VOLUMEN * parseFloat(process.env.DTE_IMPUESTO);
    const totalDesc = parseFloat(decLinea + decVolumen);
    const cantidad = element.CANTIDAD;
    const precioTotal = precio * cantidad;
    const ventagravada = precioTotal - totalDesc;
    let _tributo = null;
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
      precioUni: parseFloat(precio.toFixed(4)),
      montoDescu: parseFloat(totalDesc.toFixed(4)),
      ventaNoSuj: 0.0,
      ventaExenta: 0.0,
      ventaGravada: parseFloat(ventagravada.toFixed(4)),
      tributos: _tributo,
      psv: 0.0,
      noGravado: 0,
      ivaItem: parseFloat(element.TOTAL_IMPUESTO1.toFixed(4)),
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
  const _fac = await Sql.SqlFactura(_documento);
  const _facL = await Sql.SqlFacturaLinea(_documento);
  let totalDescuento = 0;
  for (let index = 0; index < _facL.length; index++) {
    const element = _facL[index];
    totalDescuento =
      totalDescuento + (element.DESC_TOT_LINEA + element.DESCUENTO_VOLUMEN);
  }
  const _resumen = {
    totalNoSuj: 0.0,
    totalExenta: 0.0,
    totalGravada: parseFloat(
      (_fac[0].totalGravada * process.env.DTE_IMPUESTO).toFixed(2)
    ),
    subTotalVentas: parseFloat(
      (_fac[0].subTotalVentas * process.env.DTE_IMPUESTO).toFixed(2)
    ),
    descuNoSuj: 0.0,
    descuExenta: 0.0,
    descuGravada: 0.0,
    porcentajeDescuento: 0.0,
    totalDescu: parseFloat(
      (totalDescuento * process.env.DTE_IMPUESTO).toFixed(2)
    ),
    tributos: null,
    subTotal: parseFloat(
      (_fac[0].subTotalVentas * process.env.DTE_IMPUESTO).toFixed(2)
    ),
    //ivaPerci1: 0,
    ivaRete1: 0,
    reteRenta: 0,
    montoTotalOperacion: parseFloat(_fac[0].montoTotalOperacion.toFixed(2)),
    totalNoGravado: 0,
    totalPagar: parseFloat(_fac[0].totalPagar.toFixed(2)),
    totalLetras:
      NumeroLetras(parseFloat(_fac[0].totalPagar.toFixed(2))) + " USD",
    totalIva: parseFloat(_fac[0].totalImpuesto.toFixed(2)),
    saldoFavor: 0,
    condicionOperacion: 1,
    pagos: [
      {
        codigo: "01",
        montoPago: parseFloat(
          (_fac[0].totalPagar * process.env.DTE_IMPUESTO).toFixed(2)
        ),
        plazo: null,
        referencia: null,
        periodo: null,
      },
    ],
    numPagoElectronico: null,
  };
  return _resumen;
};

module.exports = { postDte01 };
