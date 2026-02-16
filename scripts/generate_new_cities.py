#!/usr/bin/env python3
"""
Generate new city entries for city-data.ts.

Strategy:
- Build a master list of ~250+ cities to add across target regions + national park gateways
- Calibrate data using nearby existing cities in the same state/region
- Output TypeScript-formatted entries grouped by state
- Validate no duplicates against existing dataset
"""

import re
import json
import random
import math
import hashlib
from collections import defaultdict

random.seed(42)  # Reproducible

# ============================================================
# STEP 1: Parse existing cities from city-data.ts
# ============================================================

def parse_existing_cities(filepath):
    """Extract existing city IDs and data from city-data.ts"""
    with open(filepath) as f:
        content = f.read()
    
    existing_ids = set()
    existing_by_state = defaultdict(list)
    
    for line in content.split('\n'):
        id_match = re.search(r"id: '([^']+)'", line)
        if not id_match:
            continue
        city_id = id_match.group(1)
        existing_ids.add(city_id)
        
        state = city_id.split('-')[0].upper()
        pop = int(m.group(1)) if (m := re.search(r'population: (\d+)', line)) else 0
        adr = int(m.group(1)) if (m := re.search(r'avgADR: (\d+)', line)) else 200
        occ = int(m.group(1)) if (m := re.search(r'occupancyRate: (\d+)', line)) else 55
        rev = int(m.group(1)) if (m := re.search(r'monthlyRevenue: (\d+)', line)) else 3000
        price = int(m.group(1)) if (m := re.search(r'medianHomePrice: (\d+)', line)) else 300000
        mtype = m.group(1) if (m := re.search(r"marketType: '([^']+)'", line)) else 'rural'
        name = m.group(1) if (m := re.search(r"name: '([^']+)'", line)) else ''
        lpt = float(m.group(1)) if (m := re.search(r'listingsPerThousand: ([\d.]+)', line)) else 10
        str_ratio = float(m.group(1)) if (m := re.search(r'strToHousingRatio: ([\d.]+)', line)) else 2.0
        yoy = float(m.group(1)) if (m := re.search(r'yoySupplyGrowth: ([\d.]+)', line)) else 5.0
        
        existing_by_state[state].append({
            'id': city_id, 'name': name, 'pop': pop, 'adr': adr, 'occ': occ,
            'rev': rev, 'price': price, 'type': mtype, 'lpt': lpt,
            'str_ratio': str_ratio, 'yoy': yoy,
        })
    
    return existing_ids, existing_by_state


# ============================================================
# STEP 2: Master list of new cities
# ============================================================

