const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/mssql");
const { impuestoModel } = require("../models");

const getImpuesto = async (req, res) => {
  try {
    const data = await impuestoModel.findAll({
      raw: true,
      subQuery: false,
    });

    res.send({ result: data, success: true });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { getImpuesto };
