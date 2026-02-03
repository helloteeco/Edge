#!/usr/bin/env python3
"""
Remove duplicate city entries from city-data.ts, keeping the entry with the higher marketScore.overall
"""
import re
import json

def extract_city_entries(content):
    """Extract all city entries from the content"""
    entries = []
    
    # Pattern for TypeScript-style entries (id: 'xxx')
    ts_pattern = r"\{\s*id:\s*'([^']+)'[^}]+\}"
    
    # Pattern for JSON-style entries ("id":"xxx")
    json_pattern = r'\{"id":"([^"]+)"[^}]+\}'
    
    # Find all entries with their positions
    for match in re.finditer(ts_pattern, content, re.DOTALL):
        entry_text = match.group(0)
        city_id = match.group(1)
        start = match.start()
        end = match.end()
        
        # Extract marketScore.overall
        score_match = re.search(r'marketScore:\s*\{[^}]*overall:\s*(\d+)', entry_text)
        score = int(score_match.group(1)) if score_match else 0
        
        entries.append({
            'id': city_id,
            'text': entry_text,
            'start': start,
            'end': end,
            'score': score,
            'format': 'ts'
        })
    
    for match in re.finditer(json_pattern, content):
        entry_text = match.group(0)
        city_id = match.group(1)
        start = match.start()
        end = match.end()
        
        # Extract marketScore.overall from JSON
        score_match = re.search(r'"overall":(\d+)', entry_text)
        score = int(score_match.group(1)) if score_match else 0
        
        entries.append({
            'id': city_id,
            'text': entry_text,
            'start': start,
            'end': end,
            'score': score,
            'format': 'json'
        })
    
    return entries

def main():
    with open('src/data/city-data.ts', 'r') as f:
        content = f.read()
    
    entries = extract_city_entries(content)
    print(f"Total entries found: {len(entries)}")
    
    # Group by ID and find duplicates
    by_id = {}
    for entry in entries:
        city_id = entry['id']
        if city_id not in by_id:
            by_id[city_id] = []
        by_id[city_id].append(entry)
    
    # Find entries to remove (keep highest score)
    to_remove = []
    for city_id, city_entries in by_id.items():
        if len(city_entries) > 1:
            # Sort by score descending, keep the highest
            city_entries.sort(key=lambda x: x['score'], reverse=True)
            best = city_entries[0]
            print(f"Duplicate: {city_id}")
            print(f"  Keeping: score={best['score']} format={best['format']}")
            for entry in city_entries[1:]:
                print(f"  Removing: score={entry['score']} format={entry['format']}")
                to_remove.append(entry)
    
    print(f"\nTotal duplicates to remove: {len(to_remove)}")
    
    # Sort by position descending so we can remove from end to start
    to_remove.sort(key=lambda x: x['start'], reverse=True)
    
    # Remove entries from content
    for entry in to_remove:
        # Find the full entry including trailing comma
        start = entry['start']
        end = entry['end']
        
        # Look for trailing comma and whitespace
        trailing = content[end:end+50]
        comma_match = re.match(r'\s*,?\s*', trailing)
        if comma_match:
            end += comma_match.end()
        
        # Look for leading whitespace/newline
        leading = content[max(0, start-20):start]
        leading_ws = re.search(r'[\n\r]\s*$', leading)
        if leading_ws:
            start = max(0, start - 20) + leading_ws.start() + 1
        
        content = content[:start] + content[end:]
    
    # Write back
    with open('src/data/city-data.ts', 'w') as f:
        f.write(content)
    
    print(f"\nRemoved {len(to_remove)} duplicate entries")
    
    # Verify
    with open('src/data/city-data.ts', 'r') as f:
        new_content = f.read()
    
    new_entries = extract_city_entries(new_content)
    new_ids = [e['id'] for e in new_entries]
    unique_ids = set(new_ids)
    
    print(f"After cleanup: {len(new_entries)} entries, {len(unique_ids)} unique IDs")
    
    if len(new_entries) != len(unique_ids):
        remaining_dups = [id for id in new_ids if new_ids.count(id) > 1]
        print(f"Warning: Still have duplicates: {set(remaining_dups)}")

if __name__ == '__main__':
    main()
