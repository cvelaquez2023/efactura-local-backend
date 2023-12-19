const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/mssql");
const { SqlDeleteDts, SqlDte } = require("./sql");
const moment = require("moment");
const guardarDte = async (datos) => {
  try {
    const dte_id = await SqlDte(datos.dte);
    if (dte_id.length == 0) {
      await sequelize.query(
        `insert into dte.dbo.dtes(dte,createDate,origen,nombre,procesado,mudulo,tipoDoc,selloRecibido,codigoGeneracion,estado,fechaemision,montoTotal,documento, Empresa_id) values('${datos.dte}',getdate(),'CLIENTE','${datos.nombre}',0,'FA', '${datos.tipoDoc}','ND','${datos.codigoGeneracion}','PENDIENTE','${datos.fechaemision}',${datos.montoTotal},'${datos.Documento}',${datos.Empresa_id})`,
        { type: QueryTypes.SELECT }
      );
    } else {
      //borramos el detalle de todo menos las observaciones
      await SqlDeleteDts(dte_id[0].Dte_id);
    }

    return "Se gurdaro con existo";
  } catch (error) {
    console.log(error);
    return "Existio un problema";
  }
};

const guardarDocumentoRelacionas = async (datos, factura) => {
  const id = await dte(factura);
  try {
    for (let index = 0; index < datos.length; index++) {
      const element = datos[index];
      await sequelize.query(
        `insert into dte.dbo.documentoRelacionado(dte_id,tipoDocumento,tipoGeneracion,numeroDocumento,fechaEmision) values(${id[0].Dte_id},'${element.tipoDocumento}',${element.tipoGeneracion},'${element.numeroDocumento}', '${element.fechaEmision}')`,
        { type: QueryTypes.SELECT }
      );
    }
  } catch (error) {
    console.log(error);
  }
};

const guardarIdentificacion = async (identificacion, factura) => {
  //const id = await dte(identificacion.numeroControl);

  const id = await dte(factura);

  try {
    await sequelize.query(
      `insert into dte.dbo.identificacion(Dte_id,version,ambiente,tipoDte,numeroControl,codigoGeneracion,tipoModelo,tipoOPeracion,fecEmi,horEmi,tipoMoneda) values(${id[0].Dte_id},${identificacion.version},'${identificacion.ambiente}', '${identificacion.tipoDte}', '${identificacion.numeroControl}','${identificacion.codigoGeneracion}',${identificacion.tipoModelo},${identificacion.tipoOperacion},'${identificacion.fecEmi}','${identificacion.horEmi}','${identificacion.tipoMoneda}')`,
      { type: QueryTypes.SELECT }
    );
  } catch (error) {
    console.log(error);
  }
};

