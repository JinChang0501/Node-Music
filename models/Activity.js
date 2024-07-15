import { DataTypes } from 'sequelize'
// import Aclass from './Aclass.js';

export default async function (sequelize) {
  // const Aclass = sequelize.models.aclass || await import('./Aclass.js').then(m => m.default(sequelize));
  return sequelize.define(
    'Activity',
    {
      actid: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      class: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      actdate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      acttime: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      area: {
        type: DataTypes.STRING,
        allowNull: false,
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
        references: {
          model: 'artist',
          key: 'id'
        },
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
    },
  )
  // Aclass.hasMany(Activity, { foreignKey: 'activity_class' })
  // Activity.belongsTo(Aclass, { foreignKey: 'activity_class' })

  // return Activity
}
