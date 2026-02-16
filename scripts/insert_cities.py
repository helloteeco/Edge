#!/usr/bin/env python3
"""
Insert new city entries into city-data.ts at the correct state array positions.
Reads the generated entries from /tmp/new_city_entries.txt and inserts them
into the appropriate state arrays in city-data.ts.
"""

import re
from collections import defaultdict

def main():
    # Read the generated entries
    with open('/tmp/new_city_entries.txt') as f:
        lines = f.readlines()
    
    # Parse entries by state
    entries_by_state = defaultdict(list)
    current_state = None
    for line in lines:
        line = line.rstrip('\n')
        if line.startswith('// STATE: '):
            current_state = line.split('// STATE: ')[1].split(' ')[0]
        elif line.strip().startswith('{ id:'):
            if current_state:
                entries_by_state[current_state].append(line)
    
    print(f"Parsed entries for {len(entries_by_state)} states:")
    for state in sorted(entries_by_state.keys()):
        print(f"  {state}: {len(entries_by_state[state])} cities")
    
    # Read city-data.ts
    with open('src/data/city-data.ts') as f:
        ts_lines = f.readlines()
    
    # Find state array boundaries (line numbers are 0-indexed here)
    state_arrays = {}
    for i, line in enumerate(ts_lines):
        m = re.match(r'^  ([A-Z]{2}): \[', line)
        if m:
            state = m.group(1)
            state_arrays[state] = {'start': i}
    
    # Find closing brackets for each state
    for state, info in state_arrays.items():
        start = info['start']
        depth = 0
        for i in range(start, len(ts_lines)):
            line = ts_lines[i]
            depth += line.count('[') - line.count(']')
            if depth <= 0 and ']' in line:
                info['end'] = i  # This is the line with '],'
                break
    
    # Insert new entries - work backwards to preserve line numbers
    insertions = []
    for state, entries in entries_by_state.items():
        if state not in state_arrays:
            print(f"WARNING: State {state} not found in city-data.ts! Skipping.")
            continue
        
        # Insert before the closing bracket of the state array
        insert_at = state_arrays[state]['end']
        insertions.append((insert_at, state, entries))
    
    # Sort by line number descending so insertions don't shift earlier positions
    insertions.sort(key=lambda x: x[0], reverse=True)
    
    total_inserted = 0
    for insert_at, state, entries in insertions:
        # Each entry needs to end with a comma
        new_lines = []
        for entry in entries:
            entry = entry.rstrip()
            if not entry.endswith(','):
                entry += ','
            new_lines.append(entry + '\n')
        
        # Insert before the closing bracket
        for j, new_line in enumerate(reversed(new_lines)):
            ts_lines.insert(insert_at, new_line)
        
        total_inserted += len(entries)
        print(f"Inserted {len(entries)} cities into {state} at line {insert_at + 1}")
    
    # Write back
    with open('src/data/city-data.ts', 'w') as f:
        f.writelines(ts_lines)
    
    print(f"\nTotal: {total_inserted} new cities inserted into city-data.ts")
    
    # Verify by counting total cities
    with open('src/data/city-data.ts') as f:
        content = f.read()
    ids = re.findall(r"id: '([^']+)'", content)
    print(f"Total cities now in city-data.ts: {len(ids)}")
    
    # Check for duplicates
    seen = set()
    dupes = []
    for cid in ids:
        if cid in seen:
            dupes.append(cid)
        seen.add(cid)
    if dupes:
        print(f"WARNING: Found {len(dupes)} duplicate IDs: {dupes}")
    else:
        print("No duplicate IDs found.")

if __name__ == '__main__':
    main()
