const { toString } = require("qrcode");
const { readFileSync, writeFileSync } = require("fs");
const { write } = require("pdfkit");

const Print = (msg) => console.log(msg);
const rqcode = async (datos) => {
  const http = `https://admin.factura.gob.sv/consultaPublica?ambiente=${datos.ambiente}&codGen=${datos.codGen}&fechaEmi=${datos.fechaEmi}`;

  toString(
    http,
    {
      type: "svg",
    },
    (err, data) => {
      if (err) return Print(`Ocurrio un error ${err}`);
      var web = readFileSync(__dirname + "/ccf.html", {
        encoding: "utf8",
      }).replace("[QR CODE]", data);
      writeFileSync(__dirname + "/index.html", web, { encoding: "utf-8" });
    }
  );
};

module.exports = rqcode;
