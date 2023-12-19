const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/mssql");

const Sqlempresa = async (empresa) => {
  return await sequelize.query(
    `select VersionDte01,VersionDte03,VersionDte05,VersionDte06,VersionDte07,VersionDte08,VersionDte11,VersionDte14,VersionDte15,VersionInva,nit,replace(nrc,'-','') as nrc,nombre,codActividad,desActividad,nombreComercial,tipoestablecimiento,departamento,municipio,complementoDir,telefono,correoDte,codestableceMh ,codestable,codPuntoVentaMh ,codPuntoVenta,userApi,pwdApi,pwdPrivado,pwdPublica,tokenUser,fechaHoraToken ,ambiente from DTE.dbo.empresa where empresa_id='${empresa}' and activa=1`,
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
const SqlCliente = async (cliente) => {
  return await sequelize.query(`EXEC dte.dbo.dte_Cliente '${cliente}'`, {
    type: QueryTypes.SELECT,
  });
};
const SqlClienteExp = async (cliente) => {
  return await sequelize.query(`EXEC dte.dbo.dte_ClienteExp '${cliente}'`, {
    type: QueryTypes.SELECT,
  });
};
const SqlDte = async (factura) => {
  return await sequelize.query(
    `select Dte_id,codigoGeneracion,selloRecibido from dte.dbo.dtes where dte='${factura}'`,
    { type: QueryTypes.SELECT }
  );
};
const SqlDteReceptor = async (dteId) => {
  return await sequelize.query(
    `select * from dte.dbo.receptor where  dte_id='${dteId}'`,
    { type: QueryTypes.SELECT }
  );
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
};