const guardarEmision = async (emisor, factura) => {
  const id = await dte(factura);
  let codEstableMH,
    codEstable,
    codPuntoVentaMH,
    codPuntoVenta,
    nombreComercial,
    tipoEstablecimiento;

  if (emisor.tipoEstablecimiento === undefined) {
    tipoEstablecimiento = "01";
  } else {
    tipoEstablecimiento = emisor.tipoEstablecimiento;
  }

  if (emisor.nombreComercial === undefined) {
    nombreComercial = null;
  } else {
    nombreComercial = emisor.nombreComercial;
  }
  if (emisor.codEstableMH === undefined) {
    codEstableMH = null;
  } else {
    codEstableMH = emisor.codEstableMH;
  }
  if (emisor.codEstable === undefined) {
    codEstable = null;
  } else {
    codEstable = emisor.codEstable;
  }
  if (emisor.codPuntoVentaMH === undefined) {
    codPuntoVentaMH = null;
  } else {
    codPuntoVentaMH = emisor.codPuntoVentaMH;
  }
  if (emisor.codPuntoVenta === undefined) {
    codPuntoVenta = null;
  } else {
    codPuntoVenta = emisor.codPuntoVenta;
  }

  try {
    await sequelize.query(
      `insert into dte.dbo.emisor(dte_id,nit,nrc,nombre,codActividad,descActividad,nombreComercial,tipoEstablecimiento,direccion_depa,direccion_muni,direccion_compl,telefono,correo,codEstableMH,codEstable,codPuntoVentaMH,codPuntoVenta) values(${id[0].Dte_id},'${emisor.nit}','${emisor.nrc}','${emisor.nombre}','${emisor.codActividad}','${emisor.descActividad}','${nombreComercial}','${tipoEstablecimiento}','${emisor.direccion.departamento}','${emisor.direccion.municipio}','${emisor.direccion.complemento}','${emisor.telefono}','${emisor.correo}','${codEstableMH}','${codEstable}','${codPuntoVentaMH}','${codPuntoVenta}')`,
      { type: QueryTypes.SELECT }
    );
  } catch (error) {
    console.log(error);
  }
};
const guardarReceptor = async (receptor, factura) => {
  const id = await dte(factura);

  let departamento,
    municipio,
    complemento,
    nit,
    nombreComercial,
    codActividad,
    nrc;

  if (receptor.direccion === undefined || receptor.direccion === null) {
    departamento = "ND";
    municipio = "ND";
    complemento = "ND";
  } else {
    departamento = receptor.direccion.departamento;
    municipio = receptor.direccion.municipio;
    complemento = receptor.direccion.complemento;
  }
  if (receptor.nit === undefined) {
    nit = receptor.numDocumento;
  } else {
    nit = receptor.nit;
  }
  if (receptor.codActividad === undefined) {
    codActividad = "";
  } else {
    codActividad = receptor.codActividad;
  }
  if (receptor.nrc === undefined) {
    nrc = "";
  } else {
    nrc = receptor.nrc;
  }
  if (receptor.nombreComercial === undefined) {
    nombreComercial = "ND";
  } else {
    nombreComercial = receptor.nombreComercial;
  }

  try {
    await sequelize.query(
      `insert into dte.dbo.receptor(dte_id,nit,nrc,nombre,codActividad,descActividad,nombreComercial,direccion_depa,direccion_muni,direccion_compl,telefono,correo) values (${id[0].Dte_id},'${nit}','${nrc}','${receptor.nombre}','${codActividad}','${receptor.descActividad}','${nombreComercial}','${departamento}','${municipio}','${complemento}','${receptor.telefono}','${receptor.correo}')`,
      { type: QueryTypes.SELECT }
    );
  } catch (error) {
    console.log(error);
  }
};
const guardarSubjectoExcluido = async (receptor, factura) => {
  const id = await dte(factura);

  let departamento,
    municipio,
    complemento,
    nit,
    nombreComercial,
    codActividad,
    nrc;

  if (receptor.direccion === undefined || receptor.direccion === null) {
    departamento = "ND";
    municipio = "ND";
    complemento = "ND";
  } else {
    departamento = receptor.direccion.departamento;
    municipio = receptor.direccion.municipio;
    complemento = receptor.direccion.complemento;
  }
  if (receptor.nit === undefined) {
    nit = receptor.numDocumento;
  } else {
    nit = receptor.nit;
  }
  if (receptor.codActividad === undefined) {
    codActividad = "";
  } else {
    codActividad = receptor.codActividad;
  }
  if (receptor.nrc === undefined) {
    nrc = "";
  } else {
    nrc = receptor.nrc;
  }
  if (receptor.nombreComercial === undefined) {
    nombreComercial = "ND";
  } else {
    nombreComercial = receptor.nombreComercial;
  }

  try {
    await sequelize.query(
      `insert into dte.dbo.subjetoExcluido(dte_id,tipoDocumento,nit,nombre,codActividad,descActividad,direccion_depa,direccion_muni,direccion_compl,telefono,correo) values (${id[0].Dte_id},'${receptor.tipoDocumento}', '${nit}','${receptor.nombre}','${codActividad}','${receptor.descActividad}','${departamento}','${municipio}','${complemento}','${receptor.telefono}','${receptor.correo}')`,
      { type: QueryTypes.SELECT }
    );
  } catch (error) {
    console.log(error);
  }
};

