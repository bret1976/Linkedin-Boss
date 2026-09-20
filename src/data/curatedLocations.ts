export interface CuratedLocation {
  name: string;
  country: string;
  flag: string;
  imageUrl: string;
  info: string;
}

export const CURATED_LOCATIONS: CuratedLocation[] = [
  {
    name: "Eiffel Tower, Paris",
    country: "France",
    flag: "🇫🇷",
    imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&auto=format&fit=crop&q=80",
    info: "# Eiffel Tower, France 🇫🇷\nThe iron lady of Paris stands as a global beacon of romance, architectural audacity, and cultural artistry. Rising 330 meters above the Champ de Mars, this 1889 marvel offers sweeping panoramas across the Seine, golden twilight illuminations, and timeless Parisian charm."
  },
  {
    name: "Taj Mahal, India",
    country: "India",
    flag: "🇮🇳",
    imageUrl: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&auto=format&fit=crop&q=80",
    info: "# Taj Mahal, India 🇮🇳\nA monument of pure white marble commissioned by Mughal Emperor Shah Jahan in 1632, the Taj Mahal is an eternal testament to profound love and artistic perfection. Its pristine reflecting pool and intricate calligraphy create an unforgettable aura of transcendent serenity."
  },
  {
    name: "Statue of Liberty, New York",
    country: "United States",
    flag: "🇺🇸",
    imageUrl: "https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=800&auto=format&fit=crop&q=80",
    info: "# Statue of Liberty, United States 🇺🇸\nWelcoming travelers into New York Harbor since 1886, Lady Liberty stands as an enduring emblem of freedom and human possibility. The copper colossus against the Manhattan skyline captures the boundless energy of the world's most vibrant metropolis."
  },
  {
    name: "Great Wall of China",
    country: "China",
    flag: "🇨🇳",
    imageUrl: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80",
    info: "# Great Wall of China, China 🇨🇳\nSnaking over dramatic mountain ridges for thousands of miles, the Great Wall represents one of humanity's greatest architectural triumphs. Walking its ancient watchtowers at sunrise reveals breathtaking vistas and centuries of rich imperial history."
  },
  {
    name: "Machu Picchu, Peru",
    country: "Peru",
    flag: "🇵🇪",
    imageUrl: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&auto=format&fit=crop&q=80",
    info: "# Machu Picchu, Peru 🇵🇪\nPerched dramatically between Andean peaks and swirling mist, the 15th-century Inca citadel of Machu Picchu remains an awe-inspiring wonder. Its mortar-free dry stone walls and sacred solar alignments evoke profound reverence and mystery."
  },
  {
    name: "Colosseum, Rome",
    country: "Italy",
    flag: "🇮🇹",
    imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80",
    info: "# Colosseum, Italy 🇮🇹\nThe grand amphitheater of imperial Rome remains a thunderous symbol of classical antiquity. Stepping onto its sunlit travertine arches connects you to two millennia of gladiator legends, emperors, and the vibrant beating heart of Rome."
  },
  {
    name: "Pyramids of Giza, Egypt",
    country: "Egypt",
    flag: "🇪🇬",
    imageUrl: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&auto=format&fit=crop&q=80",
    info: "# Pyramids of Giza, Egypt 🇪🇬\nStanding tall across five millennia of human civilization, the Great Pyramids and the Sphinx defy time on the golden desert plateau of Giza. Their geometric precision and monumental majesty remain humanity's most timeless wonder."
  },
  {
    name: "Sydney Opera House",
    country: "Australia",
    flag: "🇦🇺",
    imageUrl: "https://images.unsplash.com/photo-1624138784614-87fd1b6528f8?w=800&auto=format&fit=crop&q=80",
    info: "# Sydney Opera House, Australia 🇦🇺\nWith its iconic sail-like roof glittering over the azure waters of Sydney Harbour, Jørn Utzon's masterpiece is a modern architectural icon. It pairs world-class performing arts with a relaxed Pacific coastal lifestyle."
  },
  {
    name: "Mount Fuji, Japan",
    country: "Japan",
    flag: "🇯🇵",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80",
    info: "# Mount Fuji, Japan 🇯🇵\nJapan's sacred, snow-capped volcano rises in harmonious symmetry above misty cedar forests and tranquil lakes. A celebrated muse for poets and woodblock artists, Fuji represents spiritual purity and sublime natural poise."
  },
  {
    name: "Santorini, Greece",
    country: "Greece",
    flag: "🇬🇷",
    imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&auto=format&fit=crop&q=80",
    info: "# Santorini, Greece 🇬🇷\nWhitewashed cliffside villas, cobalt-blue domes, and dramatic caldera cliffs define this Aegean gem. Sunsets in Oia turn the whitewashed labyrinth of alleys into an amber-lit dreamscape framed by volcanic seas."
  },
  {
    name: "Stonehenge, UK",
    country: "United Kingdom",
    flag: "🇬🇧",
    imageUrl: "https://images.unsplash.com/photo-1599833975787-5c143f373c30?w=800&auto=format&fit=crop&q=80",
    info: "# Stonehenge, United Kingdom 🇬🇧\nSet amidst the rolling green meadows of Wiltshire, this prehistoric circle of megalithic standing stones has stood for over 4,500 years. Its celestial alignments and mysterious origin continue to fascinate stargazers and explorers alike."
  },
  {
    name: "Petra, Jordan",
    country: "Jordan",
    flag: "🇯🇴",
    imageUrl: "https://images.unsplash.com/photo-1579606032834-d40f2511e053?w=800&auto=format&fit=crop&q=80",
    info: "# Petra, Jordan 🇯🇴\nCarved directly into vibrant rose-red sandstone cliffs by the Nabataean civilization over two thousand years ago, Petra emerges dramatically at the end of the winding Siq canyon. The Treasury and Monastery reveal a desert kingdom of extraordinary genius."
  },
  {
    name: "Burj Khalifa, Dubai",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80",
    info: "# Burj Khalifa, United Arab Emirates 🇦🇪\nPiercing the desert sky at 828 meters, the Burj Khalifa is the tallest structure ever conceived by humankind. Offering panoramic observation decks, dancing fountain displays, and ultra-futuristic luxury, it symbolizes modern architectural daring."
  },
  {
    name: "Niagara Falls, Canada",
    country: "Canada",
    flag: "🇨🇦",
    imageUrl: "https://images.unsplash.com/photo-1533094602577-199e35118234?w=800&auto=format&fit=crop&q=80",
    info: "# Niagara Falls, Canada 🇨🇦\nRoaring with millions of gallons of cascading water every minute, Horseshoe Falls delivers raw hydro power and shimmering rainbows. The misty spray and thundering vibration create an electrifying encounter with pure nature."
  },
  {
    name: "Mount Everest, Himalayas",
    country: "Nepal",
    flag: "🇳🇵",
    imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80",
    info: "# Mount Everest, Nepal 🇳🇵\nThe roof of the world reaches 8,849 meters into the jet stream, flanked by glaciated ridges and fluttering prayer flags. For mountaineers and spiritual travelers alike, the Himalayan sanctuary offers unmatched grandeur and transcendent perspective."
  },
  {
    name: "Golden Gate Bridge, San Francisco",
    country: "United States",
    flag: "🇺🇸",
    imageUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&auto=format&fit=crop&q=80",
    info: "# Golden Gate Bridge, United States 🇺🇸\nSpanning the misty entrance to San Francisco Bay with its vibrant International Orange towers, the Golden Gate is a masterclass in Art Deco engineering. Watching Pacific fog roll beneath its suspension cables is an indelible coastal experience."
  },
  {
    name: "Acropolis of Athens",
    country: "Greece",
    flag: "🇬🇷",
    imageUrl: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&auto=format&fit=crop&q=80",
    info: "# Acropolis of Athens, Greece 🇬🇷\nCrowning the Athenian skyline, the Parthenon and its Doric columns represent the birthplace of democracy, philosophy, and classical Western architecture. Illuminated under starry Mediterranean skies, its grandeur remains eternal."
  },
  {
    name: "Angkor Wat, Cambodia",
    country: "Cambodia",
    flag: "🇰🇭",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
    info: "# Angkor Wat, Cambodia 🇰🇭\nThe world's largest religious monument combines lotus-bud towers, intricate sandstone bas-reliefs, and serene reflection pools wrapped in jungle banyan roots. Sunrise over Angkor Wat reveals the spiritual soul of the Khmer Empire."
  },
  {
    name: "Sagrada Familia, Barcelona",
    country: "Spain",
    flag: "🇪🇸",
    imageUrl: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&auto=format&fit=crop&q=80",
    info: "# Sagrada Familia, Spain 🇪🇸\nAntoni Gaudí’s organic masterpiece blends nature-inspired stone vaults with kaleidoscope stained glass windows that bathe the nave in rainbow light. An ongoing monument to architectural genius and spiritual imagination."
  },
  {
    name: "Venice Canals, Italy",
    country: "Italy",
    flag: "🇮🇹",
    imageUrl: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=800&auto=format&fit=crop&q=80",
    info: "# Venice Canals, Italy 🇮🇹\nGliding down the Grand Canal in a traditional wooden gondola past Gothic palaces and marble footbridges feels like stepping inside an oil painting. The floating city blends historical intrigue, quiet alleys, and luminous lagoon vistas."
  },
  {
    name: "Victoria Falls, Zambia",
    country: "Zambia",
    flag: "🇿🇲",
    imageUrl: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&auto=format&fit=crop&q=80",
    info: "# Victoria Falls, Zambia 🇿🇲\nKnown locally as 'Mosi-oa-Tunya' (The Smoke that Thunders), this colossal curtain of falling water spans over a mile across the Zambezi River. Its rainbow-filled plumes of spray nurture a lush surrounding rainforest."
  },
  {
    name: "Galapagos Islands",
    country: "Ecuador",
    flag: "🇪🇨",
    imageUrl: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80",
    info: "# Galapagos Islands, Ecuador 🇪🇨\nA volcanic archipelago in the eastern Pacific where giant tortoises, marine iguanas, and blue-footed boobies thrive without fear of humans. This living laboratory of evolution offers unparalleled marine wildlife encounters."
  },
  {
    name: "Easter Island statues",
    country: "Chile",
    flag: "🇨🇱",
    imageUrl: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&auto=format&fit=crop&q=80",
    info: "# Easter Island (Rapa Nui), Chile 🇨🇱\nRising mysteriously from the volcanic turf of Rapa Nui, nearly 900 monumental stone Moai statues gaze inward across the remote Pacific ocean. Their chiseled profiles honor ancient Polynesian ancestors and ancestral heritage."
  },
  {
    name: "Chichen Itza, Mexico",
    country: "Mexico",
    flag: "🇲🇽",
    imageUrl: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&auto=format&fit=crop&q=80",
    info: "# Chichen Itza, Mexico 🇲🇽\nThe stepped pyramid of El Castillo displays the brilliant astronomical prowess of the Maya civilization. During the equinoxes, the setting sun casts shadows resembling a serpent slithering down its sacred balustrade."
  },
  {
    name: "Yellowstone Grand Prismatic Spring",
    country: "United States",
    flag: "🇺🇸",
    imageUrl: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?w=800&auto=format&fit=crop&q=80",
    info: "# Grand Prismatic Spring, United States 🇺🇸\nThe largest hot spring in the United States radiates surreal rings of brilliant orange, gold, and sapphire caused by heat-loving microbial mats. Its steaming turquoise center evokes an alien planetary landscape."
  },
  {
    name: "Aurora Borealis in Iceland",
    country: "Iceland",
    flag: "🇮🇸",
    imageUrl: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&auto=format&fit=crop&q=80",
    info: "# Aurora Borealis, Iceland 🇮🇸\nEmerald green, violet, and silver ribbons of celestial light dance across the dark Arctic sky above glaciers and black volcanic beaches. Witnessing the Northern Lights is one of Earth's most enchanting natural wonders."
  },
  {
    name: "Serengeti National Park, Tanzania",
    country: "Tanzania",
    flag: "🇹🇿",
    imageUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&auto=format&fit=crop&q=80",
    info: "# Serengeti National Park, Tanzania 🇹🇿\nThe endless golden savannah of East Africa hosts the Great Migration of millions of wildebeest, zebras, and apex predators. Acacia-dotted horizons and untamed wildlife create an unforgettable safari odyssey."
  },
  {
    name: "Banff National Park, Canada",
    country: "Canada",
    flag: "🇨🇦",
    imageUrl: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800&auto=format&fit=crop&q=80",
    info: "# Banff National Park, Canada 🇨🇦\nNestled deep within the Canadian Rockies, Lake Louise and Moraine Lake shimmer with glacial turquoise water beneath towering snow-capped peaks. Pristine alpine forests and crisp mountain air captivate every nature lover."
  },
  {
    name: "Salar de Uyuni, Bolivia",
    country: "Bolivia",
    flag: "🇧🇴",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80",
    info: "# Salar de Uyuni, Bolivia 🇧🇴\nThe world's largest salt flat transforms during the wet season into an infinite mirror reflecting the blue Andean sky and clouds. The absence of horizon creates surreal optical illusions and breathtaking stargazing."
  },
  {
    name: "Bora Bora overwater bungalows",
    country: "French Polynesia",
    flag: "🇵🇫",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
    info: "# Bora Bora, French Polynesia 🇵🇫\nRinged by coral reefs and lagoon waters spanning every hue of turquoise, Mount Otemanu rises proudly over iconic thatched overwater villas. The ultimate luxury tropical paradise for pure romance and tranquility."
  },
  {
    name: "Maldives beaches",
    country: "Maldives",
    flag: "🇲🇻",
    imageUrl: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&auto=format&fit=crop&q=80",
    info: "# Maldives Beaches, Maldives 🇲🇻\nPowder-soft white sand islands surrounded by crystal-clear Indian Ocean waters and thriving coral atolls. From swimming with manta rays to lounging on private sandbars, the Maldives is the epitome of serene coastal luxury."
  },
  {
    name: "Christ the Redeemer, Brazil",
    country: "Brazil",
    flag: "🇧🇷",
    imageUrl: "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=800&auto=format&fit=crop&q=80",
    info: "# Christ the Redeemer, Brazil 🇧🇷\nWith open arms atop the 710-meter summit of Corcovado Mountain, this monumental Art Deco statue watches over Rio de Janeiro, Sugarloaf Mountain, and Copacabana beach in warm welcoming embrace."
  },
  {
    name: "Table Mountain, South Africa",
    country: "South Africa",
    flag: "🇿🇦",
    imageUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&auto=format&fit=crop&q=80",
    info: "# Table Mountain, South Africa 🇿🇦\nThe flat-topped sandstone sentinel overlooking Cape Town is frequently draped in a billowy white cloud 'tablecloth'. Offering rare fynbos floral kingdoms and sweeping views where two oceans meet."
  },
  {
    name: "Neuschwanstein Castle, Germany",
    country: "Germany",
    flag: "🇩🇪",
    imageUrl: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&auto=format&fit=crop&q=80",
    info: "# Neuschwanstein Castle, Germany 🇩🇪\nPerched atop a rugged cliff in the Bavarian Alps, King Ludwig II’s 19th-century Romanesque Revival retreat inspired fairy-tale castles around the globe. Its dramatic spires and Alpine forest backdrop evoke pure wonder."
  },
  {
    name: "St. Basil's Cathedral, Moscow",
    country: "Russia",
    flag: "🇷🇺",
    imageUrl: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&auto=format&fit=crop&q=80",
    info: "# St. Basil's Cathedral, Russia 🇷🇺\nDominating Red Square with its swirl of brightly colored, patterned onion domes, this 16th-century architectural marvel looks like a confection of fire and fairytale geometry."
  },
  {
    name: "Forbidden City, Beijing",
    country: "China",
    flag: "🇨🇳",
    imageUrl: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80",
    info: "# Forbidden City, China 🇨🇳\nThe imperial palace complex of the Ming and Qing dynasties spans nearly 1,000 buildings featuring golden-glazed roof tiles, crimson gates, and centuries of celestial ceremonies and royal legacy."
  },
  {
    name: "Halong Bay, Vietnam",
    country: "Vietnam",
    flag: "🇻🇳",
    imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80",
    info: "# Halong Bay, Vietnam 🇻🇳\nThousands of towering limestone karsts and jungle-topped islets rise dramatically out of the emerald waters of the Gulf of Tonkin. Cruising aboard a traditional junk boat reveals hidden sea grottos and floating fishing villages."
  },
  {
    name: "Times Square, New York at night",
    country: "United States",
    flag: "🇺🇸",
    imageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&auto=format&fit=crop&q=80",
    info: "# Times Square, United States 🇺🇸\nThe crossroads of the world pulses with neon billboards, Broadway marquee lights, yellow cabs, and electric urban energy. An unforgettable kinetic sensory spectacle at the core of Manhattan."
  },
  {
    name: "Grand Canyon, Arizona",
    country: "United States",
    flag: "🇺🇸",
    imageUrl: "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=800&auto=format&fit=crop&q=80",
    info: "# Grand Canyon, United States 🇺🇸\nCarved by the Colorado River across billions of years, the mile-deep canyon showcases glowing red strata, labyrinthine gorges, and sunset shadows that stretch into infinity."
  },
  {
    name: "Big Ben, London",
    country: "United Kingdom",
    flag: "🇬🇧",
    imageUrl: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=800&auto=format&fit=crop&q=80",
    info: "# Big Ben, United Kingdom 🇬🇧\nThe neo-Gothic Elizabeth Tower and its resonant bells rise proudly over the River Thames and the Houses of Parliament. An enduring symbol of British heritage, architectural nobility, and London style."
  },
  {
    name: "Louvre Museum pyramid, Paris",
    country: "France",
    flag: "🇫🇷",
    imageUrl: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&auto=format&fit=crop&q=80",
    info: "# Louvre Museum, France 🇫🇷\nI.M. Pei's luminous glass and metal pyramid contrasts daringly with the classical French Renaissance palace courtyards. Home to the Mona Lisa and millennia of human artistic genius."
  },
  {
    name: "Blue Lagoon, Iceland",
    country: "Iceland",
    flag: "🇮🇸",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80",
    info: "# Blue Lagoon, Iceland 🇮🇸\nSteaming, milky-blue geothermal waters rich in natural silica and minerals contrast against black volcanic lava fields. A soothing sanctuary where thermal heat warms the soul amidst sub-Arctic breezes."
  },
  {
    name: "Mount Kilimanjaro",
    country: "Tanzania",
    flag: "🇹🇿",
    imageUrl: "https://images.unsplash.com/photo-1589553416260-f586c8f1514f?w=800&auto=format&fit=crop&q=80",
    info: "# Mount Kilimanjaro, Tanzania 🇹🇿\nThe highest free-standing mountain in the world rises 5,895 meters above the African savannah. Its snow-crowned summit above the clouds is a crowning achievement for hikers and adventurers worldwide."
  },
  {
    name: "Cinque Terre, Italy",
    country: "Italy",
    flag: "🇮🇹",
    imageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&auto=format&fit=crop&q=80",
    info: "# Cinque Terre, Italy 🇮🇹\nFive pastel-hued fishing villages cling precariously to rugged Ligurian cliffs above the sparkling Mediterranean. Terraced vineyards, fresh pesto, and scenic coastal hiking paths evoke the dolce vita."
  },
  {
    name: "Lake Como, Italy",
    country: "Italy",
    flag: "🇮🇹",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
    info: "# Lake Como, Italy 🇮🇹\nFringed by the foothills of the Italian Alps, Lake Como is celebrated for aristocratic neoclassical villas, lush cypress gardens, and quiet ferry rides across shimmering sapphire waters."
  },
  {
    name: "The Alhambra, Spain",
    country: "Spain",
    flag: "🇪🇸",
    imageUrl: "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&auto=format&fit=crop&q=80",
    info: "# The Alhambra, Spain 🇪🇸\nSet against the snowy peaks of the Sierra Nevada in Granada, this Moorish palace complex features tranquil courtyards, trickling fountains, and arabesque plasterwork of breathtaking sophistication."
  },
  {
    name: "Cappadocia hot air balloons, Turkey",
    country: "Turkey",
    flag: "🇹🇷",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
    info: "# Cappadocia, Turkey 🇹🇷\nHundreds of colorful hot air balloons drift at dawn over honeycombed volcanic hills, ancient cave dwellings, and fairy chimneys. A sunrise flight across this golden Anatolian valley is pure magic."
  },
  {
    name: "Antelope Canyon, Arizona",
    country: "United States",
    flag: "🇺🇸",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80",
    info: "# Antelope Canyon, United States 🇺🇸\nCarved by flash floods into swirling red Navajo sandstone, this slot canyon creates ethereal sunbeams that illuminate wave-like walls in glowing shades of amber, violet, and gold."
  }
];
