"""Site content. Facts here come from the live site; nothing about prices, hours or reviews is invented."""

SITE = "https://ziccoplumbersgp.co.za"
NAME = "Zicco Plumbers"
PHONE_DISPLAY = "+27 81 440 5778"
PHONE_TEL = "+27814405778"
WA_NUMBER = "27814405778"
CONTACT_PERSON = "Ntsikelelo Mpayipeli"
STREET = "33 Jorissen Street, Geldenhuys Building"
ADDRESS = "33 Jorissen Street, Geldenhuys Building, Braamfontein, Johannesburg, Gauteng"
PIRB_NO = "72110"
LICENCE_NO = "8610/19"
UPDATED = "2026-10-23"
# PIRB licence card: categories the licensed plumber may certify (COC), plus specialisation.
LICENSED_CATEGORIES = ["Above ground drainage", "Below ground drainage", "Rainwater drainage", "Cold water", "Hot water"]
LICENSED_SPECIALISATION = "Heat pumps"

# Icons are simple stroked SVG paths (Feather-style), drawn at 24x24.
ICONS = {
    "tool": '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    "drain": '<circle cx="12" cy="12" r="9"/><path d="M8 9h8M7 12h10M8 15h8"/>',
    "drop": '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
    "layers": '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    "jet": '<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>',
    "thermo": '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
    "camera": '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
    "building": '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    "pump": '<circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    "id": '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.5"/><path d="M13 10h5M13 14h4"/>',
    "file": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/>',
    "pin": '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    "home": '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    "users": '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    "crane": '<path d="M2 20h20M6 20V4l12 4M6 8h12M14 8v5"/><rect x="12" y="13" width="4" height="3"/>',
    "stack": '<path d="M9 2v20M14 2v20"/><path d="M14 8l6-3M14 13l6-3"/><path d="M9 11H4"/>',
    "ground": '<path d="M2 9h20"/><path d="M3 9l3-3M8 9l3-3M13 9l3-3M18 9l3-3"/><rect x="3" y="14" width="18" height="5" rx="2.5"/>',
    "rain": '<line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>',
    "tap": '<path d="M3 10h10a3 3 0 0 1 3 3v2"/><path d="M7 5h6M10 5v5"/><path d="M18 20a2 2 0 1 1-4 0c0-1.3 2-3.5 2-3.5s2 2.2 2 3.5z"/>',
    "menu": '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
}

IMAGES = {
    "hero": ("hero.jpg", ""),
    "booster": ("01-booster-pump.jpg", "A vertical water booster pump with blue pipework connected on both sides"),
    "slab": ("02-drainage-pipes-on-slab.jpg", "White drainage pipes laid over steel reinforcing mesh on a new building slab"),
    "shower": ("03-glass-shower.jpg", "A tiled shower with a glass screen and a wall-mounted shower panel"),
    "geyser": ("04-geyser-on-wall.jpg", "A stainless steel geyser mounted on an outside wall with copper pipes and valves"),
    "drain-wall": ("05-drainage-on-building-wall.jpg", "Drainage pipes with branches running along the outside wall of a brick building"),
    "heatpump": ("06-heat-pump-and-geyser.jpg", "A hot water heat pump and a stainless steel geyser mounted on a wall, joined by insulated and copper pipework"),
    "toilet": ("07-wall-hung-toilet.jpg", "A wall-hung toilet with a concealed cistern flush plate and a bidet spray hose"),
    "copper": ("08-copper-pipe-manifold.jpg", "Copper pipes with isolating valves fixed to a wall"),
    "stack": ("09-drainage-stack-on-wall.jpg", "A white drainage stack and branch pipes fixed to the outside wall of a house"),
    "valves": ("10-water-valves-in-trench.jpg", "Blue gate valves on a water pipe in an excavated trench"),
}

# Short project captions for the gallery
CAPTIONS = {
    "booster": "Water booster pump installation",
    "slab": "Drainage laid on a new building slab before the pour",
    "shower": "Shower installation with glass screen",
    "geyser": "Geyser installation with copper pipework",
    "drain-wall": "External drainage on a multi-storey building",
    "heatpump": "Heat pump connected to a geyser",
    "toilet": "Wall-hung toilet with concealed cistern",
    "copper": "Copper water supply with isolating valves",
    "stack": "Drainage stack and branch pipes",
    "valves": "Water main gate valves in a trench",
}

# Service options in the quote form. The first seven match the client's own form.
FORM_SERVICES = [
    "Plumbing service / maintenance",
    "Drains (blocked drain, drain cleaning)",
    "Leak detection",
    "Subsoil drainage",
    "Water jetting",
    "Heat pumps / Geysers",
    "New building plumbing installation",
    "Water booster pump",
    "Metered showers",
    "Plumbing COC",
    "Drain camera",
    "Above-ground drainage",
    "Below-ground drainage",
    "Rainwater drainage",
    "Cold water installation",
    "Other",
]

