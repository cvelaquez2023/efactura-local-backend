const { sequelize } = require("../config/mssql");
const { DataTypes } = require("sequelize");
const Documentos = sequelize.define(
  "DOCUMENTOS_CC",
  {
    DOCUMENTO: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    TIPO: {
      type: DataTypes.STRING,
    },
    FECHA_DOCUMENTO: {
      type: DataTypes.STRING,
    },
    MONTO: {
      type: DataTypes.DECIMAL,
    },
    CLIENTE: {
      type: DataTypes.STRING,
    },
    APLICACION: {
      type: DataTypes.STRING,
    },
  },
  { timestamps: false, hasTrigger: true }
);

module.exports = Documentos;
