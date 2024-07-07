import { DataTypes } from 'sequelize'

export default async function (sequelize) {
  return sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sent_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      noti_class: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // references: {
        //   model: 'nclass',
        //   key: 'id'
        // },
      },
    },
    {
      tableName: 'notification', //直接提供資料表名稱
      timestamps: true, // 使用時間戳
      paranoid: false, // 軟性刪除
      underscored: true, // 所有自動建立欄位，使用snake_case命名
      createdAt: 'created_at', // 建立的時間戳
      updatedAt: 'updated_at', // 更新的時間戳
    }
  )
}
