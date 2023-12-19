const { subtipoDocCCModel, documentoModel } = require("../models");
const {
  Sqlempresa,
  SqlFactura,
  SqlCliente,
  SqlDocumentoCC,
  SqlClienteExp,
  SqlDocumentoCPDte14,
  SqlDocumentoCPDte07,
} = require("../sqltx/sql");
const moment = require("moment");
const { sequelize } = require("./mssql");
const { QueryTypes } = require("sequelize");
const _ambiente = process.env.DTE_AMBIENTE;
const _moneda = process.env.MONEDA;

const firmaMH = async (datos) => {
  try {
    const response = await fetch(`http://localhost:8113/firmardocumento/`, {
      body: JSON.stringify(datos),
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
      method: "POST",
    });

    const data = await response.json();
    return data.body;
  } catch (error) {
    return "ERROR";
  }
};
const autorizacionMh = async () => {
  try {
    const response = await fetch(
      `https://apitest.dtes.mh.gob.sv/seguridad/auth`,
      {
        body: new URLSearchParams({
          user: process.env.DTE_USER_API,
          pwd: process.env.DTE_PWD_API,
        }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        method: "POST",
      }
    );
    const data = await response.json();
    return data.body;
  } catch (error) {
    return "ERROR";
  }
};
//identificacion
const identificacion = async (
  _tipoDoc,
  _empresa,
  _factura,
  _ambiente,
  _cargado_Fac
) => {
  try {
    const datosEmpresa = await Sqlempresa(_empresa);
    let _VersionDte = "";
    switch (_tipoDoc) {
      case "01":
        _VersionDte = datosEmpresa[0].VersionDte01;
        break;
      case "03":
        _VersionDte = datosEmpresa[0].VersionDte03;
        break;
      case "05":
        _VersionDte = datosEmpresa[0].VersionDte05;
        break;
      case "11":
        _VersionDte = datosEmpresa[0].VersionDte11;
        break;
      case "14":
        _VersionDte = datosEmpresa[0].VersionDte14;
        break;
      case "07":
        _VersionDte = datosEmpresa[0].VersionDte07;
        break;
      default:
        break;
    }

    const datosFactura = await datosFac(_factura, _tipoDoc);
    //CONSULTAMOS EL SUBTIPO DEL DOCUMENTO

    //consultamos el cliente con los datos

    const uuid = require("uuid");
    const _codigoGeneracion = uuid.v4().toUpperCase();
    const _fechaNueva = moment
      .tz(datosFactura[0].FECHA_DOCUMENTO, "Amercia/El_Salvador")
      .format("YYYY-MM-DD");
    const _hora = moment
      .tz(datosFactura[0].CreateDate, "Amercia/El_Salvador")
      .format("HH:MM:ss");
    //CONSTRUIMOS EL SEGMENTO IDENTIFICACION
    const _demoFa = "DTE-05-00000000-24-000000000000001";
    let _numeroC = "";
    if (_demoFa.length >= 31) {
      const _parte1 = _demoFa.substring(0, 15);
      const _parte2 = _demoFa.substring(19, 34);
      _numeroC = _parte1 + "-" + _parte2;
    } else {
      _demoFa;
    }
    if (_tipoDoc === "11") {
      const identificacion = {
        version: datosEmpresa[0].VersionDte11,
        ambiente: datosEmpresa[0].ambiente,
        tipoDte: _tipoDoc,
        //numeroControl: _factura,
        numeroControl: _numeroC,
        codigoGeneracion: _codigoGeneracion.toUpperCase(),
        tipoModelo: 1,
        tipoOperacion: 1,
        tipoContingencia: null,
        motivoContigencia: null,
        fecEmi: _fechaNueva,
        horEmi: _hora,
        tipoMoneda: process.env.MONEDA,
      };
      return identificacion;
    } else if (_tipoDoc == "03" || _tipoDoc == "05") {
      const identificacion = {
        version: datosEmpresa[0].VersionDte03,
        ambiente: datosEmpresa[0].ambiente,
        tipoDte: _tipoDoc,
        //numeroControl: _factura,
        numeroControl: _numeroC,
        codigoGeneracion: _codigoGeneracion.toUpperCase(),
        tipoModelo: 1,
        tipoOperacion: 1,
        tipoContingencia: null,
        motivoContin: null,
        fecEmi: _fechaNueva,
        horEmi: _hora,
        tipoMoneda: process.env.MONEDA,
      };
      return identificacion;
    } else if (_tipoDoc == "01") {
      const identificacion = {
        version: datosEmpresa[0].VersionDte01,
        ambiente: datosEmpresa[0].ambiente,
        tipoDte: _tipoDoc,
        //numeroControl: _factura,
        numeroControl: _numeroC,
        codigoGeneracion: _codigoGeneracion.toUpperCase(),
        tipoModelo: 1,
        tipoOperacion: 1,
        tipoContingencia: null,
        motivoContin: null,
        fecEmi: _fechaNueva,
        horEmi: _hora,
        tipoMoneda: process.env.MONEDA,
      };
      return identificacion;
    }
  } catch (error) {
    return error;
  }
};
const datosFac = async (factura, tipodoc) => {
  if (tipodoc === "14") {
    const datosFactura = await SqlDocumentoCPDte14(factura);
    return datosFactura;
  } else if (tipodoc == "07") {
    const datosFactura = await SqlDocumentoCPDte07(factura);
    return datosFactura;
  } else {
    const datosFactura = await SqlDocumentoCC(factura);
    return datosFactura;
  }
};
const emisor = async (_empresa, tipoDte) => {
  const empresa = await Sqlempresa(_empresa);

  if (tipoDte === "03" || tipoDte === "01") {
    const emisor = {
      nit: empresa[0].nit,
      nrc: empresa[0].nrc,
      nombre: empresa[0].nombre,
      codActividad: empresa[0].codActividad,
      descActividad: empresa[0].desActividad,
      nombreComercial: empresa[0].nombreComercial,
      tipoEstablecimiento: "01",
      direccion: {
        departamento: empresa[0].departamento,
        municipio: empresa[0].municipio,
        complemento: empresa[0].complementoDir,
      },
      telefono: empresa[0].telefono,
      correo: empresa[0].correoDte,
      codEstable: empresa[0].codestable,
      codPuntoVenta: empresa[0].codPuntoVenta,
      codEstableMH: empresa[0].codestableceMh,
      codPuntoVentaMH: empresa[0].codPuntoVentaMh,
    };
    return emisor;
  }
  if (tipoDte === "07") {
    const emisor = {
      nit: empresa[0].nit,
      nrc: empresa[0].nrc,
      nombre: empresa[0].nombre,
      codActividad: empresa[0].codActividad,
      descActividad: empresa[0].desActividad,
      nombreComercial: empresa[0].nombreComercial,
      tipoEstablecimiento: "01",
      direccion: {
        departamento: empresa[0].departamento,
        municipio: empresa[0].municipio,
        complemento: empresa[0].complementoDir,
      },
      telefono: empresa[0].telefono,
      correo: empresa[0].correoDte,
      codigo: empresa[0].codestable,
      puntoVenta: empresa[0].codPuntoVenta,
      codigoMH: empresa[0].codestableceMh,
      puntoVentaMH: empresa[0].codPuntoVentaMh,
    };
    return emisor;
  }
  if (tipoDte === "14") {
    const emisor = {
      nit: empresa[0].nit,
      nrc: empresa[0].nrc,
      nombre: empresa[0].nombre,
      codActividad: empresa[0].codActividad,
      descActividad: empresa[0].desActividad,
      direccion: {
        departamento: empresa[0].departamento,
        municipio: empresa[0].municipio,
        complemento: empresa[0].complementoDir,
      },
      telefono: empresa[0].telefono,
      codEstableMH: empresa[0].codestableceMh,
      codEstable: empresa[0].codestable,
      codPuntoVenta: empresa[0].codPuntoVenta,
      codPuntoVentaMH: empresa[0].codPuntoVentaMh,
      correo: empresa[0].correoDte,
    };
    return emisor;
  }
  if (tipoDte === "11") {
    const emisor = {
      nit: empresa[0].nit,
      nrc: empresa[0].nrc,
      nombre: empresa[0].nombre,
      codActividad: empresa[0].codActividad,
      descActividad: empresa[0].desActividad,
      nombreComercial: empresa[0].nombreComercial,
      tipoEstablecimiento: "01",
      direccion: {
        departamento: empresa[0].departamento,
        municipio: empresa[0].municipio,
        complemento: empresa[0].complementoDir,
      },
      telefono: empresa[0].telefono,
      correo: empresa[0].correoDte,
      codEstable: empresa[0].codestable,
      codPuntoVenta: empresa[0].codPuntoVenta,
      codEstableMH: empresa[0].codestableceMh,
      codPuntoVentaMH: empresa[0].codPuntoVentaMh,
      tipoItemExpor: 1,
      recintoFiscal: null,
      regimen: null,
    };
    return emisor;
  }
  if (tipoDte == "05") {
    const emisor = {
      nit: empresa[0].nit,
      nrc: empresa[0].nrc,
      nombre: empresa[0].nombre,
      codActividad: empresa[0].codActividad,
      descActividad: empresa[0].desActividad,
      nombreComercial: empresa[0].nombreComercial,
      tipoEstablecimiento: "01",
      direccion: {
        departamento: empresa[0].departamento,
        municipio: empresa[0].municipio,
        complemento: empresa[0].complementoDir,
      },
      telefono: empresa[0].telefono,
      correo: empresa[0].correoDte,
    };
    return emisor;
  }
};
const receptor = async (_factura, tipoDte) => {
  const data = await SqlFactura(_factura);
  const dataCliente = await sequelize.query(
    `EXEC dte.dbo.dte_Cliente '${data[0].CLIENTE}'`,
    {
      type: QueryTypes.SELECT,
    }
  );
  if (tipoDte === "03" || tipoDte === "05") {
    const receptor = {
      nit: dataCliente[0].CONTRIBUYENTE,
      //nrc: dataCliente[0].RUBRO1_CLI.replace("-", ""),
      //codActividad: dataCliente[0].RUBRO8_CLIENTE,
      //descActividad: dataCliente[0].RUBRO9_CLIENTE,
      //correo: dataCliente[0].RUBRO7_CLIENTE,
      nrc: dataCliente[0].NRC.replace("-", ""),
      nombre: dataCliente[0].ALIAS.replace("'", ""),
      codActividad: dataCliente[0].CODACT,
      descActividad: dataCliente[0].DESCACT,
      nombreComercial: dataCliente[0].NOMBRE.replace("'", ""),
      direccion: {
        departamento: dataCliente[0].ZONA.substring(0, 2),
        municipio: dataCliente[0].ZONA.substring(2, 4),
        complemento: dataCliente[0].DIRECCION,
      },
      telefono: dataCliente[0].TELEFONO1.replace("-", ""),
      correo: dataCliente[0].CORREODTE,
    };
    return receptor;
  }
  if (tipoDte === "11") {
    const clienteExp = await SqlClienteExp(_factura);
    const receptor = {
      nombre: clienteExp[0].NOMBRE.replace("'", ""),
      codPais: clienteExp[0].PAIS,
      nombrePais: clienteExp[0].NOMBREPAIS,
      complemento: clienteExp[0].DIRECCION_FACTURA,
      tipoDocumento: "37",
      numDocumento: clienteExp[0].CONTRIBUYENTE,
      nombreComercial: clienteExp[0].ALIAS.replace("'", ""),
      tipoPersona: 1,
      descActividad: clienteExp[0].RUBRO9_CLIENTE,
      telefono: clienteExp[0].TELEFONO1.replace("-", ""),
      correo: clienteExp[0].E_MAIL,
    };
    return receptor;
  }
  if (tipoDte === "01") {
    let _tipoDo = "";
    let _dui = "";
    if (dataCliente[0].CONTRIBUYENTE.length == 14) {
      _dui = dataCliente[0].CONTRIBUYENTE;
      _tipoDo = "36";
    } else {
      _tipoDo = "13";
      const dui00 = dataCliente[0].CONTRIBUYENTE;
      const dui01 = dui00.substring(0, 8);
      const dui02 = dui00.substring(8, 9);
      _dui = dui01 + "-" + dui02;
    }

    let _correo = "";

    if (dataCliente[0].E_MAIL.length === 1) {
      _correo = null;
    } else {
      _correo = dataCliente[0].E_MAIL;
    }
    const receptor = {
      tipoDocumento: _tipoDo,
      numDocumento: _dui,
      nrc: null,
      nombre: dataCliente[0].NOMBRE.replace("'", ""),
      codActividad: null,
      descActividad: null,
      direccion: null,
      telefono: dataCliente[0].TELEFONO1.replace("-", ""),
      correo: _correo,
    };
    return receptor;
  }
};

const receptor07 = async (_factura) => {
  const data = await SqlDocumentoCPDte07(_factura);
  const dataCliente = await sequelize.query(
    `EXEC dte.dbo.dte_proveedorCodigo '${data[0].PROVEEDOR}'`,
    {
      type: QueryTypes.SELECT,
    }
  );

  let _tipoDo = "";
  let _dui = "";
  if (dataCliente[0].CONTRIBUYENTE.length == 14) {
    _dui = dataCliente[0].CONTRIBUYENTE;
    _tipoDo = "36";
  } else {
    _tipoDo = "13";
    const dui00 = dataCliente[0].CONTRIBUYENTE;
    const dui01 = dui00.substring(0, 8);
    const dui02 = dui00.substring(8, 9);
    _dui = dui01 + "-" + dui02;
  }
  const receptor = {
    tipoDocumento: _tipoDo,
    numDocumento: _dui,
    nrc: dataCliente[0].nrc.replace("-", ""),
    nombre: dataCliente[0].NOMBRE.replace("'", ""),
    codActividad: dataCliente[0].CODACTI,
    descActividad: dataCliente[0].DESACT,
    nombreComercial: dataCliente[0].ALIAS.replace("'", ""),
    direccion: {
      departamento: dataCliente[0].DEPA,
      municipio: dataCliente[0].MUNI,
      complemento: dataCliente[0].DIRECCION.replace("DETALLE:", ""),
    },
    telefono: dataCliente[0].TELEFONO1.replace("-", ""),
    correo: dataCliente[0].E_MAIL,
  };
  return receptor;
};

module.exports = {
  firmaMH,
  autorizacionMh,
  identificacion,
  emisor,
  receptor,
  receptor07,
};
