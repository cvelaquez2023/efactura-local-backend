const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/mssql");

const Sqlempresa = async (empresa) => {
  return await sequelize.query(
    `select VersionDte01,VersionDte03,VersionDte05,VersionDte06,VersionDte07,VersionDte08,VersionDte11,VersionDte14,VersionDte15,VersionInva,nit,replace(nrc,'-','') as nrc,nombre,codActividad,desActividad,nombreComercial,tipoestablecimiento,departamento,municipio,complementoDir,telefono,correoDte,codestableceMh ,codestable,codPuntoVentaMh ,codPuntoVenta,userApi,pwdApi,pwdPrivado,pwdPublica,tokenUser,fechaHoraToken ,ambiente,versionConting,contingencia from DTE.dbo.empresa where empresa_id='${empresa}' and activa=1`,
    { type: QueryTypes.SELECT }
  );
};
const SqlFactura = async (factura) => {
  return await sequelize.query(`EXEC dte.dbo.dte_Factura '${factura}'`, {
    type: QueryTypes.SELECT,
  });
};
const SqlFacturaLinea = async (factura) => {
  return await sequelize.query(`EXEC dte.dbo.dte_FacturaLinea '${factura}'`, {
    type: QueryTypes.SELECT,
  });
};
const SqlFacturaArticulo = async (factura, articulo) => {
  return await sequelize.query(
    `EXEC dte.dbo.dte_FacturaLineaArticulo '${factura}','${articulo}'`,
    {
      type: QueryTypes.SELECT,
    }
  );
};
const SqlFacturaRet = async (factura) => {
  return await sequelize.query(`EXEC dte.dbo.dte_RetencionFA '${factura}'`, {
    type: QueryTypes.SELECT,
  });
};
const SqlDireEmbarque = async (factura, dire) => {
  return await sequelize.query(
    `EXEC dte.dbo.dte_direccionEmbarque '${factura}','${dire}'`,
    {
      type: QueryTypes.SELECT,
    }
  );
};

const SqlCliente = async (cliente) => {
  return await sequelize.query(`EXEC dte.dbo.dte_Cliente '${cliente}'`, {
    type: QueryTypes.SELECT,
  });
};
const SqlDteIdentificacion = async (dte) => {
  return await sequelize.query(
    `select * from dte.dbo.identificacion where Dte_id=${dte}`,
    {
      type: QueryTypes.SELECT,
    }
  );
};
const SqlClienteExp = async (cliente) => {
  return await sequelize.query(`EXEC dte.dbo.dte_ClienteExp '${cliente}'`, {
    type: QueryTypes.SELECT,
  });
};
const SqlDte = async (factura) => {
  return await sequelize.query(
    `select Dte_id,codigoGeneracion,selloRecibido,montoTotal,tipoDoc,CONVERT(nvarchar, fechaemision, 23) as fecEmi,firma from dte.dbo.dtes where dte='${factura}'`,
    { type: QueryTypes.SELECT }
  );
};
const SqlDteRecptor02 = async (factura) => {
  return await sequelize.query(
    `select dte.dte_id, dte.tipoDoc,dte.codigoGeneracion,dte.selloRecibido,dte.Dte,CONVERT(nvarchar, dte.fechaemision, 23) as fecEmi,dte.montoTotal as montoIva,IIF(LEN(nit)>12 ,'13','02') as tipoDocumento,re.nit,re.nombre,re.telefono, re.correo, re.tipoDocumento from DTE.dbo.DTES dte,dte.dbo.receptor re where  dte.Dte_Id=re.dte_Id and dte='${factura}'`,
    { type: QueryTypes.SELECT }
  );
};
const SqlDteReceptor = async (dteId) => {
  return await sequelize.query(
    `select * from dte.dbo.receptor where  dte_id='${dteId}'`,
    { type: QueryTypes.SELECT }
  );
};
const SqlDteEmisor = async (dteId) => {
  return await sequelize.query(
    `select * from dte.dbo.emisor where  dte_id='${dteId}'`,
    { type: QueryTypes.SELECT }
  );
};
const SqlDteSujetoExcluido = async (dteId) => {
  return await sequelize.query(
    `select * from dte.dbo.subjetoExcluido where  dte_id='${dteId}'`,
    { type: QueryTypes.SELECT }
  );
};
const SqlDteCuerpo = async (dteId) => {
  return await sequelize.query(
    `select * from dte.dbo.cuerpoDocumento where  dte_id='${dteId}'`,
    { type: QueryTypes.SELECT }
  );
};

