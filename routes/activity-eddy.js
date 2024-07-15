import express from "express";
import sequelize from "#configs/db.js";
const { Activity } = sequelize.models;
import { QueryTypes, Op } from "sequelize";

// 檢查空物件, 轉換req.params為數字
import { getIdParam } from '#db-helpers/db-tool.js'

const router = express.Router();

const genConcatRegexp = (param, column) => {
  return sequelize.where(
    sequelize.fn("CONCAT", ",", sequelize.col(column), ","),
    {
      [Op.regexp]: `,(${param.split(",").join("|")}),`,
    }
  );
};

const genClause = (key, value) => {
  switch (key) {
    case "name_like":
      return {
        name: {
          [Op.like]: `%${value}%`,
        },
      };
    case "actClass":
      return genConcatRegexp(value, "actClass");
    case "area":
      return genConcatRegexp(value, "area");
    default:
      return "";
  }
};

router.get("/", async (req, res) => {
  const conditions = [];
  for (const [key, value] of Object.entries(req.query)) {
    if (value) {
      const clause = genClause(key, value);
      if (clause) conditions.push(clause);
    }
  }

  try {
    const { count, rows } = await Activity.findAndCountAll({
      where: conditions.length > 0 ? { [Op.and]: conditions } : {},
      raw: true,
    });

    if (req.query.raw === "true") {
      return res.json(rows);
    }

    return res.json({
      status: "success",
      data: {
        total: count,
        activity: rows,
      },
    });
  } catch (e) {
    console.log(e);

    return res.json({
      status: "error",
      message: "無法查詢到資料，查詢字串可能有誤",
    });
  }
});

router.get("/:id", async (req, res) => {
  const actid = getIdParam(req);

  const activity = await Activity.findByPk(actid, {
    raw: true,
  });

  return res.json({ status: "success", data: { activity } });
});

export default router;
