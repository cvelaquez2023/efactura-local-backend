const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/mssql");
const {
  dteModel,
  proveedorModel,
  tipoDocModel,
  condicionPagoModel,
  impuestoModel,
} = require("../models");
const { raw } = require("body-parser");
const moment = require("moment");

const postDteProveedor = async (req, res) => {
  try {
    const {
      version,
      ambiente,
      tipoDte,
      numeroControl,
      codigoGeneracion,
      tipoModelo,
      tipoOperacion,
      tipoContingencia,
      motivoContin,
      fecEmi,
      horEmi,
      tipoMoneda,
    } = req.body.identificacion;
    //Leemos emisor
    const e_nit = req.body.emisor.nit;
    const e_nrc = req.body.emisor.nrc;
    const e_nombre = req.body.emisor.nombre;
    const e_codActividad = req.body.emisor.codActividad;
    const e_descActividad = req.body.emisor.descActividad;
    const e_nombreComercial = req.body.emisor.nombreComercial;
    const e_tipoEstablecimiento = req.body.emisor.tipoEstablecimiento;
    const e_departamento = req.body.emisor.direccion.departamento;
    const e_municipio = req.body.emisor.direccion.municipio;
    const e_complemento = req.body.emisor.direccion.complemento;
    const e_telefono = req.body.emisor.telefono;
    const e_correo = req.body.emisor.correo;
    const e_codEstableMH = req.body.emisor.codEstableMH;
    const e_codEstable = req.body.emisor.codEstable;
    const e_codPuntoVentaMH = req.body.emisor.codPuntoVentaMH;
    const e_codPuntoVenta = req.body.emisor.codPuntoVenta;

    let _selloRecivido = "";
    let _encontreSello = false;
    let _message = "";
    var demo = req.body;
    const myObje = Object.entries(demo);

    for (let i = 0; i < myObje.length; i++) {
      const element = myObje[i];

      if (element[0] == "selloRecibido") {
        _selloRecivido = element[1];
        _encontreSello = true;
      }

      for (let x = 0; x < element.length; x++) {
        const element2 = element[x];

        if (element2 != null) {
          const dte = element2.hasOwnProperty("selloRecibido");
          if (dte) {
            _selloRecivido = element2.selloRecibido;
            _encontreSello = true;
          }
        }
      }
    }
    if (!_encontreSello) {
      /*
      return res.send({
        results: "JSON no tiene sello de Recibido",
        result: false,
        message: "",
      });
      */
      _message = "No se encontro sello Recibido por hacienda";
      _selloRecivido = "ND";
    }
    //const {} = req.body.documentoRelacionado;

    //Consultamos si ya existe en dtes  por medio de dte  proveedor y codigoGeneracion
    const _existDte = await sequelize.query(
      `select  dte from dte.dbo.DTES where dte='${numeroControl}' and codigoGeneracion='${codigoGeneracion}' and documento='${e_nit}' and origen='PROVEEDOR'`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (_existDte.length > 0) {
      return res.send({
        result: `DTE ya fue ingresado al proveedor y Codigo Generacion :${numeroControl} , ${e_nombre} y su NIT ${e_nit} `,
        success: false,
        errors: [
          `DTE ya fue ingresado al proveedor y Codigo Generacion :${numeroControl} , ${e_nombre} y su NIT ${e_nit} `,
        ],
      });
    }
    //Consultamos si el dte ya esta en softlandERP
    //1 consultamos el proveedor por medio del nit
    //let _proveedor = "";
    const _proveedor = await sequelize.query(
      `EXEC dte.dbo.dte_proveedor '${e_nit}'`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (_proveedor.length === 0) {
      return res.send({
        result: `No existe Proveedor en Cuentas Por Pagar ${e_nombre} y su NIT ${e_nit} `,
        success: false,
        errors: [
          `No existe Proveedor en Cuentas Por Pagar ${e_nombre} y su NIT ${e_nit} `,
        ],
      });
    }
    //Verificamos si ya fue ingresado el dte al proveedor

    const _documentoCP = await sequelize.query(
      `EXEC dte.dbo.dte_documentoCP '${_proveedor[0].PROVEEDOR}','${numeroControl}'`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (_documentoCP[0]) {
      return res.send({
        result: `Documento Dte ya fue ingresado al proveedor ${_proveedor[0].PROVEEDOR} `,
        success: false,
        errors: `Documento Dte ya fue ingresado al proveedor ${_proveedor[0].PROVEEDOR} `,
      });
    }

    const cdId = await sequelize.query(
      "select max(cuerpoDocumento_id) as id from DTE.dbo.cuerpoDocumento",
      {},
      { type: QueryTypes.SELECT }
    );
    const cd_Id = cdId[0][0].id;
    //fin

    //guardamos en tabla de DTES
    const insertDTES = await sequelize.query(
      "INSERT INTO DTE.dbo.DTES(Dte,origen,nombre,tipoDoc,selloRecibido,codigoGeneracion,fechaemision,montoTotal,documento,CreateDate,estado,procesado)VALUES((:_1),(:_2),(:_3),(:_4),(:_5),(:_6),(:_7),(:_8),(:_9),getdate(),'PENDIENTE',0)",
      {
        replacements: {
          _1: numeroControl,
          _2: "PROVEEDOR",
          _3: e_nombre,
          _4: tipoDte,
          _5: _selloRecivido,
          _6: codigoGeneracion,
          _7: fecEmi,
          _8: req.body.resumen.montoTotalOperacion,
          _9: e_nit,
        },
      },
      { type: QueryTypes.UPDATE }
    );

    //Consultamos el id guardado
    const DteId = await sequelize.query(
      "select Dte_id from DTE.dbo.DTES WHERE Dte=(:_1)",
      {
        replacements: { _1: numeroControl },
      },
      { type: QueryTypes.SELECT }
    );
    const Id = DteId[0][0].Dte_id;

    //Guardamos en la tabla de identificacion
    const insertIdentificacion = await sequelize.query(
      "INSERT INTO DTE.DBO.identificacion(Dte_id,version,ambiente,tipoDte,numeroControl,codigoGeneracion,tipoModelo,tipoOperacion,tipoContingencia,motivoContin, fecEmi,horEmi,tipoMoneda)values((:_1),(:_2),(:_3),(:_4),(:_5),(:_6),(:_7),(:_8),(:_9),(:_10),(:_11),(:_12),(:_13))",
      {
        replacements: {
          _1: Id,
          _2: version,
          _3: ambiente,
          _4: tipoDte,
          _5: numeroControl,
          _6: codigoGeneracion,
          _7: tipoModelo,
          _8: tipoOperacion,
          _9: tipoContingencia,
          _10: motivoContin,
          _11: fecEmi,
          _12: horEmi,
          _13: tipoMoneda,
        },
      },
      { type: QueryTypes.INSERT }
    );

    //Validasmos si documentoRelacionado trae datos
    if (req.body.documentoRelacionado) {
      //Guardamos los documentos relacionado

      const _documtoRelacionados = req.body.documentoRelacionado;

      for (let xx = 0; xx < _documtoRelacionados.length; xx++) {
        const element = _documtoRelacionados[xx];
        const insertDocRelacionado = await sequelize.query(
          "INSERT INTO DTE.dbo.documentoRelacionado(dte_id,tipoDocumento,tipoGeneracion,numeroDocumento,fechaEmision) values((:_1),(:_2),(:_3),(:_4),(:_5))",
          {
            replacements: {
              _1: Id,
              _2: element.tipoDocumento,
              _3: element.tipoGeneracion,
              _4: element.numeroDocumento,
              _5: element.fechaEmision,
            },
          },
          { type: QueryTypes.INSERT }
        );
      }
    }

    // emisior

    const insertEmisor = await sequelize.query(
      "INSERT INTO DTE.dbo.emisor(dte_id,nit,nrc,nombre,codActividad,descActividad,nombreComercial,tipoEstablecimiento,direccion_depa, direccion_muni,direccion_compl, telefono,correo,codEstableMH,codEstable,codPuntoVentaMH,codPuntoVenta)VALUES((:_1),(:_2),(:_3),(:_4),(:_5),(:_6),(:_7),(:_8),(:_9),(:_10),(:_11),(:_12),(:_13),(:_14),(:_15),(:_16),(:_17)) ",
      {
        replacements: {
          _1: Id,
          _2: e_nit,
          _3: e_nrc,
          _4: e_nombre,
          _5: e_codActividad,
          _6: e_descActividad,
          _7: e_nombreComercial,
          _8: e_tipoEstablecimiento,
          _9: e_departamento,
          _10: e_municipio,
          _11: e_complemento,
          _12: e_telefono,
          _13: e_correo,
          _14: tipoDte === "05" ? "null" : e_codEstableMH,
          _15: tipoDte === "05" ? "null" : e_codEstable,
          _16: tipoDte === "05" ? "null" : e_codPuntoVentaMH,
          _17: tipoDte === "05" ? "null" : e_codPuntoVenta,
        },
      },
      { type: QueryTypes.INSERT }
    );

    //receptor
    const r_nit = req.body.receptor.nit;
    const r_nrc = req.body.receptor.nrc;
    const r_nombre = req.body.receptor.nombre;
    const r_codActividad = req.body.receptor.codActividad;
    const r_descActividad = req.body.receptor.descActividad;
    const r_nombreComercial = req.body.receptor.nombreComercial;
    const r_departamento = req.body.receptor.direccion.departamento;
    const r_municipio = req.body.receptor.direccion.municipio;
    const r_complemento = req.body.receptor.direccion.complemento;
    const r_telefono = req.body.receptor.telefono;
    const r_correo = req.body.receptor.correo;
    const insertRecepor = await sequelize.query(
      "INSERT INTO DTE.dbo.receptor(dte_Id,nit,nrc,nombre,codActividad,descActividad,nombreComercial,direccion_depa,direccion_muni,direccion_compl,telefono,correo)VALUES((:_1),(:_2),(:_3),(:_4),(:_5),(:_6),(:_7),(:_8),(:_9),(:_10),(:_11),(:_12))",
      {
        replacements: {
          _1: Id,
          _2: r_nit,
          _3: r_nrc,
          _4: r_nombre,
          _5: r_codActividad,
          _6: r_descActividad,
          _7: r_nombreComercial,
          _8: r_departamento,
          _9: r_municipio,
          _10: r_complemento,
          _11: r_telefono,
          _12: r_correo,
        },
      },
      { type: QueryTypes.INSERT }
    );

    //validasmos si trae algo otrosdocumentos
    if (req.body.otrosDocumentos) {
      const o_codDocAsociado = req.body.otrosDocumentos.codDocAsociado;
      const o_descDocumento = req.body.otrosDocumentos.descDocumento;
      const o_detalleDocumento = req.body.otrosDocumentos.detalleDocumento;
      const o_medicoNombre =
        req.body.otrosDocumentos.detalleDocumento.medico.nombre;
      const o_mediconit = req.body.otrosDocumentos.detalleDocumento.medico.nit;
      const o_medicodocIdentificacion =
        req.body.otrosDocumentos.detalleDocumento.medico.docIdentificacion;
      const o_medicotipoServicio =
        req.body.otrosDocumentos.detalleDocumento.medico.tipoServicio;
      const insertOtrosDoc = await sequelize.query(
        "INSERT INTO DTE.dbo.otrosDocumentos(dte_id,codDocAsociado,descDocumento,detalleDocumento,medico_nombre,medico_nit,medico_docIdentificacion,medico_tipoServicio)VALUES( (:_1),(:_2),(:_3),(:_4),(:_5),(:_6),(:_7),(:_8) ) ",
        {
          replacements: {
            _1: Id,
            _2: o_codDocAsociado,
            _3: o_descDocumento,
            _4: o_detalleDocumento,
            _5: o_medicoNombre,
            _6: o_mediconit,
            _7: o_medicodocIdentificacion,
            _8: o_medicotipoServicio,
          },
        },
        { type: QueryTypes.INSERT }
      );
    }
    //Ventas a terceros
    if (req.body.ventaTercero) {
      const vt_nit = req.body.ventaTercero.nit;
      const vt_nombre = req.body.ventaTercero.nombre;
      const insertVentaTercero = await sequelize.query(
        "INSERT INTO DTE.dbo.ventaTercero(dte_id,nit,nombre) VALUES((:_1),(:_2),(:_3)) ",
        {
          replacements: {
            _1: Id,
            _2: vt_nit,
            _3: vt_nombre,
          },
        },
        { type: QueryTypes.INSERT }
      );
    }
    //cuerpDocumento
    //recorremos los iten con un for
    const datos = req.body.cuerpoDocumento;
    //console.log(datos);

    for (let i = 0; i < datos.length; i++) {
      const element = datos[i];
      const cp_numItem = element.numItem;
      const cp_tipoItem = element.tipoItem;
      const cp_numeroDocumento = element.numeroDocumento;
      const cp_codigo = element.codigo;
      const cp_codTributo = element.codTributo;
      const cp_descripcion = element.descripcion;
      const cp_cantidad = element.cantidad;
      const cp_uniMedida = element.uniMedida;
      const cp_precioUni = element.precioUni;
      const cp_montoDescu = element.montoDescu;
      const cp_ventaNoSuj = element.ventaNoSuj;
      const cp_ventaExenta = element.ventaExenta;
      const cp_ventaGravada = element.ventaGravada;
      const cp_psv = element.psv;
      const cp_noGravado = element.noGravado;

      const _tributos = element.tributos;
      //insertamos en la tabla CuerpoDocumento
      const insertCupDoc = await sequelize.query(
        "INSERT INTO DTE.dbo.cuerpoDocumento(dte_Id, numItem,tipoItem,numeroDocumento,codigo,codTributo,descripcion,cantidad,uniMedida,precioUni,montoDescu,ventaNoSuj,ventaExenta,ventaGravada,psv,noGravado) VALUES((:_1),(:_2),(:_3),(:_4),(:_5),(:_6),(:_7),(:_8),(:_9),(:_10),(:_11),(:_12),(:_13),(:_14),(:_15),(:_16))",
        {
          replacements: {
            _1: Id,
            _2: cp_numItem,
            _3: cp_tipoItem,
            _4: cp_numeroDocumento,
            _5: cp_codigo,
            _6: cp_codTributo,
            _7: cp_descripcion,
            _8: cp_cantidad,
            _9: cp_uniMedida,
            _10: cp_precioUni,
            _11: cp_montoDescu,
            _12: cp_ventaNoSuj,
            _13: cp_ventaExenta,
            _14: cp_ventaGravada,
            _15: tipoDte === "05" ? 0.0 : cp_psv,
            _16: tipoDte == "05" ? 0.0 : cp_noGravado,
          },
        },
        { type: QueryTypes.INSERT }
      );
      //consultamos el ultimo cuerpoDocumentoId
      const cdId = await sequelize.query(
        "select max(cuerpoDocumento_id) as id from DTE.dbo.cuerpoDocumento",
        {},
        { type: QueryTypes.SELECT }
      );
      const cd_Id = cdId[0][0].id;
      //recoremos el tributo para insertado en la tabla
      const _tributo = element.tributos;
      if (_tributo) {
        for (let x = 0; x < _tributo.length; x++) {
          const element = _tributo[x];
          //insertamos en la tabla tributoCuerpoDocumento
          const insertTributosCD = await sequelize.query(
            "INSERT INTO DTE.dbo.tributoCuerpoDocumento(dte_id,cuerpoDocumento_id,item)VALUES((:_1),(:_2),(:_3))",
            {
              replacements: {
                _1: Id,
                _2: cd_Id,
                _3: element,
              },
            },
            { type: QueryTypes.INSERT }
          );
        }
      }
    }
    //Agregamos resumen
    const re_totalNoSuj = req.body.resumen.totalNoSuj;
    const re_totalExenta = req.body.resumen.totalExenta;
    const re_totalGravada = req.body.resumen.totalGravada;
    const re_subTotalVenta = req.body.resumen.subTotalVentas;
    const re_descuNoSuj = req.body.resumen.descuNoSuj;
    const re_descuExenta = req.body.resumen.descuExenta;
    const re_descuGravada = req.body.resumen.descuGravada;
    const re_porcentajeDescuento = req.body.resumen.porcentajeDescuento;
    const re_totalDescu = req.body.resumen.totalDescu;
    const re_subTotal = req.body.resumen.subTotal;
    const re_ivaPerci1 = req.body.resumen.ivaPerci1;
    const re_ivaRete1 = req.body.resumen.ivaRete1;
    const re_reteRenta = req.body.resumen.reteRenta;
    const re_montoTotalOperacion = req.body.resumen.montoTotalOperacion;
    const re_totalNoGravado = req.body.resumen.totalNoGravado;
    const re_totalPagar = req.body.resumen.totalPagar;
    const re_totalLetras = req.body.resumen.totalLetras;
    const re_saldoFavor = req.body.resumen.saldoFavor;
    const re_condicionOperacion = req.body.resumen.condicionOperacion;
    const re_pagos = req.body.resumen.pagos;
    const re_numPagoElectronico = req.body.resumen.numPagoElectronico;

    // array de tributos
    const re_tributos = req.body.resumen.tributos;
    //Insertamoe en tabla de resumen

    const insertResumen = await sequelize.query(
      "INSERT INTO DTE.dbo.resumen(dte_Id,totalNoSuj,totalExenta,totalGravada,subTotalVentas,descuNoSuj,descuExenta,porcentajeDescuento,totalDescu,subTotal,ivaPerci1,ivaRete1,reteRenta,montoTotalOperacion,totalNoGravado,totalPagar,totalLetras,saldoFavor,condicionOperacion,numPagoEletronico,descuGravada) values( (:_1),(:_2),(:_3),(:_4),(:_5),(:_6),(:_7),(:_8),(:_9),(:_10),(:_11),(:_12),(:_13),(:_14),(:_15),(:_16),(:_17),(:_18),(:_19),(:_20),(:_21) )",
      {
        replacements: {
          _1: Id,
          _2: re_totalNoSuj,
          _3: re_totalExenta,
          _4: re_totalGravada,
          _5: re_subTotalVenta,
          _6: re_descuNoSuj,
          _7: re_descuExenta,
          _8: tipoDte === "05" ? 0.0 : re_porcentajeDescuento,
          _9: re_totalDescu,
          _10: re_subTotal,
          _11: re_ivaPerci1,
          _12: re_ivaRete1,
          _13: re_reteRenta,
          _14: re_montoTotalOperacion,
          _15: tipoDte === "05" ? 0.0 : re_totalNoGravado,
          _16: tipoDte === "05" ? 0.0 : re_totalPagar,
          _17: re_totalLetras,
          _18: tipoDte === "05" ? 0.0 : re_saldoFavor,
          _19: re_condicionOperacion,
          _20: tipoDte === "05" ? "null" : re_numPagoElectronico,
          _21: re_descuGravada,
        },
      },
      { type: QueryTypes.INSERT }
    );
    //Conseguimos el Id de resumen
    const ResumenId = await sequelize.query(
      "select max(resumen_id) as id from DTE.dbo.resumen",
      {},
      { type: QueryTypes.SELECT }
    );
    const resumen_Id = ResumenId[0][0].id;
    //recorremos el array  de pagos
    if (re_pagos) {
      for (let y = 0; y < re_pagos.length; y++) {
        const element = re_pagos[y];

        const insertPagosResumen = await sequelize.query(
          "INSERT INTO DTE.dbo.pagosresumen(dte_id,resumen_id,codigo,montoPago,referencia,plazo,periodo)VALUES((:_1),(:_2),(:_3),(:_4),(:_5),(:_6),(:_7))",
          {
            replacements: {
              _1: Id,
              _2: resumen_Id,
              _3: element.codigo,
              _4: element.montoPago,
              _5: element.referencia,
              _6: element.plazo,
              _7: element.periodo,
            },
          },
          { type: QueryTypes.INSERT }
        );
      }
    }

    //recorremos tributos de resumen
    if (re_tributos) {
      for (let e = 0; e < re_tributos.length; e++) {
        const element = re_tributos[e];
        const insertTributosResumen = await sequelize.query(
          "INSERT INTO DTE.dbo.tributoresumen(dte_id,resumen_id,codigo,descripcion,valor)VALUES((:_1),(:_2),(:_3),(:_4),(:_5))",
          {
            replacements: {
              _1: Id,
              _2: resumen_Id,
              _3: element.codigo,
              _4: element.descripcion,
              _5: element.valor,
            },
          },
          { type: QueryTypes.INSERT }
        );
      }
    }

    //Fin de resumen
    //Inicio de extension
    if (req.body.extension) {
      const ex_docuEntrega = req.body.extension.docuEntrega;
      const ex_nombreEntrega = req.body.extension.nombEntrega;
      const ex_docuRecibe = req.body.extension.docuRecibe;
      const ex_nombRecibe = req.body.extension.nombRecibe;
      const ex_observaciones = req.body.extension.observaciones;
      const ex_placaVehiculo = req.body.extension.placaVehiculo;

      const insertExtension = await sequelize.query(
        "INSERT INTO DTE.dbo.extension(dte_id,nombEntrega,docuEntrega,nombRecibe,docuRecibe,observaciones,placaVehiculo)VALUES((:_1),(:_2),(:_3),(:_4),(:_5),(:_6),(:_7))",
        {
          replacements: {
            _1: Id,
            _2: ex_nombreEntrega,
            _3: ex_docuEntrega,
            _4: ex_nombRecibe,
            _5: ex_docuRecibe,
            _6: ex_observaciones,
            _7: tipoDte === "05" ? "null" : ex_placaVehiculo,
          },
        },
        { type: QueryTypes.INSERT }
      );
    }
    //Fin de extension
    //Inicio de apendice
    if (req.body.apendice) {
      const _apendice = req.body.apendice;
      for (let i = 0; i < _apendice.length; i++) {
        const _ap = _apendice[i];

        const insertApendice = await sequelize.query(
          "INSERT INTO DTE.dbo.apendice(dte_id,campo,etiqueta,valor)VALUES((:_1),(:_2),(:_3),(:_4))",
          {
            replacements: {
              _1: Id,
              _2: _ap.campo,
              _3: _ap.etiqueta,
              _4: _ap.valor,
            },
          },
          { type: QueryTypes.INSERT }
        );
      }
    }
    //Fin de Apendice

    //Inicio de Respuesta Ministerio de Hacienda
    const insertRespuestaMH = await sequelize.query(
      "INSERT INTO DTE.dbo.respuestamh(dte_id,selloRecibido,observaciones)VALUES((:_1),(:_2),'Documento de Proveedores')",
      {
        replacements: {
          _1: Id,
          _2: _selloRecivido,
        },
      },
      { type: QueryTypes.INSERT }
    );

    res.send({ result: insertDTES, success: true, message: [_message] });
  } catch (error) {
    console.log(error);
    res.send({ result: error.message, success: false });
  }
};

const getDteProveedor = async (req, res) => {
  //consultamos todos los dte de los proveedores
  try {
    const _dataProveedor = await sequelize.query(
      "select Dte_Id,Dte,nombre,procesado,tipoDoc,selloRecibido,codigoGeneracion,fechaemision,montoTotal,Documento,mudulo from dte.dbo.DTES where origen='PROVEEDOR'",
      {
        type: QueryTypes.SELECT,
      }
    );
    nuevo = JSON.stringify(_dataProveedor);
    nuevo = JSON.parse(nuevo);

    res.send({ result: nuevo, success: true });
  } catch (error) {
    console.log("errror", error);
    res.send({ results: error.message, result: false });
  }
};

const getDteProveedorId = async (req, res) => {};
const putDteProveedor = async (req, res) => {
  const idDte = req.params.id2;
  const _selloRecibido = req.params.id3;

  try {
    const editDte = sequelize.query(
      `update DTE.dbo.DTES set selloRecibido=upper('${_selloRecibido}') where Dte_Id=${idDte}`,
      {
        type: QueryTypes.SELECT,
      }
    );
    res.send({ resul: editDte, success: true });
  } catch (error) {
    res.send({ resul: [], success: true, errors: [error] });
  }
};

const cargarCPSoftland = async (req, res) => {
  try {
    const _dteData = await sequelize.query(
      `select dte,nombre,CONVERT(varchar,fechaemision,103) as fechaemision,montoTotal,documento,tipoDoc,selloRecibido from dte.dbo.dtes where Dte_id=${req.body.id}`,
      {
        type: QueryTypes.SELECT,
      }
    );

    const _dte = _dteData[0].dte;
    const _tipoDoc = _dteData[0].tipoDoc;
    const _selloRecibido = _dteData[0].selloRecibido;
    const _nombre = _dteData[0].nombre;
    const _fecha = _dteData[0].fechaEmision;
    const _nitProveedor = _dteData[0].documento;
    //consultamos los subtipos de documentos que tenemos en sofland segun el tipoDoc que envia
    // si es tipo 01 , 03 es tipo fac
    const _subtipoDocCp = await tipoDocModel.findAll({
      where: { dte: _tipoDoc },
      raw: true,
      subQuery: false,
    });

    //Obtenemos codigo de porveedor
    const _proveedor = await sequelize.query(
      `EXEC dte.dbo.dte_proveedor '${_nitProveedor}'`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const _codigoProve = _proveedor[0];

    //consultamos maestro de proveedor
    const _datoProveedor = await proveedorModel.findOne({
      where: { PROVEEDOR: _codigoProve.PROVEEDOR },
      raw: true,
      subQuery: false,
    });

    const _dataProveeCondPago = _datoProveedor.CONDICION_PAGO;
    const _dataProveeCodImpuesto = _datoProveedor.CODIGO_IMPUESTO;

    //consulamos las condicones de pago

    const _condicionPago = await condicionPagoModel.findOne({
      where: { CONDICION_PAGO: _dataProveeCondPago },
      raw: true,
      subQuery: false,
    });
    const _Impuesto = await impuestoModel.findOne({
      where: { IMPUESTO: _dataProveeCodImpuesto },
      raw: true,
      subQuery: false,
    });

    //Preparamos la data para envi

    res.send({ result: {}, success: true });
  } catch (error) {
    res.send({ result: {}, success: true, errors: [error] });
  }
};

const getCargaCPSoftland = async (req, res) => {
  const _id = req.params.id;
  try {
    const _dteData = await sequelize.query(
      `select dte,nombre,fechaemision as fechadoc, CONVERT(varchar,fechaemision,103) as fechaemision,montoTotal,documento,tipoDoc,selloRecibido,codigoGeneracion from dte.dbo.dtes where Dte_id=${_id}`,
      {
        type: QueryTypes.SELECT,
      }
    );

    const _dte = _dteData[0].dte;
    const _tipoDoc = _dteData[0].tipoDoc;
    const _selloRecibido = _dteData[0].selloRecibido;
    const _nombre = _dteData[0].nombre;
    const _fecha = _dteData[0].fechaemision;
    const _fechaDoc = _dteData[0].fechadoc;
    const _nitProveedor = _dteData[0].documento;
    const _codigoGeneracion = _dteData[0].codigoGeneracion;
    let _tipo = "";
    if (
      _tipoDoc === "03" ||
      _tipoDoc === "02" ||
      _tipoDoc === "11" ||
      _tipoDoc === "14" ||
      _tipoDoc === "15"
    ) {
      _tipo = "FAC";
    }
    if (_tipoDoc === "05") {
      _tipo = "N/C";
    }
    if (_tipoDoc === "06") {
      _tipo = "N/D";
    }
    if (_tipoDoc === "07") {
      _tipo = "RET";
    }

    //resumen de ventas
    const _resumen = await sequelize.query(
      `select totalNoSuj,totalExenta,totalGravada,subTotalVentas,descuNoSuj,descuExenta,descuGravada,porcentajeDescuento,totalDescu,subTotal,totalPagar,montoTotalOperacion,condicionOperacion from DTE.dbo.resumen where dte_Id=${_id} `,
      {
        type: QueryTypes.SELECT,
      }
    );

    const _resuTotalNoSuj = _resumen[0].totalNoSuj;
    const _resuTotalExenta = _resumen[0].totalExenta;
    const _resuTotalGravada = _resumen[0].totalGravada;
    const _resuSubTotalVentas = _resumen[0].SubTotalVentas;
    const _resuDescuNoSuj = _resumen[0].DescuNoSuj;
    const _resuDescuExenta = _resumen[0].DescuExenta;
    const _resuDescuGrava = _resumen[0].DescuGrava;
    const _resuPorcentajeDescuento = _resumen[0].PorcentajeDescuento;
    const _resuTotalDescu = _resumen[0].TotalDescu;
    const _resuSubTotal = _resumen[0].subTotal;
    const _resuTotalPagar = _resumen[0].totalPagar;
    const _resuCondicionPagar = _resumen[0].condicionOperacion;
    const _resuMontoTotalOperacion = _resumen[0].montoTotalOperacion;

    //Tributos de resumen
    const _Tributoresumen = await sequelize.query(
      `select codigo,valor from DTE.dbo.tributoresumen where dte_Id=${_id} `,
      {
        type: QueryTypes.SELECT,
      }
    );
    let _Impuesto1 = "";
    let _fovial = "0.0";
    let _cotrans = "0.0";
    for (let x = 0; x < _Tributoresumen.length; x++) {
      const element = _Tributoresumen[x];
      //Ivaaaaa
      if (element.codigo == "20") {
        _Impuesto1 = element.valor;
      }
      //fovial
      if (element.codigo == "D1") {
        _fovial = element.valor;
      }

      //cotrans
      if (element.codigo == "C8") {
        _cotrans = element.valor;
      }
    }

    //consultamos los subtipos de documentos que tenemos en sofland segun el tipoDoc que envia
    // si es tipo 01 , 03 es tipo fac
    const _subtipoDocCp = await tipoDocModel.findAll({
      where: { cat002: _tipoDoc },
      raw: true,
      subQuery: false,
    });

    //Obtenemos codigo de porveedor
    const _proveedor = await sequelize.query(
      `EXEC dte.dbo.dte_proveedor '${_nitProveedor}'`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const _codigoProve = _proveedor[0];

    //consultamos maestro de proveedor
    const _datoProveedor = await proveedorModel.findOne({
      where: { PROVEEDOR: _codigoProve.PROVEEDOR },
      raw: true,
      subQuery: false,
    });

    const _dataProveeCondPago = _datoProveedor.CONDICION_PAGO;
    const _dataProveeCodImpuesto = _datoProveedor.CODIGO_IMPUESTO;
    const _dataProveeCodMoneda = _datoProveedor.MONEDA;

    //consulamos las condicones de pago

    const _condicionPago = await condicionPagoModel.findOne({
      where: { CONDICION_PAGO: _dataProveeCondPago },
      raw: true,
      subQuery: false,
    });
    const _Impuesto = await impuestoModel.findOne({
      where: { IMPUESTO: _dataProveeCodImpuesto },
      raw: true,
      subQuery: false,
    });

    moment.locale("fr");
    moment().format("L");

    const date = moment(new Date(_fechaDoc));
    const momentDate = moment(date).format("DD/MM/YYYY");

    //fechavence
    const addDay = moment(momentDate, "DD/MM/YYYY").add(
      _condicionPago.DIAS_NETO,
      "days"
    );

    //Preparamos la data para envi
    const data = {
      proveedor: _datoProveedor.PROVEEDOR,

      nombre: _nombre,
      dte: _dte,
      codigoGeneracion: _codigoGeneracion,
      TipoDoc: _tipo,
      subTipoDoc: _tipoDoc,
      fechaDoc: _fecha,
      monto: _resuMontoTotalOperacion,
      saldo: _resuMontoTotalOperacion,
      subtotal: _resuTotalGravada,
      impuesto1: _Impuesto1,
      impuesto2: _resuTotalExenta + _resuTotalNoSuj,
      fovial: _fovial,
      cotrans: _cotrans,
      condicion_pago: _condicionPago.CONDICION_PAGO,
      diasNeto: _condicionPago.DIAS_NETO,
      moneda: _dataProveeCodMoneda,
      //   subtipo: _subtipoDocCp,
      fechaVence: moment(addDay).format("DD/MM/YYYY"),
      codigoImpuesto: _dataProveeCodImpuesto,
      selloRecibido: _selloRecibido,
    };

    res.send({ result: [data], success: true });
  } catch (error) {
    console.log("errror", error);
  }
};

module.exports = {
  postDteProveedor,
  getDteProveedor,
  putDteProveedor,
  cargarCPSoftland,
  getCargaCPSoftland,
};