const guardarventaTercero = async (datos) => {};
const guardarcueroDocumento = async (_cuerpoDoc, factura) => {
  const id = await dte(factura);
  try {
    //insertamos cuerpo documento
    let psv,
      noGravado,
      tipoItem,
      numeroDocumento,
      ventaNoSuj,
      ventaExenta,
      ventaGravada;
    for (let xx = 0; xx < _cuerpoDoc.length; xx++) {
      const element = _cuerpoDoc[xx];
      if (element.psv === undefined) {
        psv = null;
      } else {
        psv = element.psv;
      }
      if (element.noGravado === undefined) {
        noGravado = null;
      } else {
        noGravado = element.noGravado;
      }

      if (element.tipoItem === undefined) {
        tipoItem = 1;
      } else {
        tipoItem = element.tipoItem;
      }
      if (element.numeroDocumento === undefined) {
        numeroDocumento = null;
      } else {
        numeroDocumento = element.numeroDocumento;
      }

      if (element.ventaNoSuj === undefined) {
        ventaNoSuj = 0;
      } else {
        ventaNoSuj = element.ventaNoSuj;
      }
      if (element.ventaExenta === undefined) {
        ventaExenta = 0;
      } else {
        ventaExenta = element.ventaExenta;
      }

      if (element.ventaGravada === undefined) {
        ventaGravada = 0;
      } else {
        ventaGravada = element.ventaGravada;
      }

      await sequelize.query(
        `insert into dte.dbo.cuerpoDocumento(dte_id,numItem,tipoItem,numeroDocumento,codigo,descripcion,cantidad,uniMedida,precioUni,montoDescu,ventaNoSuj,ventaExenta,ventaGravada,psv,noGravado) values (${id[0].Dte_id},${element.numItem},${tipoItem},'${numeroDocumento}','${element.codigo}','${element.descripcion}',${element.cantidad},'${element.uniMedida}',${element.precioUni},${element.montoDescu},${ventaNoSuj},${ventaExenta},${ventaGravada},${psv},${noGravado})`,
        { type: QueryTypes.SELECT }
      );
      let _cuerpoDocId = 0;
      const cuerpoDocId = await sequelize.query(
        `select max(cuerpoDocumento_id) as id from dte.dbo.cuerpoDocumento where dte_id=${id[0].Dte_id}`
      );
      if (cuerpoDocId.length > 0) {
        _cuerpoDocId = cuerpoDocId[0][0].id;
      } else {
        _cuerpoDocId = 1;
      }

      //const _cuerpoDoc_id = cuerpoDocId[0][0].id;

      if (element.tributos !== undefined) {
        if (element.tributos !== null) {
          for (let yy = 0; yy < element.tributos.length; yy++) {
            const element2 = element.tributos[yy];
            await sequelize.query(
              `insert into dte.dbo.tributoCuerpoDocumento(dte_id,cuerpoDocumento_id,item) values(${id[0].Dte_id},${_cuerpoDocId},${element2})`,
              { type: QueryTypes.SELECT }
            );
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
};

const guardarResumen = async (_resumen, factura, tipoDoc) => {
  const id = await dte(factura);
  try {
    let totalNoGravado,
      totalPagar,
      saldoFavor,
      porcentajeDescuento,
      ivaPerci1,
      totalNoSuj,
      totalExenta,
      subTotalVentas,
      descuNoSuj,
      descuExenta,
      descuGravada,
      subTotal,
      ivaRete1,
      reteRenta,
      totalGravada,
      montoTotalOperacion,
      ventaGravada;

    if (_resumen.ventaGravada === undefined) {
      ventaGravada = 0;
    } else {
      ventaGravada = _resumen.ventaGravada;
    }
    if (_resumen.montoTotalOperacion === undefined) {
      montoTotalOperacion = 0;
    } else {
      montoTotalOperacion = _resumen.montoTotalOperacion;
    }

    if (_resumen.totalGravada === undefined) {
      totalGravada = 0;
    } else {
      totalGravada = _resumen.totalGravada;
    }
    if (_resumen.reteRenta === undefined) {
      reteRenta = 0;
    } else {
      reteRenta = _resumen.reteRenta;
    }
    if (_resumen.ivaRete1 === undefined) {
      ivaRete1 = 0;
    } else {
      ivaRete1 = _resumen.ivaRete1;
    }

    if (_resumen.descuNoSuj === undefined) {
      descuNoSuj = 0;
    } else {
      descuNoSuj = _resumen.descuNoSuj;
    }

    if (_resumen.subTotal === undefined) {
      subTotal = 0;
    } else {
      subTotal = _resumen.subTotal;
    }

    if (_resumen.descuGravada === undefined) {
      descuGravada = 0;
    } else {
      descuGravada = _resumen.descuGravada;
    }

    if (_resumen.descuExenta === undefined) {
      descuExenta = 0;
    } else {
      descuExenta = _resumen.totalNoSuj;
    }

    if (_resumen.totalNoSuj === undefined) {
      totalNoSuj = 0;
    } else {
      totalNoSuj = _resumen.totalNoSuj;
    }

    if (_resumen.totalExenta === undefined) {
      totalExenta = 0;
    } else {
      totalExenta = _resumen.totalExenta;
    }

    if (_resumen.totalNoGravado === undefined) {
      totalNoGravado = 0;
    } else {
      totalNoGravado = _resumen.totalNoGravado;
    }

    if (_resumen.subTotalVentas === undefined) {
      subTotalVentas = 0;
    } else {
      subTotalVentas = _resumen.subTotalVentas;
    }

    if (_resumen.descuNoSuj === undefined) {
      descuNoSuj = 0;
    } else {
      descuNoSuj = _resumen.descuNoSuj;
    }

    if (_resumen.totalPagar === undefined) {
      totalPagar = 0;
    } else {
      totalPagar = _resumen.totalPagar;
    }
    if (_resumen.saldoFavor === undefined) {
      saldoFavor = 0;
    } else {
      saldoFavor = _resumen.saldoFavor;
    }
    if (_resumen.porcentajeDescuento === undefined) {
      porcentajeDescuento = 0;
    } else {
      porcentajeDescuento = _resumen.porcentajeDescuento;
    }

    if (_resumen.ivaPerci1 === undefined) {
      ivaPerci1 = 0;
    } else {
      ivaPerci1 = _resumen.ivaPerci1;
    }

    await sequelize.query(
      `insert into dte.dbo.resumen(dte_Id,totalNoSuj,totalExenta,totalGravada,subTotalVentas,descuNoSuj,descuExenta,descuGravada,porcentajeDescuento,totalDescu,subTotal,ivaPerci1,ivaRete1,reteRenta,montoTotalOperacion,totalNoGravado,totalPagar,totalLetras,saldoFavor,condicionOperacion) values (${
        id[0].Dte_id
      },${totalNoSuj},${totalExenta},${totalGravada},${
        totalNoSuj + totalExenta + totalGravada
      },${descuNoSuj},${descuExenta},${descuGravada},${porcentajeDescuento},${
        _resumen.totalDescu
      },${subTotal},${ivaPerci1},${ivaRete1},${reteRenta},${montoTotalOperacion},${totalNoGravado},${totalPagar},'${
        _resumen.totalLetras
      }',${saldoFavor},${_resumen.condicionOperacion})`,
      { type: QueryTypes.SELECT }
    );
  } catch (error) {
    console.log(error);
  }
};

const guardarTributoResumen = async (_tributos, factura) => {
  const id = await dte(factura);
  try {
    if (_tributos !== null) {
      const cuerpoId = await sequelize.query(
        `select Max(resumen_id) as id from dte.dbo.resumen where dte_id=${id[0].Dte_id}`,
        { type: QueryTypes.SELECT }
      );

      const _cuerpoId = cuerpoId[0].id;
      //Insertamos en la tabla de tributoResumen
      for (let zz = 0; zz < _tributos.length; zz++) {
        const element3 = _tributos[zz];
        await sequelize.query(
          `insert into dte.dbo.tributoresumen(dte_Id,resumen_id,codigo,descripcion,valor) values (${id[0].Dte_id},${_cuerpoId},'${element3.codigo}','${element3.descripcion}',${element3.valor})`,
          { type: QueryTypes.SELECT }
        );
      }
    }
  } catch (error) {
    console.log(error);
  }
};
const guardarPagoResumen = async (_pagos, factura) => {
  const id = await dte(factura);
  try {
    const cuerpoId = await sequelize.query(
      `select Max(resumen_id) as id from dte.dbo.resumen where dte_id=${id[0].Dte_id}`,
      { type: QueryTypes.SELECT }
    );
    const _cuerpoId = cuerpoId[0].id;
    for (let a = 0; a < _pagos.length; a++) {
      const element4 = _pagos[a];
      await sequelize.query(
        `insert into dte.dbo.pagosresumen(dte_Id,resumen_id,codigo,montoPago,plazo,referencia,periodo) values (${id[0].Dte_id},${_cuerpoId},'${element4.codigo}',${element4.montoPago},'${element4.plazo}','${element4.referencia}',${element4.periodo})`,
        { type: QueryTypes.SELECT }
      );
    }
  } catch (error) {
    console.log(error);
  }
};
const guardarRespuestaMH = async (_respuestaMH, factura) => {
  const id = await dte(factura);
  try {
    const date = new Date(_respuestaMH.fhProcesamiento);
    const fecha = date;

    await sequelize.query(
      `insert into dte.dbo.respuestamh(dte_Id,version,ambiente,estado,codigoGeneracion,selloRecibido,fhprocesamiento, clasificaMsg,codigoMsg,descripcionMsg) values (${id[0].Dte_id},${_respuestaMH.version},'${_respuestaMH.ambiente}','${_respuestaMH.estado}','${_respuestaMH.codigoGeneracion}','${_respuestaMH.selloRecibido}',getDate(),'${_respuestaMH.clasificaMsg}','${_respuestaMH.codigoMsg}','${_respuestaMH.descripcionMsg}')`,
      { type: QueryTypes.SELECT }
    );
  } catch (error) {
    console.log(error);
  }
};

const updateDte = async (_respuestaMH, factura) => {
  try {
    const id = await dte(factura);

    await sequelize.query(
      `update dte.dbo.dtes set estado='${_respuestaMH.estado}',selloRecibido='${_respuestaMH.selloRecibido}',updateDate=getDate() where Dte_id=${id[0].Dte_id}`,
      { type: QueryTypes.SELECT }
    );
  } catch (error) {
    console.log(error);
  }
};
const guardarObservacionesMH = async (datos, factura) => {
  const id = await dte(factura);
  try {
    const respuestaMhId = await sequelize.query(
      `select Max(respuestamh_id) as id from dte.dbo.respuestamh where dte_id=${id[0].Dte_id}`,
      { type: QueryTypes.SELECT }
    );
    let _respuestaMHId = 0;
    if (respuestaMhId.length > 0) {
      _respuestaMHId = respuestaMhId[0].id;
    } else {
      _respuestaMHId = 0;
    }

    for (let d = 0; d < datos.length; d++) {
      const el = datos[d];

      await sequelize.query(
        `insert into dte.dbo.observaciones(dte_id,respuestamh_id,descripcion) values (${id[0].Dte_id},${_respuestaMHId},'${el}')`,
        { type: QueryTypes.SELECT }
      );
    }
  } catch (error) {}
};
const dte = async (doc) => {
  return (dte_id = await SqlDte(doc));
};
module.exports = {
  guardarDte,
  guardarDocumentoRelacionas,
  guardarIdentificacion,
  guardarEmision,
  guardarReceptor,
  guardarventaTercero,
  guardarcueroDocumento,
  guardarResumen,
  guardarRespuestaMH,
  guardarObservacionesMH,
  guardarTributoResumen,
  guardarPagoResumen,
  updateDte,
  guardarSubjectoExcluido,
};
