import { Request, Response } from "express";
import knex from "../database/connections";

export default class PointsController {
  async index(request: Request, response: Response) {
    const { city, items, uf } = request.query;
    const parsedItems = String(items)
      .split(",")
      .map((item) => Number(item.trim()));
    const points = await knex("points")
      .join("point_items", "points.id", "=", "point_items.point_id")
      .whereIn("point_items.item_id", parsedItems)
      .where("city", String(city))
      .where("uf", String(uf))
      .distinct()
      .select("points.*");

    const serializedPoints = points.map((point) => ({
      ...point,
      image_url: `http://192.168.0.107/uploads/${point.image}`,
    }));
    return response.json(serializedPoints);
  }

  async show(request: Request, response: Response) {
    const { id } = request.params;
    console.log(id);
    const point = await knex("points").where("id", id).first();
    console.log(point);
    if (!point) {
      return response.status(404).json({ errorMessage: "Point not found." });
    }
    const serializedPoint = {
      ...point,
      image_url: `http://192.168.0.107/uploads/${point.image}`,
    };

    /*
        SELECT * FROM items 
            JOIN point_items ON point_items.item_id = items.id 
          WHERE point_items.point_id = id;
    */
    const items = await knex("items")
      .join("point_items", "items.id", "=", "point_items.item_id")
      .where("point_items.point_id", id)
      .select("items.title");

    return response.json({ serializedPoint, items });
  }

  async create(request: Request, response: Response) {
    const {
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
      items,
    } = request.body;

    const trx = await knex.transaction();
    const point = {
      image: request.file.filename,
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
    };

    const insertedIds = await trx("points").insert(point);
    const pointId = insertedIds[0];

    const pointItems = items
      .split(",")
      .map((item: string) => Number(item.trim()))
      .map((itemId: number) => {
        return {
          item_id: itemId,
          point_id: pointId,
        };
      });

    await trx("point_items").insert(pointItems);

    await trx.commit();

    return response.json({
      id: pointId,
      ...point,
    });
  }
}
