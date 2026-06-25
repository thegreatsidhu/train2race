import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const RACES = [
  // World Marathon Majors 2026/2027
  { name: "Tokyo Marathon", slug: "tokyo-marathon-2027", city: "Tokyo", country: "Japan", raceDate: new Date("2027-03-07"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Boston Marathon", slug: "boston-marathon-2027", city: "Boston", country: "USA", raceDate: new Date("2027-04-19"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "London Marathon", slug: "london-marathon-2027", city: "London", country: "UK", raceDate: new Date("2027-04-25"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Berlin Marathon", slug: "berlin-marathon-2026", city: "Berlin", country: "Germany", raceDate: new Date("2026-09-27"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Chicago Marathon", slug: "chicago-marathon-2026", city: "Chicago", country: "USA", raceDate: new Date("2026-10-11"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "New York City Marathon", slug: "nyc-marathon-2026", city: "New York", country: "USA", raceDate: new Date("2026-11-01"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Sydney Marathon", slug: "sydney-marathon-2026", city: "Sydney", country: "Australia", raceDate: new Date("2026-09-20"), distanceM: 42195, series: "World Marathon Majors" },
  // Major US Marathons
  { name: "Los Angeles Marathon", slug: "la-marathon-2027", city: "Los Angeles", country: "USA", raceDate: new Date("2027-03-21"), distanceM: 42195, series: "Major US" },
  { name: "Marine Corps Marathon", slug: "marine-corps-2026", city: "Washington DC", country: "USA", raceDate: new Date("2026-10-25"), distanceM: 42195, series: "Major US" },
  { name: "Houston Marathon", slug: "houston-marathon-2027", city: "Houston", country: "USA", raceDate: new Date("2027-01-18"), distanceM: 42195, series: "Major US" },
  { name: "Miami Marathon", slug: "miami-marathon-2027", city: "Miami", country: "USA", raceDate: new Date("2027-02-07"), distanceM: 42195, series: "Major US" },
  { name: "Philadelphia Marathon", slug: "philadelphia-marathon-2026", city: "Philadelphia", country: "USA", raceDate: new Date("2026-11-22"), distanceM: 42195, series: "Major US" },
  { name: "San Francisco Marathon", slug: "sf-marathon-2026", city: "San Francisco", country: "USA", raceDate: new Date("2026-07-26"), distanceM: 42195, series: "Major US" },
  { name: "Twin Cities Marathon", slug: "twin-cities-2026", city: "Minneapolis", country: "USA", raceDate: new Date("2026-10-04"), distanceM: 42195, series: "Major US" },
  { name: "Portland Marathon", slug: "portland-marathon-2026", city: "Portland", country: "USA", raceDate: new Date("2026-10-04"), distanceM: 42195, series: "Major US" },
  { name: "Denver Marathon", slug: "denver-marathon-2026", city: "Denver", country: "USA", raceDate: new Date("2026-10-18"), distanceM: 42195, series: "Major US" },
  { name: "Nashville Marathon", slug: "nashville-marathon-2027", city: "Nashville", country: "USA", raceDate: new Date("2027-04-24"), distanceM: 42195, series: "Major US" },
  { name: "Austin Marathon", slug: "austin-marathon-2027", city: "Austin", country: "USA", raceDate: new Date("2027-02-14"), distanceM: 42195, series: "Major US" },
  { name: "Seattle Marathon", slug: "seattle-marathon-2026", city: "Seattle", country: "USA", raceDate: new Date("2026-11-29"), distanceM: 42195, series: "Major US" },
  { name: "San Diego Rock n Roll Marathon", slug: "sd-rnr-2026", city: "San Diego", country: "USA", raceDate: new Date("2026-06-07"), distanceM: 42195, series: "Rock n Roll" },
  { name: "Las Vegas Rock n Roll Marathon", slug: "vegas-rnr-2026", city: "Las Vegas", country: "USA", raceDate: new Date("2026-11-15"), distanceM: 42195, series: "Rock n Roll" },
  { name: "Walt Disney World Marathon", slug: "disney-marathon-2027", city: "Orlando", country: "USA", raceDate: new Date("2027-01-10"), distanceM: 42195, series: "runDisney" },
  { name: "Big Sur International Marathon", slug: "big-sur-2027", city: "Big Sur", country: "USA", raceDate: new Date("2027-04-25"), distanceM: 42195, series: "Major US" },
  { name: "Richmond Marathon", slug: "richmond-marathon-2026", city: "Richmond", country: "USA", raceDate: new Date("2026-11-14"), distanceM: 42195, series: "Major US" },
  { name: "Columbus Marathon", slug: "columbus-marathon-2026", city: "Columbus", country: "USA", raceDate: new Date("2026-10-18"), distanceM: 42195, series: "Major US" },
  { name: "Indianapolis Monumental Marathon", slug: "indy-marathon-2026", city: "Indianapolis", country: "USA", raceDate: new Date("2026-11-07"), distanceM: 42195, series: "Major US" },
  { name: "St George Marathon", slug: "st-george-marathon-2026", city: "St George", country: "USA", raceDate: new Date("2026-10-03"), distanceM: 42195, series: "Major US" },
  { name: "Grandmas Marathon", slug: "grandmas-marathon-2026", city: "Duluth", country: "USA", raceDate: new Date("2026-06-20"), distanceM: 42195, series: "Major US" },
  { name: "California International Marathon", slug: "cim-2026", city: "Sacramento", country: "USA", raceDate: new Date("2026-12-06"), distanceM: 42195, series: "Major US" },
  { name: "Honolulu Marathon", slug: "honolulu-marathon-2026", city: "Honolulu", country: "USA", raceDate: new Date("2026-12-13"), distanceM: 42195, series: "Major US" },
  { name: "New Orleans Marathon", slug: "new-orleans-marathon-2027", city: "New Orleans", country: "USA", raceDate: new Date("2027-03-07"), distanceM: 42195, series: "Major US" },
  { name: "Phoenix Marathon", slug: "phoenix-marathon-2027", city: "Phoenix", country: "USA", raceDate: new Date("2027-02-27"), distanceM: 42195, series: "Major US" },
  // International Marathons
  { name: "Paris Marathon", slug: "paris-marathon-2027", city: "Paris", country: "France", raceDate: new Date("2027-04-11"), distanceM: 42195, series: "International" },
  { name: "Amsterdam Marathon", slug: "amsterdam-marathon-2026", city: "Amsterdam", country: "Netherlands", raceDate: new Date("2026-10-18"), distanceM: 42195, series: "International" },
  { name: "Vienna Marathon", slug: "vienna-marathon-2027", city: "Vienna", country: "Austria", raceDate: new Date("2027-04-25"), distanceM: 42195, series: "International" },
  { name: "Toronto Marathon", slug: "toronto-marathon-2026", city: "Toronto", country: "Canada", raceDate: new Date("2026-10-18"), distanceM: 42195, series: "International" },
  { name: "Vancouver Marathon", slug: "vancouver-marathon-2027", city: "Vancouver", country: "Canada", raceDate: new Date("2027-05-02"), distanceM: 42195, series: "International" },
  { name: "Dublin Marathon", slug: "dublin-marathon-2026", city: "Dublin", country: "Ireland", raceDate: new Date("2026-10-25"), distanceM: 42195, series: "International" },
  { name: "Rome Marathon", slug: "rome-marathon-2027", city: "Rome", country: "Italy", raceDate: new Date("2027-03-21"), distanceM: 42195, series: "International" },
  { name: "Barcelona Marathon", slug: "barcelona-marathon-2027", city: "Barcelona", country: "Spain", raceDate: new Date("2027-03-14"), distanceM: 42195, series: "International" },
  { name: "Stockholm Marathon", slug: "stockholm-marathon-2027", city: "Stockholm", country: "Sweden", raceDate: new Date("2027-05-30"), distanceM: 42195, series: "International" },
  { name: "Cape Town Marathon", slug: "cape-town-marathon-2026", city: "Cape Town", country: "South Africa", raceDate: new Date("2026-09-20"), distanceM: 42195, series: "International" },
  { name: "Zurich Marathon", slug: "zurich-marathon-2027", city: "Zurich", country: "Switzerland", raceDate: new Date("2027-04-11"), distanceM: 42195, series: "International" },
  { name: "Prague Marathon", slug: "prague-marathon-2027", city: "Prague", country: "Czech Republic", raceDate: new Date("2027-05-09"), distanceM: 42195, series: "International" },
  // Half Marathons
  { name: "NYC Half Marathon", slug: "nyc-half-2027", city: "New York", country: "USA", raceDate: new Date("2027-03-21"), distanceM: 21097, series: "Major Half" },
  { name: "Brooklyn Half Marathon", slug: "brooklyn-half-2026", city: "Brooklyn", country: "USA", raceDate: new Date("2026-10-17"), distanceM: 21097, series: "Major Half" },
  { name: "Philadelphia Half Marathon", slug: "philly-half-2026", city: "Philadelphia", country: "USA", raceDate: new Date("2026-11-22"), distanceM: 21097, series: "Major Half" },
  { name: "Chicago Half Marathon", slug: "chicago-half-2026", city: "Chicago", country: "USA", raceDate: new Date("2026-09-27"), distanceM: 21097, series: "Major Half" },
  { name: "Disney Princess Half Marathon", slug: "disney-princess-half-2027", city: "Orlando", country: "USA", raceDate: new Date("2027-02-28"), distanceM: 21097, series: "runDisney" },
  { name: "Disney Wine and Dine Half", slug: "disney-wine-dine-half-2026", city: "Orlando", country: "USA", raceDate: new Date("2026-11-07"), distanceM: 21097, series: "runDisney" },
  // 10Ks
  { name: "Peachtree Road Race 10K", slug: "peachtree-10k-2027", city: "Atlanta", country: "USA", raceDate: new Date("2027-07-04"), distanceM: 10000, series: "Major 10K" },
  { name: "Bolder Boulder 10K", slug: "bolder-boulder-2027", city: "Boulder", country: "USA", raceDate: new Date("2027-05-31"), distanceM: 10000, series: "Major 10K" },
  { name: "Bay to Breakers 12K", slug: "bay-to-breakers-2027", city: "San Francisco", country: "USA", raceDate: new Date("2027-05-16"), distanceM: 12000, series: "Major Road Race" },
  // Ironman Full
  { name: "Ironman World Championship Kona", slug: "ironman-kona-2026", city: "Kailua-Kona", country: "USA", raceDate: new Date("2026-10-10"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman World Championship Nice", slug: "ironman-nice-2026", city: "Nice", country: "France", raceDate: new Date("2026-06-28"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Arizona", slug: "ironman-arizona-2026", city: "Tempe", country: "USA", raceDate: new Date("2026-11-22"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Florida", slug: "ironman-florida-2026", city: "Panama City Beach", country: "USA", raceDate: new Date("2026-11-07"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Texas", slug: "ironman-texas-2026", city: "The Woodlands", country: "USA", raceDate: new Date("2026-10-17"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Wisconsin", slug: "ironman-wisconsin-2026", city: "Madison", country: "USA", raceDate: new Date("2026-09-13"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Lake Placid", slug: "ironman-lake-placid-2026", city: "Lake Placid", country: "USA", raceDate: new Date("2026-07-19"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Coeur dAlene", slug: "ironman-cda-2026", city: "Coeur dAlene", country: "USA", raceDate: new Date("2026-08-23"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Canada", slug: "ironman-canada-2026", city: "Penticton", country: "Canada", raceDate: new Date("2026-08-30"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Maryland", slug: "ironman-maryland-2026", city: "Cambridge", country: "USA", raceDate: new Date("2026-09-20"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Louisville", slug: "ironman-louisville-2026", city: "Louisville", country: "USA", raceDate: new Date("2026-10-04"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Mont Tremblant", slug: "ironman-mont-tremblant-2026", city: "Mont Tremblant", country: "Canada", raceDate: new Date("2026-08-23"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Chattanooga", slug: "ironman-chattanooga-2026", city: "Chattanooga", country: "USA", raceDate: new Date("2026-09-27"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Frankfurt", slug: "ironman-frankfurt-2026", city: "Frankfurt", country: "Germany", raceDate: new Date("2026-06-28"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Switzerland", slug: "ironman-switzerland-2026", city: "Zurich", country: "Switzerland", raceDate: new Date("2026-07-05"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Austria", slug: "ironman-austria-2026", city: "Klagenfurt", country: "Austria", raceDate: new Date("2026-06-28"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman New Zealand", slug: "ironman-nz-2027", city: "Taupo", country: "New Zealand", raceDate: new Date("2027-03-06"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Australia", slug: "ironman-australia-2027", city: "Port Macquarie", country: "Australia", raceDate: new Date("2027-05-02"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman South Africa", slug: "ironman-sa-2027", city: "Port Elizabeth", country: "South Africa", raceDate: new Date("2027-03-28"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  // Ironman 70.3
  { name: "Ironman 70.3 World Championship", slug: "im703-world-2026", city: "Taupo", country: "New Zealand", raceDate: new Date("2026-12-05"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 St George", slug: "im703-st-george-2026", city: "St George", country: "USA", raceDate: new Date("2026-08-01"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Oceanside", slug: "im703-oceanside-2027", city: "Oceanside", country: "USA", raceDate: new Date("2027-04-03"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Augusta", slug: "im703-augusta-2026", city: "Augusta", country: "USA", raceDate: new Date("2026-09-27"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 New Orleans", slug: "im703-new-orleans-2027", city: "New Orleans", country: "USA", raceDate: new Date("2027-04-18"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Chattanooga", slug: "im703-chattanooga-2026", city: "Chattanooga", country: "USA", raceDate: new Date("2026-09-20"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Boulder", slug: "im703-boulder-2026", city: "Boulder", country: "USA", raceDate: new Date("2026-08-09"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Santa Cruz", slug: "im703-santa-cruz-2026", city: "Santa Cruz", country: "USA", raceDate: new Date("2026-09-13"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Eagleman", slug: "im703-eagleman-2026", city: "Cambridge", country: "USA", raceDate: new Date("2026-06-07"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Steelhead", slug: "im703-steelhead-2026", city: "Benton Harbor", country: "USA", raceDate: new Date("2026-07-12"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Lake Stevens", slug: "im703-lake-stevens-2026", city: "Lake Stevens", country: "USA", raceDate: new Date("2026-08-02"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Musselman", slug: "im703-musselman-2026", city: "Geneva", country: "USA", raceDate: new Date("2026-07-12"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Ohio", slug: "im703-ohio-2026", city: "Cambridge", country: "USA", raceDate: new Date("2026-07-26"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Texas", slug: "im703-texas-2027", city: "Galveston", country: "USA", raceDate: new Date("2027-04-04"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Mont Tremblant", slug: "im703-mont-tremblant-2026", city: "Mont Tremblant", country: "Canada", raceDate: new Date("2026-08-09"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Banff", slug: "im703-banff-2026", city: "Banff", country: "Canada", raceDate: new Date("2026-08-30"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 UK", slug: "im703-uk-2026", city: "Weymouth", country: "UK", raceDate: new Date("2026-09-20"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Ireland", slug: "im703-ireland-2026", city: "Dun Laoghaire", country: "Ireland", raceDate: new Date("2026-08-23"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Barcelona", slug: "im703-barcelona-2026", city: "Barcelona", country: "Spain", raceDate: new Date("2026-10-04"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Nice", slug: "im703-nice-2026", city: "Nice", country: "France", raceDate: new Date("2026-06-21"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Cascais", slug: "im703-cascais-2026", city: "Cascais", country: "Portugal", raceDate: new Date("2026-09-06"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Dubai", slug: "im703-dubai-2027", city: "Dubai", country: "UAE", raceDate: new Date("2027-02-06"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Melbourne", slug: "im703-melbourne-2027", city: "Melbourne", country: "Australia", raceDate: new Date("2027-03-28"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  // Olympic Triathlons
  { name: "Chicago Triathlon", slug: "chicago-tri-2026", city: "Chicago", country: "USA", raceDate: new Date("2026-08-23"), distanceM: 51500, isTriathlon: true, series: "Olympic Tri" },
  { name: "NYC Triathlon", slug: "nyc-tri-2026", city: "New York", country: "USA", raceDate: new Date("2026-07-19"), distanceM: 51500, isTriathlon: true, series: "Olympic Tri" },
  // Ultras
  { name: "Western States 100", slug: "western-states-2027", city: "Auburn", country: "USA", raceDate: new Date("2027-06-26"), distanceM: 160000, series: "Ultra" },
  { name: "UTMB", slug: "utmb-2026", city: "Chamonix", country: "France", raceDate: new Date("2026-08-28"), distanceM: 170000, series: "UTMB" },
  { name: "Comrades Marathon", slug: "comrades-2027", city: "Durban", country: "South Africa", raceDate: new Date("2027-06-13"), distanceM: 89000, series: "Ultra" },
  { name: "JFK 50 Mile", slug: "jfk-50-2026", city: "Boonsboro", country: "USA", raceDate: new Date("2026-11-21"), distanceM: 80000, series: "Ultra" },

  // ── 2027 additions ──────────────────────────────────────────────────────────

  // World Marathon Majors 2027
  { name: "Berlin Marathon", slug: "berlin-marathon-2027", city: "Berlin", country: "Germany", raceDate: new Date("2027-09-26"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Chicago Marathon", slug: "chicago-marathon-2027", city: "Chicago", country: "USA", raceDate: new Date("2027-10-10"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "New York City Marathon", slug: "nyc-marathon-2027", city: "New York", country: "USA", raceDate: new Date("2027-11-07"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Sydney Marathon", slug: "sydney-marathon-2027", city: "Sydney", country: "Australia", raceDate: new Date("2027-09-19"), distanceM: 42195, series: "World Marathon Majors" },

  // Major US Marathons 2027
  { name: "Marine Corps Marathon", slug: "marine-corps-2027", city: "Washington DC", country: "USA", raceDate: new Date("2027-10-24"), distanceM: 42195, series: "Major US" },
  { name: "Philadelphia Marathon", slug: "philadelphia-marathon-2027", city: "Philadelphia", country: "USA", raceDate: new Date("2027-11-21"), distanceM: 42195, series: "Major US" },
  { name: "San Francisco Marathon", slug: "sf-marathon-2027", city: "San Francisco", country: "USA", raceDate: new Date("2027-07-25"), distanceM: 42195, series: "Major US" },
  { name: "Twin Cities Marathon", slug: "twin-cities-2027", city: "Minneapolis", country: "USA", raceDate: new Date("2027-10-03"), distanceM: 42195, series: "Major US" },
  { name: "Portland Marathon", slug: "portland-marathon-2027", city: "Portland", country: "USA", raceDate: new Date("2027-10-17"), distanceM: 42195, series: "Major US" },
  { name: "Denver Marathon", slug: "denver-marathon-2027", city: "Denver", country: "USA", raceDate: new Date("2027-10-17"), distanceM: 42195, series: "Major US" },
  { name: "Seattle Marathon", slug: "seattle-marathon-2027", city: "Seattle", country: "USA", raceDate: new Date("2027-11-28"), distanceM: 42195, series: "Major US" },
  { name: "San Diego Rock n Roll Marathon", slug: "sd-rnr-2027", city: "San Diego", country: "USA", raceDate: new Date("2027-06-06"), distanceM: 42195, series: "Rock n Roll" },
  { name: "Las Vegas Rock n Roll Marathon", slug: "vegas-rnr-2027", city: "Las Vegas", country: "USA", raceDate: new Date("2027-11-14"), distanceM: 42195, series: "Rock n Roll" },
  { name: "Richmond Marathon", slug: "richmond-marathon-2027", city: "Richmond", country: "USA", raceDate: new Date("2027-11-14"), distanceM: 42195, series: "Major US" },
  { name: "Columbus Marathon", slug: "columbus-marathon-2027", city: "Columbus", country: "USA", raceDate: new Date("2027-10-17"), distanceM: 42195, series: "Major US" },
  { name: "Indianapolis Monumental Marathon", slug: "indy-marathon-2027", city: "Indianapolis", country: "USA", raceDate: new Date("2027-11-06"), distanceM: 42195, series: "Major US" },
  { name: "St George Marathon", slug: "st-george-marathon-2027", city: "St George", country: "USA", raceDate: new Date("2027-10-02"), distanceM: 42195, series: "Major US" },
  { name: "Grandmas Marathon", slug: "grandmas-marathon-2027", city: "Duluth", country: "USA", raceDate: new Date("2027-06-19"), distanceM: 42195, series: "Major US" },
  { name: "California International Marathon", slug: "cim-2027", city: "Sacramento", country: "USA", raceDate: new Date("2027-12-05"), distanceM: 42195, series: "Major US" },
  { name: "Honolulu Marathon", slug: "honolulu-marathon-2027", city: "Honolulu", country: "USA", raceDate: new Date("2027-12-12"), distanceM: 42195, series: "Major US" },
  { name: "Pittsburgh Marathon", slug: "pittsburgh-marathon-2027", city: "Pittsburgh", country: "USA", raceDate: new Date("2027-05-02"), distanceM: 42195, series: "Major US" },
  { name: "Gold Coast Marathon", slug: "gold-coast-marathon-2027", city: "Gold Coast", country: "Australia", raceDate: new Date("2027-07-04"), distanceM: 42195, series: "International" },

  // International Marathons 2027
  { name: "Amsterdam Marathon", slug: "amsterdam-marathon-2027", city: "Amsterdam", country: "Netherlands", raceDate: new Date("2027-10-17"), distanceM: 42195, series: "International" },
  { name: "Toronto Waterfront Marathon", slug: "toronto-marathon-2027", city: "Toronto", country: "Canada", raceDate: new Date("2027-10-17"), distanceM: 42195, series: "International" },
  { name: "Dublin Marathon", slug: "dublin-marathon-2027", city: "Dublin", country: "Ireland", raceDate: new Date("2027-10-25"), distanceM: 42195, series: "International" },
  { name: "Cape Town Marathon", slug: "cape-town-marathon-2027", city: "Cape Town", country: "South Africa", raceDate: new Date("2027-09-19"), distanceM: 42195, series: "International" },
  { name: "Hamburg Marathon", slug: "hamburg-marathon-2027", city: "Hamburg", country: "Germany", raceDate: new Date("2027-04-25"), distanceM: 42195, series: "International" },
  { name: "Rotterdam Marathon", slug: "rotterdam-marathon-2027", city: "Rotterdam", country: "Netherlands", raceDate: new Date("2027-04-11"), distanceM: 42195, series: "International" },
  { name: "Athens Classic Marathon", slug: "athens-marathon-2027", city: "Athens", country: "Greece", raceDate: new Date("2027-11-14"), distanceM: 42195, series: "International" },

  // Half Marathons 2027
  { name: "Brooklyn Half Marathon", slug: "brooklyn-half-2027", city: "Brooklyn", country: "USA", raceDate: new Date("2027-05-16"), distanceM: 21097, series: "Major Half" },
  { name: "Philadelphia Half Marathon", slug: "philly-half-2027", city: "Philadelphia", country: "USA", raceDate: new Date("2027-11-21"), distanceM: 21097, series: "Major Half" },
  { name: "Chicago Half Marathon", slug: "chicago-half-2027", city: "Chicago", country: "USA", raceDate: new Date("2027-09-26"), distanceM: 21097, series: "Major Half" },
  { name: "Disney Wine and Dine Half", slug: "disney-wine-dine-half-2027", city: "Orlando", country: "USA", raceDate: new Date("2027-11-06"), distanceM: 21097, series: "runDisney" },
  { name: "Great North Run", slug: "great-north-run-2027", city: "Newcastle", country: "UK", raceDate: new Date("2027-09-12"), distanceM: 21097, series: "International" },
  { name: "Lisbon Half Marathon", slug: "lisbon-half-2027", city: "Lisbon", country: "Portugal", raceDate: new Date("2027-03-21"), distanceM: 21097, series: "International" },

  // Ironman Full 2027
  { name: "Ironman World Championship Kona", slug: "ironman-kona-2027", city: "Kailua-Kona", country: "USA", raceDate: new Date("2027-10-09"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman World Championship Nice", slug: "ironman-nice-2027", city: "Nice", country: "France", raceDate: new Date("2027-06-27"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Arizona", slug: "ironman-arizona-2027", city: "Tempe", country: "USA", raceDate: new Date("2027-11-21"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Florida", slug: "ironman-florida-2027", city: "Panama City Beach", country: "USA", raceDate: new Date("2027-11-06"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Texas", slug: "ironman-texas-2027", city: "The Woodlands", country: "USA", raceDate: new Date("2027-10-17"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Wisconsin", slug: "ironman-wisconsin-2027", city: "Madison", country: "USA", raceDate: new Date("2027-09-12"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Lake Placid", slug: "ironman-lake-placid-2027", city: "Lake Placid", country: "USA", raceDate: new Date("2027-07-18"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Coeur dAlene", slug: "ironman-cda-2027", city: "Coeur dAlene", country: "USA", raceDate: new Date("2027-08-22"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Canada", slug: "ironman-canada-2027", city: "Penticton", country: "Canada", raceDate: new Date("2027-08-29"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Maryland", slug: "ironman-maryland-2027", city: "Cambridge", country: "USA", raceDate: new Date("2027-09-18"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Louisville", slug: "ironman-louisville-2027", city: "Louisville", country: "USA", raceDate: new Date("2027-10-03"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Mont Tremblant", slug: "ironman-mont-tremblant-2027", city: "Mont Tremblant", country: "Canada", raceDate: new Date("2027-08-15"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Chattanooga", slug: "ironman-chattanooga-2027", city: "Chattanooga", country: "USA", raceDate: new Date("2027-09-26"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Frankfurt", slug: "ironman-frankfurt-2027", city: "Frankfurt", country: "Germany", raceDate: new Date("2027-06-27"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Switzerland", slug: "ironman-switzerland-2027", city: "Zurich", country: "Switzerland", raceDate: new Date("2027-07-04"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Austria", slug: "ironman-austria-2027", city: "Klagenfurt", country: "Austria", raceDate: new Date("2027-06-27"), distanceM: 226000, isTriathlon: true, series: "Ironman" },

  // Ironman 70.3 2027
  { name: "Ironman 70.3 World Championship", slug: "im703-world-2027", city: "TBD", country: "TBD", raceDate: new Date("2027-11-13"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 St George", slug: "im703-st-george-2027", city: "St George", country: "USA", raceDate: new Date("2027-08-01"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Augusta", slug: "im703-augusta-2027", city: "Augusta", country: "USA", raceDate: new Date("2027-09-26"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Chattanooga", slug: "im703-chattanooga-2027", city: "Chattanooga", country: "USA", raceDate: new Date("2027-09-19"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Boulder", slug: "im703-boulder-2027", city: "Boulder", country: "USA", raceDate: new Date("2027-08-08"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Santa Cruz", slug: "im703-santa-cruz-2027", city: "Santa Cruz", country: "USA", raceDate: new Date("2027-09-12"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Eagleman", slug: "im703-eagleman-2027", city: "Cambridge", country: "USA", raceDate: new Date("2027-06-06"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Steelhead", slug: "im703-steelhead-2027", city: "Benton Harbor", country: "USA", raceDate: new Date("2027-07-11"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Lake Stevens", slug: "im703-lake-stevens-2027", city: "Lake Stevens", country: "USA", raceDate: new Date("2027-08-01"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Musselman", slug: "im703-musselman-2027", city: "Geneva", country: "USA", raceDate: new Date("2027-07-11"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Ohio", slug: "im703-ohio-2027", city: "Cambridge", country: "USA", raceDate: new Date("2027-07-25"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Mont Tremblant", slug: "im703-mont-tremblant-2027", city: "Mont Tremblant", country: "Canada", raceDate: new Date("2027-08-08"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Banff", slug: "im703-banff-2027", city: "Banff", country: "Canada", raceDate: new Date("2027-08-29"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 UK", slug: "im703-uk-2027", city: "Weymouth", country: "UK", raceDate: new Date("2027-09-19"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Ireland", slug: "im703-ireland-2027", city: "Dun Laoghaire", country: "Ireland", raceDate: new Date("2027-08-22"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Barcelona", slug: "im703-barcelona-2027", city: "Barcelona", country: "Spain", raceDate: new Date("2027-10-03"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Nice", slug: "im703-nice-2027", city: "Nice", country: "France", raceDate: new Date("2027-06-20"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Cascais", slug: "im703-cascais-2027", city: "Cascais", country: "Portugal", raceDate: new Date("2027-09-05"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },

  // Olympic Triathlons 2027
  { name: "Chicago Triathlon", slug: "chicago-tri-2027", city: "Chicago", country: "USA", raceDate: new Date("2027-08-22"), distanceM: 51500, isTriathlon: true, series: "Olympic Tri" },
  { name: "NYC Triathlon", slug: "nyc-tri-2027", city: "New York", country: "USA", raceDate: new Date("2027-07-18"), distanceM: 51500, isTriathlon: true, series: "Olympic Tri" },

  // Ultras 2027
  { name: "UTMB", slug: "utmb-2027", city: "Chamonix", country: "France", raceDate: new Date("2027-08-27"), distanceM: 170000, series: "UTMB" },
  { name: "JFK 50 Mile", slug: "jfk-50-2027", city: "Boonsboro", country: "USA", raceDate: new Date("2027-11-20"), distanceM: 80000, series: "Ultra" },

  // ── California Marathons ────────────────────────────────────────────────────

  // Already seeded: LA Marathon (2027), SF Marathon (2026+2027), SD RnR (2026+2027), Big Sur (2027), CIM (2026+2027)

  // Missing 2026 editions of already-seeded races
  { name: "Los Angeles Marathon", slug: "la-marathon-2026", city: "Los Angeles", country: "USA", raceDate: new Date("2026-03-22"), distanceM: 42195, series: "Major US" },
  { name: "Big Sur International Marathon", slug: "big-sur-2026", city: "Big Sur", country: "USA", raceDate: new Date("2026-04-26"), distanceM: 42195, series: "Major US" },

  // Surf City Marathon – Huntington Beach (Feb)
  { name: "Surf City Marathon", slug: "surf-city-marathon-2026", city: "Huntington Beach", country: "USA", raceDate: new Date("2026-02-01"), distanceM: 42195, series: "California Marathon" },
  { name: "Surf City Marathon", slug: "surf-city-marathon-2027", city: "Huntington Beach", country: "USA", raceDate: new Date("2027-02-07"), distanceM: 42195, series: "California Marathon" },

  // Pasadena Marathon (Feb)
  { name: "Pasadena Marathon", slug: "pasadena-marathon-2026", city: "Pasadena", country: "USA", raceDate: new Date("2026-02-15"), distanceM: 42195, series: "California Marathon" },
  { name: "Pasadena Marathon", slug: "pasadena-marathon-2027", city: "Pasadena", country: "USA", raceDate: new Date("2027-02-21"), distanceM: 42195, series: "California Marathon" },

  // Napa Valley Marathon (Mar)
  { name: "Napa Valley Marathon", slug: "napa-valley-marathon-2026", city: "Napa", country: "USA", raceDate: new Date("2026-03-01"), distanceM: 42195, series: "California Marathon" },
  { name: "Napa Valley Marathon", slug: "napa-valley-marathon-2027", city: "Napa", country: "USA", raceDate: new Date("2027-03-07"), distanceM: 42195, series: "California Marathon" },

  // Oakland Marathon (Mar)
  { name: "Oakland Marathon", slug: "oakland-marathon-2026", city: "Oakland", country: "USA", raceDate: new Date("2026-03-22"), distanceM: 42195, series: "California Marathon" },
  { name: "Oakland Marathon", slug: "oakland-marathon-2027", city: "Oakland", country: "USA", raceDate: new Date("2027-03-21"), distanceM: 42195, series: "California Marathon" },

  // Catalina Island Marathon (Mar)
  { name: "Catalina Island Marathon", slug: "catalina-marathon-2026", city: "Avalon", country: "USA", raceDate: new Date("2026-03-14"), distanceM: 42195, series: "California Marathon" },
  { name: "Catalina Island Marathon", slug: "catalina-marathon-2027", city: "Avalon", country: "USA", raceDate: new Date("2027-03-20"), distanceM: 42195, series: "California Marathon" },

  // Marin Marathon – San Rafael (Mar)
  { name: "Marin Marathon", slug: "marin-marathon-2026", city: "San Rafael", country: "USA", raceDate: new Date("2026-03-22"), distanceM: 42195, series: "California Marathon" },
  { name: "Marin Marathon", slug: "marin-marathon-2027", city: "San Rafael", country: "USA", raceDate: new Date("2027-03-21"), distanceM: 42195, series: "California Marathon" },

  // Modesto Marathon (Mar)
  { name: "Modesto Marathon", slug: "modesto-marathon-2026", city: "Modesto", country: "USA", raceDate: new Date("2026-03-29"), distanceM: 42195, series: "California Marathon" },
  { name: "Modesto Marathon", slug: "modesto-marathon-2027", city: "Modesto", country: "USA", raceDate: new Date("2027-03-28"), distanceM: 42195, series: "California Marathon" },

  // San Luis Obispo Marathon (Apr)
  { name: "San Luis Obispo Marathon", slug: "slo-marathon-2026", city: "San Luis Obispo", country: "USA", raceDate: new Date("2026-04-19"), distanceM: 42195, series: "California Marathon" },
  { name: "San Luis Obispo Marathon", slug: "slo-marathon-2027", city: "San Luis Obispo", country: "USA", raceDate: new Date("2027-04-18"), distanceM: 42195, series: "California Marathon" },

  // OC Marathon – Costa Mesa (May)
  { name: "OC Marathon", slug: "oc-marathon-2026", city: "Costa Mesa", country: "USA", raceDate: new Date("2026-05-03"), distanceM: 42195, series: "California Marathon" },
  { name: "OC Marathon", slug: "oc-marathon-2027", city: "Costa Mesa", country: "USA", raceDate: new Date("2027-05-02"), distanceM: 42195, series: "California Marathon" },

  // Avenue of the Giants Marathon – Humboldt Redwoods (May)
  { name: "Avenue of the Giants Marathon", slug: "avenue-giants-2026", city: "Humboldt Redwoods", country: "USA", raceDate: new Date("2026-05-03"), distanceM: 42195, series: "California Marathon" },
  { name: "Avenue of the Giants Marathon", slug: "avenue-giants-2027", city: "Humboldt Redwoods", country: "USA", raceDate: new Date("2027-05-02"), distanceM: 42195, series: "California Marathon" },

  // Mountains 2 Beach Marathon – Ventura (May)
  { name: "Mountains 2 Beach Marathon", slug: "m2b-marathon-2026", city: "Ventura", country: "USA", raceDate: new Date("2026-05-24"), distanceM: 42195, series: "California Marathon" },
  { name: "Mountains 2 Beach Marathon", slug: "m2b-marathon-2027", city: "Ventura", country: "USA", raceDate: new Date("2027-05-23"), distanceM: 42195, series: "California Marathon" },

  // Santa Rosa Marathon (Aug)
  { name: "Santa Rosa Marathon", slug: "santa-rosa-marathon-2026", city: "Santa Rosa", country: "USA", raceDate: new Date("2026-08-23"), distanceM: 42195, series: "California Marathon" },
  { name: "Santa Rosa Marathon", slug: "santa-rosa-marathon-2027", city: "Santa Rosa", country: "USA", raceDate: new Date("2027-08-22"), distanceM: 42195, series: "California Marathon" },

  // Ventura Marathon (Sep)
  { name: "Ventura Marathon", slug: "ventura-marathon-2026", city: "Ventura", country: "USA", raceDate: new Date("2026-09-06"), distanceM: 42195, series: "California Marathon" },
  { name: "Ventura Marathon", slug: "ventura-marathon-2027", city: "Ventura", country: "USA", raceDate: new Date("2027-09-05"), distanceM: 42195, series: "California Marathon" },

  // Lake Tahoe Marathon (Sep)
  { name: "Lake Tahoe Marathon", slug: "lake-tahoe-marathon-2026", city: "South Lake Tahoe", country: "USA", raceDate: new Date("2026-09-20"), distanceM: 42195, series: "California Marathon" },
  { name: "Lake Tahoe Marathon", slug: "lake-tahoe-marathon-2027", city: "South Lake Tahoe", country: "USA", raceDate: new Date("2027-09-19"), distanceM: 42195, series: "California Marathon" },

  // Long Beach Marathon (Oct)
  { name: "Long Beach Marathon", slug: "long-beach-marathon-2026", city: "Long Beach", country: "USA", raceDate: new Date("2026-10-11"), distanceM: 42195, series: "California Marathon" },
  { name: "Long Beach Marathon", slug: "long-beach-marathon-2027", city: "Long Beach", country: "USA", raceDate: new Date("2027-10-10"), distanceM: 42195, series: "California Marathon" },

  // Silicon Valley Marathon – San Jose (Oct)
  { name: "Silicon Valley Marathon", slug: "silicon-valley-marathon-2026", city: "San Jose", country: "USA", raceDate: new Date("2026-10-04"), distanceM: 42195, series: "California Marathon" },
  { name: "Silicon Valley Marathon", slug: "silicon-valley-marathon-2027", city: "San Jose", country: "USA", raceDate: new Date("2027-10-03"), distanceM: 42195, series: "California Marathon" },

  // Revel Canyon City Marathon – Azusa (Nov)
  { name: "Revel Canyon City Marathon", slug: "revel-canyon-city-2026", city: "Azusa", country: "USA", raceDate: new Date("2026-11-07"), distanceM: 42195, series: "Revel" },
  { name: "Revel Canyon City Marathon", slug: "revel-canyon-city-2027", city: "Azusa", country: "USA", raceDate: new Date("2027-11-06"), distanceM: 42195, series: "Revel" },

  // Santa Barbara Marathon (Nov)
  { name: "Santa Barbara Marathon", slug: "santa-barbara-marathon-2026", city: "Santa Barbara", country: "USA", raceDate: new Date("2026-11-08"), distanceM: 42195, series: "California Marathon" },
  { name: "Santa Barbara Marathon", slug: "santa-barbara-marathon-2027", city: "Santa Barbara", country: "USA", raceDate: new Date("2027-11-07"), distanceM: 42195, series: "California Marathon" },

  // ── California 5K / 10K ─────────────────────────────────────────────────────

  // 5Ks
  { name: "Carlsbad 5000", slug: "carlsbad-5000-2027", city: "Carlsbad", country: "USA", raceDate: new Date("2027-04-04"), distanceM: 5000, series: "Major 5K" },
  { name: "Carlsbad 5000", slug: "carlsbad-5000-2026", city: "Carlsbad", country: "USA", raceDate: new Date("2026-04-05"), distanceM: 5000, series: "Major 5K" },
  { name: "Disneyland 5K", slug: "disneyland-5k-2026", city: "Anaheim", country: "USA", raceDate: new Date("2026-08-28"), distanceM: 5000, series: "runDisney" },
  { name: "Disneyland 5K", slug: "disneyland-5k-2027", city: "Anaheim", country: "USA", raceDate: new Date("2027-08-27"), distanceM: 5000, series: "runDisney" },
  { name: "LA Big 5K", slug: "la-big-5k-2027", city: "Los Angeles", country: "USA", raceDate: new Date("2027-03-20"), distanceM: 5000, series: "Major 5K" },
  { name: "LA Big 5K", slug: "la-big-5k-2026", city: "Los Angeles", country: "USA", raceDate: new Date("2026-10-04"), distanceM: 5000, series: "Major 5K" },
  { name: "Santa Monica Classic 5K", slug: "santa-monica-classic-5k-2026", city: "Santa Monica", country: "USA", raceDate: new Date("2026-09-13"), distanceM: 5000, series: "Major 5K" },
  { name: "Santa Monica Classic 5K", slug: "santa-monica-classic-5k-2027", city: "Santa Monica", country: "USA", raceDate: new Date("2027-09-12"), distanceM: 5000, series: "Major 5K" },
  { name: "San Francisco 5K", slug: "sf-5k-2026", city: "San Francisco", country: "USA", raceDate: new Date("2026-07-26"), distanceM: 5000, series: "Major 5K" },
  { name: "San Francisco 5K", slug: "sf-5k-2027", city: "San Francisco", country: "USA", raceDate: new Date("2027-07-25"), distanceM: 5000, series: "Major 5K" },
  { name: "Kaiser Permanente SF Half 5K", slug: "kp-sf-5k-2027", city: "San Francisco", country: "USA", raceDate: new Date("2027-02-07"), distanceM: 5000, series: "Major 5K" },
  { name: "Surf City 5K", slug: "surf-city-5k-2027", city: "Huntington Beach", country: "USA", raceDate: new Date("2027-02-07"), distanceM: 5000, series: "Major 5K" },
  { name: "Surf City 5K", slug: "surf-city-5k-2026", city: "Huntington Beach", country: "USA", raceDate: new Date("2026-02-01"), distanceM: 5000, series: "Major 5K" },

  // 10Ks
  { name: "Santa Monica Classic 10K", slug: "santa-monica-classic-10k-2026", city: "Santa Monica", country: "USA", raceDate: new Date("2026-09-13"), distanceM: 10000, series: "Major 10K" },
  { name: "Santa Monica Classic 10K", slug: "santa-monica-classic-10k-2027", city: "Santa Monica", country: "USA", raceDate: new Date("2027-09-12"), distanceM: 10000, series: "Major 10K" },
  { name: "Disneyland 10K", slug: "disneyland-10k-2026", city: "Anaheim", country: "USA", raceDate: new Date("2026-08-29"), distanceM: 10000, series: "runDisney" },
  { name: "Disneyland 10K", slug: "disneyland-10k-2027", city: "Anaheim", country: "USA", raceDate: new Date("2027-08-28"), distanceM: 10000, series: "runDisney" },
  { name: "Napa to Sonoma 10K", slug: "napa-sonoma-10k-2026", city: "Napa", country: "USA", raceDate: new Date("2026-07-19"), distanceM: 10000, series: "Major 10K" },
  { name: "Napa to Sonoma 10K", slug: "napa-sonoma-10k-2027", city: "Napa", country: "USA", raceDate: new Date("2027-07-18"), distanceM: 10000, series: "Major 10K" },
  { name: "San Diego Rock n Roll 10K", slug: "sd-rnr-10k-2026", city: "San Diego", country: "USA", raceDate: new Date("2026-06-07"), distanceM: 10000, series: "Rock n Roll" },
  { name: "San Diego Rock n Roll 10K", slug: "sd-rnr-10k-2027", city: "San Diego", country: "USA", raceDate: new Date("2027-06-06"), distanceM: 10000, series: "Rock n Roll" },
  { name: "San Jose Rock n Roll 10K", slug: "sj-rnr-10k-2026", city: "San Jose", country: "USA", raceDate: new Date("2026-10-04"), distanceM: 10000, series: "Rock n Roll" },
  { name: "San Jose Rock n Roll 10K", slug: "sj-rnr-10k-2027", city: "San Jose", country: "USA", raceDate: new Date("2027-10-03"), distanceM: 10000, series: "Rock n Roll" },
  { name: "LA Big 10K", slug: "la-big-10k-2027", city: "Los Angeles", country: "USA", raceDate: new Date("2027-03-20"), distanceM: 10000, series: "Major 10K" },
  { name: "LA Big 10K", slug: "la-big-10k-2026", city: "Los Angeles", country: "USA", raceDate: new Date("2026-10-04"), distanceM: 10000, series: "Major 10K" },
  { name: "Golden Gate 10K", slug: "golden-gate-10k-2026", city: "San Francisco", country: "USA", raceDate: new Date("2026-10-18"), distanceM: 10000, series: "Major 10K" },
  { name: "Golden Gate 10K", slug: "golden-gate-10k-2027", city: "San Francisco", country: "USA", raceDate: new Date("2027-10-17"), distanceM: 10000, series: "Major 10K" },
  { name: "Surf City 10K", slug: "surf-city-10k-2027", city: "Huntington Beach", country: "USA", raceDate: new Date("2027-02-07"), distanceM: 10000, series: "Major 10K" },
  { name: "Surf City 10K", slug: "surf-city-10k-2026", city: "Huntington Beach", country: "USA", raceDate: new Date("2026-02-01"), distanceM: 10000, series: "Major 10K" },
];
async function main() {
  let n = 0;
  for (const r of RACES) {
    await prisma.majorRace.upsert({ where: { slug: r.slug }, update: { raceDate: r.raceDate, name: r.name }, create: { ...r, isTriathlon: r.isTriathlon||false, status: "active" } });
    n++;
  }
  console.log(`Seeded ${n} races`);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
