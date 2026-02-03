#!/usr/bin/env python3
"""
Remove duplicate city entries from city-data.ts by parsing the file structure properly.
Keeps the entry with the higher marketScore.overall.
"""
import re
import json

def main():
    with open('src/data/city-data.ts', 'r') as f:
        content = f.read()
    
    # Find the start of cityData object
    match = re.search(r'export const cityData: Record<string, CityData\[\]> = \{', content)
    if not match:
        print("Could not find cityData export")
        return
    
    header = content[:match.end()]
    rest = content[match.end():]
    
    # Parse each state's array
    # Pattern: STATE_CODE: [entries],
    state_pattern = r'\n\s*(\w{2}):\s*\['
    
    states = {}
    current_pos = 0
    
    for state_match in re.finditer(state_pattern, rest):
        state_code = state_match.group(1)
        array_start = state_match.end()
        
        # Find the closing bracket for this array
        bracket_count = 1
        pos = array_start
        while bracket_count > 0 and pos < len(rest):
            if rest[pos] == '[':
                bracket_count += 1
            elif rest[pos] == ']':
                bracket_count -= 1
            pos += 1
        
        array_content = rest[array_start:pos-1]
        states[state_code] = {
            'start': state_match.start(),
            'end': pos,
            'content': array_content
        }
    
    print(f"Found {len(states)} states")
    
    # For each state, parse entries and remove duplicates
    total_removed = 0
    
    for state_code, state_info in states.items():
        array_content = state_info['content']
        
        # Find all city entries in this array
        # Match both TypeScript and JSON format entries
        entries = []
        
        # Pattern for complete city objects
        entry_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        
        for entry_match in re.finditer(entry_pattern, array_content):
            entry_text = entry_match.group(0)
            
            # Extract ID
            id_match = re.search(r"id:\s*'([^']+)'", entry_text) or re.search(r'"id":"([^"]+)"', entry_text)
            if not id_match:
                continue
            
            city_id = id_match.group(1)
            
            # Extract score
            score_match = re.search(r'overall:\s*(\d+)', entry_text) or re.search(r'"overall":(\d+)', entry_text)
            score = int(score_match.group(1)) if score_match else 0
            
            entries.append({
                'id': city_id,
                'text': entry_text,
                'start': entry_match.start(),
                'end': entry_match.end(),
                'score': score
            })
        
        # Group by ID and find duplicates
        by_id = {}
        for entry in entries:
            city_id = entry['id']
            if city_id not in by_id:
                by_id[city_id] = []
            by_id[city_id].append(entry)
        
        # Build new array content keeping only best entries
        new_entries = []
        for city_id, city_entries in by_id.items():
            if len(city_entries) > 1:
                # Sort by score descending
                city_entries.sort(key=lambda x: x['score'], reverse=True)
                best = city_entries[0]
                print(f"{state_code}: {city_id} - keeping score {best['score']}, removing {len(city_entries)-1} duplicate(s)")
                total_removed += len(city_entries) - 1
                new_entries.append(best)
            else:
                new_entries.append(city_entries[0])
        
        # Sort entries by their original position to maintain order
        new_entries.sort(key=lambda x: x['start'])
        
        # Rebuild the array content
        new_array_content = '\n    ' + ',\n    '.join(e['text'] for e in new_entries)
        
        state_info['new_content'] = new_array_content
    
    print(f"\nTotal duplicates removed: {total_removed}")
    
    # Rebuild the entire file
    new_content = header + '\n'
    
    # Sort states alphabetically
    for state_code in sorted(states.keys()):
        state_info = states[state_code]
        new_content += f"  {state_code}: [{state_info['new_content']}\n  ],\n"
    
    new_content += '};\n'
    
    # Write back
    with open('src/data/city-data.ts', 'w') as f:
        f.write(new_content)
    
    print("File updated successfully")

if __name__ == '__main__':
    main()
