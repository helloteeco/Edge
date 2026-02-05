#!/usr/bin/env python3
"""
Fix apostrophes in single-quoted strings by escaping them
"""
import re

# Read the file
with open('/home/ubuntu/edge-fix/src/data/city-data.ts', 'r') as f:
    content = f.read()

# Find all single-quoted strings and escape internal apostrophes
def escape_apostrophes(match):
    # Get the content between quotes
    inner = match.group(1)
    # Escape any apostrophes that aren't already escaped
    escaped = inner.replace("'", "\\'")
    return f"'{escaped}'"

# Match single-quoted strings
# This regex matches 'content' where content may contain apostrophes
content = re.sub(r"'([^'\\]*(?:\\.[^'\\]*)*)'", escape_apostrophes, content)

# Also handle the specific case of Coeur d'Alene which has a fancy apostrophe
content = content.replace("Coeur d'Alene", "Coeur d\\'Alene")
content = content.replace("Coeur d'Alene", "Coeur d\\'Alene")

# Write back
with open('/home/ubuntu/edge-fix/src/data/city-data.ts', 'w') as f:
    f.write(content)

print("Fixed apostrophes in single-quoted strings")
