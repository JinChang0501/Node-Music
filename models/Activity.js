import { DataTypes } from 'sequelize'

export default async function (sequelize) {
  return sequelize.define(
    'Activity',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      activity_class: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      activity_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      a_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      // 跟銘討論日期跟時間是否需合併
      a_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      area: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      descriptions: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      organizer: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      picture: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cover: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'activity', //直接提供資料表名稱
      timestamps: true, // 使用時間戳
      paranoid: false, // 軟性刪除
      underscored: true, // 所有自動建立欄位，使用snake_case命名
      createdAt: 'created_at', // 建立的時間戳
      updatedAt: 'updated_at', // 更新的時間戳
    }
  )
}
