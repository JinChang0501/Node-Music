import { DataTypes } from 'sequelize'

export default async function (sequelize) {
  return sequelize.define(
    'Ticket',
    {
      tid: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      activity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'activity',
          key: 'actid',
        },
      },
      seat_area: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      seat_row: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      seat_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      member_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'member',
          key: 'id',
        },
      },
      order_num: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
    },
    {
      tableName: 'ticket',
      timestamps: true, // 使用時間戳
      paranoid: false, // 軟性刪除
      underscored: true, // 所有自動建立欄位，使用snake_case命名
      createdAt: 'created_at', // 建立的時間戳
      //updatedAt: 'updated_at', // 更新的時間戳
    }
  )
}