SERVICES = [
    {
        "slug": "plumbing-maintenance-repairs",
        "name": "Plumbing service & maintenance",
        "icon": "tool",
        "card": "Leaking taps, running toilets, burst and damaged pipes, valves, low pressure and general plumbing repairs for homes and buildings.",
        "title": "Plumbing Repairs & Maintenance in Johannesburg | Zicco Plumbers",
        "desc": "PIRB-registered plumber for plumbing repairs and maintenance in Johannesburg: taps, toilets, pipes, valves and water pressure. Call or WhatsApp +27 81 440 5778.",
        "h1": "Plumbing repairs & maintenance in Johannesburg",
        "lead": "From a dripping tap to a damaged water pipe, Zicco Plumbers handles everyday plumbing repairs and planned maintenance for homes, flats, offices and whole buildings.",
        "img": "copper",
        "sections": [
            ("Common plumbing repairs", "<ul class=\"check-list\"><li>Dripping and leaking taps, mixers and shower valves</li><li>Toilets that keep running, won't flush or leak at the base</li><li>Burst, cracked or corroded water pipes</li><li>Faulty stopcocks, isolating valves and pressure valves</li><li>Low water pressure and noisy pipes</li><li>Basins, sinks, baths and showers: replacements and new fittings</li><li>Wall-hung toilets and concealed cisterns</li></ul>"),
            ("Planned maintenance for buildings", "<p>For body corporates, landlords, building managers and student accommodation, regular plumbing maintenance stops small leaks becoming water damage and high water bills. We can check and repair taps, toilets, valves, geysers and drainage across a building, and tell you what needs attention before it fails.</p>"),
            ("Why use a registered plumber", "<p>Zicco Plumbers is a <strong>PIRB-registered company (no. " + PIRB_NO + ")</strong> with a <strong>licensed plumber (licence " + LICENCE_NO + ")</strong> who can sign Certificates of Compliance. Work that needs a plumbing COC, such as a geyser replacement, can be certified when it is done.</p>"),
        ],
        "faqs": [
            ("Do you do small plumbing jobs?", "Yes. Send a WhatsApp message with a description and a photo of the problem and we will tell you what is involved."),
            ("Can you look after the plumbing for a whole building?", "Yes. We work in high-rise buildings, blocks of flats and student accommodation, and can arrange maintenance for the building's plumbing."),
        ],
        "related": ["leak-detection", "blocked-drains-drain-cleaning", "geyser-heat-pump-installation"],
    },
    {
        "slug": "blocked-drains-drain-cleaning",
        "name": "Blocked drains & drain cleaning",
        "icon": "drain",
        "card": "Blocked sinks, toilets, showers and outside drains cleared. Drain cleaning to remove grease, roots and build-up so the blockage doesn't come back.",
        "title": "Blocked Drains & Drain Cleaning Johannesburg | Zicco Plumbers",
        "desc": "Blocked drain in Johannesburg? Zicco Plumbers clears blocked toilets, sinks, showers and outside drains, with water jetting and drain cameras. Call +27 81 440 5778.",
        "h1": "Blocked drains & drain cleaning in Johannesburg",
        "lead": "Blocked toilet, slow sink or an overflowing gully outside? We clear blocked drains and clean the pipe properly, so the same blockage doesn't come straight back.",
        "img": "stack",
        "sections": [
            ("Drains we clear", "<ul class=\"check-list\"><li>Blocked toilets and soil pipes</li><li>Kitchen sinks blocked with grease and food waste</li><li>Slow basins, baths and showers</li><li>Outside gullies, manholes and yard drains</li><li>Main sewer lines from the property to the municipal connection</li><li>Drainage stacks in blocks of flats and high-rise buildings</li></ul>"),
            ("Signs your drain is blocking", "<ul><li>Water drains slowly or gurgles</li><li>Bad smells from plugholes or outside drains</li><li>Toilet water rises when you flush</li><li>Water or sewage coming up at an outside gully or manhole</li></ul><p>A slow drain is much easier to clear than a fully blocked one, so it is worth calling early.</p>"),
            ("Clearing the blockage properly", "<p>Small blockages can often be cleared with drain rods or a machine. For grease, silt and tree roots we use <a href=\"/services/high-pressure-water-jetting/\">high-pressure water jetting</a>, which cleans the full width of the pipe. If drains keep blocking, a <a href=\"/services/drain-camera-inspection/\">drain camera inspection</a> shows what is causing it, such as roots, a broken pipe or a sag in the line.</p>"),
        ],
        "faqs": [
            ("What causes blocked drains?", "The most common causes are grease and food waste in kitchen drains, wet wipes and sanitary products in toilets, hair in showers, and tree roots or broken pipes in outside drains."),
            ("My drain keeps blocking. What should I do?", "A drain that keeps blocking usually has an underlying problem such as roots, a cracked pipe or a dip in the line. A drain camera inspection finds the cause so it can be repaired."),
        ],
        "related": ["high-pressure-water-jetting", "drain-camera-inspection", "subsoil-drainage"],
    },
    {
        "slug": "leak-detection",
        "name": "Leak detection",
        "icon": "drop",
        "card": "High water bill, damp walls or a meter that keeps turning? We find hidden water leaks and repair them with as little damage as possible.",
        "title": "Leak Detection Johannesburg | Find Hidden Water Leaks | Zicco Plumbers",
        "desc": "Leak detection in Johannesburg: high water bills, damp walls, water meter running. Zicco Plumbers finds and repairs hidden water leaks. Call or WhatsApp +27 81 440 5778.",
        "h1": "Leak detection in Johannesburg",
        "lead": "A hidden leak can waste thousands of litres of water before you see it. We track down leaks in walls, floors, ceilings and underground pipes, then repair them.",
        "img": "valves",
        "sections": [
            ("Signs of a hidden leak", "<ul class=\"check-list\"><li>Your water bill has gone up and your use hasn't</li><li>The water meter keeps moving when every tap is closed</li><li>Damp patches, bubbling paint or mould on walls or ceilings</li><li>Wet spots or unusually green patches in the garden or paving</li><li>The sound of running water when nothing is on</li><li>Low water pressure for no obvious reason</li></ul>"),
            ("Check your meter first", "<p>Close every tap and make sure nothing is using water (toilets, irrigation, washing machine). Take a reading or photo of your water meter, wait 30 minutes and look again. If the numbers have moved, you almost certainly have a leak. Send us the photos on WhatsApp.</p>"),
            ("Finding and fixing the leak", "<p>We work methodically from the meter to the fittings, isolating sections of pipe to narrow down where the water is going, then open up only where we need to. Once the leak is found we repair or replace the damaged pipe and test the system.</p>"),
        ],
        "faqs": [
            ("Will you have to break walls or floors?", "Only where the leak is. We narrow the leak down first so that only a small area needs to be opened for the repair."),
            ("Can a leak be underground?", "Yes. Leaks in the supply pipe between the meter and the building are common and often show up as a wet patch, sinking paving or a rising water bill."),
        ],
        "related": ["plumbing-maintenance-repairs", "geyser-heat-pump-installation", "blocked-drains-drain-cleaning"],
    },
    {
        "slug": "subsoil-drainage",
        "name": "Subsoil drainage",
        "icon": "layers",
        "card": "Subsoil drains that carry groundwater away from foundations, retaining walls, basements and waterlogged gardens.",
        "title": "Subsoil Drainage Installation Johannesburg | Zicco Plumbers",
        "desc": "Subsoil drainage in Johannesburg for waterlogged gardens, damp foundations, retaining walls and basements. PIRB-registered plumber. Call +27 81 440 5778.",
        "h1": "Subsoil drainage in Johannesburg",
        "lead": "Standing water, rising damp and pressure behind retaining walls all come from water trapped in the ground. A subsoil drain collects that water and carries it safely away.",
        "img": "slab",
        "sections": [
            ("When you need subsoil drainage", "<ul class=\"check-list\"><li>Waterlogged lawns and gardens that stay wet after rain</li><li>Damp walls and floors from water around the foundations</li><li>Water building up behind retaining walls</li><li>Basements, parking levels and lift pits that take in water</li><li>New buildings and paving on sloping or clay sites</li></ul>"),
            ("How a subsoil drain works", "<p>A trench is dug along the area that needs draining. A perforated drain pipe is laid in it, surrounded by stone and wrapped in geotextile fabric so soil doesn't block the pipe. Groundwater seeps into the pipe and runs to a suitable outlet, away from the building.</p>"),
            ("New builds and existing properties", "<p>Subsoil drainage is easiest to install during construction, alongside the building's other drainage. It can also be added to existing homes and buildings where water is causing damp or damage.</p>"),
        ],
        "faqs": [
            ("Is subsoil drainage the same as a stormwater drain?", "No. Stormwater drains carry surface rainwater from roofs and paving. Subsoil drains collect water that has soaked into the ground."),
        ],
        "related": ["new-building-plumbing-installations", "blocked-drains-drain-cleaning", "drain-camera-inspection"],
    },
    {
        "slug": "above-ground-drainage",
        "name": "Above-ground drainage",
        "icon": "stack",
        "card": "Soil, waste and vent pipework for toilets, basins, showers, baths and kitchens, inside and outside the building, from homes to high-rise.",
        "title": "Above-Ground Drainage Installation & Repairs Johannesburg | Zicco Plumbers",
        "desc": "Above-ground drainage in Johannesburg: soil and waste pipes, stacks and vents for homes and buildings. Licensed for above-ground drainage COCs. Call +27 81 440 5778.",
        "h1": "Above-ground drainage in Johannesburg",
        "lead": "Above-ground drainage is all the soil, waste and vent pipework that carries water away from toilets, basins, showers, baths and kitchens to the drains below. Zicco Plumbers installs, replaces and repairs it, and is licensed to certify it.",
        "img": "drain-wall",
        "sections": [
            ("What we install and repair", "<ul class=\"check-list\"><li>Soil and waste pipes for toilets, basins, showers, baths and sinks</li><li>Drainage stacks and branch pipes on multi-storey buildings</li><li>Vent pipes and air admittance valves that stop gurgling and smells</li><li>Kitchen and laundry waste connections</li><li>Replacing cracked, leaking or badly joined drain pipes</li><li>New drainage for renovations, extensions and new buildings</li></ul>"),
            ("Signs of an above-ground drainage problem", "<ul><li>Drains that gurgle or empty slowly even after being cleared</li><li>Sewer smells inside the bathroom or kitchen</li><li>Damp or stains around waste pipes, or water on the floor under a basin</li><li>Leaks from the outside drain pipes on the wall</li></ul>"),
            ("Licensed for above-ground drainage", "<p>Our plumber's PIRB licence covers <strong>above-ground drainage</strong>, so the work can be certified with a plumbing Certificate of Compliance when it's done.</p>"),
        ],
        "faqs": [
            ("Do you do drainage on high-rise buildings?", "Yes. We install and repair drainage stacks and branch pipes on multi-storey and high-rise buildings."),
            ("Can you certify the new drainage in my renovation?", "Yes. Above-ground drainage is one of the categories on our plumber's licence, so we can issue a COC for it."),
        ],
        "related": [],
    },
    {
        "slug": "below-ground-drainage",
        "name": "Below-ground drainage",
        "icon": "ground",
        "card": "Underground drain and sewer lines from the building to the municipal connection: new installations, replacements and repairs.",
        "title": "Below-Ground Drainage & Sewer Lines Johannesburg | Zicco Plumbers",
        "desc": "Below-ground drainage in Johannesburg: new sewer lines, broken and root-damaged drain replacement, manholes and gullies. Licensed for below-ground drainage COCs.",
        "h1": "Below-ground drainage in Johannesburg",
        "lead": "Below-ground drainage carries everything from the building to the municipal sewer. We lay new underground drain lines, and replace and repair pipes that are broken, sagging or full of roots.",
        "img": "valves",
        "sections": [
            ("What we do", "<ul class=\"check-list\"><li>New underground drain and sewer lines for new buildings and extensions</li><li>Drainage laid in and under slabs before the concrete is poured</li><li>Replacing broken, collapsed or root-damaged drain pipes</li><li>Manholes, inspection eyes and rodding points</li><li>Gullies and yard drains</li><li>Connections to the municipal sewer</li></ul>"),
            ("Finding the problem first", "<p>For drains that keep blocking, smell or cause sinking paving, a drain camera inspection shows exactly where the damage is, so we only dig where it's needed. Blockages can often be cleared with high-pressure water jetting before any digging.</p>"),
            ("Licensed for below-ground drainage", "<p>Our plumber's PIRB licence covers <strong>below-ground drainage</strong>, so new and repaired drain lines can be certified with a plumbing COC.</p>"),
        ],
        "faqs": [
            ("How do I know if my underground drain is broken?", "Common signs are drains that keep blocking, sewer smells outside, damp or sinking paving near a drain line, and very green patches in the garden. A camera inspection confirms it."),
            ("Do you lay drainage on new building sites?", "Yes. We lay below-ground drainage on construction sites, including in-slab drainage before the pour."),
        ],
        "related": [],
    },
    {
        "slug": "rainwater-drainage",
        "name": "Rainwater drainage",
        "icon": "rain",
        "card": "Downpipes, rainwater pipes and stormwater drains that carry rain safely away from roofs, paving and foundations.",
        "title": "Rainwater & Stormwater Drainage Johannesburg | Zicco Plumbers",
        "desc": "Rainwater drainage in Johannesburg: downpipes, rainwater pipes, stormwater drains and flat-roof outlets. Licensed for rainwater drainage COCs. Call +27 81 440 5778.",
        "h1": "Rainwater drainage in Johannesburg",
        "lead": "Johannesburg's summer storms put a lot of water on roofs and paving in a short time. Rainwater drainage carries it safely away so it doesn't flood yards, damage walls or soak foundations.",
        "img": "stack",
        "sections": [
            ("What we install and repair", "<ul class=\"check-list\"><li>Downpipes and rainwater pipes from roofs and gutters</li><li>Stormwater drains and channels in yards, driveways and paving</li><li>Flat-roof and balcony outlets</li><li>Rainwater drainage on new buildings and complexes</li><li>Repairing leaking, cracked or blocked rainwater pipes</li></ul>"),
            ("Signs you need better rainwater drainage", "<ul><li>Water pooling against walls or at the front door when it rains</li><li>Damp walls and floors after storms</li><li>Overflowing downpipes or water running across paving</li><li>Erosion or sinking paving near downpipes</li></ul>"),
            ("Keeping rainwater out of the sewer", "<p>Rainwater should drain to stormwater, not into the sewer system, which can overflow in heavy rain. Municipal by-laws generally don't allow it. We make sure rainwater goes where it should.</p>"),
            ("Licensed for rainwater drainage", "<p>Our plumber's PIRB licence covers <strong>rainwater drainage</strong>, so the work can be certified with a plumbing COC.</p>"),
        ],
        "faqs": [
            ("Is rainwater drainage the same as subsoil drainage?", "No. Rainwater drainage deals with rain coming off roofs and paving. Subsoil drainage removes water that has soaked into the ground around foundations and gardens."),
        ],
        "related": [],
    },
    {
        "slug": "high-pressure-water-jetting",
        "name": "High-pressure water jetting",
        "icon": "jet",
        "card": "High-pressure jetting to clean drains and sewer lines of grease, fat, silt, scale and tree roots, restoring full flow.",
        "title": "High-Pressure Water Jetting Johannesburg | Drain Jetting | Zicco Plumbers",
        "desc": "Drain and sewer water jetting in Johannesburg. High-pressure cleaning removes grease, silt and roots from drains. Zicco Plumbers, call or WhatsApp +27 81 440 5778.",
        "h1": "High-pressure water jetting in Johannesburg",
        "lead": "Water jetting cleans the inside of drain and sewer pipes with a high-pressure stream of water, cutting through grease, silt and roots that rods and plungers leave behind.",
        "img": "drain-wall",
        "sections": [
            ("What water jetting clears", "<ul class=\"check-list\"><li>Grease and fat build-up in kitchen and restaurant drains</li><li>Silt, sand and debris in outside drains and stormwater lines</li><li>Tree roots growing into drain joints</li><li>Scale and sludge in older pipes</li><li>Long sewer runs in complexes and buildings</li></ul>"),
            ("Why jetting works better", "<p>Rods push a hole through a blockage. Jetting scours the whole inside of the pipe, so the drain flows at full capacity and stays clear for longer. It uses only water, so there are no harsh chemicals in your drains.</p>"),
            ("Jetting with a camera inspection", "<p>On drains that block repeatedly, we can follow jetting with a <a href=\"/services/drain-camera-inspection/\">drain camera inspection</a> to check the pipe is clean and undamaged.</p>"),
        ],
        "faqs": [
            ("Will water jetting damage my pipes?", "Jetting is safe for drain pipes in sound condition. Where a pipe is badly cracked or broken, a camera inspection first shows whether it needs repair."),
            ("How often should drains be jetted?", "It depends on how the drain is used. Restaurant kitchens and large buildings benefit from regular jetting; homes usually only need it when there's a problem."),
        ],
        "related": ["blocked-drains-drain-cleaning", "drain-camera-inspection", "subsoil-drainage"],
    },
    {
        "slug": "geyser-heat-pump-installation",
        "name": "Geysers & heat pumps",
        "icon": "thermo",
        "card": "Geyser installation, replacement and repair, plus hot water heat pumps that heat water using far less electricity.",
        "title": "Geyser Installation, Repair & Heat Pumps Johannesburg | Zicco Plumbers",
        "desc": "Geyser installation, replacement and repair and hot water heat pumps in Johannesburg. PIRB-registered, licensed plumber, COC issued. Call +27 81 440 5778.",
        "h1": "Geysers & heat pumps in Johannesburg",
        "lead": "Burst geyser, no hot water or high electricity bills? We install, replace and repair geysers, and fit hot water heat pumps that cut the cost of heating water.",
        "img": "heatpump",
        "sections": [
            ("Geyser repairs and replacement", "<ul class=\"check-list\"><li>Burst or leaking geysers replaced</li><li>No hot water: element and thermostat faults</li><li>Leaking pressure control valves, safety valves and vacuum breakers</li><li>Drip trays and overflow pipes fitted correctly</li><li>New geyser installations in new builds and renovations</li></ul><p>If your geyser has burst, switch off the geyser at the electrical board and close the water supply to it, then call or WhatsApp us.</p>"),
            ("Hot water heat pumps", "<p>A heat pump heats water by taking heat from the surrounding air, much like an air conditioner in reverse. It typically uses around a third of the electricity of a standard geyser element to heat the same amount of water. We install heat pump systems and connect them to your existing or new geyser.</p><p>Heat pumps suit homes with high hot water use, blocks of flats, guest houses and student accommodation.</p>"),
            ("COC for geyser work", "<p>Hot water installations must be done to standard and certified. Our plumber's PIRB licence (" + LICENCE_NO + ") covers <strong>hot water</strong>, with a <strong>specialisation in heat pumps</strong>, so we can issue the plumbing Certificate of Compliance that insurers usually ask for after a geyser replacement.</p>"),
        ],
        "faqs": [
            ("Do you repair geysers or only install them?", "Both. We repair geyser faults such as elements, thermostats and valves, and replace geysers that have burst or reached the end of their life."),
            ("Is a heat pump worth it?", "For households and buildings that use a lot of hot water, a heat pump uses much less electricity than a geyser element, so the running cost is lower. Ask us for a quote and we can talk through whether it suits your property."),
            ("Will I get a COC for my new geyser?", "Yes. Our licensed plumber can issue a Certificate of Compliance for the installation."),
        ],
        "related": ["plumbing-coc-certificates", "plumbing-maintenance-repairs", "leak-detection"],
    },
    {
        "slug": "cold-water-installations",
        "name": "Cold water installations",
        "icon": "tap",
        "card": "Water supply pipework from the meter to every tap: new supply lines, pipe replacement, stopcocks and pressure valves.",
        "title": "Cold Water Supply Installation & Pipe Replacement Johannesburg | Zicco Plumbers",
        "desc": "Cold water installations in Johannesburg: new water supply lines, old pipe replacement, stopcocks and pressure reducing valves. Licensed for cold water COCs.",
        "h1": "Cold water installations in Johannesburg",
        "lead": "Your cold water supply runs from the municipal meter to every tap, toilet and appliance. We install new supply pipework, replace old and leaking pipes, and fit the valves that control it.",
        "img": "copper",
        "sections": [
            ("What we install", "<ul class=\"check-list\"><li>New water supply lines from the meter to the building</li><li>Replacing old galvanised or leaking pipes</li><li>Supply pipework for kitchens, bathrooms and extensions</li><li>Stopcocks, isolating valves and non-return valves</li><li>Pressure reducing valves where the supply pressure is too high</li><li>Water supply for new buildings and high-rise, including booster pumps</li></ul>"),
            ("Signs your cold water supply needs work", "<ul><li>Rusty or discoloured water</li><li>Low or uneven water pressure</li><li>Leaks, damp walls or a water meter that keeps turning</li><li>No way to turn the water off to one part of the house</li></ul>"),
            ("Licensed for cold water", "<p>Our plumber's PIRB licence covers <strong>cold water</strong> installations, so new and replaced supply pipework can be certified with a plumbing COC.</p>"),
        ],
        "faqs": [
            ("Should I replace old galvanised pipes?", "Old galvanised steel pipes rust from the inside, which causes low pressure, discoloured water and leaks. Replacing them usually fixes all three."),
            ("Can you fit a main stopcock so I can turn off the water?", "Yes. We fit main and isolating valves so the water can be shut off quickly in an emergency or for repairs."),
        ],
        "related": [],
    },
    {
        "slug": "drain-camera-inspection",
        "name": "Drain camera inspections",
        "icon": "camera",
        "card": "A camera fed through the drain shows exactly what's wrong: roots, cracks, collapses or blockages, without digging first.",
        "title": "Drain Camera Inspection Johannesburg | CCTV Drain Survey | Zicco Plumbers",
        "desc": "Drain camera inspections in Johannesburg. See inside your drains to find roots, cracks, collapses and recurring blockages before you dig. Call +27 81 440 5778.",
        "h1": "Drain camera inspections in Johannesburg",
        "lead": "A waterproof camera on a flexible cable is fed into the drain so we can see the inside of the pipe on screen. That means the right fix first time, and digging only where it's needed.",
        "img": "stack",
        "sections": [
            ("When a drain camera helps", "<ul class=\"check-list\"><li>Drains that keep blocking after they've been cleared</li><li>Suspected tree roots in the drain line</li><li>Sinking paving, bad smells or damp near a drain</li><li>Checking an old drain before renovating or building</li><li>Checking new drainage before it is covered up</li><li>Finding where a drain line runs and where the problem is</li></ul>"),
            ("What we can find", "<p>Cracked and broken pipes, displaced joints, root intrusion, collapsed sections, sags where water and waste collect, and objects stuck in the line. Once we know the cause, we can recommend the right repair, such as <a href=\"/services/high-pressure-water-jetting/\">water jetting</a> or replacing a damaged section.</p>"),
        ],
        "faqs": [
            ("Do you have to dig to inspect a drain?", "No. The camera goes in through an existing access point such as a gully, rodding eye or manhole."),
        ],
        "related": ["blocked-drains-drain-cleaning", "high-pressure-water-jetting", "leak-detection"],
    },
    {
        "slug": "new-building-plumbing-installations",
        "name": "New building plumbing installations",
        "icon": "crane",
        "card": "Complete plumbing for new construction sites and high-rise buildings: drainage, water supply and hot water, from slab to handover.",
        "title": "Commercial Plumbing for New Construction & High-Rise | Zicco Plumbers",
        "desc": "Plumbing installations for new construction sites and high-rise buildings in Johannesburg: drainage, water supply, hot water and COC. PIRB company 72110.",
        "h1": "Plumbing installations for new buildings & high-rise",
        "lead": "Zicco Plumbers installs plumbing on new construction sites and in high-rise buildings across Johannesburg, working with contractors and developers from the slab to handover.",
        "img": "slab",
        "sections": [
            ("What we install", "<ul class=\"check-list\"><li>Below-slab and in-slab drainage, laid before the pour</li><li>Soil and waste stacks and branch drainage on every floor</li><li>Cold and hot water supply pipework and valves</li><li>Geysers, heat pumps and hot water systems</li><li>Water booster pumps for upper floors</li><li>Sanitaryware, wall-hung toilets and concealed cisterns</li><li>Metered showers for student accommodation</li><li>Subsoil drainage around foundations and basements</li></ul>"),
            ("Working with contractors and developers", "<p>We work from your drawings and the building programme, coordinate with the other trades on site, and make sure the plumbing is ready to test and inspect at each stage. As a PIRB-registered company (no. " + PIRB_NO + ") with a licensed plumber (licence " + LICENCE_NO + "), we can issue the plumbing Certificate of Compliance at completion.</p>"),
        ],
        "faqs": [
            ("Do you quote from drawings?", "Yes. Send the plumbing drawings or bill of quantities and we can price the installation."),
            ("Do you work on high-rise buildings?", "Yes. High-rise and multi-storey buildings are a core part of our work, including drainage stacks and booster pumps."),
        ],
        "related": ["water-booster-pumps", "metered-showers", "subsoil-drainage"],
    },
    {
        "slug": "water-booster-pumps",
        "name": "Water booster pumps",
        "icon": "pump",
        "card": "Booster pumps that give high-rise buildings and low-pressure properties strong, steady water pressure on every floor.",
        "title": "Water Booster Pump Installation Johannesburg | Zicco Plumbers",
        "desc": "Water booster pumps for high-rise buildings and low-pressure properties in Johannesburg. Installation by a PIRB-registered plumber. Call +27 81 440 5778.",
        "h1": "Water booster pumps in Johannesburg",
        "lead": "Municipal water pressure often isn't enough for the upper floors of a building. A booster pump raises the pressure so every tap and shower works properly.",
        "img": "booster",
        "sections": [
            ("Signs you need a booster pump", "<ul class=\"check-list\"><li>Weak flow or no water on the upper floors</li><li>Showers that run hot and cold when someone else opens a tap</li><li>Heat pumps or appliances that need a minimum water pressure</li><li>Water storage tanks that need pumping into the building</li></ul>"),
            ("Booster pumps for high-rise buildings", "<p>We install booster pump systems in high-rise and multi-storey buildings, together with the valves and pipework that connect them to the building's supply. For new buildings, the booster system can be installed as part of the full <a href=\"/services/new-building-plumbing-installations/\">plumbing installation</a>.</p>"),
        ],
        "faqs": [
            ("Can a booster pump be added to an existing building?", "Yes. Booster pumps can be fitted to existing buildings and homes where the water pressure is too low."),
        ],
        "related": ["new-building-plumbing-installations", "plumbing-maintenance-repairs", "geyser-heat-pump-installation"],
    },
    {
        "slug": "metered-showers",
        "name": "Metered showers",
        "icon": "clock",
        "card": "Push-button metered showers for student accommodation and shared bathrooms, cutting water waste and taps left running.",
        "title": "Metered Showers for Student Accommodation | Zicco Plumbers Johannesburg",
        "desc": "Metered (timed push-button) showers for student accommodation and shared bathrooms in Johannesburg. Reduce water use and running costs. Call +27 81 440 5778.",
        "h1": "Metered showers for student accommodation",
        "lead": "Metered showers run for a set time at the push of a button, then switch off on their own. They are a simple way to cut water use in student residences and shared bathrooms.",
        "img": "shower",
        "sections": [
            ("Why metered showers", "<ul class=\"check-list\"><li>No showers left running in empty bathrooms</li><li>Lower water and hot water costs for the building</li><li>Robust valves designed for heavy daily use</li><li>Less hot water demand on geysers and heat pumps</li></ul>"),
            ("Student accommodation in Braamfontein and beyond", "<p>Zicco Plumbers is based in Braamfontein, close to many student residences. We install metered showers in new and existing student accommodation, and can pair them with <a href=\"/services/geyser-heat-pump-installation/\">heat pumps</a> to reduce the cost of hot water further.</p>"),
        ],
        "faqs": [
            ("Can metered showers be fitted to existing bathrooms?", "Yes, in most cases. We can look at your existing showers and advise what's needed."),
        ],
        "related": ["geyser-heat-pump-installation", "new-building-plumbing-installations", "plumbing-maintenance-repairs"],
    },
    {
        "slug": "plumbing-coc-certificates",
        "name": "Plumbing COC certificates",
        "icon": "file",
        "card": "Our licensed plumber can sign plumbing COCs for drainage, rainwater, cold water and hot water work, including heat pumps.",
        "title": "Plumbing Certificate of Compliance (COC) Johannesburg | Zicco Plumbers",
        "desc": "Plumbing COC in Johannesburg from a PIRB-registered company with a licensed plumber (licence 8610/19). Geysers, new installations and more. Call +27 81 440 5778.",
        "h1": "Plumbing Certificates of Compliance (COC)",
        "lead": "A plumbing Certificate of Compliance confirms that plumbing work meets the required standards. Zicco Plumbers' licensed plumber can sign COCs for the work we do.",
        "img": "geyser",
        "sections": [
            ("When you need a plumbing COC", "<ul class=\"check-list\"><li>After a geyser is installed or replaced (insurers usually ask for one)</li><li>When a heat pump or other hot water system is installed</li><li>On completion of plumbing in a new building or renovation</li><li>When a buyer, bank or insurer asks for one</li></ul>"),
            ("What we can certify", "<p>Our plumber's PIRB licence covers these categories, so we can issue plumbing COCs for work in:</p>" + "<ul class=\"check-list\">" + "".join(f"<li>{c}</li>" for c in LICENSED_CATEGORIES) + f"<li>Specialisation: {LICENSED_SPECIALISATION}</li></ul>"),
            ("Registered and licensed", "<p>Zicco Plumbers is a <strong>PIRB-registered company, no. " + PIRB_NO + "</strong>, and our plumber holds <strong>licence " + LICENCE_NO + "</strong>. You can check PIRB registrations at <a href=\"https://www.pirb.co.za\" rel=\"noopener\">pirb.co.za</a>. Only licensed plumbers can issue a PIRB Certificate of Compliance.</p>"),
            ("Getting a COC", "<p>Tell us what the COC is for when you call or WhatsApp. If the existing plumbing needs work before it can be certified, we'll tell you what is required.</p>"),
        ],
        "faqs": [
            ("Who can issue a plumbing COC?", "A licensed plumber registered with the PIRB (Plumbing Industry Registration Board). Zicco Plumbers' licence number is " + LICENCE_NO + "."),
        ],
        "related": ["geyser-heat-pump-installation", "new-building-plumbing-installations", "plumbing-maintenance-repairs"],
    },
]

