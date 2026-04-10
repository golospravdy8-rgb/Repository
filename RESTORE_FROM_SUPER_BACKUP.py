#!/usr/bin/env python3
"""
Restore basket-lviv project from SUPER_FULL_BACKUP.json
"""
import json
import os
import sys
import base64
from pathlib import Path

def restore_backup(backup_file='SUPER_FULL_BACKUP.json'):
    if not os.path.exists(backup_file):
        print(f"ERROR: {backup_file} not found!")
        return False

    print(f"Loading {backup_file}...")
    try:
        with open(backup_file, 'r', encoding='utf-8') as f:
            backup = json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON - {e}")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

    print("Backup loaded successfully!\n")

    # 1. Restore structure (all source files)
    print("RESTORING STRUCTURE (455 files)...")
    restored_files = 0
    for filepath, content in backup.get('structure', {}).items():
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            restored_files += 1
            if restored_files % 50 == 0:
                print(f"  ... {restored_files} files")
        except Exception as e:
            print(f"  WARNING: Could not restore {filepath}: {e}")
    print(f"DONE: Restored {restored_files} source files\n")

    # 2. Restore environment files
    print("RESTORING SECRETS (.env files)...")
    for filename, content in backup.get('secrets', {}).items():
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  OK: {filename}")
        except Exception as e:
            print(f"  ERROR: {filename} - {e}")
    print()

    # 3. Restore images
    print("RESTORING IMAGES (75 files)...")
    total_images = 0
    for category, images in backup.get('data', {}).get('images', {}).items():
        category_dir = f"public/{category.replace('_', '-')}"
        os.makedirs(category_dir, exist_ok=True)
        
        for filename, b64_data in images.items():
            try:
                filepath = os.path.join(category_dir, filename)
                with open(filepath, 'wb') as f:
                    f.write(base64.b64decode(b64_data))
                total_images += 1
            except Exception as e:
                print(f"  WARNING: {category}/{filename} - {e}")
    
    print(f"DONE: Restored {total_images} images\n")

    # 4. Print database summary
    print("DATABASE SUMMARY:")
    db = backup.get('data', {}).get('database', {})
    for table_name, records in db.items():
        count = len(records) if isinstance(records, list) else 0
        if count > 0:
            print(f"  {table_name}: {count} records")
    print()

    print("=" * 60)
    print("RESTORATION COMPLETE!")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. npm install         # Install dependencies")
    print("  2. npm run db:push     # Create database schema")
    print("  3. npm run db:seed     # Restore database data")
    print("  4. npm run dev:safe    # Start development server")
    print("\nYour project is restored!")
    
    return True

if __name__ == '__main__':
    backup_file = sys.argv[1] if len(sys.argv) > 1 else 'SUPER_FULL_BACKUP.json'
    success = restore_backup(backup_file)
    sys.exit(0 if success else 1)
