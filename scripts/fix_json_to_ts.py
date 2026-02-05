#!/usr/bin/env python3
"""
Convert JSON format entries in city-data.ts to proper TypeScript object literal format
"""
import re

# Read the file
with open('/home/ubuntu/edge-fix/src/data/city-data.ts', 'r') as f:
    content = f.read()

# Convert JSON format to TypeScript format:
# 1. Replace "key": with key: (remove quotes around keys)
# 2. Replace "value" with 'value' for string values

# First, let's identify JSON entries (they have "id": instead of id:)
# We need to convert them line by line

lines = content.split('\n')
new_lines = []

for line in lines:
    if '"id":' in line:
        # This is a JSON format line, convert it
        # Replace "key": with key:
        converted = re.sub(r'"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:', r'\1:', line)
        # Replace remaining "string" with 'string' for values
        # But be careful not to replace numbers or booleans
        # Match "value" that comes after : and convert to 'value'
        converted = re.sub(r':\s*"([^"]*)"', r": '\1'", converted)
        new_lines.append(converted)
    else:
        new_lines.append(line)

new_content = '\n'.join(new_lines)

# Write back
with open('/home/ubuntu/edge-fix/src/data/city-data.ts', 'w') as f:
    f.write(new_content)

# Count entries
ts_count = len(re.findall(r"id: '", new_content))
json_count = len(re.findall(r'"id":', new_content))

print(f"Converted JSON entries to TypeScript format")
print(f"TypeScript format entries: {ts_count}")
print(f"Remaining JSON format entries: {json_count}")
print(f"Total: {ts_count + json_count}")
