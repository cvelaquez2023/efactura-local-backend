const { subtipoDocCCModel, documentoModel } = require("../models");
const {
  Sqlempresa,
  SqlFactura,
  SqlCliente,
  SqlDocumentoCC,
  SqlClienteExp,
  SqlDocumentoCPDte14,
  SqlDocumentoCPDte07,
  SqlDireEmbarque,
} = require("../sqltx/sql");
const moment = require("moment");
const { sequelize } = require("./mssql");
const { QueryTypes } = require("sequelize");
const _ambiente = process.env.DTE_AMBIENTE;
const _moneda = process.env.MONEDA;

const firmaMH = async (datos) => {
  try {
    const response = await fetch(`http://192.168.1.159:8113/firmardocumento/`, {
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
    const response = await fetch(`https://api.dtes.mh.gob.sv/seguridad/auth`, {
      body: new URLSearchParams({
        user: process.env.DTE_USER_API,
        pwd: process.env.DTE_PWD_API,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      method: "POST",
    });
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
      case "04":
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
    let _fechaNueva = "";
    let _hora = "";
    if (_tipoDoc === "04") {
      _fechaNueva = moment
        .tz(datosFactura[0].FECHA, "America/El_Salvador")
        .format("YYYY-MM-DD");
      _hora = datosFactura[0].HORA;
    }
    if (_tipoDoc === "14") {
      _fechaNueva = _factura.aplicacion.fecha;
      // fecha actual
      let date = new Date();
      let hora = date.getHours().toString().padStart(2, "0");
      let minu = date.getMinutes().toString().padStart(2, "0");
      _hora = hora + ":" + minu + ":" + "00";
    } else {
      _fechaNueva = datosFactura[0].FECHA_DOCUMENTO;
      /*
      _fechaNueva = moment
        .tz(datosFactura[0].FECHA_DOCUMENTO, "America/El_Salvador")
        .format("YYYY-MM-DD");
      */
      _hora = datosFactura[0].CreateDate;
    }

    //CONSTRUIMOS EL SEGMENTO IDENTIFICACION
    let _demoFa = "";
    if (_tipoDoc === "14") {
      _demoFa = _factura.aplicacion.dte;
    } else {
      _demoFa = _factura;
    }

    //const _demoFa = "DTE-04-00000000-24-000000000000053";
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
    } else if (_tipoDoc == "03" || _tipoDoc == "05" || _tipoDoc == "04") {
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
    } else if (_tipoDoc === "07") {
      const identificacion = {
        version: datosEmpresa[0].VersionDte07,
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
    } else if (_tipoDoc == "14") {
      const identificacion = {
        version: datosEmpresa[0].VersionDte14,
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
    const datosFactura = factura.aplicacion.dte;
    return datosFactura;
  } else if (tipodoc == "07") {
    const datosFactura = await SqlDocumentoCPDte07(factura);
    return datosFactura;
  } else if (tipodoc == "04") {
    const datosFactura = await SqlFactura(factura);
    return datosFactura;
  } else {
    const datosFactura = await SqlDocumentoCC(factura);
    return datosFactura;
  }
};
const emisor = async (_empresa, tipoDte) => {
  const empresa = await Sqlempresa(_empresa);

  if (tipoDte === "03" || tipoDte === "01" || tipoDte === "04") {
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
      correo: empresa[0].correoDte.toLowerCase(),
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
      correo: empresa[0].correoDte.toLowerCase(),
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
      correo: empresa[0].correoDte.toLowerCase(),
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
      correo: empresa[0].correoDte.toLowerCase(),
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
      correo: empresa[0].correoDte.toLowerCase(),
    };
    return emisor;
  }
};
const receptor = async (_factura, tipoDte) => {
  const data = await SqlFactura(_factura);
  let cliente = "";
  if (data.length > 0) {
    cliente = data[0].CLIENTE;
  } else {
    const d = await SqlDocumentoCC(_factura);
    if (d[0].CLI_CORPORAC_ASOC === null) {
      cliente = d[0].CLIENTE;
    } else {
      cliente = d[0].CLIENTE_REPORTE;
    }
  }

  const dataCliente = await sequelize.query(
    `EXEC dte.dbo.dte_Cliente '${cliente}'`,
    {
      type: QueryTypes.SELECT,
    }
  );
  if (tipoDte === "03" || tipoDte === "05") {
    let _correo = dataCliente[0].CORREODTE;
    let _nit = dataCliente[0].CONTRIBUYENTE;

    const receptor = {
      nit: _nit.trim(),

      //nrc: dataCliente[0].RUBRO1_CLI.replace("-", ""),
      //codActividad: dataCliente[0].RUBRO8_CLIENTE,
      //descActividad: dataCliente[0].RUBRO9_CLIENTE,
      //correo: dataCliente[0].RUBRO7_CLIENTE,
      nrc: dataCliente[0].NRC.replace("-", "").trim(),
      nombre: dataCliente[0].ALIAS.replace("'", ""),
      codActividad: dataCliente[0].CODACT,
      descActividad: dataCliente[0].DESCACT,
      nombreComercial: dataCliente[0].NOMBRE.replace("'", ""),
      direccion: {
        departamento: dataCliente[0].ZONA.substring(0, 2),
        municipio: dataCliente[0].ZONA.substring(2, 4),
        complemento: dataCliente[0].DIRECCION.replace("DETALLE:", ""),
      },
      telefono: dataCliente[0].TELEFONO1.replace("-", ""),
      correo: _correo,
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
    if (dataCliente[0].CONTRIBUYENTE.length >= 14) {
      _dui = dataCliente[0].CONTRIBUYENTE;
      _tipoDo = "36";
    } else {
      _tipoDo = "13";
      const dui00 = dataCliente[0].CONTRIBUYENTE;
      const dui01 = dui00.substring(0, 8);
      const dui02 = dui00.substring(8, 9);
      _dui = dui01 + "-" + dui02;
    }

    let _correo,
      _telefono = "";

    if (dataCliente[0].E_MAIL.length === 1) {
      _correo = null;
    } else {
      _correo = dataCliente[0].E_MAIL;
    }
    if (dataCliente[0].TELEFONO1 === 1) {
      _telefono = null;
    } else {
      _telefono = dataCliente[0].TELEFONO1.replace("-", "");
    }

    const receptor = {
      tipoDocumento: _tipoDo,
      numDocumento: _dui,
      nrc: null,
      nombre: dataCliente[0].NOMBRE.replace("'", ""),
      codActividad: null,
      descActividad: null,
      direccion: {
        departamento: dataCliente[0].ZONA.substring(0, 2),
        municipio: dataCliente[0].ZONA.substring(2, 4),
        complemento: dataCliente[0].DIRECCION,
      },
      telefono: _telefono,
      correo: _correo,
    };
    return receptor;
  }
  if (tipoDte === "07") {
    let _tipoDo = "";
    let _dui = "";
    if (dataCliente[0].CONTRIBUYENTE.length >= 14) {
      _dui = dataCliente[0].CONTRIBUYENTE;
      _tipoDo = "36";
    } else {
      _tipoDo = "13";
      const dui00 = dataCliente[0].CONTRIBUYENTE;
      const dui01 = dui00.substring(0, 8);
      const dui02 = dui00.substring(8, 9);
      _dui = dui01 + "-" + dui02;
    }

    let _correo,
      _telefono = "";

    if (dataCliente[0].E_MAIL.length === 1) {
      _correo = null;
    } else {
      _correo = dataCliente[0].E_MAIL;
    }
    if (dataCliente[0].TELEFONO1 === 1) {
      _telefono = null;
    } else {
      _telefono = dataCliente[0].TELEFONO1.replace("-", "");
    }

    const receptor = {
      tipoDocumento: _tipoDo,
      numDocumento: _dui,
      nrc: dataCliente[0].NRC.replace("-", "").trim(),
      nombre: dataCliente[0].ALIAS.replace("'", ""),
      codActividad: dataCliente[0].CODACT,
      descActividad: dataCliente[0].DESCACT,
      nombreComercial: dataCliente[0].NOMBRE.replace("'", ""),
      direccion: {
        departamento: dataCliente[0].ZONA.substring(0, 2),
        municipio: dataCliente[0].ZONA.substring(2, 4),
        complemento: dataCliente[0].DIRECCION,
      },
      telefono: _telefono,
      correo: _correo,
    };
    return receptor;
  }
  if (tipoDte === "04") {
    let _tipoDo = "";
    let _dui = "";
    let _nrc = "";
    if (dataCliente[0].CONTRIBUYENTE.length >= 14) {
      _dui = dataCliente[0].CONTRIBUYENTE;
      _tipoDo = "36";
    } else {
      _tipoDo = "13";
      const dui00 = dataCliente[0].CONTRIBUYENTE;
      const dui01 = dui00.substring(0, 8);
      const dui02 = dui00.substring(8, 9);
      _dui = dui01 + "-" + dui02;
    }

    let _correo,
      _telefono = "";

    if (dataCliente[0].E_MAIL.length === 1) {
      _correo = null;
    } else {
      _correo = dataCliente[0].E_MAIL;
    }
    if (dataCliente[0].TELEFONO1 === 1) {
      _telefono = null;
    } else {
      _telefono = dataCliente[0].TELEFONO1.replace("-", "");
    }

    if (dataCliente[0].NRC === null || dataCliente[0].NRC === "ND") {
      _nrc = null;
    } else {
      _nrc = dataCliente[0].NRC.replace("-", "");
    }

    const receptor = {
      tipoDocumento: _tipoDo,
      numDocumento: _dui,
      nrc: _nrc,
      nombre: dataCliente[0].ALIAS.replace("'", ""),
      codActividad: dataCliente[0].CODACT,
      descActividad: dataCliente[0].DESCACT,
      nombreComercial: dataCliente[0].NOMBRE.replace("'", ""),
      direccion: {
        departamento: dataCliente[0].ZONA.substring(0, 2),
        municipio: dataCliente[0].ZONA.substring(2, 4),
        complemento: dataCliente[0].DIRECCION,
      },
      telefono: _telefono,
      correo: _correo,
      bienTitulo: "01",
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
  let _dui,
    _nrc = "";
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
  if (dataCliente[0].nrc === null) {
    _nrc = null;
  } else {
    _nrc = dataCliente[0].nrc.replace("-", "");
  }
  const receptor = {
    tipoDocumento: _tipoDo,
    numDocumento: _dui,
    nrc: _nrc,
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

const apendice = async (_factura, tipo, subtipo) => {
  try {
    const data = await SqlFactura(_factura);
    if (data.length > 0) {
      const apen1 = data[0].VENDEDOR;
      const apend2 = data[0].NOMBRE;
      const apend3 = data[0].observaciones;
      const apend4 = data[0].CONDICION_PAGO;
      const apend5 = data[0].DESCRIPCION;
      const apend6 = data[0].CLIENTE;
      const apend7 = data[0].PEDIDO;
      //Vemos la Direccion de Embarque del cliente
      const direEmbrque = await SqlDireEmbarque(
        data[0].CLIENTE,
        data[0].DIREC_EMBARQUE
      );

      const apend8 = direEmbrque[0].DESCRIPCION.replace("DETALLE:", "");
      const _apendice = [];
      if (tipo == 47) {
        const apen11 = {
          campo: "VENDEDOR",
          etiqueta: "VENDEDOR",
          valor: apen1,
        };
        const apen12 = {
          campo: "NOMBRE",
          etiqueta: "NOMBRE",
          valor: apend2,
        };
        const apen13 = {
          campo: "OBSERVACIONES",
          etiqueta: "OBSERVACIONES",
          valor: "",
        };
        const apen14 = {
          campo: "PAGO",
          etiqueta: "PAGO",
          valor: apend4,
        };
        const apen15 = {
          campo: "DESCRIPCION",
          etiqueta: "DESCRIPCION",
          valor: apend5,
        };
        const apen16 = {
          campo: "CLIENTE",
          etiqueta: "CLIENTE",
          valor: apend6,
        };
        const apen17 = {
          campo: "PEDIDO",
          etiqueta: "PEDIDO",
          valor: apend7,
        };
        const apen18 = {
          campo: "DIRECION",
          etiqueta: "DIRECION",
          valor: apend8,
        };
        _apendice.push(apen11);
        _apendice.push(apen12);
        _apendice.push(apen13);
        _apendice.push(apen14);
        _apendice.push(apen15);
        _apendice.push(apen16);
        _apendice.push(apen17);
        _apendice.push(apen18);

        return _apendice;
      }
      if (tipo === "05") {
        const apen11 = {
          campo: "VENDEDOR",
          etiqueta: "VENDEDOR",
          valor: apen1,
        };
        const apen12 = {
          campo: "NOMBRE",
          etiqueta: "NOMBRE",
          valor: apend2,
        };
        const apen13 = {
          campo: "OBSERVACIONES",
          etiqueta: "OBSERVACIONES",
          valor: apend3,
        };
        const apen14 = {
          campo: "PAGO",
          etiqueta: "PAGO",
          valor: apend4,
        };
        const apen15 = {
          campo: "DESCRIPCION",
          etiqueta: "DESCRIPCION",
          valor: apend5,
        };
        const apen16 = {
          campo: "CLIENTE",
          etiqueta: "CLIENTE",
          valor: apend6,
        };

        const apen18 = {
          campo: "DIRECION",
          etiqueta: "DIRECION",
          valor: apend8,
        };
        _apendice.push(apen11);
        _apendice.push(apen12);
        _apendice.push(apen13);
        _apendice.push(apen14);
        _apendice.push(apen15);
        _apendice.push(apen16);
        _apendice.push(apen18);

        return _apendice;
      }
      if (subtipo === "03" || subtipo === "01") {
        const apen11 = {
          campo: "VENDEDOR",
          etiqueta: "VENDEDOR",
          valor: apen1,
        };
        const apen12 = {
          campo: "NOMBRE",
          etiqueta: "NOMBRE",
          valor: apend2,
        };
        const apen13 = {
          campo: "OBSERVACIONES",
          etiqueta: "OBSERVACIONES",
          valor: apend3,
        };
        const apen14 = {
          campo: "PAGO",
          etiqueta: "PAGO",
          valor: apend4,
        };
        const apen15 = {
          campo: "DESCRIPCION",
          etiqueta: "DESCRIPCION",
          valor: apend5,
        };
        const apen16 = {
          campo: "CLIENTE",
          etiqueta: "CLIENTE",
          valor: apend6,
        };
        const apen17 = {
          campo: "PEDIDO",
          etiqueta: "PEDIDO",
          valor: apend7,
        };
        const apen18 = {
          campo: "DIRECION",
          etiqueta: "DIRECION",
          valor: apend8,
        };
        _apendice.push(apen11);
        _apendice.push(apen12);
        _apendice.push(apen13);
        _apendice.push(apen14);
        _apendice.push(apen15);
        _apendice.push(apen16);
        _apendice.push(apen17);
        _apendice.push(apen18);

        return _apendice;
      }
    } else {
      const data = await SqlDocumentoCC(_factura);
      const apen1 = data[0].VENDEDOR;
      const apend2 = data[0].NOMBREVENDEDOR;
      const apend6 = data[0].CLIENTE + "-" + data[0].NOMBRE;

      //Vemos la Direccion de Embarque del cliente

      const _apendice = [];
      const apen11 = {
        campo: "VENDEDOR",
        etiqueta: "VENDEDOR",
        valor: apen1,
      };
      const apen12 = {
        campo: "NOMBRE",
        etiqueta: "NOMBRE",
        valor: apend2,
      };
      const apen13 = {
        campo: "OBSERVACIONES",
        etiqueta: "OBSERVACIONES",
        valor: "ND",
      };
      const apen14 = {
        campo: "PAGO",
        etiqueta: "PAGO",
        valor: "ND",
      };
      const apen15 = {
        campo: "DESCRIPCION",
        etiqueta: "DESCRIPCION",
        valor: "ND",
      };
      const apen16 = {
        campo: "CLIENTE",
        etiqueta: "CLIENTE",
        valor: apend6,
      };
      const apen17 = {
        campo: "PEDIDO",
        etiqueta: "PEDIDO",
        valor: "ND",
      };
      const apen18 = {
        campo: "DIRECION",
        etiqueta: "DIRECION",
        valor: "ND",
      };
      _apendice.push(apen11);
      _apendice.push(apen12);
      _apendice.push(apen13);
      _apendice.push(apen14);
      _apendice.push(apen15);
      _apendice.push(apen16);
      _apendice.push(apen17);
      _apendice.push(apen18);

      return _apendice;
    }
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  firmaMH,
  autorizacionMh,
  identificacion,
  emisor,
  receptor,
  receptor07,
  apendice,
};
