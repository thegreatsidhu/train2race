import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const RACES = [
  { name: "Boston Marathon", slug: "boston-marathon-2026", city: "Boston", country: "USA", raceDate: new Date("2026-04-20"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Tokyo Marathon", slug: "tokyo-marathon-2027", city: "Tokyo", country: "Japan", raceDate: new Date("2027-03-07"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "London Marathon", slug: "london-marathon-2026", city: "London", country: "UK", raceDate: new Date("2026-04-26"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Berlin Marathon", slug: "berlin-marathon-2026", city: "Berlin", country: "Germany", raceDate: new Date("2026-09-27"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Chicago Marathon", slug: "chicago-marathon-2026", city: "Chicago", country: "USA", raceDate: new Date("2026-10-11"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "New York City Marathon", slug: "nyc-marathon-2026", city: "New York", country: "USA", raceDate: new Date("2026-11-01"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Sydney Marathon", slug: "sydney-marathon-2026", city: "Sydney", country: "Australia", raceDate: new Date("2026-09-20"), distanceM: 42195, series: "World Marathon Majors" },
  { name: "Los Angeles Marathon", slug: "la-marathon-2026", city: "Los Angeles", country: "USA", raceDate: new Date("2026-03-22"), distanceM: 42195, series: "Major US" },
  { name: "Marine Corps Marathon", slug: "marine-corps-2026", city: "Washington DC", country: "USA", raceDate: new Date("2026-10-25"), distanceM: 42195, series: "Major US" },
  { name: "Houston Marathon", slug: "houston-marathon-2027", city: "Houston", country: "USA", raceDate: new Date("2027-01-18"), distanceM: 42195, series: "Major US" },
  { name: "Miami Marathon", slug: "miami-marathon-2027", city: "Miami", country: "USA", raceDate: new Date("2027-02-01"), distanceM: 42195, series: "Major US" },
  { name: "Philadelphia Marathon", slug: "philadelphia-marathon-2026", city: "Philadelphia", country: "USA", raceDate: new Date("2026-11-22"), distanceM: 42195, series: "Major US" },
  { name: "San Francisco Marathon", slug: "sf-marathon-2026", city: "San Francisco", country: "USA", raceDate: new Date("2026-07-26"), distanceM: 42195, series: "Major US" },
  { name: "Paris Marathon", slug: "paris-marathon-2026", city: "Paris", country: "France", raceDate: new Date("2026-04-05"), distanceM: 42195, series: "International" },
  { name: "Amsterdam Marathon", slug: "amsterdam-marathon-2026", city: "Amsterdam", country: "Netherlands", raceDate: new Date("2026-10-18"), distanceM: 42195, series: "International" },
  { name: "Toronto Marathon", slug: "toronto-marathon-2026", city: "Toronto", country: "Canada", raceDate: new Date("2026-05-03"), distanceM: 42195, series: "International" },
  { name: "NYC Half Marathon", slug: "nyc-half-2026", city: "New York", country: "USA", raceDate: new Date("2026-03-15"), distanceM: 21097, series: "Major Half" },
  { name: "Brooklyn Half Marathon", slug: "brooklyn-half-2026", city: "Brooklyn", country: "USA", raceDate: new Date("2026-05-16"), distanceM: 21097, series: "Major Half" },
  { name: "Philadelphia Half Marathon", slug: "philly-half-2026", city: "Philadelphia", country: "USA", raceDate: new Date("2026-11-22"), distanceM: 21097, series: "Major Half" },
  { name: "Peachtree Road Race 10K", slug: "peachtree-10k-2026", city: "Atlanta", country: "USA", raceDate: new Date("2026-07-04"), distanceM: 10000, series: "Major 10K" },
  { name: "Bolder Boulder 10K", slug: "bolder-boulder-2026", city: "Boulder", country: "USA", raceDate: new Date("2026-05-25"), distanceM: 10000, series: "Major 10K" },
  { name: "Bay to Breakers 12K", slug: "bay-to-breakers-2026", city: "San Francisco", country: "USA", raceDate: new Date("2026-05-17"), distanceM: 12000, series: "Major Road Race" },
  { name: "Ironman World Championship", slug: "ironman-kona-2026", city: "Kailua-Kona", country: "USA", raceDate: new Date("2026-10-10"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Arizona", slug: "ironman-arizona-2026", city: "Tempe", country: "USA", raceDate: new Date("2026-11-22"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Florida", slug: "ironman-florida-2026", city: "Panama City Beach", country: "USA", raceDate: new Date("2026-11-07"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Texas", slug: "ironman-texas-2026", city: "The Woodlands", country: "USA", raceDate: new Date("2026-04-25"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Wisconsin", slug: "ironman-wisconsin-2026", city: "Madison", country: "USA", raceDate: new Date("2026-09-13"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman Lake Placid", slug: "ironman-lake-placid-2026", city: "Lake Placid", country: "USA", raceDate: new Date("2026-07-19"), distanceM: 226000, isTriathlon: true, series: "Ironman" },
  { name: "Ironman 70.3 World Championship", slug: "im703-world-2026", city: "Taupo", country: "New Zealand", raceDate: new Date("2026-12-05"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 St. George", slug: "im703-st-george-2026", city: "St. George", country: "USA", raceDate: new Date("2026-05-02"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Oceanside", slug: "im703-oceanside-2026", city: "Oceanside", country: "USA", raceDate: new Date("2026-04-04"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Ironman 70.3 Augusta", slug: "im703-augusta-2026", city: "Augusta", country: "USA", raceDate: new Date("2026-09-27"), distanceM: 113000, isTriathlon: true, series: "Ironman 70.3" },
  { name: "Chicago Triathlon", slug: "chicago-tri-2026", city: "Chicago", country: "USA", raceDate: new Date("2026-08-23"), distanceM: 51500, isTriathlon: true, series: "Olympic Tri" },
  { name: "NYC Triathlon", slug: "nyc-tri-2026", city: "New York", country: "USA", raceDate: new Date("2026-07-19"), distanceM: 51500, isTriathlon: true, series: "Olympic Tri" },
  { name: "Western States 100", slug: "western-states-2026", city: "Auburn", country: "USA", raceDate: new Date("2026-06-27"), distanceM: 160000, series: "Ultra" },
  { name: "UTMB", slug: "utmb-2026", city: "Chamonix", country: "France", raceDate: new Date("2026-08-28"), distanceM: 170000, series: "UTMB" },
  { name: "Comrades Marathon", slug: "comrades-2026", city: "Durban", country: "South Africa", raceDate: new Date("2026-06-14"), distanceM: 89000, series: "Ultra" },
];
async function main() {
  let n = 0;
  for (const r of RACES) {
    await prisma.majorRace.upsert({ where: { slug: r.slug }, update: { raceDate: r.raceDate }, create: { ...r, isTriathlon: r.isTriathlon || false } });
    n++;
  }
  console.log(`Seeded ${n} races`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
