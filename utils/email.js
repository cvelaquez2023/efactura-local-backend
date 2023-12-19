const { transporter } = require("../config/mailer");
const fs = require("fs");
const path = require("path");
const emailRechazo = async (dte, email, tipo) => {
  const data = fs.readFileSync(
    `"../../storage/json/${tipo}/rechazados/${dte}.json`,
    "utf8"
  );
  /*
  const dataPDF = fs.readFileSync(
    `"../../storage/pdf/dte01/${dte}.pdf`,
    "utf8"
  );
  */

  try {
    return await transporter.sendMail({
      from: '"Soporte H2C S.A.de C.V." <carlosrobertovelasquez@gmail.com>', // sender address
      to: email, // list of receivers
      subject: "Rechazo de Dte ", // Subject line
      attachments: [
        {
          filename: `${dte}.json`,
          content: data,
        },
        /*
        {
          filename: `${dte}.pdf`,
          content: dataPDF,
        },
        */
      ],
      html: `
             Hola,
             <br>
             <br>
             El Ministerio de Hacienda  a Rechazado el siguiente Documento Tributario Eletronico ${dte}  
             <br>
             <br>
             <span>H2C S.A. de C.V.</span> Soporte
            `, // html body
    });
  } catch (error) {
    console.log(error);
  }
};
const emailEnviado = async (dte, email, tipo) => {
  const data = fs.readFileSync(
    `"../../storage/json/${tipo}/aceptados/${dte}.json`,
    "utf8"
  );
  // const dataPDF = fs.readFileSync(`../../storage/pdf/dte01/${dte}.pdf`);

  try {
    return await transporter.sendMail({
      from: '"Soporte H2C S.A.de C.V." <carlosrobertovelasquez@gmail.com>', // sender address
      to: email, // list of receivers
      subject: "Envio de Dte ", // Subject line
      attachments: [
        {
          filename: `${dte}.json`,
          content: data,
        },

        /*    
        {
          filename: `${dte}.pdf`,
          content: dataPDF,
          contentType: "application/pdf",
        },
        */
      ],
      html: `
                   Estimado Cliente , por este medio hacemos llegar su Comprobante de Documento Tributario Eletronico,
                   <br>
                   <br>
                   Agradecemos su preferencia a nuestros productos y servcios   
                   <br>
                   <br>
                   <span>H2C S.A. de C.V.</span> Soporte
                  `, // html body
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { emailRechazo, emailEnviado };
