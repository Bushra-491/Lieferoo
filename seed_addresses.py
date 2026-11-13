import json
import os
import psycopg

def seed_database():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is not set in this terminal.")
        return

    json_path = "data/B1_sample_addresses.json"
    if not os.path.exists(json_path):
        print(f"Error: Could not find {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    addresses = data.get("addresses", [])
    print(f"Found {len(addresses)} addresses in JSON file. Starting insertion...")

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            for addr in addresses:
                # Unpack lat and lng from nested location object
                loc = addr.get("location", {})
                lat = loc.get("lat")
                lng = loc.get("lng")

                # Handle sub_buildings list conversion
                sub_bldgs = addr.get("sub_buildings", [])
                sub_bldgs_str = ", ".join(sub_bldgs) if isinstance(sub_bldgs, list) else sub_bldgs

                cur.execute(
                    """
                    INSERT INTO addresses (
                        address_id, building_type, building_name_ko, building_name_en,
                        sub_buildings, road_address_ko, road_address_en,
                        jibun_address_ko, jibun_address_en, district_ko, district_en,
                        legal_dong_ko, legal_dong_en, zip_code, lat, lng
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (address_id) DO NOTHING;
                    """,
                    (
                        addr.get("address_id"),
                        addr.get("building_type"),
                        addr.get("building_name_ko"),
                        addr.get("building_name_en"),
                        sub_bldgs_str,
                        addr.get("road_address_ko"),
                        addr.get("road_address_en"),
                        addr.get("jibun_address_ko"),
                        addr.get("jibun_address_en"),
                        addr.get("district_ko"),
                        addr.get("district_en"),
                        addr.get("legal_dong_ko"),
                        addr.get("legal_dong_en"),
                        addr.get("zip_code"),
                        lat,
                        lng
                    )
                )
        conn.commit()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