const SqlFacturaLike = async (factura) => {
  return await sequelize.query(`EXEC dte.dbo.dte_FacturaLike '${factura}'`, {
    type: QueryTypes.SELECT,
  });
};

const SqlDteResumen = async (dteId) => {
  return await sequelize.query(
    `select * from dte.dbo.resumen where  dte_id='${dteId}'`,
    { type: QueryTypes.SELECT }
  );
};

const SqlDeleteDts = async (dteId) => {
  return await sequelize.query(`EXEC dte.dbo.dte_deleteDte '${dteId}'`, {
    type: QueryTypes.SELECT,
  });
};
const SqlDocumentoCC = async (documento) => {
  return await sequelize.query(`EXEC dte.dbo.dte_DocumentosCC '${documento}'`, {
    type: QueryTypes.SELECT,
  });
};
const SqlDocumentoCPDte14 = async (documento) => {
  return await sequelize.query(
    `EXEC DTE.dbo.dte_DocumentoCPDte14 '${documento}'`,
    {
      type: QueryTypes.SELECT,
    }
  );
};
const SqlDocumentoCPDte07 = async (documento) => {
  return await sequelize.query(
    `EXEC DTE.dbo.dte_DocumentoCPDte07 '${documento}'`,
    {
      type: QueryTypes.SELECT,
    }
  );
};
const SqlProveedorCodigo = async (codigo) => {
  return await sequelize.query(`EXEC DTE.dbo.dte_proveedorCodigo '${codigo}'`, {
    type: QueryTypes.SELECT,
  });
};

const SqlDtePdf = async (dte) => {
  return await sequelize.query(
    `select dte.codigoGeneracion,dte.dte as numeroControl,dte.selloRecibido,dte.CreateDate as fechaHoraGeneracion ,dte.tipoDoc,
  em.nombre,em.nombreComercial,em.nit,em.nrc,em.descActividad,em.direccion_compl,em.direccion_depa,em.direccion_muni, em.telefono,em.correo,
  re.nombre, re.nombreComercial,re.nit, re.nrc,re.descActividad, re.direccion_compl, re.direccion_depa, re.direccion_muni,re.telefono, re.correo,
  cu.numItem,cu.codigo,cu.cantidad, cu.uniMedida,cu.descripcion,cu.precioUni,cu.montoDescu,cu.ventaNoSuj,cu.ventaExenta,cu.ventaGravada,
  resu.totalNoSuj,resu.totalGravada,resu.totalDescu,resu.subTotal, triresu.valor,resu.subTotalVentas, resu.ivaPerci1, resu.ivaRete1,resu.reteRenta,resu.montoTotalOperacion, resu.totalPagar, resu.totalLetras
  from 
  dte.dbo.DTES dte ,
  dte.dbo.emisor em,
  dte.dbo.receptor re,
  dte.dbo.cuerpoDocumento cu,
  dte.dbo.resumen resu,
  dte.dbo.tributoresumen triresu
  where Dte='${dte}' and
  dte.Dte_Id=em.dte_Id and
  dte.Dte_Id=re.dte_Id and
  dte.Dte_Id=cu.dte_Id and
  dte.Dte_Id=resu.dte_Id and
  dte.Dte_Id=triresu.dte_Id`,
    { type: QueryTypes }
  );
};

const SqlRetencionCp = async (proveedor, tipo, documento, codigoRetencion) => {
  return await sequelize.query(
    `EXEC DTE.dbo.dte_RetencionCP '${proveedor}','${tipo}','${documento}','${codigoRetencion}'`,
    {
      type: QueryTypes.SELECT,
    }
  );
};

const SqlProveedor = async (contribuyente) => {
  return await sequelize.query(
    `EXEC DTE.dbo.dte_proveedor '${contribuyente}'`,
    {
      type: QueryTypes.SELECT,
    }
  );
};
module.exports = {
  Sqlempresa,
  SqlFactura,
  SqlCliente,
  SqlFacturaLinea,
  SqlDte,
  SqlDteReceptor,
  SqlDteResumen,
  SqlDeleteDts,
  SqlDocumentoCC,
  SqlClienteExp,
  SqlDocumentoCPDte14,
  SqlProveedorCodigo,
  SqlDocumentoCPDte07,
  SqlDteRecptor02,
  SqlFacturaLike,
  SqlDtePdf,
  SqlFacturaRet,
  SqlDireEmbarque,
  SqlRetencionCp,
  SqlProveedor,
  SqlDteIdentificacion,
  SqlDteEmisor,
  SqlDteSujetoExcluido,
  SqlDteCuerpo,
  SqlFacturaArticulo,
};
