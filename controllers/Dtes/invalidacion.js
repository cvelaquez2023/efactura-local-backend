const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/mssql");
const { firmaMH, autorizacionMh } = require("../../config/MH");
const { Sqlempresa, SqlDteReceptor } = require("../../sqltx/sql");
const moment = require("moment");

const postInvalidar = async (req, res) => {
  const {
    empresa_id,
    documento,
    tipoAnulacion,
    motivoAnulacion,
    nombreResponsable,
    tipoDocResponsable,
    numDocResponsable,
    nombreSolicita,
    numDocSolicita,
    tipoDocSolicita,
  } = req.body;

  //consultados datos del dte

  const empresa = await Sqlempresa(empresa_id);

  if (empresa.length == 0) {
    return res
      .status(400)
      .send({ messaje: "Empresa No existe o no esta activa" });
  }

  const datosDte = await sequelize.query(
    `select dte.dte_id, dte.tipoDoc,dte.codigoGeneracion,dte.selloRecibido,dte.Dte,CONVERT(nvarchar, dte.fechaemision, 23) as fecEmi,dte.montoTotal as montoIva,IIF(LEN(nit)>12 ,'13','02') as tipoDocumento,re.nit,re.nombre,re.telefono, re.correo, re.tipoDocumento from DTE.dbo.DTES dte,dte.dbo.receptor re where  dte.Dte_Id=re.dte_Id and dte='${documento}'`,
    { type: QueryTypes.SELECT }
  );

  const _idDte = datosDte[0].dte_id;

  const uuid = require("uuid");
  const _codigoGeneracion = uuid.v4().toUpperCase();
  const fecha = moment();
  const fechaFormateada = fecha.format("YYYY-MM-DD");
  const horaFormateada = fecha.format("HH:mm:ss");

  const _identificacion = {
    version: empresa[0].VersionInva,
    ambiente: empresa[0].ambiente,
    codigoGeneracion: _codigoGeneracion,
    fecAnula: fechaFormateada,
    horAnula: horaFormateada,
  };

  const _emisor = {
    nit: empresa[0].nit,
    nombre: empresa[0].nombre,
    tipoEstablecimiento: empresa[0].tipoestablecimiento,
    nomEstablecimiento: empresa[0].nombreComercial,
    codEstable: empresa[0].codestable,
    codPuntoVenta: empresa[0].codPuntoVenta,
    telefono: empresa[0].telefono,
    correo: empresa[0].correoDte,
  };
  const _documento = {
    tipoDte: datosDte[0].tipoDoc,
    codigoGeneracion: datosDte[0].codigoGeneracion,
    selloRecibido: datosDte[0].selloRecibido,
    numeroControl: "DTE-05-00000000-000000000000001",
    fecEmi: datosDte[0].fecEmi,
    montoIva: parseFloat(datosDte[0].montoIva.toFixed(2)),
    codigoGeneracionR: null,
    tipoDocumento: datosDte[0].tipoDocumento,
    numDocumento: datosDte[0].nit,
    nombre: datosDte[0].nombre,
  };

  const _motivo = {
    tipoAnulacion: tipoAnulacion,
    motivoAnulacion: motivoAnulacion,
    nombreResponsable: nombreResponsable,
    tipDocResponsable: tipoDocResponsable,
    numDocResponsable: numDocResponsable,
    nombreSolicita: nombreSolicita,
    tipDocSolicita: tipoDocSolicita,
    numDocSolicita: numDocSolicita,
  };
  datos = {
    identificacion: _identificacion,
    emisor: _emisor,
    documento: _documento,
    motivo: _motivo,
  };

  const datafirma = {
    nit: process.env.DTE_NIT,
    activo: true,
    passwordPri: process.env.DTE_PWD_PRIVADA,
    dteJson: datos,
  };

  const _firma = await firmaMH(datafirma);

  //traermos la autorizacion de mh
  const _auth = await autorizacionMh();
  _token = _auth.token;

  //enviamos el documento a la direccion del ministerio de Hacienda para que nos regrese el sello
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", _token);

  var raw = JSON.stringify({
    ambiente: process.env.DTE_AMBIENTE,
    idEnvio: 1,
    version: empresa[0].VersionInva,
    documento: _firma,
  });

  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  const postInvaliddardte = async () => {
    try {
      const response = await fetch(
        "https://apitest.dtes.mh.gob.sv/fesv/anulardte",
        requestOptions
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.log("error", error);
    }
  };

  const _respuestaMH = await postInvaliddardte();

  if (_respuestaMH.estado === "RECHAZADO") {
    try {
      const respuestaMhId = await sequelize.query(
        `select Max(respuestamh_id) as id from dte.dbo.respuestamh where dte_id=${_idDte}`,
        { type: QueryTypes.SELECT }
      );

      let _respuestaMHId = 0;
      if (respuestaMhId.length > 0) {
        _respuestaMHId = respuestaMhId[0].id;
      } else {
        _respuestaMHId = 0;
      }

      for (let d = 0; d < _respuestaMH.observaciones.length; d++) {
        const el = _respuestaMH.observaciones[d];
        await sequelize.query(
          `insert into dte.dbo.observaciones(dte_id,respuestamh_id,descripcion) values (${_idDte},${_respuestaMHId},'${el}')`,
          { type: QueryTypes.SELECT }
        );
      }

      res.send(_respuestaMH);
    } catch (error) {
      console.log(error);
    }
    //enviamos correo a contabilidad para que corrigan porque esta rechazado
  } else if (_respuestaMH.estado == "PROCESADO") {
    await sequelize.query(
      `update dte.dbo.dtes set selloRecibidoInva='${_respuestaMH.selloRecibido}',fechaHoraInva=''${_respuestaMH.fhProcesamiento},invalidado=1,codigoGeneracionInvalidacion='${_respuestaMH.codigoGeneracion}',estadoIvalidacion='${_respuestaMH.estado}' where Dte_id= ${_idDte}`,
      { type: QueryTypes.SELECT }
    );

    res.send(JsonCliente);
  }

  res.send({ result: _respuestaMH, success: true });
};

module.exports = postInvalidar;
