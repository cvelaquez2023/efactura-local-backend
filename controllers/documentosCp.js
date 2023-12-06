const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/mssql");
const {
  documentosCpModel,
  diarioModel,
  asientoDiarioModel,
} = require("../models");

const postDocumentoCp = async (req, res) => {
  const _dte_id = req.body.id;
  const _tipoDoc = req.body.tipo;
  const _fechaDoc = req.body.fechaDocumento;
  const _fecha = req.body.fecha;
  const _aplicacion = req.body.aplicacion;
  const _codPago = req.body.condicionPago;
  const _subTipo = req.body.subtipo;
  const _fechaVence = req.body.fechavence;
  const _codigoImpuesto = req.body.codigoImpuesto;
  const _nota = req.body.notas;

  try {
    const _documetoCp = await sequelize.query(
      `EXEC dte.dbo.dte_DocumentosCP ${_dte_id},'${_tipoDoc}','${_fechaDoc}','${_fecha}','${_aplicacion}','${_codPago}',${_subTipo},'${_fechaVence}','${_codigoImpuesto}','${_nota}' `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const _dte = await sequelize.query(
      `select Dte+'-'+ CONVERT(varchar, year( GETDATE()),103) as Dte from dte.dbo.dtes where Dte_id='${_dte_id}' `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const _documento = await documentosCpModel.findAll({
      where: { DOCUMENTO: _dte[0].Dte },
      raw: true,
      subQuery: false,
    });

    /*
      const _data = await diarioModel.findAll({
        where: { ASIENTO: _documento[0].ASIENTO },
        raw: true,
      });
      */

    const _data2 = await asientoDiarioModel.findAll({
      where: { ASIENTO: _documento[0].ASIENTO },
      raw: true,
    });

    const _data = await sequelize.query(
      `EXEC dte.dbo.dte_asiento'${_documento[0].ASIENTO}' `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const datos = {
      enca: _data2,
      detalle: _data,
    };

    res.send({ result: _data, success: true });

    //consultamos ya el diario

  } catch (error) {
    console.log(error);
    res.send({ result: {}, success: false, errors: error });
  }
};

module.exports = { postDocumentoCp };