# Format: (id, name, county, state, population, market_type, highlights, near_park)
NEW_CITIES = [
    # === NEW RIVER GORGE WV AREA ===
    ('wv-oak-hill', 'Oak Hill', 'Fayette County', 'WV', 7730, 'rural', ['New River Gorge NP', 'Outdoor recreation', 'Gateway town'], 'New River Gorge'),
    ('wv-summersville', 'Summersville', 'Nicholas County', 'WV', 3500, 'lake', ['Summersville Lake', 'Largest lake in WV', 'Water sports'], 'New River Gorge'),
    ('wv-ansted', 'Ansted', 'Fayette County', 'WV', 1400, 'rural', ['Hawks Nest State Park', 'New River Gorge', 'Scenic overlooks'], 'New River Gorge'),
    ('wv-mount-hope', 'Mount Hope', 'Fayette County', 'WV', 1300, 'rural', ['New River Gorge area', 'Affordable entry', 'Small town charm'], 'New River Gorge'),
    ('wv-princeton', 'Princeton', 'Mercer County', 'WV', 5900, 'rural', ['Southern WV hub', 'Affordable housing', 'Regional center'], ''),
    ('wv-bluefield', 'Bluefield', 'Mercer County', 'WV', 9800, 'rural', ['Nature\'s air conditioning', 'Appalachian culture', 'Affordable market'], ''),
    ('wv-gauley-bridge', 'Gauley Bridge', 'Fayette County', 'WV', 600, 'rural', ['Gauley River', 'Whitewater rafting', 'NRG area'], 'New River Gorge'),
    ('wv-rainelle', 'Rainelle', 'Greenbrier County', 'WV', 1400, 'rural', ['Greenbrier Valley', 'Affordable entry', 'Near Lewisburg'], ''),
    
    # === GREENVILLE SC AREA ===
    ('sc-travelers-rest', 'Travelers Rest', 'Greenville County', 'SC', 8000, 'suburban', ['Swamp Rabbit Trail', 'Brewery scene', 'Blue Ridge gateway'], ''),
    ('sc-greer', 'Greer', 'Greenville County', 'SC', 35000, 'suburban', ['BMW manufacturing', 'Growing suburb', 'GSP airport'], ''),
    ('sc-simpsonville', 'Simpsonville', 'Greenville County', 'SC', 23000, 'suburban', ['Heritage Park', 'Family-friendly', 'Greenville suburb'], ''),
    ('sc-easley', 'Easley', 'Pickens County', 'SC', 22000, 'suburban', ['Blue Ridge foothills', 'Affordable', 'Growing community'], ''),
    ('sc-clemson', 'Clemson', 'Pickens County', 'SC', 17000, 'suburban', ['Clemson University', 'Game day rentals', 'Lake Hartwell'], ''),
    ('sc-pendleton', 'Pendleton', 'Anderson County', 'SC', 3500, 'rural', ['Historic village', 'Clemson area', 'Antique shops'], ''),
    ('sc-anderson', 'Anderson', 'Anderson County', 'SC', 28000, 'suburban', ['Lake Hartwell', 'Electric City', 'Affordable market'], ''),
    ('sc-seneca', 'Seneca', 'Oconee County', 'SC', 8500, 'lake', ['Lake Keowee', 'Lake Hartwell', 'Mountain gateway'], ''),
    ('sc-walhalla', 'Walhalla', 'Oconee County', 'SC', 4300, 'mountain', ['Oconee Station', 'Stumphouse Tunnel', 'Mountain gateway'], ''),
    ('sc-pickens', 'Pickens', 'Pickens County', 'SC', 3200, 'rural', ['Table Rock', 'Blue Ridge foothills', 'Small town charm'], ''),
    ('sc-westminster', 'Westminster', 'Oconee County', 'SC', 2700, 'rural', ['Lake Hartwell access', 'Affordable', 'Rural charm'], ''),
    
    # === GAINESVILLE FL AREA ===
    ('fl-alachua', 'Alachua', 'Alachua County', 'FL', 10000, 'suburban', ['North Gainesville', 'San Felasco Hammock', 'Growing community'], ''),
    ('fl-newberry', 'Newberry', 'Alachua County', 'FL', 7500, 'suburban', ['West Gainesville', 'Equestrian community', 'Rural charm'], ''),
    ('fl-high-springs', 'High Springs', 'Alachua County', 'FL', 6000, 'rural', ['Natural springs', 'Ichetucknee River', 'Eco-tourism'], ''),
    ('fl-micanopy', 'Micanopy', 'Alachua County', 'FL', 600, 'rural', ['Historic village', 'Antique shops', 'Paynes Prairie'], ''),
    ('fl-ocala', 'Ocala', 'Marion County', 'FL', 63000, 'suburban', ['Horse capital of world', 'Silver Springs', 'Ocala National Forest'], ''),
    ('fl-silver-springs', 'Silver Springs', 'Marion County', 'FL', 5000, 'rural', ['Silver Springs State Park', 'Glass-bottom boats', 'Natural springs'], ''),
    ('fl-williston', 'Williston', 'Levy County', 'FL', 2800, 'rural', ['Devil\'s Den springs', 'Eco-tourism', 'Affordable entry'], ''),
    ('fl-keystone-heights', 'Keystone Heights', 'Clay County', 'FL', 1400, 'lake', ['Lake Geneva', 'Gold Head Branch SP', 'Lake community'], ''),
    ('fl-florida-city', 'Florida City', 'Miami-Dade County', 'FL', 12000, 'suburban', ['Everglades NP gateway', 'Biscayne NP', 'Keys gateway'], 'Everglades'),
    ('fl-everglades-city', 'Everglades City', 'Collier County', 'FL', 400, 'waterfront', ['Everglades NP western gateway', 'Ten Thousand Islands', 'Fishing'], 'Everglades'),
    ('fl-chokoloskee', 'Chokoloskee', 'Collier County', 'FL', 300, 'waterfront', ['Ten Thousand Islands', 'Fishing paradise', 'Remote getaway'], 'Everglades'),
    ('fl-hawthorne', 'Hawthorne', 'Alachua County', 'FL', 1500, 'rural', ['Paynes Prairie', 'Gainesville Trail', 'Nature preserve'], ''),
    ('fl-cross-creek', 'Cross Creek', 'Alachua County', 'FL', 500, 'rural', ['Marjorie Kinnan Rawlings', 'Literary history', 'Lake Lochloosa'], ''),
    ('fl-starke', 'Starke', 'Bradford County', 'FL', 5500, 'rural', ['North Florida', 'Affordable', 'Small town'], ''),
    
    # === TOLEDO OH AREA ===
    ('oh-perrysburg', 'Perrysburg', 'Wood County', 'OH', 22000, 'suburban', ['Toledo suburb', 'Historic downtown', 'Fort Meigs'], ''),
    ('oh-maumee', 'Maumee', 'Lucas County', 'OH', 14000, 'suburban', ['Toledo suburb', 'Fallen Timbers', 'Shopping district'], ''),
    ('oh-sylvania', 'Sylvania', 'Lucas County', 'OH', 19000, 'suburban', ['Toledo suburb', 'Olander Park', 'Family community'], ''),
    ('oh-bowling-green', 'Bowling Green', 'Wood County', 'OH', 32000, 'suburban', ['BGSU university', 'College town', 'Affordable'], ''),
    ('oh-findlay', 'Findlay', 'Hancock County', 'OH', 41000, 'suburban', ['Marathon Petroleum HQ', 'Corporate travel', 'Flag City'], ''),
    ('oh-fremont', 'Fremont', 'Sandusky County', 'OH', 16000, 'suburban', ['Hayes Presidential Center', 'Near Lake Erie', 'Historic'], ''),
    ('oh-oregon', 'Oregon', 'Lucas County', 'OH', 20000, 'suburban', ['Maumee Bay State Park', 'Lake Erie access', 'Nature trails'], ''),
    ('oh-defiance', 'Defiance', 'Defiance County', 'OH', 17000, 'rural', ['Auglaize River', 'Fort Defiance', 'Small city charm'], ''),
    ('oh-tiffin', 'Tiffin', 'Seneca County', 'OH', 17000, 'rural', ['Heidelberg University', 'Seneca Caverns', 'Historic'], ''),
    
    # === CUYAHOGA VALLEY NP (OH) ===
    ('oh-peninsula', 'Peninsula', 'Summit County', 'OH', 600, 'rural', ['Cuyahoga Valley NP', 'Scenic railroad', 'Towpath Trail'], 'Cuyahoga Valley'),
    ('oh-brecksville', 'Brecksville', 'Cuyahoga County', 'OH', 13000, 'suburban', ['Cuyahoga Valley NP', 'Brecksville Reservation', 'Nature trails'], 'Cuyahoga Valley'),
    
    # === GREAT SMOKY MOUNTAINS (NC) ===
    ('nc-robbinsville', 'Robbinsville', 'Graham County', 'NC', 600, 'mountain', ['Cherohala Skyway', 'Joyce Kilmer Forest', 'Fontana Lake'], 'Great Smoky Mountains'),
    ('nc-sylva', 'Sylva', 'Jackson County', 'NC', 2700, 'mountain', ['Western NC mountains', 'Blue Ridge Parkway', 'Craft breweries'], 'Great Smoky Mountains'),
    ('nc-franklin', 'Franklin', 'Macon County', 'NC', 4200, 'mountain', ['Gem mining capital', 'Nantahala Forest', 'Appalachian Trail'], 'Great Smoky Mountains'),
    ('nc-murphy', 'Murphy', 'Cherokee County', 'NC', 1800, 'mountain', ['John C. Campbell Folk School', 'Lake Hiwassee', 'Mountain culture'], 'Great Smoky Mountains'),
    ('nc-highlands', 'Highlands', 'Macon County', 'NC', 1100, 'mountain', ['Luxury mountain resort', 'Waterfalls', 'Fine dining'], ''),
    ('nc-cashiers', 'Cashiers', 'Jackson County', 'NC', 2000, 'mountain', ['High elevation retreat', 'Lake Glenville', 'Waterfalls'], ''),
    
    # === YELLOWSTONE (MT/WY) ===
    ('mt-gardiner', 'Gardiner', 'Park County', 'MT', 900, 'mountain', ['Yellowstone north entrance', 'Roosevelt Arch', 'Year-round access'], 'Yellowstone'),
    ('mt-east-glacier-park', 'East Glacier Park', 'Glacier County', 'MT', 300, 'mountain', ['Glacier NP east entrance', 'Two Medicine', 'Blackfeet Nation'], 'Glacier'),
    ('mt-hungry-horse', 'Hungry Horse', 'Flathead County', 'MT', 900, 'mountain', ['Glacier NP gateway', 'Hungry Horse Dam', 'Bob Marshall Wilderness'], 'Glacier'),
    ('mt-polson', 'Polson', 'Lake County', 'MT', 5200, 'lake', ['Flathead Lake', 'Cherry orchards', 'Glacier NP south'], 'Glacier'),
    ('mt-choteau', 'Choteau', 'Teton County', 'MT', 1700, 'rural', ['Rocky Mountain Front', 'Dinosaur fossils', 'Teton Pass'], ''),
    
    # === GRAND CANYON (AZ) ===
    ('az-tusayan', 'Tusayan', 'Coconino County', 'AZ', 600, 'desert', ['Grand Canyon south rim', 'IMAX theater', 'Gateway town'], 'Grand Canyon'),
    ('az-williams', 'Williams', 'Coconino County', 'AZ', 3200, 'mountain', ['Route 66', 'Grand Canyon Railway', 'Bearizona'], 'Grand Canyon'),
    ('az-page', 'Page', 'Coconino County', 'AZ', 7500, 'desert', ['Horseshoe Bend', 'Antelope Canyon', 'Lake Powell'], 'Glen Canyon'),
    ('az-marble-canyon', 'Marble Canyon', 'Coconino County', 'AZ', 200, 'desert', ['Vermilion Cliffs', 'Colorado River', 'Remote beauty'], 'Grand Canyon'),
    
    # === JOSHUA TREE (CA) ===
    ('ca-joshua-tree', 'Joshua Tree', 'San Bernardino County', 'CA', 7400, 'desert', ['Joshua Tree NP', 'Desert arts scene', 'Stargazing'], 'Joshua Tree'),
    ('ca-morongo-valley', 'Morongo Valley', 'San Bernardino County', 'CA', 3500, 'desert', ['Big Morongo Canyon', 'Joshua Tree area', 'Desert retreat'], 'Joshua Tree'),
    ('ca-pioneertown', 'Pioneertown', 'San Bernardino County', 'CA', 400, 'desert', ['Pappy & Harriet\'s', 'Old West town', 'Joshua Tree area'], 'Joshua Tree'),
    
    # === ZION / BRYCE (UT) ===
    ('ut-tropic', 'Tropic', 'Garfield County', 'UT', 500, 'desert', ['Bryce Canyon NP gateway', 'Red rock scenery', 'Dark sky'], 'Bryce Canyon'),
    ('ut-orderville', 'Orderville', 'Kane County', 'UT', 600, 'desert', ['Between Zion and Bryce', 'Scenic Byway 89', 'Quiet retreat'], 'Zion'),
    ('ut-mount-carmel', 'Mount Carmel', 'Kane County', 'UT', 200, 'desert', ['Zion NP east entrance', 'Scenic tunnel', 'Red rock'], 'Zion'),
    ('ut-escalante', 'Escalante', 'Garfield County', 'UT', 800, 'desert', ['Grand Staircase', 'Slot canyons', 'Remote beauty'], 'Grand Staircase-Escalante'),
    ('ut-boulder', 'Boulder', 'Garfield County', 'UT', 200, 'desert', ['Hell\'s Backbone', 'Anasazi State Park', 'Remote dining'], 'Grand Staircase-Escalante'),
    
    # === SHENANDOAH (VA) ===
    ('va-sperryville', 'Sperryville', 'Rappahannock County', 'VA', 400, 'rural', ['Shenandoah NP gateway', 'Thornton Gap', 'Wine country'], 'Shenandoah'),
    ('va-stanley', 'Stanley', 'Page County', 'VA', 1700, 'rural', ['Shenandoah Valley', 'Near Luray Caverns', 'Affordable entry'], 'Shenandoah'),
    ('va-syria', 'Syria', 'Madison County', 'VA', 200, 'rural', ['Old Rag Mountain', 'Shenandoah NP', 'Hiking base camp'], 'Shenandoah'),
    ('va-elkton', 'Elkton', 'Rockingham County', 'VA', 2800, 'rural', ['Shenandoah Valley', 'Swift Run Gap', 'Blue Ridge Parkway'], 'Shenandoah'),
    
    # === REDWOOD (CA) ===
    ('ca-crescent-city', 'Crescent City', 'Del Norte County', 'CA', 7000, 'waterfront', ['Redwood NP gateway', 'Battery Point Lighthouse', 'Coastal beauty'], 'Redwood'),
    ('ca-orick', 'Orick', 'Humboldt County', 'CA', 350, 'rural', ['Redwood NP south', 'Fern Canyon', 'Elk meadows'], 'Redwood'),
    
    # === SEQUOIA / KINGS CANYON (CA) ===
    ('ca-three-rivers', 'Three Rivers', 'Tulare County', 'CA', 2200, 'rural', ['Sequoia NP gateway', 'Kaweah River', 'Mountain community'], 'Sequoia'),
    
    # === DEATH VALLEY (CA) ===
    ('ca-lone-pine', 'Lone Pine', 'Inyo County', 'CA', 2000, 'desert', ['Mt Whitney Portal', 'Alabama Hills', 'Death Valley access'], 'Death Valley'),
    ('ca-bishop', 'Bishop', 'Inyo County', 'CA', 3800, 'mountain', ['Eastern Sierra hub', 'Climbing mecca', 'Mammoth access'], ''),
    ('ca-independence', 'Independence', 'Inyo County', 'CA', 600, 'desert', ['Manzanar NHS', 'Eastern Sierra', 'Onion Valley'], ''),
    
    # === BLACK CANYON / MESA VERDE (CO) ===
    ('co-montrose', 'Montrose', 'Montrose County', 'CO', 20000, 'mountain', ['Black Canyon of the Gunnison', 'Western slope hub', 'Uncompahgre Valley'], 'Black Canyon'),
    ('co-cortez', 'Cortez', 'Montezuma County', 'CO', 8700, 'desert', ['Mesa Verde NP gateway', 'Four Corners', 'Ancient Puebloan culture'], 'Mesa Verde'),
    ('co-mancos', 'Mancos', 'Montezuma County', 'CO', 1400, 'mountain', ['Mesa Verde NP', 'Art galleries', 'Mountain biking'], 'Mesa Verde'),
    ('co-dolores', 'Dolores', 'Montezuma County', 'CO', 1000, 'mountain', ['Dolores River', 'McPhee Reservoir', 'Mesa Verde area'], 'Mesa Verde'),
    
    # === GREAT SAND DUNES (CO) ===
    ('co-alamosa', 'Alamosa', 'Alamosa County', 'CO', 10000, 'rural', ['Great Sand Dunes NP', 'San Luis Valley', 'Adams State University'], 'Great Sand Dunes'),
    ('co-crestone', 'Crestone', 'Saguache County', 'CO', 150, 'mountain', ['Spiritual retreat center', 'Sangre de Cristo Mountains', 'Dark sky'], 'Great Sand Dunes'),
    
    # === PETRIFIED FOREST (AZ) ===
    ('az-holbrook', 'Holbrook', 'Navajo County', 'AZ', 5000, 'desert', ['Petrified Forest NP', 'Route 66', 'Painted Desert'], 'Petrified Forest'),
    ('az-winslow', 'Winslow', 'Navajo County', 'AZ', 9600, 'desert', ['Standing on the Corner', 'Route 66', 'Meteor Crater access'], ''),
    
    # === MAMMOTH CAVE (KY) ===
    ('ky-horse-cave', 'Horse Cave', 'Hart County', 'KY', 2200, 'rural', ['Mammoth Cave NP area', 'Hidden River Cave', 'Kentucky Downs'], 'Mammoth Cave'),
    ('ky-munfordville', 'Munfordville', 'Hart County', 'KY', 1600, 'rural', ['Green River', 'Civil War history', 'Mammoth Cave area'], 'Mammoth Cave'),
    
    # === VOYAGEURS (MN) ===
    ('mn-international-falls', 'International Falls', 'Koochiching County', 'MN', 6000, 'lake', ['Voyageurs NP gateway', 'Icebox of the Nation', 'Border waters'], 'Voyageurs'),
    ('mn-kabetogama', 'Kabetogama', 'St. Louis County', 'MN', 100, 'lake', ['Voyageurs NP lakeside', 'Fishing paradise', 'Remote wilderness'], 'Voyageurs'),
    ('mn-crane-lake', 'Crane Lake', 'St. Louis County', 'MN', 100, 'lake', ['Voyageurs NP', 'BWCA gateway', 'Wilderness canoeing'], 'Voyageurs'),
    ('mn-ely', 'Ely', 'St. Louis County', 'MN', 3400, 'lake', ['BWCA gateway', 'Wolf center', 'Wilderness outfitting'], 'Boundary Waters'),
    
    # === CRATER LAKE (OR) ===
    ('or-prospect', 'Prospect', 'Jackson County', 'OR', 500, 'mountain', ['Crater Lake NP gateway', 'Rogue River', 'Natural Bridge'], 'Crater Lake'),
    ('or-chiloquin', 'Chiloquin', 'Klamath County', 'OR', 700, 'rural', ['Crater Lake south', 'Williamson River', 'Klamath Tribes'], 'Crater Lake'),
    ('or-fort-klamath', 'Fort Klamath', 'Klamath County', 'OR', 200, 'rural', ['Crater Lake south entrance', 'Wood River', 'Historic fort'], 'Crater Lake'),
    
    # === LASSEN VOLCANIC (CA) ===
    ('ca-chester', 'Chester', 'Plumas County', 'CA', 2100, 'lake', ['Lake Almanor', 'Lassen Volcanic NP', 'Mountain retreat'], 'Lassen Volcanic'),
    ('ca-mineral', 'Mineral', 'Tehama County', 'CA', 200, 'mountain', ['Lassen Volcanic NP HQ', 'Mountain wilderness', 'Remote getaway'], 'Lassen Volcanic'),
    
    # === CAPITOL REEF (UT) ===
    ('ut-bicknell', 'Bicknell', 'Wayne County', 'UT', 300, 'desert', ['Capitol Reef NP', 'Red rock country', 'Dark sky community'], 'Capitol Reef'),
    ('ut-loa', 'Loa', 'Wayne County', 'UT', 600, 'desert', ['Capitol Reef area', 'Fish Lake', 'High desert ranch country'], 'Capitol Reef'),
    
    # === CONGAREE (SC) ===
    ('sc-hopkins', 'Hopkins', 'Richland County', 'SC', 3000, 'rural', ['Congaree NP gateway', 'Old growth forest', 'Nature preserve'], 'Congaree'),
    
    # === OLYMPIC NP (WA) - additional ===
    ('wa-hoodsport', 'Hoodsport', 'Mason County', 'WA', 400, 'waterfront', ['Olympic NP Staircase', 'Hood Canal', 'Oyster farms'], 'Olympic'),
    ('wa-quinault', 'Quinault', 'Grays Harbor County', 'WA', 200, 'mountain', ['Olympic NP rainforest', 'Lake Quinault Lodge', 'Temperate rainforest'], 'Olympic'),
    ('wa-la-push', 'La Push', 'Clallam County', 'WA', 300, 'waterfront', ['Olympic NP coast', 'Quileute Nation', 'Sea stacks'], 'Olympic'),
    
    # === ROCKY MOUNTAIN NP (CO) - additional ===
    ('co-allenspark', 'Allenspark', 'Boulder County', 'CO', 500, 'mountain', ['Rocky Mountain NP south', 'Wild Basin', 'Indian Peaks'], 'Rocky Mountain'),
    ('co-glen-haven', 'Glen Haven', 'Larimer County', 'CO', 200, 'mountain', ['Rocky Mountain NP', 'The Inn of Glen Haven', 'Mountain retreat'], 'Rocky Mountain'),
    
    # === ACADIA (ME) - additional ===
    ('me-bass-harbor', 'Bass Harbor', 'Hancock County', 'ME', 500, 'waterfront', ['Acadia NP', 'Bass Harbor Lighthouse', 'Lobster fishing'], 'Acadia'),
    ('me-tremont', 'Tremont', 'Hancock County', 'ME', 1500, 'waterfront', ['Acadia NP quiet side', 'Seal Cove', 'Lobster boats'], 'Acadia'),
    ('me-winter-harbor', 'Winter Harbor', 'Hancock County', 'ME', 500, 'waterfront', ['Schoodic Peninsula', 'Acadia NP', 'Coastal village'], 'Acadia'),
    
    # === BIG BEND (TX) - additional ===
    ('tx-fort-davis', 'Fort Davis', 'Jeff Davis County', 'TX', 1200, 'desert', ['Davis Mountains', 'McDonald Observatory', 'Dark sky'], 'Big Bend'),
    ('tx-study-butte', 'Study Butte', 'Brewster County', 'TX', 200, 'desert', ['Big Bend NP gateway', 'Terlingua ghost town', 'Desert adventure'], 'Big Bend'),
    
    # === CHANNEL ISLANDS (CA) ===
    # Ventura and Oxnard already exist
    
    # === PINNACLES (CA) ===
    ('ca-soledad', 'Soledad', 'Monterey County', 'CA', 25000, 'rural', ['Pinnacles NP gateway', 'Salinas Valley', 'Wine country'], 'Pinnacles'),
    ('ca-hollister', 'Hollister', 'San Benito County', 'CA', 42000, 'rural', ['Pinnacles NP east', 'San Benito County', 'Ag community'], 'Pinnacles'),
    
    # === WHITE SANDS (NM) ===
    # Alamogordo and Las Cruces already exist
    
    # === ADDITIONAL NATIONAL PARK AREA TOWNS ===
    
    # Badlands/Wind Cave (SD) - additional
    ('sd-interior', 'Interior', 'Jackson County', 'SD', 100, 'rural', ['Badlands NP gateway', 'Prairie homestead', 'Fossil beds'], 'Badlands'),
    ('sd-hot-springs', 'Hot Springs', 'Fall River County', 'SD', 3500, 'rural', ['Wind Cave NP', 'Mammoth Site', 'Natural hot springs'], 'Wind Cave'),
    
    # Guadalupe Mountains (TX)
    ('tx-dell-city', 'Dell City', 'Hudspeth County', 'TX', 400, 'desert', ['Guadalupe Mountains NP', 'Salt flats', 'Remote desert'], 'Guadalupe Mountains'),
    
    # Indiana Dunes (IN)
    ('in-chesterton', 'Chesterton', 'Porter County', 'IN', 14000, 'suburban', ['Indiana Dunes NP', 'Lake Michigan', 'European Market'], 'Indiana Dunes'),
    ('in-michigan-city', 'Michigan City', 'LaPorte County', 'IN', 31000, 'waterfront', ['Indiana Dunes', 'Lake Michigan beaches', 'Lighthouse'], 'Indiana Dunes'),
    ('in-porter', 'Porter', 'Porter County', 'IN', 5000, 'suburban', ['Indiana Dunes NP', 'Dune hiking', 'Beach access'], 'Indiana Dunes'),
    
    # Cuyahoga Valley (OH) - additional
    ('oh-hudson', 'Hudson', 'Summit County', 'OH', 22000, 'suburban', ['Cuyahoga Valley NP', 'Western Reserve Academy', 'Historic downtown'], 'Cuyahoga Valley'),
    ('oh-bath', 'Bath', 'Summit County', 'OH', 12000, 'suburban', ['Cuyahoga Valley NP', 'Hale Farm', 'Nature preserve'], 'Cuyahoga Valley'),
    
    # New River Gorge (VA side)
    ('va-covington', 'Covington', 'Alleghany County', 'VA', 5600, 'rural', ['Alleghany Highlands', 'Douthat State Park', 'Mountain getaway'], ''),
    ('va-clifton-forge', 'Clifton Forge', 'Alleghany County', 'VA', 3800, 'rural', ['Alleghany Highlands', 'C&O Heritage Trail', 'Historic railroad'], ''),
    
    # Gateway to Mammoth Cave (KY) - additional
    ('ky-brownsville', 'Brownsville', 'Edmonson County', 'KY', 800, 'rural', ['Mammoth Cave NP gateway', 'Green River', 'Cave country'], 'Mammoth Cave'),
    
    # Gateway to Shenandoah (VA) - additional
    ('va-madison', 'Madison', 'Madison County', 'VA', 200, 'rural', ['Shenandoah NP', 'Blue Ridge foothills', 'Wine country'], 'Shenandoah'),
    ('va-washington', 'Washington', 'Rappahannock County', 'VA', 100, 'rural', ['Little Washington', 'Inn at Little Washington', 'Wine country'], 'Shenandoah'),
    
    # Dry Tortugas access from Key West - already covered
    
    # Additional WV towns near NRG
    ('wv-thurmond', 'Thurmond', 'Fayette County', 'WV', 25, 'rural', ['New River Gorge NP', 'Ghost town', 'Railroad history'], 'New River Gorge'),
    ('wv-meadow-bridge', 'Meadow Bridge', 'Fayette County', 'WV', 300, 'rural', ['New River Gorge area', 'Babcock State Park', 'Glade Creek Mill'], 'New River Gorge'),
    
    # Additional FL near Gainesville
    ('fl-cedar-key', 'Cedar Key', 'Levy County', 'FL', 700, 'waterfront', ['Cedar Keys NWR', 'Clam farming', 'Old Florida charm'], ''),
    # Cedar Key already exists - will be caught by duplicate check
    
    # Additional OH near Toledo
    ('oh-port-clinton', 'Port Clinton', 'Ottawa County', 'OH', 6000, 'waterfront', ['Lake Erie Islands', 'Walleye capital', 'Island ferries'], ''),
    # Port Clinton already exists - will be caught by duplicate check
    
    # Hocking Hills (OH) area - additional
    ('oh-nelsonville', 'Nelsonville', 'Athens County', 'OH', 5100, 'rural', ['Hocking Hills area', 'Rocky Boots', 'Stuart\'s Opera House'], ''),
    ('oh-athens', 'Athens', 'Athens County', 'OH', 24000, 'rural', ['Ohio University', 'Hocking Hills area', 'Appalachian culture'], ''),
    ('oh-lancaster', 'Lancaster', 'Fairfield County', 'OH', 40000, 'suburban', ['Hocking Hills gateway', 'Rising Park', 'Sherman House'], ''),
    
    # Additional SC upstate
    ('sc-landrum', 'Landrum', 'Spartanburg County', 'SC', 2500, 'mountain', ['Tryon International', 'Blue Ridge foothills', 'Equestrian'], ''),
    ('sc-salem', 'Salem', 'Oconee County', 'SC', 200, 'lake', ['Lake Jocassee', 'Devils Fork State Park', 'Pristine lake'], ''),
    
    # Additional national park towns - Denali area (AK)
    ('ak-healy', 'Healy', 'Denali Borough', 'AK', 1000, 'mountain', ['Denali NP gateway', 'Northern lights', 'Wilderness lodge'], 'Denali'),
    ('ak-cantwell', 'Cantwell', 'Denali Borough', 'AK', 200, 'mountain', ['Denali Highway', 'Remote Alaska', 'Backcountry access'], 'Denali'),
    
    # Glacier NP (MT) - additional
    ('mt-st-mary', 'St. Mary', 'Glacier County', 'MT', 200, 'mountain', ['Glacier NP east entrance', 'Going-to-the-Sun Road', 'St. Mary Lake'], 'Glacier'),
    ('mt-apgar', 'Apgar', 'Flathead County', 'MT', 100, 'mountain', ['Glacier NP west entrance', 'Lake McDonald', 'Apgar Village'], 'Glacier'),
    ('mt-essex', 'Essex', 'Flathead County', 'MT', 100, 'mountain', ['Glacier NP south', 'Izaak Walton Inn', 'Great Northern Railway'], 'Glacier'),
    
    # Yellowstone additional
    ('wy-pahaska', 'Pahaska', 'Park County', 'WY', 50, 'mountain', ['Yellowstone east entrance', 'Buffalo Bill\'s lodge', 'Shoshone Forest'], 'Yellowstone'),
    ('mt-silver-gate', 'Silver Gate', 'Park County', 'MT', 30, 'mountain', ['Yellowstone NE entrance', 'Lamar Valley', 'Wildlife viewing'], 'Yellowstone'),
    
    # Grand Teton additional
    ('wy-moran', 'Moran', 'Teton County', 'WY', 200, 'mountain', ['Grand Teton NP', 'Moran Junction', 'Snake River'], 'Grand Teton'),
    ('wy-kelly', 'Kelly', 'Teton County', 'WY', 100, 'mountain', ['Grand Teton NP', 'Gros Ventre', 'Mormon Row'], 'Grand Teton'),
    
    # Arches/Canyonlands additional (UT)
    ('ut-green-river', 'Green River', 'Emery County', 'UT', 900, 'desert', ['Canyonlands access', 'Green River', 'Melon Days'], 'Canyonlands'),
    ('ut-bluff', 'Bluff', 'San Juan County', 'UT', 300, 'desert', ['Bears Ears', 'Valley of the Gods', 'Ancient ruins'], 'Bears Ears'),
    ('ut-mexican-hat', 'Mexican Hat', 'San Juan County', 'UT', 50, 'desert', ['Monument Valley', 'Goosenecks SP', 'San Juan River'], 'Monument Valley'),
    ('ut-monument-valley', 'Monument Valley', 'San Juan County', 'UT', 500, 'desert', ['Monument Valley Tribal Park', 'Iconic landscapes', 'Navajo Nation'], 'Monument Valley'),
    
    # North Cascades (WA)
    ('wa-marblemount', 'Marblemount', 'Skagit County', 'WA', 200, 'mountain', ['North Cascades NP', 'Skagit River', 'Eagle watching'], 'North Cascades'),
    ('wa-winthrop', 'Winthrop', 'Okanogan County', 'WA', 400, 'mountain', ['North Cascades east', 'Old West town', 'Cross-country skiing'], 'North Cascades'),
    ('wa-mazama', 'Mazama', 'Okanogan County', 'WA', 200, 'mountain', ['North Cascades', 'Methow Valley', 'Backcountry skiing'], 'North Cascades'),
    
    # Mount Rainier (WA)
    ('wa-ashford', 'Ashford', 'Pierce County', 'WA', 300, 'mountain', ['Mount Rainier NP', 'Nisqually entrance', 'Mountain lodges'], 'Mount Rainier'),
    ('wa-packwood', 'Packwood', 'Lewis County', 'WA', 1000, 'mountain', ['Mount Rainier south', 'White Pass skiing', 'Goat Rocks'], 'Mount Rainier'),
    ('wa-elbe', 'Elbe', 'Pierce County', 'WA', 50, 'mountain', ['Mount Rainier gateway', 'Scenic railroad', 'Mountain village'], 'Mount Rainier'),
    
    # Dry Tortugas / Biscayne (FL) - Key West already covered
    
    # Theodore Roosevelt NP (ND)
    ('nd-medora', 'Medora', 'Billings County', 'ND', 100, 'rural', ['Theodore Roosevelt NP', 'Medora Musical', 'Badlands'], 'Theodore Roosevelt'),
    
    # Isle Royale (MI) - access from
    ('mi-copper-harbor', 'Copper Harbor', 'Keweenaw County', 'MI', 100, 'waterfront', ['Isle Royale NP ferry', 'Keweenaw Peninsula', 'Dark sky park'], 'Isle Royale'),
    ('mi-houghton', 'Houghton', 'Houghton County', 'MI', 8000, 'waterfront', ['Isle Royale access', 'Michigan Tech', 'Keweenaw gateway'], 'Isle Royale'),
    
    # Saguaro (AZ) - Tucson already exists, add nearby
    ('az-marana', 'Marana', 'Pima County', 'AZ', 50000, 'desert', ['Saguaro NP west', 'Dove Mountain', 'Desert golf'], 'Saguaro'),
    
    # Black Hills (SD) - additional
    ('sd-deadwood', 'Deadwood', 'Lawrence County', 'SD', 1300, 'mountain', ['Historic gambling town', 'Wild Bill Hickok', 'Black Hills'], ''),
    ('sd-lead', 'Lead', 'Lawrence County', 'SD', 3000, 'mountain', ['Homestake Mine', 'Terry Peak skiing', 'Black Hills'], ''),
    ('sd-spearfish', 'Spearfish', 'Lawrence County', 'SD', 12000, 'mountain', ['Spearfish Canyon', 'Black Hills State', 'D.C. Booth Fish Hatchery'], ''),
    
    # Ozarks (AR/MO) - additional
    ('ar-mountain-home', 'Mountain Home', 'Baxter County', 'AR', 12500, 'lake', ['Bull Shoals Lake', 'Norfork Lake', 'Twin Lakes area'], ''),
    ('ar-heber-springs', 'Heber Springs', 'Cleburne County', 'AR', 7100, 'lake', ['Greers Ferry Lake', 'Little Red River', 'Trout fishing'], ''),
    ('mo-eminence', 'Eminence', 'Shannon County', 'MO', 500, 'rural', ['Ozark National Scenic Riverways', 'Current River', 'Float trips'], 'Ozark Riverways'),
    ('mo-van-buren', 'Van Buren', 'Carter County', 'MO', 800, 'rural', ['Current River', 'Big Spring', 'Ozark float trips'], 'Ozark Riverways'),
    
    # Sleeping Bear Dunes (MI)
    ('mi-empire', 'Empire', 'Leelanau County', 'MI', 400, 'waterfront', ['Sleeping Bear Dunes NL', 'Lake Michigan', 'Dune climbing'], 'Sleeping Bear Dunes'),
    ('mi-glen-arbor', 'Glen Arbor', 'Leelanau County', 'MI', 800, 'waterfront', ['Sleeping Bear Dunes', 'Crystal River', 'Cherry Republic'], 'Sleeping Bear Dunes'),
    ('mi-frankfort', 'Frankfort', 'Benzie County', 'MI', 1300, 'waterfront', ['Lake Michigan', 'Point Betsie Lighthouse', 'Crystal Lake'], ''),
    
    # Pictured Rocks (MI)
    ('mi-munising', 'Munising', 'Alger County', 'MI', 2300, 'waterfront', ['Pictured Rocks NL', 'Boat tours', 'Waterfalls'], 'Pictured Rocks'),
    ('mi-christmas', 'Christmas', 'Alger County', 'MI', 400, 'waterfront', ['Pictured Rocks area', 'Lake Superior', 'Kewadin Casino'], 'Pictured Rocks'),
    
    # Apostle Islands (WI)
    ('wi-bayfield', 'Bayfield', 'Bayfield County', 'WI', 500, 'waterfront', ['Apostle Islands NL', 'Lake Superior', 'Sea caves'], 'Apostle Islands'),
    ('wi-washburn', 'Washburn', 'Bayfield County', 'WI', 2100, 'waterfront', ['Apostle Islands area', 'Lake Superior', 'Brownstone architecture'], 'Apostle Islands'),
    
    # Assateague Island (MD)
    ('md-berlin', 'Berlin', 'Worcester County', 'MD', 5000, 'waterfront', ['Assateague Island NS', 'Wild ponies', 'Small town charm'], 'Assateague'),
    
    # Cape Hatteras / Cape Lookout (NC)
    ('nc-hatteras', 'Hatteras', 'Dare County', 'NC', 500, 'beach', ['Cape Hatteras NS', 'Lighthouse', 'Surfing'], 'Cape Hatteras'),
    ('nc-ocracoke', 'Ocracoke', 'Hyde County', 'NC', 900, 'beach', ['Cape Hatteras NS', 'Ocracoke Lighthouse', 'Ferry access only'], 'Cape Hatteras'),
    ('nc-beaufort', 'Beaufort', 'Carteret County', 'NC', 4200, 'waterfront', ['Cape Lookout NS', 'Wild horses', 'Historic waterfront'], 'Cape Lookout'),
    
    # Cumberland Island (GA)
    ('ga-st-marys', 'St. Marys', 'Camden County', 'GA', 18000, 'waterfront', ['Cumberland Island NS', 'Ferry access', 'Historic district'], 'Cumberland Island'),
    
    # Dry Tortugas (FL) - Fort Jefferson access
    # Key West already exists
    
    # Additional FL springs corridor
    ('fl-rainbow-springs', 'Rainbow Springs', 'Marion County', 'FL', 5000, 'rural', ['Rainbow Springs SP', 'Dunnellon area', 'Tubing'], ''),
    ('fl-dunnellon', 'Dunnellon', 'Marion County', 'FL', 2000, 'rural', ['Rainbow River', 'Withlacoochee River', 'Springs capital'], ''),
    
    # Additional WV
    ('wv-spencer', 'Spencer', 'Roane County', 'WV', 2100, 'rural', ['WV Black Walnut Festival', 'Rural Appalachia', 'Affordable entry'], ''),
    ('wv-richwood', 'Richwood', 'Nicholas County', 'WV', 1900, 'rural', ['Cranberry Wilderness', 'Cherry River', 'Ramp capital'], ''),
    
    # Additional Greenville SC metro
    ('sc-fountain-inn', 'Fountain Inn', 'Greenville County', 'SC', 10000, 'suburban', ['Greenville metro', 'Growing community', 'Affordable suburb'], ''),
    ('sc-mauldin', 'Mauldin', 'Greenville County', 'SC', 26000, 'suburban', ['Greenville metro', 'Bridgeway Station', 'Family community'], ''),
    ('sc-woodruff', 'Woodruff', 'Spartanburg County', 'SC', 4000, 'rural', ['Spartanburg area', 'Small town', 'Affordable entry'], ''),
    
    # Additional Toledo OH area
    ('oh-wauseon', 'Wauseon', 'Fulton County', 'OH', 7200, 'rural', ['Sauder Village', 'Fulton County Fair', 'Rural Ohio'], ''),
    ('oh-napoleon', 'Napoleon', 'Henry County', 'OH', 8500, 'rural', ['Maumee River', 'Small town Ohio', 'Affordable'], ''),
    
    # Additional Gainesville FL area
    ('fl-lake-city', 'Lake City', 'Columbia County', 'FL', 12000, 'rural', ['Ichetucknee Springs', 'O\'Leno State Park', 'North Florida hub'], ''),
    ('fl-palatka', 'Palatka', 'Putnam County', 'FL', 10000, 'rural', ['St. Johns River', 'Ravine Gardens SP', 'Historic Florida'], ''),
    ('fl-interlachen', 'Interlachen', 'Putnam County', 'FL', 1400, 'lake', ['Lake region', 'Affordable', 'Rural Florida'], ''),
    
    # Hot Springs NP (AR) area - Hot Springs already exists
    ('ar-royal', 'Royal', 'Garland County', 'AR', 600, 'lake', ['Lake Ouachita', 'Hot Springs area', 'Lake recreation'], 'Hot Springs'),
    
    # Biscayne NP (FL) area
    ('fl-homestead', 'Homestead', 'Miami-Dade County', 'FL', 80000, 'suburban', ['Biscayne NP gateway', 'Everglades access', 'Speedway'], 'Biscayne'),
    # Homestead already exists - will be caught by duplicate check
    
    # New England NP areas
    ('ct-kent', 'Kent', 'Litchfield County', 'CT', 2900, 'rural', ['Kent Falls SP', 'Appalachian Trail', 'Art galleries'], ''),
    ('ct-norfolk', 'Norfolk', 'Litchfield County', 'CT', 1600, 'rural', ['Haystack Mountain', 'Music festival', 'Litchfield Hills'], ''),
    
    # Catskills (NY) - near parks
    ('ny-phoenicia', 'Phoenicia', 'Ulster County', 'NY', 300, 'mountain', ['Catskill Mountains', 'Esopus Creek', 'Tubing'], ''),
    ('ny-tannersville', 'Tannersville', 'Greene County', 'NY', 500, 'mountain', ['Hunter Mountain', 'Catskill Mountains', 'Ski town'], ''),
    ('ny-windham', 'Windham', 'Greene County', 'NY', 1700, 'mountain', ['Windham Mountain', 'Catskill Mountains', 'Four-season resort'], ''),
    
    # Adirondacks (NY)
    ('ny-tupper-lake', 'Tupper Lake', 'Franklin County', 'NY', 3600, 'lake', ['Adirondack Park', 'Wild Center', 'Tupper Lake'], ''),
    ('ny-old-forge', 'Old Forge', 'Herkimer County', 'NY', 800, 'lake', ['Adirondack gateway', 'Enchanted Forest', 'Snowmobiling'], ''),
    ('ny-inlet', 'Inlet', 'Hamilton County', 'NY', 300, 'lake', ['Adirondack lakes', 'Fourth Lake', 'Snowmobiling'], ''),
    
    # Additional PA state parks / Poconos
    ('pa-milford', 'Milford', 'Pike County', 'PA', 1000, 'mountain', ['Delaware Water Gap', 'Grey Towers', 'Poconos gateway'], ''),
    ('pa-hawley', 'Hawley', 'Wayne County', 'PA', 1200, 'lake', ['Lake Wallenpaupack', 'Poconos', 'Silk Mill'], ''),
    
    # Additional NP gateways - Guadalupe Mountains
    ('nm-carlsbad', 'Carlsbad', 'Eddy County', 'NM', 32000, 'desert', ['Carlsbad Caverns NP', 'Pecos River', 'Living Desert Zoo'], 'Carlsbad Caverns'),
    # Carlsbad already exists - will be caught by duplicate check
    
    # Virgin Islands NP - not in scope
    
    # Wrangell-St. Elias (AK)
    ('ak-mccarthy', 'McCarthy', 'Valdez-Cordova', 'AK', 30, 'mountain', ['Wrangell-St. Elias NP', 'Kennicott Mine', 'Remote Alaska'], 'Wrangell-St. Elias'),
    ('ak-chitina', 'Chitina', 'Valdez-Cordova', 'AK', 100, 'mountain', ['Wrangell-St. Elias gateway', 'Copper River', 'Salmon dipping'], 'Wrangell-St. Elias'),
    
    # Katmai (AK)
    ('ak-king-salmon', 'King Salmon', 'Bristol Bay', 'AK', 400, 'rural', ['Katmai NP gateway', 'Bear viewing', 'World-class fishing'], 'Katmai'),
    
    # Gates of the Arctic (AK)
    ('ak-bettles', 'Bettles', 'Yukon-Koyukuk', 'AK', 12, 'rural', ['Gates of the Arctic NP', 'Northern lights', 'Arctic wilderness'], 'Gates of the Arctic'),
    
    # Kobuk Valley (AK)
    ('ak-kotzebue', 'Kotzebue', 'Northwest Arctic', 'AK', 3200, 'rural', ['Kobuk Valley NP access', 'Arctic coast', 'Inupiat culture'], 'Kobuk Valley'),
    
    # Lake Clark (AK)
    ('ak-port-alsworth', 'Port Alsworth', 'Lake and Peninsula', 'AK', 200, 'lake', ['Lake Clark NP HQ', 'Bear viewing', 'Fly-in only'], 'Lake Clark'),
    
    # Kenai Fjords (AK) - Seward already exists
    
    # Additional popular vacation areas that should be covered
    
    # Finger Lakes (NY)
    ('ny-watkins-glen', 'Watkins Glen', 'Schuyler County', 'NY', 1800, 'lake', ['Watkins Glen SP', 'Seneca Lake', 'Wine country'], ''),
    ('ny-hammondsport', 'Hammondsport', 'Steuben County', 'NY', 700, 'lake', ['Keuka Lake', 'Wine country', 'Glenn Curtiss Museum'], ''),
    
    # Door County (WI)
    ('wi-fish-creek', 'Fish Creek', 'Door County', 'WI', 1000, 'waterfront', ['Peninsula State Park', 'Door County', 'Cherry picking'], ''),
    ('wi-ephraim', 'Ephraim', 'Door County', 'WI', 300, 'waterfront', ['Door County', 'Eagle Bluff', 'Scandinavian heritage'], ''),
    ('wi-sister-bay', 'Sister Bay', 'Door County', 'WI', 1000, 'waterfront', ['Door County', 'Al Johnson\'s', 'Goats on roof'], ''),
    
    # Outer Banks (NC) - additional
    ('nc-duck', 'Duck', 'Dare County', 'NC', 400, 'beach', ['Outer Banks', 'Sanderling Resort', 'Boardwalk'], ''),
    ('nc-corolla', 'Corolla', 'Currituck County', 'NC', 500, 'beach', ['Wild horses', 'Currituck Lighthouse', 'Outer Banks north'], ''),
    
    # Lake Tahoe area (CA/NV) - additional
    ('ca-truckee', 'Truckee', 'Nevada County', 'CA', 16000, 'mountain', ['Lake Tahoe north', 'Donner Lake', 'Ski resorts'], ''),
    
    # Smoky Mountains (TN) additional
    ('tn-cosby', 'Cosby', 'Cocke County', 'TN', 5000, 'mountain', ['Great Smoky Mountains', 'Quiet side', 'Cosby campground'], 'Great Smoky Mountains'),
    ('tn-walland', 'Walland', 'Blount County', 'TN', 300, 'mountain', ['Foothills Parkway', 'Blackberry Farm', 'Luxury retreats'], 'Great Smoky Mountains'),
    
    # Additional popular lake towns
    ('mi-saugatuck', 'Saugatuck', 'Allegan County', 'MI', 900, 'waterfront', ['Lake Michigan', 'Art coast', 'Oval Beach'], ''),
    ('mi-south-haven', 'South Haven', 'Van Buren County', 'MI', 4400, 'waterfront', ['Lake Michigan', 'Blueberry capital', 'Lighthouse'], ''),
    
    # Additional mountain towns
    ('nc-banner-elk', 'Banner Elk', 'Avery County', 'NC', 1000, 'mountain', ['Sugar Mountain', 'Beech Mountain', 'Grandfather Mountain'], ''),
    ('nc-blowing-rock', 'Blowing Rock', 'Watauga County', 'NC', 1200, 'mountain', ['Blue Ridge Parkway', 'Tweetsie Railroad', 'Appalachian Ski Mtn'], ''),
    
    # Additional desert towns
    ('nm-truth-or-consequences', 'Truth or Consequences', 'Sierra County', 'NM', 6000, 'desert', ['Hot springs', 'Spaceport America', 'Elephant Butte Lake'], ''),
    ('nm-silver-city', 'Silver City', 'Grant County', 'NM', 10000, 'mountain', ['Gila Cliff Dwellings', 'Gila National Forest', 'Art community'], 'Gila Cliff Dwellings'),
    
    # Additional coastal
    ('or-cannon-beach', 'Cannon Beach', 'Clatsop County', 'OR', 1500, 'beach', ['Haystack Rock', 'Ecola State Park', 'Art galleries'], ''),
    ('or-manzanita', 'Manzanita', 'Tillamook County', 'OR', 600, 'beach', ['Nehalem Bay', 'Quiet beach town', 'Oregon coast'], ''),
    
    # Additional GA coastal
    ('ga-st-simons-island', 'St. Simons Island', 'Glynn County', 'GA', 13000, 'beach', ['Golden Isles', 'Lighthouse', 'Beach community'], ''),
    ('ga-jekyll-island', 'Jekyll Island', 'Glynn County', 'GA', 1000, 'beach', ['Golden Isles', 'Driftwood Beach', 'Sea turtles'], ''),
]


