import psycopg2
import os
from datetime import datetime

def dump_database(connection_string, output_file):
    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        # Get all tables in the public schema
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"-- Supabase Database Dump\n")
            f.write(f"-- Generated at: {datetime.now().isoformat()}\n\n")
            
            for table in tables:
                print(f"Dumping table: {table}")
                f.write(f"-- Data for table: {table}\n")
                
                # Get column names
                cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '{table}' ORDER BY ordinal_position;")
                columns = [row[0] for row in cursor.fetchall()]
                col_str = ", ".join([f'"{col}"' for col in columns])
                
                # Get data
                cursor.execute(f'SELECT * FROM "public"."{table}";')
                rows = cursor.fetchall()
                
                for row in rows:
                    # Format values properly for SQL
                    formatted_values = []
                    for val in row:
                        if val is None:
                            formatted_values.append("NULL")
                        elif isinstance(val, bool):
                            formatted_values.append("TRUE" if val else "FALSE")
                        elif isinstance(val, (int, float)):
                            formatted_values.append(str(val))
                        elif isinstance(val, dict) or isinstance(val, list):
                            import json
                            # Escape single quotes in JSON
                            json_str = json.dumps(val).replace("'", "''")
                            formatted_values.append(f"'{json_str}'")
                        else:
                            # Escape single quotes in strings
                            val_str = str(val).replace("'", "''")
                            formatted_values.append(f"'{val_str}'")
                            
                    val_str = ", ".join(formatted_values)
                    f.write(f'INSERT INTO "public"."{table}" ({col_str}) VALUES ({val_str});\n')
                
                f.write("\n")
                
        print(f"Successfully dumped data to {output_file}")
        print("\nNOTE: This script dumps DATA only (INSERT statements).")
        print("To dump the full schema (including RLS policies, functions, and triggers),")
        print("it is highly recommended to use the Supabase CLI:")
        print("  supabase db dump -h <db-host> -p 5432 -U postgres -f roles.sql --role-only")
        print("  supabase db dump -h <db-host> -p 5432 -U postgres -f schema.sql")
        print("  supabase db dump -h <db-host> -p 5432 -U postgres -f data.sql --data-only")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    print("=== Supabase Database Dumper ===")
    print("You can find your connection string in the Supabase Dashboard:")
    print("Project Settings -> Database -> Connection string -> URI")
    print("Example: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres")
    
    conn_str = input("\nEnter your Supabase connection string: ").strip()
    
    if conn_str:
        output_filename = f"supabase_dump_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        dump_database(conn_str, output_filename)
    else:
        print("Connection string cannot be empty.")
