const PDF = require("pdfkit-construct");
const fs = require("fs");
const {
  SqlFactura,
  SqlCliente,
  SqlFacturaLinea,
  SqlDte,
  SqlDteReceptor,
  SqlDteResumen,
} = require("../../../sqltx/sql");

const fac01 = async (_factura) => {
  const getFactura = await SqlFactura(_factura);
  const getCliente = await SqlCliente(getFactura[0].CLIENTE);
  const _fileName = `"../../storage/pdf/dte01/${_factura}.pdf`;
  //fs.writeFileSync(_fileName, JSON.stringify(JsonCliente));

  const detalle = await SqlFacturaLinea(_factura);
  const dteId = await SqlDte(_factura);
  const _receptor = await SqlDteReceptor(dteId[0].Dte_id);
  const _resumen = await SqlDteResumen(dteId[0].Dte_id);
  const doc = new PDF({ margin: 5, size: "A4" });

  const registros = detalle.map((venta) => {
    const registro = {
      linea: venta.LINEA,
      articulo: venta.ARTICULO,
      descripcion: venta.DESCRIPCION,
      cantidad: venta.CANTIDAD,
      precio: (venta.PRECIO_UNITARIO + venta.TOTAL_IMPUESTO1).toFixed(2),
      precioTotal:
        (venta.PRECIO_UNITARIO + venta.TOTAL_IMPUESTO1).toFixed(2) *
        venta.CANTIDAD,
    };
    return registro;
  });

  doc.setDocumentHeader(
    {
      height: "12%",
    },
    () => {
      doc.image("logo.jpeg", 20, 10, { width: 50 });
      doc.fontSize(20).text("FACTURA", 20, 20, {
        align: "center",
      });
      doc.fontSize(11).text(`${_factura}`, 20, 38, {
        align: "center",
      });
      doc.fontSize(8).text(`${dteId[0].selloRecibido}`, 400, 38, {
        align: "left",
      });
      doc.fontSize(8).text(`${dteId[0].codigoGeneracion}`, 400, 48, {
        align: "left",
      });
      doc.fontSize(8).text(`CLIENTE:${getFactura[0].CLIENTE}`, 50, 58, {
        align: "left",
      });
      doc.fontSize(8).text(`NOMBRE:${getCliente[0].ALIAS}`, 50, 68, {
        align: "left",
      });
      doc.fontSize(8).text(`DIRECCION:${getCliente[0].DIRECCION}`, 50, 78, {
        align: "lef",
      });

      doc.fontSize(8).text(`NOMBRE:${getCliente[0].NOMBRE}`, {
        width: 420,
        align: "left",
      });
    }
  );

  doc.addTable(
    [
      { key: "linea", label: "Linea", align: "left" },
      { key: "articulo", label: "Articulo", align: "left" },
      { key: "descripcion", label: "Descripcion", align: "left" },
      { key: "cantidad", label: "Cantidad", align: "right" },
      { key: "precio", label: "Precio Uni.", align: "right" },
      { key: "precioTotal", label: "Total", align: "right" },
    ],
    registros,
    {
      border: { size: 0.1, color: "#cdcdcd" },
      width: "fill_body",
      striped: true,
      stripedColors: ["#f6f6f6", "#d6c4dd"],
      cellsPadding: 5,
      marginLeft: 10,
      marginRight: 10,
      headAlign: "left",
    }
  );

  doc.setDocumentFooter(
    {
      height: "10%",
    },
    () => {
      doc
        .fontSize(15)
        .text(
          `Total:${_resumen[0].totalPagar}`,
          doc.footer.x + 250,
          doc.footer.y + 1
        );
    }
  );
  doc.render();

  doc.pipe(fs.writeFileSync(_fileName));
  doc.end();
};