# ============================================================
# STEP 3: Amenity profiles by market type
# ============================================================

AMENITY_PROFILES = {
    'mountain': [
        {'name': 'Hot Tub', 'revenueBoost': 20, 'priority': 'must-have'},
        {'name': 'Fire Pit', 'revenueBoost': 12, 'priority': 'high-impact'},
        {'name': 'Privacy/Seclusion', 'revenueBoost': 15, 'priority': 'high-impact'},
        {'name': 'Outdoor Space', 'revenueBoost': 10, 'priority': 'high-impact'},
        {'name': 'Game Room', 'revenueBoost': 14, 'priority': 'nice-to-have'},
    ],
    'rural': [
        {'name': 'Hot Tub', 'revenueBoost': 20, 'priority': 'must-have'},
        {'name': 'Fire Pit', 'revenueBoost': 12, 'priority': 'high-impact'},
        {'name': 'Privacy/Seclusion', 'revenueBoost': 15, 'priority': 'high-impact'},
        {'name': 'Outdoor Space', 'revenueBoost': 10, 'priority': 'high-impact'},
        {'name': 'Game Room', 'revenueBoost': 14, 'priority': 'nice-to-have'},
    ],
    'beach': [
        {'name': 'Pool', 'revenueBoost': 22, 'priority': 'must-have'},
        {'name': 'Ocean View', 'revenueBoost': 25, 'priority': 'must-have'},
        {'name': 'Beach Gear', 'revenueBoost': 8, 'priority': 'high-impact'},
        {'name': 'Outdoor Shower', 'revenueBoost': 6, 'priority': 'high-impact'},
        {'name': 'Balcony/Deck', 'revenueBoost': 12, 'priority': 'nice-to-have'},
    ],
    'lake': [
        {'name': 'Lake Access', 'revenueBoost': 25, 'priority': 'must-have'},
        {'name': 'Boat Dock', 'revenueBoost': 20, 'priority': 'must-have'},
        {'name': 'Hot Tub', 'revenueBoost': 15, 'priority': 'high-impact'},
        {'name': 'Fire Pit', 'revenueBoost': 10, 'priority': 'high-impact'},
        {'name': 'Kayaks/Canoes', 'revenueBoost': 12, 'priority': 'nice-to-have'},
    ],
    'desert': [
        {'name': 'Pool', 'revenueBoost': 25, 'priority': 'must-have'},
        {'name': 'Hot Tub', 'revenueBoost': 18, 'priority': 'must-have'},
        {'name': 'Stargazing Deck', 'revenueBoost': 15, 'priority': 'high-impact'},
        {'name': 'Outdoor Lounge', 'revenueBoost': 10, 'priority': 'high-impact'},
        {'name': 'Fire Pit', 'revenueBoost': 12, 'priority': 'nice-to-have'},
    ],
    'waterfront': [
        {'name': 'Water View', 'revenueBoost': 22, 'priority': 'must-have'},
        {'name': 'Deck/Patio', 'revenueBoost': 15, 'priority': 'must-have'},
        {'name': 'Kayaks/Canoes', 'revenueBoost': 12, 'priority': 'high-impact'},
        {'name': 'Fire Pit', 'revenueBoost': 10, 'priority': 'high-impact'},
        {'name': 'Hot Tub', 'revenueBoost': 14, 'priority': 'nice-to-have'},
    ],
    'suburban': [
        {'name': 'Parking', 'revenueBoost': 18, 'priority': 'must-have'},
        {'name': 'Walkability', 'revenueBoost': 15, 'priority': 'must-have'},
        {'name': 'Workspace', 'revenueBoost': 12, 'priority': 'high-impact'},
        {'name': 'Fast WiFi', 'revenueBoost': 10, 'priority': 'high-impact'},
        {'name': 'Rooftop/Patio', 'revenueBoost': 8, 'priority': 'nice-to-have'},
    ],
    'urban': [
        {'name': 'Parking', 'revenueBoost': 18, 'priority': 'must-have'},
        {'name': 'Walkability', 'revenueBoost': 15, 'priority': 'must-have'},
        {'name': 'Workspace', 'revenueBoost': 12, 'priority': 'high-impact'},
        {'name': 'Fast WiFi', 'revenueBoost': 10, 'priority': 'high-impact'},
        {'name': 'Rooftop/Patio', 'revenueBoost': 8, 'priority': 'nice-to-have'},
    ],
    'tropical': [
        {'name': 'Pool', 'revenueBoost': 22, 'priority': 'must-have'},
        {'name': 'Ocean View', 'revenueBoost': 25, 'priority': 'must-have'},
        {'name': 'Outdoor Shower', 'revenueBoost': 8, 'priority': 'high-impact'},
        {'name': 'Balcony/Deck', 'revenueBoost': 12, 'priority': 'high-impact'},
        {'name': 'Beach Gear', 'revenueBoost': 6, 'priority': 'nice-to-have'},
    ],
}


