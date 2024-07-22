import { DataTypes } from 'sequelize'

export default async function (sequelize) {
  return sequelize.define(
    'Product',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      picture: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      picture2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      picture3: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      activity: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      intro: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'product', //直接提供資料表名稱
      timestamps: true, // 使用時間戳
      paranoid: false, // 軟性刪除
      underscored: true, // 所有自動建立欄位，使用snake_case命名
      createdAt: 'created_at', // 建立的時間戳
      updatedAt: 'updated_at', // 更新的時間戳
    }
  )
}