const fac03 = async (_factura) => {
  const invoice = {
    shipping: {
      name: "John Doe",
      address: "1234 Main Street",
      city: "San Francisco",
      state: "CA",
      country: "US",
      postal_code: 94111,
    },
    items: [
      {
        item: "TC 100",
        description: "Toner Cartridge",
        quantity: 2,
        amount: 6000,
      },
      {
        item: "USB_EXT",
        description: "USB Cable Extender",
        quantity: 1,
        amount: 2000,
      },
    ],
    subtotal: 8000,
    paid: 0,
    invoice_nr: 1234,
  };
  const _fileName = `"../../storage/pdf/dte01/${_factura}.pdf`;
  createInvoice(invoice, _fileName);
};

function createInvoice(invoice, path) {
  let doc = new PDF({ margin: 50 });
  generateHeader(doc);
  generateCustonInformacion(doc, invoice);
  generateInvoiceTable(doc, invoice);
  generateFooter(doc);
  doc.end();
  doc.pipe(fs.createWriteStream(path));
}
function generateHeader(doc) {
  doc
    .image("logo.jpeg", 50, 45, { with: 50 })
    .fillColor("#444444")
    .fontSize(20)
    .text("Drogueria Universal S.A. de C.V", 110, 57)
    .fontSize(10)
    .text("123 Main Street", 200, 65, { align: "right" })
    .text("New York, NY,10025", 200, 80, { align: "right" })
    .moveDown();
}
function generateFooter(doc) {
  doc
    .fontSize(10)
    .text(
      "Payment is due within 15 days. Thank you for your business.",
      50,
      780,
      { align: "center", with: 500 }
    );
}
function generateCustonInformacion(doc, invoice) {
  doc.fillColor("#444444").fontSize(20).text("Invoice", 50, 160);

  generateHr(doc, 185);

  const customerInformationTop = 200;

  doc
    .fontSize(10)
    .text("Invoice Number:", 50, customerInformationTop)
    .font("Helvetica-Bold")
    .text(invoice.invoice_nr, 150, customerInformationTop)
    .font("Helvetica")
    .text("Invoice Date:", 50, customerInformationTop + 15)
    .text(formatDate(new Date()), 150, customerInformationTop + 15)
    .text("Balance Due:", 50, customerInformationTop + 30)
    .text(
      formatCurrency(invoice.subtotal - invoice.paid),
      150,
      customerInformationTop + 30
    )

    .font("Helvetica-Bold")
    .text(invoice.shipping.name, 300, customerInformationTop)
    .font("Helvetica")
    .text(invoice.shipping.address, 300, customerInformationTop + 15)
    .text(
      invoice.shipping.city +
        ", " +
        invoice.shipping.state +
        ", " +
        invoice.shipping.country,
      300,
      customerInformationTop + 30
    )
    .moveDown();

  generateHr(doc, 252);
}
function generateTableRow(
  doc,
  y,
  item,
  description,
  unitCost,
  quantity,
  lineTotal
) {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(description, 150, y)
    .text(unitCost, 280, y, { width: 90, align: "right" })
    .text(quantity, 370, y, { width: 90, align: "right" })
    .text(lineTotal, 0, y, { align: "right" });
}
function generateInvoiceTable(doc, invoice) {
  let i;
  const invoiceTableTop = 330;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    invoiceTableTop,
    "Item",
    "Description",
    "Unit Cost",
    "Quantity",
    "Line Total"
  );
  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");

  for (i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    const position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.item,
      item.description,
      formatCurrency(item.amount / item.quantity),
      item.quantity,
      formatCurrency(item.amount)
    );

    generateHr(doc, position + 20);
  }

  const subtotalPosition = invoiceTableTop + (i + 1) * 30;
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "Subtotal",
    "",
    formatCurrency(invoice.subtotal)
  );

  const paidToDatePosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    paidToDatePosition,
    "",
    "",
    "Paid To Date",
    "",
    formatCurrency(invoice.paid)
  );

  const duePosition = paidToDatePosition + 25;
  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    duePosition,
    "",
    "",
    "Balance Due",
    "",
    formatCurrency(invoice.subtotal - invoice.paid)
  );
  doc.font("Helvetica");
}
function generateHr(doc, y) {
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}
function formatCurrency(cents) {
  return "$" + (cents / 100).toFixed(2);
}
function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return year + "/" + month + "/" + day;
}
module.exports = { fac01, fac03 };