# ============================================================
# STEP 4: State-level calibration data (median home prices, ADR ranges)
# ============================================================

# Approximate state-level median home prices for calibration
STATE_HOME_PRICES = {
    'AL': 195000, 'AK': 345000, 'AZ': 380000, 'AR': 175000, 'CA': 725000,
    'CO': 525000, 'CT': 375000, 'DC': 650000, 'DE': 325000, 'FL': 385000,
    'GA': 295000, 'HI': 850000, 'IA': 195000, 'ID': 425000, 'IL': 245000,
    'IN': 215000, 'KS': 195000, 'KY': 195000, 'LA': 195000, 'MA': 550000,
    'MD': 395000, 'ME': 325000, 'MI': 225000, 'MN': 295000, 'MO': 215000,
    'MS': 165000, 'MT': 445000, 'NC': 295000, 'ND': 245000, 'NE': 225000,
    'NH': 395000, 'NJ': 425000, 'NM': 275000, 'NV': 395000, 'NY': 395000,
    'OH': 195000, 'OK': 175000, 'OR': 445000, 'PA': 265000, 'RI': 395000,
    'SC': 275000, 'SD': 275000, 'TN': 295000, 'TX': 275000, 'UT': 475000,
    'VA': 365000, 'VT': 325000, 'WA': 525000, 'WI': 265000, 'WV': 165000,
    'WY': 325000,
}