SERVICE_BY_SLUG = {s["slug"]: s for s in SERVICES}

AREAS = [
    {
        "slug": "braamfontein", "name": "Braamfontein",
        "intro": [
            "Zicco Plumbers is based in Braamfontein, at 33 Jorissen Street in the Geldenhuys Building. That makes us the local plumber for Braamfontein's offices, apartment blocks, shops and the many student residences around the universities.",
            "Much of our work here is in multi-storey buildings: drainage stacks, water supply, booster pumps for upper floors, and metered showers and heat pumps in student accommodation.",
        ],
        "focus": ["metered-showers", "plumbing-maintenance-repairs", "blocked-drains-drain-cleaning", "geyser-heat-pump-installation", "water-booster-pumps"],
    },
    {
        "slug": "johannesburg-cbd", "name": "Johannesburg CBD",
        "intro": [
            "The Johannesburg CBD is next door to our Braamfontein base. Its older high-rise buildings, many now converted into apartments, put heavy demands on drainage stacks, water supply and hot water systems.",
            "We repair and replace building plumbing, clear blocked stacks and sewer lines, install booster pumps so upper floors get proper pressure, and fit new plumbing in buildings being refurbished.",
        ],
        "focus": ["blocked-drains-drain-cleaning", "water-booster-pumps", "new-building-plumbing-installations", "high-pressure-water-jetting", "leak-detection"],
    },
    {
        "slug": "sandton", "name": "Sandton",
        "intro": [
            "Sandton combines office towers and apartment buildings with established residential suburbs. Zicco Plumbers works on both: plumbing installations in new and high-rise buildings, and repairs, geysers and drains in homes.",
            "In multi-storey buildings that often means booster pumps and drainage stacks. In homes, it's geyser replacements, heat pumps, leak detection and blocked drains.",
        ],
        "focus": ["geyser-heat-pump-installation", "leak-detection", "water-booster-pumps", "blocked-drains-drain-cleaning", "new-building-plumbing-installations"],
    },
    {
        "slug": "randburg", "name": "Randburg",
        "intro": [
            "Randburg has many older homes and established gardens. Mature trees are a common cause of blocked and broken outside drains, and older pipework is more likely to leak.",
            "Zicco Plumbers clears and jets blocked drains, uses drain cameras to find root damage and broken pipes, tracks down hidden leaks, and replaces and repairs geysers across Randburg.",
        ],
        "focus": ["blocked-drains-drain-cleaning", "drain-camera-inspection", "high-pressure-water-jetting", "leak-detection", "geyser-heat-pump-installation"],
    },
    {
        "slug": "fourways", "name": "Fourways",
        "intro": [
            "Fourways is full of estates, townhouse complexes and ongoing new development. We install plumbing on new builds, and look after existing homes and complexes.",
            "Common jobs include geysers and heat pumps, subsoil drainage for gardens, paving and retaining walls, and plumbing maintenance for complexes.",
        ],
        "focus": ["geyser-heat-pump-installation", "subsoil-drainage", "new-building-plumbing-installations", "plumbing-maintenance-repairs", "blocked-drains-drain-cleaning"],
    },
    {
        "slug": "midrand", "name": "Midrand",
        "intro": [
            "Midrand has grown fast, with new apartment complexes, offices and housing developments. Zicco Plumbers installs plumbing in new buildings and maintains it once they're occupied.",
            "We fit drainage and water supply on construction sites, booster pumps for multi-storey blocks, heat pumps and geysers, and subsoil drainage on new sites.",
        ],
        "focus": ["new-building-plumbing-installations", "water-booster-pumps", "geyser-heat-pump-installation", "subsoil-drainage", "leak-detection"],
    },
]

