import json
import os
import psycopg


def seed():
    database_url = os.environ["DATABASE_URL"]
    with open("data/B1_sample_addresses.json", "r", encoding="utf-8") as f:
        payload = json.load(f)

    addresses = payload.get("addresses", [])

    sql = """
        INSERT INTO addresses (
            address_id,
            building_type,
            building_name_ko,
            building_name_en,
            sub_buildings,
            road_address_ko,
            road_address_en,
            jibun_address_ko,
            jibun_address_en,
            district_ko,
            district_en,
            legal_dong_ko,
            legal_dong_en,
            zip_code,
            lat,
            lng
        )
        VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (address_id) DO NOTHING;
    """

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            for item in addresses:
                loc = item.get("location") or {}
                cur.execute(
                    sql,
                    (
                        item["address_id"],
                        item.get("building_type", ""),
                        item.get("building_name_ko"),
                        item.get("building_name_en"),
                        json.dumps(item.get("sub_buildings", [])),
                        item["road_address_ko"],
                        item["road_address_en"],
                        item["jibun_address_ko"],
                        item["jibun_address_en"],
                        item.get("district_ko", ""),
                        item.get("district_en", ""),
                        item.get("legal_dong_ko", ""),
                        item.get("legal_dong_en", ""),
                        item.get("zip_code", ""),
                        loc.get("lat", 0.0),
                        loc.get("lng", 0.0),
                    ),
                )
            cur.execute("SELECT COUNT(*) FROM addresses;")
            count = cur.fetchone()[0]

    print(f"Total rows in addresses: {count}")


if __name__ == "__main__":
    seed()