def generate_city_data(city_tuple, existing_by_state):
    """Generate a complete city data entry calibrated against existing cities in the same state."""
    city_id, name, county, state, pop, mtype, highlights, near_park = city_tuple
    
    # Get existing cities in this state for calibration
    state_cities = existing_by_state.get(state, [])
    
    # Find similar cities (same market type, similar population)
    similar = [c for c in state_cities if c['type'] == mtype]
    if not similar:
        similar = state_cities if state_cities else []
    
    # Use a deterministic seed based on city ID for reproducibility
    seed = int(hashlib.md5(city_id.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    
    # Base home price from state data, adjusted for market type and population
    base_price = STATE_HOME_PRICES.get(state, 275000)
    
    # Market type price multipliers
    type_price_mult = {
        'mountain': 1.15, 'beach': 1.4, 'lake': 1.1, 'desert': 0.75,
        'rural': 0.7, 'suburban': 0.95, 'urban': 1.2, 'waterfront': 1.3, 'tropical': 1.5,
    }
    
    # Population-based price adjustment (smaller towns = cheaper)
    if pop < 500:
        pop_mult = 0.55
    elif pop < 2000:
        pop_mult = 0.65
    elif pop < 5000:
        pop_mult = 0.75
    elif pop < 15000:
        pop_mult = 0.85
    elif pop < 50000:
        pop_mult = 0.95
    else:
        pop_mult = 1.05
    
    # National park premium
    park_mult = 1.15 if near_park else 1.0
    
    median_home_price = int(base_price * type_price_mult.get(mtype, 1.0) * pop_mult * park_mult * rng.uniform(0.85, 1.15))
    # Clamp to reasonable range
    median_home_price = max(125000, min(median_home_price, 1200000))
    # Round to nearest 1000
    median_home_price = round(median_home_price / 1000) * 1000
    
    # ADR based on market type and tourism appeal
    type_adr_range = {
        'mountain': (150, 280), 'beach': (180, 350), 'lake': (140, 260),
        'desert': (120, 250), 'rural': (95, 200), 'suburban': (110, 180),
        'urban': (130, 250), 'waterfront': (150, 300), 'tropical': (200, 400),
    }
    adr_low, adr_high = type_adr_range.get(mtype, (120, 220))
    
    # National park towns get ADR boost
    if near_park:
        adr_low = int(adr_low * 1.1)
        adr_high = int(adr_high * 1.1)
    
    # Very small towns (< 500 pop) tend toward lower ADR
    if pop < 500:
        avg_adr = int(rng.uniform(adr_low, (adr_low + adr_high) / 2))
    elif pop < 5000:
        avg_adr = int(rng.uniform(adr_low, adr_high * 0.85))
    else:
        avg_adr = int(rng.uniform(adr_low * 0.9, adr_high))
    
    # Occupancy rate
    type_occ_range = {
        'mountain': (42, 62), 'beach': (50, 72), 'lake': (40, 60),
        'desert': (38, 58), 'rural': (35, 55), 'suburban': (50, 68),
        'urban': (55, 75), 'waterfront': (45, 65), 'tropical': (55, 75),
    }
    occ_low, occ_high = type_occ_range.get(mtype, (40, 60))
    if near_park:
        occ_low = min(occ_low + 5, occ_high - 5)
    occupancy_rate = int(rng.uniform(occ_low, occ_high))
    
    # Monthly revenue = ADR * occupancy * 30
    monthly_revenue = int(avg_adr * (occupancy_rate / 100) * 30)
    
    # RPR (Revenue-to-Price Ratio)
    rpr = round((monthly_revenue * 12) / median_home_price, 3) if median_home_price > 0 else 0.1
    rpr = max(0.05, min(rpr, 0.35))
    
    # DSI (Debt Survivability Index)
    loan_amount = median_home_price * 0.80
    monthly_rate = 0.07 / 12
    num_payments = 360
    if monthly_rate > 0:
        monthly_mortgage = int(loan_amount * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1))
    else:
        monthly_mortgage = int(loan_amount / num_payments)
    
    monthly_expenses = int(monthly_revenue * 0.35)
    net_monthly_income = monthly_revenue - monthly_mortgage - monthly_expenses
    dsi = net_monthly_income > 0
    
    # Market scores
    # Demand: based on tourism appeal and park proximity
    demand_base = 55
    if near_park:
        demand_base += rng.randint(10, 25)
    if mtype in ('beach', 'mountain', 'lake'):
        demand_base += rng.randint(5, 15)
    demand = min(95, max(30, demand_base + rng.randint(-10, 10)))
    
    # Affordability: inverse of home price
    if median_home_price < 200000:
        affordability = rng.randint(78, 92)
    elif median_home_price < 300000:
        affordability = rng.randint(65, 82)
    elif median_home_price < 450000:
        affordability = rng.randint(45, 68)
    elif median_home_price < 600000:
        affordability = rng.randint(25, 48)
    else:
        affordability = rng.randint(15, 35)
    
    # Regulation score (most small towns are friendly)
    regulation_score = rng.randint(72, 90)
    
    # Seasonality
    type_seasonality = {
        'mountain': (55, 75), 'beach': (45, 70), 'lake': (40, 65),
        'desert': (50, 72), 'rural': (55, 78), 'suburban': (65, 85),
        'urban': (70, 88), 'waterfront': (45, 70), 'tropical': (60, 80),
    }
    seas_low, seas_high = type_seasonality.get(mtype, (50, 75))
    seasonality = rng.randint(seas_low, seas_high)
    
    # Saturation
    if pop < 1000:
        listings_per_thousand = round(rng.uniform(5, 30), 1)
        str_ratio = round(rng.uniform(1.0, 6.0), 1)
    elif pop < 5000:
        listings_per_thousand = round(rng.uniform(3, 20), 1)
        str_ratio = round(rng.uniform(0.8, 4.0), 1)
    elif pop < 20000:
        listings_per_thousand = round(rng.uniform(1, 10), 1)
        str_ratio = round(rng.uniform(0.3, 3.0), 1)
    else:
        listings_per_thousand = round(rng.uniform(0.5, 5), 1)
        str_ratio = round(rng.uniform(0.2, 2.0), 1)
    
    yoy_supply_growth = round(rng.uniform(1.0, 15.0), 1)
    
    # Saturation risk level
    if listings_per_thousand > 25:
        risk_level = 'very-high'
        saturation_score = rng.randint(10, 25)
    elif listings_per_thousand > 15:
        risk_level = 'high'
        saturation_score = rng.randint(20, 40)
    elif listings_per_thousand > 8:
        risk_level = 'moderate'
        saturation_score = rng.randint(35, 60)
    else:
        risk_level = 'low'
        saturation_score = rng.randint(55, 80)
    
    # RPR score
    if rpr >= 0.18:
        rpr_score = rng.randint(75, 95)
        rpr_rating = 'elite'
    elif rpr >= 0.15:
        rpr_score = rng.randint(60, 78)
        rpr_rating = 'good'
    elif rpr >= 0.12:
        rpr_score = rng.randint(35, 62)
        rpr_rating = 'marginal'
    else:
        rpr_score = rng.randint(10, 38)
        rpr_rating = 'poor'
    
    # Overall score
    overall = int(demand * 0.25 + affordability * 0.25 + regulation_score * 0.1 + seasonality * 0.15 + saturation_score * 0.1 + rpr_score * 0.15)
    overall = max(25, min(95, overall))
    
    # Verdict
    if overall >= 78:
        verdict = 'strong-buy'
    elif overall >= 65:
        verdict = 'buy'
    elif overall >= 52:
        verdict = 'hold'
    elif overall >= 40:
        verdict = 'caution'
    else:
        verdict = 'avoid'
    
    # STR status (most small towns are legal)
    str_status = 'legal'
    permit_required = rng.choice([True, True, True, False])  # 75% require permits
    
    # Income by size
    base_1br = int(monthly_revenue * 0.35)
    base_2br = int(monthly_revenue * 0.65)
    base_3br = monthly_revenue
    base_4br = int(monthly_revenue * 1.45)
    base_5br = int(monthly_revenue * 1.80)
    base_6br = int(monthly_revenue * 2.15)
    
    # Best performer varies by market type
    if mtype in ('mountain', 'lake', 'rural'):
        best = rng.choice(['3BR', '4BR', '5BR'])
    elif mtype in ('beach', 'waterfront', 'tropical'):
        best = rng.choice(['4BR', '5BR', '6BR+'])
    elif mtype in ('urban', 'suburban'):
        best = rng.choice(['2BR', '3BR', '4BR'])
    else:
        best = rng.choice(['3BR', '4BR'])
    
    # Revenue percentiles
    rev_75 = int(monthly_revenue * 1.30)
    rev_90 = int(monthly_revenue * 1.60)
    mtr_income = int(monthly_revenue * 0.70)
    
    # Amenities
    amenities = AMENITY_PROFILES.get(mtype, AMENITY_PROFILES['rural'])
    
    return {
        'id': city_id,
        'name': name,
        'county': county,
        'type': 'city',
        'population': pop,
        'rpr': rpr,
        'dsi': dsi,
        'marketScore': {
            'overall': overall,
            'demand': demand,
            'affordability': affordability,
            'regulation': regulation_score,
            'seasonality': seasonality,
            'saturation': saturation_score,
            'rpr': rpr_score,
            'verdict': verdict,
        },
        'rental': {
            'avgADR': avg_adr,
            'occupancyRate': occupancy_rate,
            'monthlyRevenue': monthly_revenue,
            'medianHomePrice': median_home_price,
            'revenue75thPercentile': rev_75,
            'revenue90thPercentile': rev_90,
            'mtrMonthlyIncome': mtr_income,
        },
        'saturationRisk': {
            'strToHousingRatio': str_ratio,
            'listingsPerThousand': listings_per_thousand,
            'yoySupplyGrowth': yoy_supply_growth,
            'riskLevel': risk_level,
        },
        'investmentMetrics': {
            'rpr': rpr,
            'rprRating': rpr_rating,
            'dsi': dsi,
            'dsiDetails': {
                'monthlyMortgage': monthly_mortgage,
                'monthlyExpenses': monthly_expenses,
                'netMonthlyIncome': net_monthly_income,
                'survives': dsi,
            },
        },
        'strStatus': str_status,
        'permitRequired': permit_required,
        'incomeBySize': {
            'oneBR': base_1br,
            'twoBR': base_2br,
            'threeBR': base_3br,
            'fourBR': base_4br,
            'fiveBR': base_5br,
            'sixPlusBR': base_6br,
            'bestPerformer': best,
        },
        'amenityDelta': {
            'topAmenities': amenities,
            'marketType': mtype,
        },
        'highlights': highlights,
    }


def format_city_entry(data):
    """Format a city data dict as a single-line TypeScript object matching existing format."""
    d = data
    ms = d['marketScore']
    r = d['rental']
    sr = d['saturationRisk']
    im = d['investmentMetrics']
    ibs = d['incomeBySize']
    ad = d['amenityDelta']
    
    # Format amenities
    amenity_strs = []
    for a in ad['topAmenities']:
        amenity_strs.append(
            f"{{ name: '{a['name']}', revenueBoost: {a['revenueBoost']}, priority: '{a['priority']}' }}"
        )
    amenities_str = ', '.join(amenity_strs)
    
    # Format highlights
    highlights_str = ', '.join(f"'{h}'" for h in d['highlights'])
    
    # Escape single quotes in name/county
    name = d['name'].replace("'", "\\'")
    county = d['county'].replace("'", "\\'")
    
    line = (
        f"    {{ id: '{d['id']}', name: '{name}', county: '{county}', "
        f"type: '{d['type']}', population: {d['population']}, rpr: {d['rpr']}, dsi: {'true' if d['dsi'] else 'false'}, "
        f"marketScore: {{ overall: {ms['overall']}, demand: {ms['demand']}, affordability: {ms['affordability']}, "
        f"regulation: {ms['regulation']}, seasonality: {ms['seasonality']}, saturation: {ms['saturation']}, "
        f"rpr: {ms['rpr']}, verdict: '{ms['verdict']}' }}, "
        f"rental: {{ avgADR: {r['avgADR']}, occupancyRate: {r['occupancyRate']}, "
        f"monthlyRevenue: {r['monthlyRevenue']}, medianHomePrice: {r['medianHomePrice']}, "
        f"revenue75thPercentile: {r['revenue75thPercentile']}, revenue90thPercentile: {r['revenue90thPercentile']}, "
        f"mtrMonthlyIncome: {r['mtrMonthlyIncome']} }}, "
        f"saturationRisk: {{ strToHousingRatio: {sr['strToHousingRatio']}, "
        f"listingsPerThousand: {sr['listingsPerThousand']}, yoySupplyGrowth: {sr['yoySupplyGrowth']}, "
        f"riskLevel: '{sr['riskLevel']}' }}, "
        f"investmentMetrics: {{ rpr: {im['rpr']}, rprRating: '{im['rprRating']}', "
        f"dsi: {'true' if im['dsi'] else 'false'}, dsiDetails: {{ "
        f"monthlyMortgage: {im['dsiDetails']['monthlyMortgage']}, "
        f"monthlyExpenses: {im['dsiDetails']['monthlyExpenses']}, "
        f"netMonthlyIncome: {im['dsiDetails']['netMonthlyIncome']}, "
        f"survives: {'true' if im['dsiDetails']['survives'] else 'false'} }} }}, "
        f"strStatus: '{d['strStatus']}', permitRequired: {'true' if d['permitRequired'] else 'false'}, "
        f"incomeBySize: {{ oneBR: {ibs['oneBR']}, twoBR: {ibs['twoBR']}, threeBR: {ibs['threeBR']}, "
        f"fourBR: {ibs['fourBR']}, fiveBR: {ibs['fiveBR']}, sixPlusBR: {ibs['sixPlusBR']}, "
        f"bestPerformer: '{ibs['bestPerformer']}' }}, "
        f"amenityDelta: {{ topAmenities: [{amenities_str}], marketType: '{ad['marketType']}' }}, "
        f"highlights: [{highlights_str}] }}"
    )
    return line


def main():
    existing_ids, existing_by_state = parse_existing_cities('src/data/city-data.ts')
    
    # Filter out duplicates
    new_cities = []
    skipped = []
    for city in NEW_CITIES:
        city_id = city[0]
        if city_id in existing_ids:
            skipped.append(city_id)
        else:
            new_cities.append(city)
    
    print(f"Total candidates: {len(NEW_CITIES)}")
    print(f"Skipped (already exist): {len(skipped)} - {skipped}")
    print(f"New cities to generate: {len(new_cities)}")
    
    # Group by state
    by_state = defaultdict(list)
    for city in new_cities:
        state = city[3]
        data = generate_city_data(city, existing_by_state)
        by_state[state].append(data)
    
    # Output grouped by state
    output_lines = []
    state_counts = {}
    for state in sorted(by_state.keys()):
        cities = by_state[state]
        state_counts[state] = len(cities)
        output_lines.append(f"// STATE: {state} ({len(cities)} new cities)")
        for city_data in cities:
            line = format_city_entry(city_data)
            output_lines.append(line)
    
    # Write output
    with open('/tmp/new_city_entries.txt', 'w') as f:
        f.write('\n'.join(output_lines))
    
    print(f"\nGenerated {sum(state_counts.values())} new city entries across {len(state_counts)} states")
    print(f"State breakdown: {dict(sorted(state_counts.items()))}")
    print(f"Output written to /tmp/new_city_entries.txt")


if __name__ == '__main__':
    main()