HOME_FAQS = [
    ("Are you a registered plumber?", "Yes. Zicco Plumbers is a PIRB-registered company (no. " + PIRB_NO + ") and our plumber is licensed (licence " + LICENCE_NO + "). You can check PIRB registration at pirb.co.za."),
    ("Can you issue a plumbing COC?", "Yes. Our licensed plumber can sign Certificates of Compliance, for example after a geyser is installed or replaced."),
    ("How do I get a quote?", "Fill in the quote form on this page, or send a WhatsApp message to " + PHONE_DISPLAY + " with a description of the job and a few photos. You can also call and ask for " + CONTACT_PERSON + "."),
    ("Which areas do you cover?", "We're based in Braamfontein and work across Johannesburg, including Sandton, Randburg, Fourways, Midrand and the Johannesburg CBD."),
    ("Do you work for contractors and building owners?", "Yes. We install plumbing on new construction sites and in high-rise buildings, and maintain plumbing for building owners, body corporates and student accommodation."),
    ("How much will my job cost?", "It depends on the job. Photos of the problem help us give you an accurate price. Send them on WhatsApp or attach one to the quote form."),
]

EXTRA_FAQS = [
    ("What should I do if my geyser bursts?", "Switch off the geyser at the electrical distribution board, close the cold water supply to the geyser (or the main water supply), and call or WhatsApp us on " + PHONE_DISPLAY + "."),
    ("How can I tell if I have a water leak?", "Close all taps, read your water meter, wait 30 minutes and read it again. If it has moved while nothing was using water, there's a leak. See our <a href=\"/services/leak-detection/\">leak detection</a> page."),
    ("Why do my drains keep blocking?", "Repeated blockages usually mean roots, a broken pipe, or a dip in the drain line. A <a href=\"/services/drain-camera-inspection/\">drain camera inspection</a> shows the cause."),
    ("What is the difference between a heat pump and a geyser?", "A geyser heats water with an electric element. A heat pump heats water using heat from the air and typically uses around a third of the electricity to do it. Most heat pumps work together with a geyser."),
    ("Do you work on student accommodation?", "Yes. We install metered showers, heat pumps and geysers, and maintain plumbing in student accommodation."),
]
