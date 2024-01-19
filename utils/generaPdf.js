const fs = require("fs");
const path = require("path");
const pdf = require("pdf-creator-node");
const moment = require("moment");
const { SqlDtePdf } = require("../sqltx/sql");
const options = require("../config/options");
const rqcode = require("../template/rqcode");
const { sequelize } = require("../config/mssql");
const { QueryTypes } = require("sequelize");
const generaPdf = async (datos) => {
  const filename = datos.replace("-24-", "-");
  const filePdf = datos.replace("-24-", "-") + ".pdf";

  const _dte = await sequelize.query(
    `select * from dte.dbo.dtes where  dte='${datos}'`,
    { type: QueryTypes.SELECT }
  );
  const _idDte = _dte[0].Dte_Id;
  // detalle de dte Cuerpo
  const _dteCuerpo = await sequelize.query(
    `SELECT codigo,lote,descripcion,  sum(cantidad) as cantidad,sum(precioUni*cantidad) as precioUni,sum(montoDescu) as montoDescu,sum(ventaNoSuj) as ventaNoSuj,sum(ventaExenta) as ventaExenta,sum(ventaGravada) as ventaGravada  FROM dte.dbo.cuerpoDocumento  WHERE dte_Id=${_idDte} group by codigo,lote,descripcion`,
    { type: QueryTypes.SELECT }
  );
  const _dteReceptor = await sequelize.query(
    `select * from dte.dbo.receptor where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );

  const _dteResumen = await sequelize.query(
    `select * from dte.dbo.resumen where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );
  const _dteTributoResumen = await sequelize.query(
    `select * from dte.dbo.tributoresumen where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );
  const _apendice = await sequelize.query(
    `select * from dte.dbo.apendice where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );
  let ApVendedor = "";
  let ApNombre = "";
  let ApObservaciones = "";
  let ApDescripcion = "";
  let ApCliente = "";
  let ApPedido = "";
  let ApDirecion = "";
  for (let y = 0; y < _apendice.length; y++) {
    const element = _apendice[y];
    if (element.campo == "VENDEDOR") {
      ApVendedor = element.valor;
    }
    if (element.campo == "NOMBRE") {
      ApNombre = element.valor;
    }
    if (element.campo == "OBSERVACIONES") {
      ApObservaciones = element.valor;
    }
    if (element.campo == "DESCRIPCION") {
      ApDescripcion = element.valor;
    }
    if (element.campo == "CLIENTE") {
      ApCliente = element.valor;
    }
    if (element.campo == "PEDIDO") {
      ApPedido = element.valor;
    }
    if (element.campo == "DIRECION") {
      ApDirecion = element.valor;
    }
  }
  let tributo = "";
  if (_dteTributoResumen.length > 0) {
    tributo = _dteTributoResumen[0].valor;
  } else {
    tributo = 0.0;
  }

  const datosQr = {
    fechaEmi: moment
      .tz(_dte[0].fechaHoraGeneracion, "America/El_Salvador")
      .format("YYYY-MM-DD"),
    codGen: _dte[0].codigoGeneracion,
    ambiente: process.env.DTE_AMBIENTE,
  };

  await rqcode(datosQr);

  const html = fs.readFileSync(
    path.join(__dirname, "../template/index.html"),
    "utf-8"
  );
  let array = [];
  let item = 0;
  _dteCuerpo.forEach((d) => {
    item = item + 1;
    const prod = {
      numItem: item,
      codigo: d.codigo,
      cantidad: d.cantidad,
      uniMeduda: d.uniMedida,
      descripcion: d.descripcion,
      precioUni: (d.precioUni / d.cantidad).toFixed(4),
      montoDescu: d.montoDescu.toFixed(4),
      ventaNoSuj: d.ventaNoSuj.toFixed(4),
      ventaExenta: d.ventaExenta.toFixed(4),
      ventaGravada: d.ventaGravada.toFixed(2),
    };
    array.push(prod);
  });
  let tipo,
    dir = "";
  if (_dte[0].tipoDoc === "03") {
    tipo = "COMPROBANTE CREDITO FISCAL";
    dir = "dte03";
  }
  if (_dte[0].tipoDoc === "01") {
    tipo = "COMPROBANTE CONSUMIDOR FINAL";
    dir = "dte01";
  }
  if (_dte[0].tipoDoc === "05") {
    tipo = "COMPROBANTE NOTA DE CREDITO";
    dir = "dte05";
  }
  const obj = {
    tipoDoc: tipo,
    codigoGeneracion: _dte[0].codigoGeneracion,
    numeroControl: filename,
    selloRecibido: _dte[0].selloRecibido,
    fechaHoraGeneracion: moment
      .tz(_dte[0].fechaHoraGeneracion, "America/El_Salvador")
      .format("DD-MM-YYYY HH:MM:SS"),
    nombre: _dteReceptor[0].nombre,
    nombreComercial: _dteReceptor[0].nombreComercial,
    nit: _dteReceptor[0].nit,
    nrc: _dteReceptor[0].nrc,
    descActividad: _dteReceptor[0].descActividad,
    direccion_compl: _dteReceptor[0].direccion_compl,
    telefono: _dteReceptor[0].telefono,
    correo: _dteReceptor[0].correo,
    prodlist: array,
    totalNoSuj: _dteResumen[0].totalNoSuj.toFixed(2),
    totalExenta: _dteResumen[0].totalExenta.toFixed(2),
    totalGravada: _dteResumen[0].totalGravada.toFixed(2),
    totalDescu: _dteResumen[0].totalDescu.toFixed(2),
    subTotal: _dteResumen[0].subTotal.toFixed(2),
    valor: tributo.toFixed(2),
    subTotalVentas: _dteResumen[0].subTotalVentas.toFixed(2),
    ivaPerci1: _dteResumen[0].ivaPerci1.toFixed(2),
    ivaRete1: _dteResumen[0].ivaRete1.toFixed(2),
    reteRenta: _dteResumen[0].reteRenta.toFixed(2),
    montoTotalOperacion: _dteResumen[0].montoTotalOperacion.toFixed(2),
    totalPagar: _dteResumen[0].totalPagar.toFixed(2),
    totalLetras: _dteResumen[0].totalLetras,
    vendedor: ApVendedor,
    nombreV: ApNombre,
    observaciones: ApObservaciones,
    descripcion: ApDescripcion,
    cliente: ApCliente,
    pedido: ApPedido,
    apDirecion: ApDirecion,
  };

  const document = {
    html: html,
    data: {
      products: obj,
    },
    path: `../backend/storage/pdf/${dir}/` + filePdf,
  };

  await pdf
    .create(document, options)
    .then((res) => {
      console.log("respuesta", res);
    })
    .catch((error) => {
      console.log(error);
    });
};
const generaPdf07 = async (datos) => {
  const filename = datos.replace("-24-", "-");
  const filePdf = datos.replace("-24-", "-") + ".pdf";

  const _dte = await sequelize.query(
    `select * from dte.dbo.dtes where  dte='${datos}'`,
    { type: QueryTypes.SELECT }
  );
  const _idDte = _dte[0].Dte_Id;
  // detalle de dte Cuerpo
  const _dteCuerpo = await sequelize.query(
    `SELECT numItem,tipoDte,tipoDoc,numeroDocumento, CONVERT(VARCHAR(10), fechaEmision, 23) as  fechaEmision,montoSujetoGrav, codigoRetencionMH,ivaRetenido,descripcion FROM dte.dbo.cuerpoDocumento  WHERE dte_Id=${_idDte} `,
    { type: QueryTypes.SELECT }
  );
  const _dteReceptor = await sequelize.query(
    `select * from dte.dbo.receptor where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );

  const _dteResumen = await sequelize.query(
    `select totalSujetoRetencion,totalIVAretenido,totalLetras from dte.dbo.resumen where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );

  const datosQr = {
    fechaEmi: moment
      .tz(_dte[0].fechaHoraGeneracion, "America/El_Salvador")
      .format("YYYY-MM-DD"),
    codGen: _dte[0].codigoGeneracion,
    ambiente: process.env.DTE_AMBIENTE,
  };

  await rqcode(datosQr);

  const html = fs.readFileSync(
    path.join(__dirname, "../template/index07.html"),
    "utf-8"
  );

  let array = [];
  let item = 0;

  _dteCuerpo.forEach((d) => {
    item = item + 1;
    const prod = {
      numItem: item,
      tipoDte: d.tipoDte,
      tipoDoc: d.tipoDoc,
      numeroDocumento: d.numeroDocumento,
      fechaEmision: d.fechaEmision,
      montoSujetoGrav: d.montoSujetoGrav.toFixed(2),
      codigoRetencionMH: d.codigoRetencionMH,
      ivaRetenido: d.ivaRetenido.toFixed(2),
      descripcion: d.descripcion,
    };
    array.push(prod);
  });
  let tipo,
    dir = "";
  if (_dte[0].tipoDoc === "03") {
    tipo = "COMPROBANTE CREDITO FISCAL";
    dir = "dte03";
  }
  if (_dte[0].tipoDoc === "01") {
    tipo = "COMPROBANTE CONSUMIDOR FINAL";
    dir = "dte01";
  }
  if (_dte[0].tipoDoc === "05") {
    tipo = "COMPROBANTE NOTA DE CREDITO";
    dir = "dte05";
  }
  if (_dte[0].tipoDoc === "07") {
    tipo = "COMPROBANTE DE RETENCIÓN";
    dir = "dte07";
  }

  const obj = {
    tipoDoc: tipo,
    codigoGeneracion: _dte[0].codigoGeneracion,
    numeroControl: filename,
    selloRecibido: _dte[0].selloRecibido,
    fechaHoraGeneracion: moment
      .tz(_dte[0].fechaHoraGeneracion, "America/El_Salvador")
      .format("DD-MM-YYYY HH:MM:SS"),
    nombre: _dteReceptor[0].nombre,
    nombreComercial: _dteReceptor[0].nombreComercial,
    nit: _dteReceptor[0].nit,
    nrc: _dteReceptor[0].nrc,
    descActividad: _dteReceptor[0].descActividad,
    direccion_compl: _dteReceptor[0].direccion_compl,
    telefono: _dteReceptor[0].telefono,
    correo: _dteReceptor[0].correo,
    prodlist: array,
    toltalSujetoRetencion: _dteResumen[0].totalSujetoRetencion,
    totalIvaretenido: _dteResumen[0].totalIVAretenido,
    totalIVAretenidoLetras: _dteResumen[0].totalLetras,
  };

  const document = {
    html: html,
    data: {
      products: obj,
    },
    path: `../backend/storage/pdf/${dir}/` + filePdf,
  };

  await pdf
    .create(document, options)
    .then((res) => {
      console.log("respuesta", res);
    })
    .catch((error) => {
      console.log(error);
    });
};
const generaPdf05 = async (datos) => {
  const filename = datos.replace("-24-", "-");
  const filePdf = datos.replace("-24-", "-") + ".pdf";

  const _dte = await sequelize.query(
    `select * from dte.dbo.dtes where  dte='${datos}'`,
    { type: QueryTypes.SELECT }
  );
  const _idDte = _dte[0].Dte_Id;
  // detalle de dte Cuerpo
  const _dteCuerpo = await sequelize.query(
    `SELECT codigo,lote,descripcion,  sum(cantidad) as cantidad,sum(precioUni*cantidad) as precioUni,sum(montoDescu) as montoDescu,sum(ventaNoSuj) as ventaNoSuj,sum(ventaExenta) as ventaExenta,sum(ventaGravada) as ventaGravada  FROM dte.dbo.cuerpoDocumento  WHERE dte_Id=${_idDte} group by codigo,lote,descripcion`,
    { type: QueryTypes.SELECT }
  );
  const _dteDocRelacionados = await sequelize.query(
    `select tipoDocumento,numeroDocumento,CONVERT(VARCHAR(10), fechaEmision, 103) as fechaEmision from dte.dbo.documentoRelacionado where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );
  const _dteReceptor = await sequelize.query(
    `select * from dte.dbo.receptor where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );

  const _dteResumen = await sequelize.query(
    `select * from dte.dbo.resumen where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );
  const _dteTributoResumen = await sequelize.query(
    `select * from dte.dbo.tributoresumen where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );
  const _apendice = await sequelize.query(
    `select * from dte.dbo.apendice where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );
  let ApVendedor = "";
  let ApNombre = "";
  let ApObservaciones = "";
  let ApDescripcion = "";
  let ApCliente = "";
  let ApPedido = "";
  let ApDirecion = "";
  for (let y = 0; y < _apendice.length; y++) {
    const element = _apendice[y];
    if (element.campo == "VENDEDOR") {
      ApVendedor = element.valor;
    }
    if (element.campo == "NOMBRE") {
      ApNombre = element.valor;
    }
    if (element.campo == "OBSERVACIONES") {
      ApObservaciones = element.valor;
    }
    if (element.campo == "DESCRIPCION") {
      ApDescripcion = element.valor;
    }
    if (element.campo == "CLIENTE") {
      ApCliente = element.valor;
    }
    if (element.campo == "PEDIDO") {
      ApPedido = element.valor;
    }
    if (element.campo == "DIRECION") {
      ApDirecion = element.valor;
    }
  }
  let tributo = "";
  if (_dteTributoResumen.length > 0) {
    tributo = _dteTributoResumen[0].valor;
  } else {
    tributo = 0.0;
  }

  const datosQr = {
    fechaEmi: moment
      .tz(_dte[0].fechaHoraGeneracion, "America/El_Salvador")
      .format("YYYY-MM-DD"),
    codGen: _dte[0].codigoGeneracion,
    ambiente: process.env.DTE_AMBIENTE,
  };

  await rqcode(datosQr);

  const html = fs.readFileSync(
    path.join(__dirname, "../template/index05.html"),
    "utf-8"
  );
  let array = [];
  let item = 0;
  _dteCuerpo.forEach((d) => {
    item = item + 1;
    const prod = {
      numItem: item,
      codigo: d.codigo,
      cantidad: d.cantidad,
      uniMeduda: d.uniMedida,
      descripcion: d.descripcion,
      precioUni: (d.precioUni / d.cantidad).toFixed(4),
      montoDescu: d.montoDescu.toFixed(4),
      ventaNoSuj: d.ventaNoSuj.toFixed(4),
      ventaExenta: d.ventaExenta.toFixed(4),
      ventaGravada: d.ventaGravada.toFixed(2),
    };
    array.push(prod);
  });

  let array2 = [];
  _dteDocRelacionados.forEach((x) => {
    const prod = {
      tipoDoc: x.tipoDocumento,
      numeroDoc: x.numeroDocumento,
      fechaE: x.fechaEmision,
    };
    array2.push(prod);
  });
  let tipo,
    dir = "";
  if (_dte[0].tipoDoc === "03") {
    tipo = "COMPROBANTE CREDITO FISCAL";
    dir = "dte03";
  }
  if (_dte[0].tipoDoc === "01") {
    tipo = "COMPROBANTE CONSUMIDOR FINAL";
    dir = "dte01";
  }
  if (_dte[0].tipoDoc === "05") {
    tipo = "COMPROBANTE NOTA DE CREDITO";
    dir = "dte05";
  }
  const obj = {
    tipoDoc: tipo,
    codigoGeneracion: _dte[0].codigoGeneracion,
    numeroControl: filename,
    selloRecibido: _dte[0].selloRecibido,
    fechaHoraGeneracion: moment
      .tz(_dte[0].fechaHoraGeneracion, "America/El_Salvador")
      .format("DD-MM-YYYY HH:MM:SS"),
    nombre: _dteReceptor[0].nombre,
    nombreComercial: _dteReceptor[0].nombreComercial,
    nit: _dteReceptor[0].nit,
    nrc: _dteReceptor[0].nrc,
    descActividad: _dteReceptor[0].descActividad,
    direccion_compl: _dteReceptor[0].direccion_compl,
    telefono: _dteReceptor[0].telefono,
    correo: _dteReceptor[0].correo,
    prodlist: array,
    prodlistRela: array2,
    totalNoSuj: _dteResumen[0].totalNoSuj.toFixed(2),
    totalExenta: _dteResumen[0].totalExenta.toFixed(2),
    totalGravada: _dteResumen[0].totalGravada.toFixed(2),
    totalDescu: _dteResumen[0].totalDescu.toFixed(2),
    subTotal: _dteResumen[0].subTotal.toFixed(2),
    valor: tributo.toFixed(2),
    subTotalVentas: _dteResumen[0].subTotalVentas.toFixed(2),
    ivaPerci1: _dteResumen[0].ivaPerci1.toFixed(2),
    ivaRete1: _dteResumen[0].ivaRete1.toFixed(2),
    reteRenta: _dteResumen[0].reteRenta.toFixed(2),
    montoTotalOperacion: _dteResumen[0].montoTotalOperacion.toFixed(2),
    totalPagar: _dteResumen[0].totalPagar.toFixed(2),
    totalLetras: _dteResumen[0].totalLetras,
    vendedor: ApVendedor,
    nombreV: ApNombre,
    observaciones: ApObservaciones,
    descripcion: ApDescripcion,
    cliente: ApCliente,
    apDirecion: ApDirecion,
  };

  const document = {
    html: html,
    data: {
      products: obj,
    },
    path: `../backend/storage/pdf/${dir}/` + filePdf,
  };

  await pdf
    .create(document, options)
    .then((res) => {
      console.log("respuesta", res);
    })
    .catch((error) => {
      console.log(error);
    });
};
const generaPdf14 = async (datos) => {
  const filename = datos.replace("-24-", "-");
  const filePdf = datos.replace("-24-", "-") + ".pdf";

  const _dte = await sequelize.query(
    `select * from dte.dbo.dtes where  dte='${datos}'`,
    { type: QueryTypes.SELECT }
  );

  const _idDte = _dte[0].Dte_Id;

  const _dteSujetoExcluido = await sequelize.query(
    `SELECT tipoDocumento,nit, nombre,codActividad,descActividad,direccion_depa,direccion_muni,direccion_compl,telefono,correo  FROM dte.dbo.subjetoExcluido  WHERE dte_Id=${_idDte} `,
    { type: QueryTypes.SELECT }
  );

  // detalle de dte Cuerpo
  const _dteCuerpo = await sequelize.query(
    `SELECT numItem,tipoItem,cantidad,codigo,uniMedida,descripcion,precioUni,montoDescu,compra  FROM dte.dbo.cuerpoDocumento  WHERE dte_Id=${_idDte} `,
    { type: QueryTypes.SELECT }
  );

  const _dteResumen = await sequelize.query(
    `select totalCompra,descuExenta,totalDescu, subTotal,ivaRete1,reteRenta,totalPagar,totalLetras,condicionOperacion from dte.dbo.resumen where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );
  const _dteReceptor = await sequelize.query(
    `select * from dte.dbo.receptor where  dte_Id=${_idDte}`,
    { type: QueryTypes.SELECT }
  );
  const datosQr = {
    fechaEmi: moment
      .tz(_dte[0].fechaHoraGeneracion, "America/El_Salvador")
      .format("YYYY-MM-DD"),
    codGen: _dte[0].codigoGeneracion,
    ambiente: process.env.DTE_AMBIENTE,
  };

  await rqcode(datosQr);

  const html = fs.readFileSync(
    path.join(__dirname, "../template/index14.html"),
    "utf-8"
  );

  let array = [];
  let item = 0;

  _dteCuerpo.forEach((d) => {
    item = item + 1;
    const prod = {
      numItem: item,
      tipoItem: d.tipoItem,
      cantidad: d.cantidad,
      codigo: null,
      uniMedida: "UNIDAD",
      descripcion: d.descripcion,
      precioUni: d.precioUni.toFixed(2),
      montoDescu: d.montoDescu.toFixed(2),
      compra: d.compra.toFixed(2),
    };
    array.push(prod);
  });

  let tipo,
    dir = "";
  if (_dte[0].tipoDoc === "03") {
    tipo = "COMPROBANTE CREDITO FISCAL";
    dir = "dte03";
  }
  if (_dte[0].tipoDoc === "01") {
    tipo = "COMPROBANTE CONSUMIDOR FINAL";
    dir = "dte01";
  }
  if (_dte[0].tipoDoc === "05") {
    tipo = "COMPROBANTE NOTA DE CREDITO";
    dir = "dte05";
  }
  if (_dte[0].tipoDoc === "07") {
    tipo = "COMPROBANTE DE RETENCIÓN";
    dir = "dte07";
  }
  if (_dte[0].tipoDoc === "14") {
    tipo = "FACTURA SUJETO EXCLUIDO";
    dir = "dte14";
  }



  const obj = {
    tipoDoc: tipo,
    codigoGeneracion: _dte[0].codigoGeneracion,
    numeroControl: _dte[0].Dte,
    selloRecibido: _dte[0].selloRecibido,
    fechaHoraGeneracion: moment
      .tz(_dte[0].fechaHoraGeneracion, "America/El_Salvador")
      .format("DD-MM-YYYY HH:MM:SS"),
    nombre: _dteSujetoExcluido[0].nombre,
    nit: _dteSujetoExcluido[0].nit,
    descActividad: _dteSujetoExcluido[0].descActividad,
    direccion_compl: _dteSujetoExcluido[0].direccion_compl,
    telefono: _dteSujetoExcluido[0].telefono,
    correo: _dteSujetoExcluido[0].correo,
    prodlist: array,
    totalCompras: _dteResumen[0].totalCompra.toFixed(2),
    descu: 0.0,
    subTotal: _dteResumen[0].subTotal.toFixed(2),
    ivaRete1: _dteResumen[0].ivaRete1.toFixed(2),
    reteRenta: _dteResumen[0].reteRenta.toFixed(2),
    totalPagar: _dteResumen[0].totalPagar.toFixed(2),
    totalLetras: _dteResumen[0].totalLetras,
  };

  const document = {
    html: html,
    data: {
      products: obj,
    },
    path: `../backend/storage/pdf/${dir}/` + filePdf,
  };

  await pdf
    .create(document, options)
    .then((res) => {
      console.log("respuesta", res);
    })
    .catch((error) => {
      console.log(error);
    });
};
module.exports = { generaPdf, generaPdf07, generaPdf05, generaPdf14 };
