const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/mssql");
const http = require("http");
const https = require("https");
const {
  consecutivoFaModel,
  clienteModel,
  pedidoModel,
  pedidoLineaModel,
  nitModel,
  facturaModel,
  subtipoDocCCModel,
} = require("../models");
const { NumeroLetras } = require("../config/letrasNumeros");

const moment = require("moment");

const getPedido = async (req, res) => {
  try {
    const user = req.cliente;
    //Consultamos datos del cliente
    const datosCliente = await clienteModel.findOne({
      attributes: [
        "CLIENTE",
        "NOMBRE",
        "CONTRIBUYENTE",
        "RUBRO1_CLI",
        "RUBRO2_CLI",
        "Telefono1",
        "E_Mail",
      ],
      where: { CLIENTE: user.CLIENTE },
    });
    //const ClienteContribuyente = datosCliente.CONTRIBUYENTE;
    //const ClienteNRC = datosCliente.RUBRO1_CLI;
    //const ClienteGiro = datosCliente.RUBRO2_CLI;

    //Validamos que tipo de documento quiere el cliente
    //Si es 1 =Credito Fiscal y si es 2= es Consumidor Final
    //Si es Credito Fiscal necesito validar si existe los documentos necesarios
    //que son el NIT,NRC y GIRO
    //Procedmos a validacion
    if (req.body.tipoDoc == 1) {
      //Solicita Credito Fiscal
      //Validamos si los que envia esta en la base de datos registrada al cliente
      const existNit = await nitModel.findOne({
        where: { NIT: req.body.Nit },
      });

      if (existNit == null) {
        //si no existe el numero de nit procedemos a crearlo en la tabla NIT
        const NIT = {
          NIT: req.body.Nit,
          RAZON_SOCIAL: datosCliente.NOMBRE,
          ALIAS: datosCliente.NOMBRE,
          TIPO: "ND",
          ORIGEN: "O",
          NUMERO_DOC_NIT: req.body.Nit,
          EXTERIOR: 0,
          NATURALEZA: "N",
          ACTIVO: "S",
          TIPO_CONTRIBUYENTE: "F",
          NRC: req.body.Nrc,
          GIRO: req.body.Giro,
          CATEGORIA: req.body.Categoria,
          TIPO_REGIMEN: "S",
          INF_LEGAL: "N",
          DETALLAR_KITS: "N",
          ACEPTA_DOC_ELECTRONICO: "N",
          USA_REPORTE_D151: "N",
        };
        const CreateNit = await nitModel.create(NIT);
        if (CreateNit != null) {
          //actualizamos los datos del cliente
          const actualizaCliente = await clienteModel.update(
            {
              CONTRIBUYENTE: req.body.Nit,
              RUBRO1_CLI: req.body.Nrc,
              RUBRO2_CLI: req.body.Giro,
              RUBRO3_CLI: req.body.Categoria,
            },
            { where: { CLIENTE: req.body.cliente } }
          );
        }
      }
    }

    //Consultamos el numero de pedido que nos toca asignar.
    const ConsPedido = await consecutivoFaModel.findOne({
      where: { CODIGO_CONSECUTIVO: req.query.Conse },
    });

    const ultimoValor = ConsPedido.VALOR_CONSECUTIVO;
    const valor = ultimoValor.split("-");
    const valor0 = valor[0];
    const valor1 = valor[1];
    const cara = valor1.length;
    const consecutivo = Math.floor(valor1);
    const fill = (number, len) =>
      "0".repeat(len - number.toString().length) + number.toString();

    //Nuevo correlativo
    const nuevoCorrelativo = valor0 + "-" + fill(consecutivo + 1, cara);

    //traemos informacion de Cliente y monto
    //Consultamos al cliente
    const Cliente = await clienteModel.findOne({
      where: { CLIENTE: req.body.cliente },
    });

    //    console.log(Cliente);
    //Montamos datos para el encabezado de pedido

    var fecha_utc = formatDate(new Date());
    const encabezado = {
      PEDIDO: nuevoCorrelativo,
      ESTADO: "N",
      FECHA_PEDIDO: fecha_utc,
      FECHA_PROMETIDA: fecha_utc,
      FECHA_PROX_EMBARQU: fecha_utc,
      FECHA_ULT_EMBARQUE: "01-01-1980",
      FECHA_ULT_CANCELAC: "01-01-1980",
      FECHA_ORDEN: fecha_utc,
      EMBARCAR_A: Cliente.NOMBRE,
      DIREC_EMBARQUE: "ND",
      DIRECCION_FACTURA: req.body.direccion,
      OBSERVACIONES: req.body.observaciones,
      TOTAL_MERCADERIA: parseFloat((req.body.total / 1.13).toFixed(2)),
      MONTO_ANTICIPO: 0,
      MONTO_FLETE: 0,
      MONTO_SEGURO: 0,
      MONTO_DOCUMENTACIO: 0,
      TIPO_DESCUENTO1: "P",
      TIPO_DESCUENTO2: "P",
      MONTO_DESCUENTO1: 0,
      MONTO_DESCUENTO2: 0,
      PORC_DESCUENTO1: 0,
      PORC_DESCUENTO2: 0,
      TOTAL_IMPUESTO1: parseFloat(
        (req.body.total - req.body.total / 1.13).toFixed(2)
      ),
      TOTAL_IMPUESTO2: 0,
      TOTAL_A_FACTURAR: parseFloat(req.body.total.toFixed(2)),
      PORC_COMI_VENDEDOR: 0,
      PORC_COMI_COBRADOR: 0,
      TOTAL_CANCELADO: 0,
      TOTAL_UNIDADES: req.body.totalUnidades,
      IMPRESO: "N",
      FECHA_HORA: fecha_utc,
      DESCUENTO_VOLUMEN: 0,
      TIPO_PEDIDO: "N",
      MONEDA_PEDIDO: "L",
      VERSION_NP: 1,
      AUTORIZADO: "N",
      DOC_A_GENERAR: "F",
      CLASE_PEDIDO: "N",
      MONEDA: "L",
      NIVEL_PRECIO: Cliente.Nivel_Precio,
      COBRADOR: Cliente.Cobrador,
      RUTA: Cliente.Ruta,
      USUARIO: "SA",
      CONDICION_PAGO: Cliente.Condicion_Pago,
      BODEGA: req.body.bodega,
      ZONA: Cliente.Zona,
      VENDEDOR: Cliente.Vendedor,
      CLIENTE: req.body.cliente,
      CLIENTE_DIRECCION: req.body.cliente,
      CLIENTE_CORPORAC: req.body.cliente,
      CLIENTE_ORIGEN: req.body.cliente,
      PAIS: Cliente.Pais,
      SUBTIPO_DOC_CXC: req.body.tipoDoc,
      TIPO_DOC_CXC: "FAC",
      BACKORDER: "N",
      PORC_INTCTE: 0.0,
      DESCUENTO_CASCADA: "N",
      FIJAR_TIPO_CAMBIO: "N",
      ORIGEN_PEDIDO: "F",
      BASE_IMPUESTO1: req.body.total,
      BASE_IMPUESTO2: 0.0,
      NOMBRE_CLIENTE: Cliente.NOMBRE,
      FECHA_PROYECTADA: fecha_utc,
      TIPO_DOCUMENTO: "P",
      TASA_IMPOSITIVA_PORC: 0.0,
      TASA_CREE1_PORC: 0.0,
      TASA_CREE2_PORC: 0.0,
      TASA_GAN_OCASIONAL_PORC: 0.0,
      CONTRATO_REVENTA: "N",
    };

    const detalle = req.body.detalle;

    //  console.log(encabezado);
    //Insertamos pedido en Softaland
    const nuevoPedido = await pedidoModel.create(encabezado);
    //actualizmos correlativo

    const results = await consecutivoFaModel.update(
      {
        VALOR_CONSECUTIVO: nuevoCorrelativo,
      },
      { where: { CODIGO_CONSECUTIVO: req.query.Conse } }
    );

    if (results > 0) {
      //GUARDAMOS LINEAS DE PEDIDO.
      var Consec = 0;
      for (var value of detalle) {
        Consec = Consec + 1;
        const pedidoLinea = {
          PEDIDO: nuevoCorrelativo,
          PEDIDO_LINEA: Consec,
          BODEGA: req.body.bodega,
          ARTICULO: value.producto,
          ESTADO: "N",
          FECHA_ENTREGA: fecha_utc,
          LINEA_USUARIO: Consec,
          PRECIO_UNITARIO: parseFloat((value.precio / 1.13).toFixed(2)),
          CANTIDAD_PEDIDA: value.cantidad,
          CANTIDAD_A_FACTURA: value.cantidad,
          CANTIDAD_FACTURADA: 0,
          CANTIDAD_RESERVADA: 0,
          CANTIDAD_BONIFICAD: 0,
          CANTIDAD_CANCELADA: 0,
          TIPO_DESCUENTO: "P",
          MONTO_DESCUENTO: 0,
          PORC_DESCUENTO: 0,
          FECHA_PROMETIDA: fecha_utc,
          CENTRO_COSTO: "1-1-01-001",
          CUENTA_CONTABLE: "4-1-01-01-01-01-00",
          TIPO_DESC: 0,
          PORC_EXONERACION: 0,
          PORC_IMPUESTO1: 13,
          PORC_IMPUESTO2: 0,
          ES_OTRO_CARGO: "N",
          ES_CANASTA_BASICA: "N",
        };

        const pedidoLineaNew = await pedidoLineaModel.create(pedidoLinea);
      }
    }

    const data3 = await sequelize.query(
      `EXEC bellmart.sP_Factura_API '${nuevoCorrelativo}','${req.body.ConsecutivoFA}',${req.body.tipoDoc},'${req.body.CondicionPago}'`,
      { type: QueryTypes.SELECT }
    );

    const factura = await sequelize.query(
      "SELECT FACTURA FROM bellmart.FACTURA  WHERE PEDIDO=(:pedido) ",
      {
        replacements: { pedido: nuevoCorrelativo },
      },
      { type: QueryTypes.SELECT }
    );

    dataNew = JSON.stringify(factura[0]);
    dataNew = JSON.parse(dataNew);

    //console.log(dataNew)
    //Procedemos a realizar la factura por medio de un procedimiento almacenado
    res.send({ results: dataNew, result: "true" });
  } catch (error) {
    console.log(error);
  }
};
const getFactura = async (req, res) => {
  const factura = req.params.fac;
  const _ambiente = process.env.DTE_AMBIENTE;
  const _moneda = process.env.MONEDA;
  const _version = process.env.DTE_VERSION;
  const _nit = process.env.DTE_NIT;

  if (!factura) {
    return res.status(400).send({ messaje: "Es requerida Numero Factura" });
  }

  //consultamos factura

  const data = await facturaModel.findAll({
    where: { FACTURA: factura },
    raw: true,
  });

  //console.log("dataaaa", data);
  //CONSULTAMOS EL SUBTIPO DEL DOCUMENTO
  const subtipo = await subtipoDocCCModel.findAll({
    where: { TIPO: data[0].TIPO_CREDITO_CXC, SUBTIPO: data[0].SUBTIPO_DOC_CXC },
    raw: true,
  });

  //consultamos el cliente con los datos
  const dataCliente = await clienteModel.findAll({
    where: { CLIENTE: data[0].CLIENTE },
  });

  //console.log(dataCliente);

  const _tipoDte = subtipo[0].ct002;
  const uuid = require("uuid");
  const _codigoGeneracion = uuid.v4();
  const _fechaNueva = new Date(data[0].FECHA_HORA).toLocaleDateString("sv-SE");
  const _hora = new Date(data[0].FECHA_HORA).toLocaleTimeString();

  //CONSTRUIMOS EL SEGMENTO IDENTIFICACION
  const identificacion = {
    version: _version,
    ambiente: _ambiente,
    tipoDte: _tipoDte,
    //numeroControl: factura,
    numeroControl: "DTE-03-00000000-000000000000001",
    codigoGeneracion: _codigoGeneracion.toUpperCase(),
    tipoModelo: 1,
    tipoOperacion: 1,
    tipoContingencia: null,
    motivoContin: null,
    fecEmi: _fechaNueva,
    horEmi: _hora,
    tipoMoneda: _moneda,
  };
  const documentoRelacionado = null;
  const emisor = {
    nit: process.env.DTE_NIT,
    nrc: process.env.DTE_NRC,
    nombre: process.env.DTE_NOMBRE,
    codActividad: process.env.DTE_CODACTIVIDAD,
    descActividad: process.env.DTE_DESCACTIVIDAD,
    nombreComercial: process.env.DTE_NOMBRECOMERCIAL,
    tipoEstablecimiento: "01",
    direccion: {
      departamento: process.env.DTE_DEPARTAMENTO,
      municipio: process.env.DTE_MUNICIPIO,
      complemento: process.env.DTE_COMPLEMENTO,
    },
    telefono: process.env.DTE_TELEFONO,
    correo: process.env.DTE_CORREO,
    codEstableMH: process.env.DTE_CODESTABLEMH,
    codEstable: process.env.DTE_CODESTABLE,
    codPuntoVentaMH: process.env.DTE_CODPUNTOVENTAMH,
    codPuntoVenta: process.env.DTE_CODPUNTOVENTA,
  };
  const receptor = {
    nit: dataCliente[0].CONTRIBUYENTE,
    nrc: dataCliente[0].RUBRO1_CLI,
    nombre: dataCliente[0].RUBRO2_CLI,
    codActividad: dataCliente[0].RUBRO8_CLIENTE,
    descActividad: dataCliente[0].RUBRO9_CLIENTE,
    nombreComercial: dataCliente[0].ALIAS,
    tipoEstablecimiento: "01",
    direccion: {
      departamento: dataCliente[0].Zona.substring(0, 2),
      municipio: dataCliente[0].Zona.substring(2, 4),
      complemento: dataCliente[0].DIRECCION,
    },
    telefono: dataCliente[0].TELEFONO1,
    correo: dataCliente[0].RUBRO7_CLIENTE,
  };
  //DESGLOSAMOS OTROS DOCUMENTOS
  const otrosDocumentos = null;

  //DESGLOSAMOS VENTAS A TERCEROS
  const ventaTercero = null;

  //DESGLOSAMOS EL CUERPO DEL DOCUMENTO
  //extraemos productos de la factura
  const dataFacLinea = await sequelize.query(
    `EXEC dte.dbo.dte_FacturaLinea '${factura}'`,
    { type: QueryTypes.SELECT }
  );
  const _cuerpoDoc = [];
  let totalLinea = 0;
  let totalDescuento = 0;
  let totalImpuesto1 = 0;
  for (let index = 0; index < dataFacLinea.length; index++) {
    const element = dataFacLinea[index];
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
      precioUni: element.PRECIO_UNITARIO,
      montoDescu: element.DESC_TOT_LINEA + element.DESCUENTO_VOLUMEN,
      ventaNoSuj: 0.0,
      ventaExenta: 0.0,
      ventaGravada: element.PRECIO_TOTAL,
      tributos: ["20"],
      psv: 0.0,
      noGravado: 0,
    };
    const _totalLinea = element.CANTIDAD * element.PRECIO_UNITARIO;
    const _totalDescuento = element.DESC_TOT_LINEA + element.DESCUENTO_VOLUMEN;
    const _totalImpuesto1 = element.TOTAL_IMPUESTO1;
    totalLinea = totalLinea + _totalLinea;
    totalDescuento = totalDescuento + _totalDescuento;
    totalImpuesto1 = totalImpuesto1 + _totalImpuesto1;
    _cuerpoDoc.push(data);
  }

  const _totalPagar = parseFloat(
    (totalLinea - totalDescuento + totalImpuesto1).toFixed(2)
  );
  //Resumen

  const _resumen = {
    totalNoSuj: 0.0,
    totalExenta: 0.0,
    totalGravadas: parseFloat(totalLinea.toFixed(2)),
    descuNoSuj: 0.0,
    descuExenta: 0.0,
    descuGravada: parseFloat(totalDescuento.toFixed(2)),
    porcentajeDescuento: 0.0,
    totalDescu: parseFloat(totalDescuento.toFixed(2)),
    tributos: [
      {
        codigo: "20",
        decripcion: "Impuesto al Valor Agregado 13%",
        valor: parseFloat(totalImpuesto1.toFixed(2)),
      },
    ],
    subTotal: parseFloat((totalLinea - totalDescuento).toFixed(2)),
    ivaPerci1: 0,
    ivaRete1: 0,
    reteRenta: 0,
    montoTotalOperacion: parseFloat(
      (totalLinea - totalDescuento + totalImpuesto1).toFixed(2)
    ),
    totalNoGravado: 0,
    totalPagar: _totalPagar,
    totalLetras: NumeroLetras(_totalPagar) + " USD",
    saldoFavor: 0,
    condicionOperacion: 1,
    pagos: null,
    numPagoElectronico: null,
  };

  const dte = {
    identificacion,
    documentoRelacionado,
    emisor,
    receptor,
    otrosDocumentos,
    ventaTercero,
    cuerpoDocumento: _cuerpoDoc,
    resumen: _resumen,
  };

  //procedemos a recibir la firma del documento
  const datafirma = {
    nit: process.env.DTE_NIT,
    activo: true,
    passwordPri: process.env.DTE_PWD_PRIVADA,
    dteJson: {
      dte,
    },
  };

  const getFirma = async () => {
    try {
      const response = await fetch(`http://localhost:8113/firmardocumento/`, {
        body: JSON.stringify(datafirma),
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        method: "POST",
      });
      const data = await response.json();
      return data.body;
    } catch (error) {
      console.log(error);
    }
  };

  const _firma = await getFirma();
  //traermos la autorizacion de mh

  const getAuthMH = async () => {
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
      console.log(error);
    }
  };

  //consultamos el token si no esta vencido aun
  const _tokenEmpresa = await sequelize.query(
    `select tokenUser,fechaHoraToken from DTE.dbo.parametros where nit='${_nit}' `
  );

  const _fechaHoraToken = _tokenEmpresa[0][0].fechaHoraToken;
  let _token = _tokenEmpresa[0][0].tokenUser;

  //Guardamos en token para valdiarlo que esta activo aun
  const _diaHoraHoy = new Date();

  if (Date.parse(_diaHoraHoy) == Date.parse(_fechaHoraToken)) {
    const _auth = await getAuthMH();
    _token = _auth.token.split(" ")[1];

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

  //enviamos el documento a la direccion del ministerio de Hacienda para que nos regrese el sello
  const dataMH = {
    ambiente: process.env.DTE_AMBIENTE,
    idEnvio: 1,
    version: process.env.DTE_VERSION,
    tipoDte: _tipoDte,
    documento: _firma,
    codigoGeneracion: _codigoGeneracion,
  };

  const postrecepciondte = async () => {
    try {
      const response = await fetch(
        `https://apitest.dtes.mh.gob.sv/fesv/recepciondte`,
        {
          body: JSON.stringify(dataMH),
          headers: {
            Authorization: _token,
            "Content-Type": "application/json; charset=UTF-8",
            "User-Agent": "Drogueria",
          },
          method: "POST",
        }
      );
      const data = await response;
      console.log("doc", data);
      return data;
    } catch (error) {
      console.log(error);
    }
  };

  const _respuestaMH = await postrecepciondte();
  console.log("respuesta de Ministerio", _respuestaMH);
  res.send(dte);
  //res.send(_firma);
};
function padTo2Digits(num) {
  return num.toString().padStart(2, "0");
}

function formatDate(date) {
  return (
    [
      date.getFullYear(),
      padTo2Digits(date.getMonth() + 1),
      padTo2Digits(date.getDate()),
    ].join("-") +
    " " +
    [
      padTo2Digits(date.getHours()),
      padTo2Digits(date.getMinutes()),
      padTo2Digits(date.getSeconds()),
    ].join(":")
  );
}
module.exports = { getPedido, getFactura };
