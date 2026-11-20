import { normalize } from "./scribble"

/**
 * Scribble word packs: things Indian players see every day, picked to be
 * drawable — one object or scene you can sketch in a few lines (samosa, auto
 * rickshaw, diya, rangoli, pressure cooker), not so easy that the first line
 * gives it away. No abstract words, no brand names, no abbreviations, no
 * regional dishes few would know, nothing that's a religious symbol to draw.
 * English spellings as Indians usually type them; other common spellings and
 * Hindi names are accepted as guesses (ALIASES below).
 *
 * Every word is lowercase, 3–16 characters, letters with the odd space or
 * hyphen (see the test). "mix" is every pack together.
 */

export type ScribblePack = "mix" | "food" | "travel" | "desi" | "money"

export const PACK_IDS: ScribblePack[] = [
  "mix",
  "food",
  "travel",
  "desi",
  "money",
]

export const isPack = (v: unknown): v is ScribblePack =>
  typeof v === "string" && (PACK_IDS as string[]).includes(v)

/** A comma-separated list → words, so the packs read like lists and stay compact. */
const words = (list: string) =>
  list
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean)

const FOOD = words(`
  samosa, chai, cutting chai, filter coffee, dosa, idli, vada pav, pav bhaji, biryani,
  jalebi, gulab jamun, rasgulla, rasmalai, ladoo, kaju katli, barfi, gajar halwa, kulfi,
  lassi, nimbu pani, pani puri, bhel puri, sev puri, dahi vada, roti, paratha, naan, puri,
  kachori, dhokla, pakora, chole bhature, rajma chawal, dal, rice, curd, ghee, butter,
  paneer, momos, noodles, pizza, burger, sandwich, hot dog, french fries, popcorn,
  ice cream, chocolate, birthday cake, cupcake, donut, cookie, biscuit, bread, toast,
  omelette, bread omelette, boiled egg, milk, tea cup, coffee mug, cold drink,
  coconut water, sugarcane, mango, banana, apple, orange, grapes, watermelon, papaya,
  pineapple, coconut, lemon, green chilli, onion, tomato, potato, carrot, cauliflower,
  brinjal, bhindi, peas, bhutta, peanuts, garlic, pumpkin, cucumber, strawberry, cherry,
  guava, pomegranate, jackfruit, lychee, lollipop, honey, cheese, pickle, papad, thali,
  banana leaf, spoon, fork, bowl, kettle, tawa, kadhai, pressure cooker, belan,
  mixer grinder, toaster, fridge, gas stove, gas cylinder, tiffin box, water bottle, matka,
  kulhad, straw, fruit basket, kathi roll, chaat, poha, upma, uttapam, khichdi, sambar,
  chutney, kheer, halwa, modak, chikki, cotton candy, ice gola, frying pan, milkshake,
  mushroom, egg roll, chicken leg, fish, prawn, soup, salad, tandoor, sweet box,
  salt shaker, kebab, rice sack, milk packet
`)

const TRAVEL = words(`
  auto rickshaw, cycle rickshaw, train, local train, steam engine, bus, double decker,
  taxi, car, bike, scooter, cycle, aeroplane, helicopter, ship, boat, houseboat,
  speedboat, yacht, submarine, rocket, truck, tractor, jeep, metro, bullock cart,
  horse cart, helmet, suitcase, backpack, ticket, passport, postcard, map, compass,
  airport, railway track, railway station, platform, bus stop, petrol pump,
  traffic light, traffic police, zebra crossing, bridge, tunnel, flyover, highway,
  milestone, signboard, speed breaker, flat tyre, steering wheel, seat belt, parachute,
  hot air balloon, tent, campfire, sleeping bag, mountain, snowman, igloo, river,
  waterfall, lake, beach, sand castle, island, palm tree, coconut tree, tea garden,
  sunset, rainbow, umbrella, raincoat, desert, camel, cactus, forest, tiger, elephant,
  lion, monkey, deer, peacock, rhino, crocodile, fort, palace, temple, taj mahal,
  india gate, qutub minar, charminar, red fort, gateway of india, hawa mahal,
  lighthouse, hotel, dhaba, swimming pool, camera, sunglasses, cap, binoculars, torch,
  anchor, fishing rod, crab, starfish, seashell, surfboard, giant wheel, roller coaster,
  slide, swing, see saw, trolley, globe, statue, fountain, bench, picnic basket, canoe,
  life jacket, cable car, toy train, toll gate, giraffe, zebra, kangaroo, penguin,
  dolphin, whale, shark, octopus, volcano, cave, windmill, pyramid, eiffel tower,
  ambulance, fire engine, police car, school bus, road roller, crane, bulldozer
`)

const DESI = words(`
  diya, rangoli, rakhi, kite, pichkari, holi colours, firecracker, sparkler, lantern,
  mehendi, bindi, bangles, saree, kurta, dhoti, lungi, dupatta, sherwani, turban, jhumka,
  payal, nose ring, garland, marigold, lotus, cricket bat, cricket ball, stumps, trophy,
  medal, hockey stick, shuttlecock, football, tug of war, carrom, ludo, chess,
  playing cards, marbles, lattu, gilli danda, yo yo, paper boat, paper plane, balloon,
  jhula, cradle, charpai, ceiling fan, table fan, cooler, bucket, mug, broom, hand pump,
  well, water tank, cow, buffalo, goat, dog, cat, crow, parrot, sparrow, pigeon, snake,
  lizard, mosquito, mosquito net, butterfly, honey bee, spider, frog, tortoise, rabbit,
  horse, donkey, hen, duck, banyan tree, mango tree, flower pot, sunflower, rose, dhol,
  tabla, flute, sitar, shehnai, guitar, harmonium, mic, radio, television, remote,
  mobile phone, laptop, headphones, selfie, alarm clock, wrist watch, calendar, book,
  pencil, pen, eraser, sharpener, school bag, blackboard, chalk, ruler, scissors,
  notebook, chappal, shoes, socks, comb, mirror, toothbrush, toothpaste, soap, towel,
  lock, key, door, window, ladder, candle, matchbox, iron, sewing machine, needle,
  button, ring, crown, temple bell, spectacles, walking stick, postbox, letter,
  newspaper, gift box, teddy bear, doll, toy car, robot, ghost, clown, circus tent,
  puppet, snake charmer, dandiya, moustache, beard, yoga, house, hut, tap, bulb,
  tube light, switchboard, sofa, bed, pillow, blanket, table, chair, almirah,
  photo frame, washing machine, satellite dish
`)

// Money and shopping: the bazaar and the bank, things you can actually draw (no GST / KYC / NEFT)
const MONEY = words(`
  coin, rupee note, rupee symbol, wallet, purse, piggy bank, atm card, atm machine,
  credit card, cheque, bank, locker, safe, gold coin, gold bar, gold chain, gold ring,
  silver coin, diamond, necklace, jewellery box, treasure chest, money bag, calculator,
  receipt, price tag, barcode, qr code, shop, shopkeeper, cash counter, cash register,
  card machine, shopping bag, shopping cart, basket, weighing scale, tea stall,
  fruit stall, sabzi cart, ice cream cart, balloon seller, mall, escalator, lift,
  vending machine, envelope, parcel, cardboard box, gift wrap, ribbon, delivery boy,
  cash box, donation box, handshake, thumbs up, stamp, money plant, money tree,
  golden egg, dice, auction hammer, bank vault, security guard, cctv camera, briefcase,
  passbook, coin stack, note bundle, toy shop, sweet shop, medical shop, kirana shop,
  bakery, barber shop, bangle stall, jewellery shop, shoe shop, flower shop, book shop,
  tailor, cobbler, ticket counter, mannequin, hanger
`)

/**
 * Other ways players write a word, all accepted as the right guess: other
 * spellings, the Hindi / Hinglish name, the everyday short form. Only for
 * words in the packs (see the test), and never a different thing — "bike"
 * isn't a scooter. Joined-up and spaced-out forms ("autorickshaw"), and a
 * plural "s" either way, are accepted without being listed (guessCandidates).
 */
const ALIASES: Record<string, string> = {
  // Food & chai
  samosa: "samosas",
  chai: "tea, cha, chaay, chay",
  "cutting chai": "cutting, cutting tea",
  "filter coffee": "kaapi, kapi",
  dosa: "dosai, dose, dhosa, masala dosa",
  idli: "idly, iddli",
  "vada pav": "wada pav, wada pao, vada pao",
  "pav bhaji": "pao bhaji, paav bhaji",
  biryani: "biriyani, biriani, briyani",
  jalebi: "jilebi, jilapi, jalabi",
  "gulab jamun": "gulab jamoon, gulabjamun",
  rasgulla: "rasagola, rasgola, rosogolla, rasagulla, roshogolla",
  ladoo: "laddu, laddoo, ladu, laadoo",
  "kaju katli": "kaju barfi, katli",
  barfi: "burfi",
  "gajar halwa": "gajar ka halwa, carrot halwa",
  "nimbu pani": "lemonade, shikanji, shikanjvi, lemon water",
  "pani puri":
    "golgappa, gol gappa, golgappe, puchka, phuchka, gupchup, paani puri",
  "bhel puri": "bhel, bhelpuri",
  "sev puri": "sevpuri",
  "dahi vada": "dahi bhalla, dahi bada",
  roti: "chapati, chapatti, phulka, rotli",
  paratha: "parantha, parotta, prantha",
  puri: "poori",
  kachori: "kachauri, kachodi",
  pakora: "pakoda, bhajji, bajji, bhaji, pakode",
  "chole bhature": "chole bhatura, chhole bhature",
  "rajma chawal": "rajma rice, rajma",
  dal: "daal, dhal",
  rice: "chawal",
  curd: "dahi, yogurt, yoghurt",
  momos: "momo",
  "french fries": "fries, finger chips, chips",
  "ice cream": "icecream",
  "birthday cake": "cake",
  donut: "doughnut",
  omelette: "omelet, omlet, amlet",
  "bread omelette": "bread omelet",
  "boiled egg": "egg, anda, ubla anda",
  milk: "doodh, dudh",
  "tea cup": "cup, teacup, cup of tea",
  "coffee mug": "coffee, coffee cup",
  "cold drink": "soft drink, soda",
  "coconut water": "nariyal pani, tender coconut, nariyal paani",
  sugarcane: "ganna, sugar cane",
  mango: "aam",
  banana: "kela",
  apple: "seb, saeb",
  orange: "santra, santara",
  grapes: "angoor, angur",
  watermelon: "tarbooz, tarbuj, tarbuz",
  papaya: "papita",
  pineapple: "ananas",
  coconut: "nariyal",
  lemon: "nimbu, lime",
  "green chilli": "chilli, chili, mirchi, hari mirchi, green chili",
  onion: "pyaz, pyaaz, kanda",
  tomato: "tamatar",
  potato: "aloo, alu",
  carrot: "gajar",
  cauliflower: "gobi, phool gobi, gobhi",
  brinjal: "baingan, eggplant, bengan",
  bhindi: "okra, ladyfinger, lady finger, ladies finger",
  peas: "matar, mutter",
  bhutta: "corn, butta, corn cob, makka, makki, bhutta corn",
  peanuts: "moongphali, mungfali, groundnut, groundnuts",
  garlic: "lehsun, lahsun",
  pumpkin: "kaddu",
  cucumber: "kheera, khira",
  guava: "amrood, amrud, peru",
  pomegranate: "anar, anaar",
  jackfruit: "kathal",
  lychee: "litchi, lichi",
  lollipop: "lolly",
  honey: "shahad, shahd",
  pickle: "achar, achaar",
  thali: "meal plate",
  "banana leaf": "kele ka patta",
  spoon: "chammach, chamach",
  kettle: "tea kettle",
  tawa: "tava",
  kadhai: "kadai, karahi, wok",
  "pressure cooker": "cooker, kukar",
  belan: "rolling pin",
  "mixer grinder": "mixer, mixie, grinder",
  fridge: "refrigerator",
  "gas stove": "stove, chulha",
  "gas cylinder": "cylinder, lpg cylinder",
  "tiffin box": "tiffin, lunch box, lunchbox, dabba",
  "water bottle": "bottle",
  matka: "ghada, clay pot, surahi",
  kulhad: "kullad, kulhar, clay cup",
  "fruit basket": "fruits",
  "kathi roll": "kati roll, roll, frankie",
  "cotton candy": "candy floss, buddhi ke baal, budhi ke baal",
  "ice gola": "gola, chuski, baraf gola, barf ka gola",
  "frying pan": "pan",
  "egg roll": "anda roll",
  "chicken leg": "drumstick, leg piece",
  fish: "machli, machhli",
  prawn: "jhinga, shrimp",
  kebab: "kabab, seekh kabab, kabob",
  "rice sack": "rice bag, bori, sack",
  "milk packet": "milk pouch",
  "salt shaker": "salt",
  // Travel
  "auto rickshaw": "auto, rickshaw, tuk tuk, tuktuk, autorikshaw",
  "cycle rickshaw": "rickshaw",
  train: "rail, railgadi, rail gadi",
  "local train": "local",
  "steam engine": "rail engine, engine",
  bike: "motorcycle, motorbike, motor cycle",
  scooter: "scooty",
  cycle: "bicycle, saikil, cycal",
  aeroplane: "airplane, plane, aeroplan, hawai jahaz, aircraft",
  helicopter: "chopper",
  ship: "jahaz, jahaj",
  boat: "naav, nav, nauka",
  houseboat: "house boat",
  truck: "lorry",
  metro: "metro train",
  "bullock cart": "bail gadi, bailgadi, bullock",
  "horse cart": "tonga, tanga, ghoda gadi",
  suitcase: "luggage",
  "railway track": "railway line, patri, train track",
  "railway station": "station",
  "petrol pump": "petrol bunk, gas station",
  "traffic light": "signal, traffic signal",
  "traffic police": "policeman, traffic cop",
  bridge: "pul",
  flyover: "overbridge",
  highway: "expressway",
  "speed breaker": "speed bump, bump",
  "flat tyre": "flat tire, puncture, tyre, tire",
  "steering wheel": "steering",
  "hot air balloon": "air balloon",
  campfire: "bonfire",
  mountain: "pahad, parvat, hill, hills",
  river: "nadi",
  waterfall: "jharna",
  lake: "talab, jheel",
  beach: "seashore, sea beach",
  "sand castle": "sandcastle",
  "coconut tree": "nariyal ka ped",
  "tea garden": "tea estate, tea plantation",
  sunset: "sunrise",
  rainbow: "indradhanush",
  umbrella: "chhata, chata, chhatri, chatri",
  desert: "registan, sand dunes",
  camel: "oont, unt, ount",
  tiger: "bagh, baagh",
  elephant: "hathi, haathi",
  lion: "sher, sheer",
  monkey: "bandar",
  deer: "hiran",
  peacock: "mor, peafowl",
  rhino: "rhinoceros, gainda",
  crocodile: "magarmach, alligator",
  fort: "qila, kila, killa",
  palace: "mahal",
  temple: "mandir",
  "taj mahal": "tajmahal, taj",
  "qutub minar": "qutb minar, kutub minar, qutab minar",
  charminar: "char minar",
  "red fort": "lal qila, lal kila",
  "gateway of india": "gateway",
  "swimming pool": "pool",
  sunglasses: "goggles, shades",
  torch: "flashlight",
  seashell: "shell, sea shell",
  "giant wheel": "ferris wheel",
  swing: "jhula",
  "see saw": "seesaw",
  bench: "park bench",
  "fire engine": "fire truck, fire brigade",
  "road roller": "roller",
  bulldozer: "jcb, excavator, digger",
  // Desi life
  diya: "dia, deepak, diya lamp, deeya, oil lamp",
  rangoli: "kolam, alpana",
  kite: "patang, patangi, guddi",
  pichkari: "water gun, pichkaari",
  "holi colours": "holi colors, holi, gulal, rang, abir",
  firecracker: "cracker, crackers, patakha, pataka, patakhe, diwali crackers",
  sparkler: "phuljhadi, phooljhadi, fuljhadi, phuljari",
  lantern: "kandil, akash kandil, lalten, lantren",
  mehendi: "mehndi, henna, mehandi",
  bangles: "chudi, choodi, churi, chudiyan, bangle",
  saree: "sari, sadi",
  turban: "pagdi, pagri, safa, paag",
  jhumka: "jhumki, earrings, earring",
  payal: "anklet, pajeb",
  dupatta: "chunni, chunri, odhni",
  "nose ring": "nath, nathni",
  garland: "mala, haar, varmala, jaimala",
  marigold: "genda, gainda, genda phool",
  lotus: "kamal",
  "cricket bat": "bat",
  "cricket ball": "ball, leather ball",
  stumps: "wicket, wickets",
  trophy: "cup",
  shuttlecock: "shuttle, birdie, badminton",
  carrom: "carrom board, caram, karam",
  ludo: "ludo board",
  chess: "chess board, shatranj",
  "playing cards": "cards, taash, tash, patte",
  marbles: "kanche, kancha, goli, golis, kanchey",
  lattu: "top, spinning top, lattoo",
  "gilli danda": "gulli danda",
  "paper boat": "kagaz ki naav",
  "paper plane": "paper aeroplane, paper airplane",
  balloon: "gubbara, guubara",
  jhula: "swing",
  cradle: "palna, paalna",
  charpai: "khat, khatiya, charpoy, cot",
  "ceiling fan": "fan, pankha",
  "table fan": "pedestal fan",
  cooler: "air cooler, desert cooler",
  bucket: "balti",
  broom: "jhadu, jharu, jhaadu",
  "hand pump": "handpump, nalka, chapakal",
  well: "kuan, kuaan, kua",
  "water tank": "tanki, paani ki tanki",
  cow: "gai, gaay, gaai",
  buffalo: "bhains, bhens",
  goat: "bakri, bakra",
  dog: "kutta, doggy, puppy",
  cat: "billi, kitten",
  crow: "kauwa, kaua, kowa",
  parrot: "tota, totaa",
  sparrow: "chidiya, chiriya, gauraiya",
  pigeon: "kabootar, kabutar",
  snake: "saanp, sanp, saap, cobra",
  lizard: "chipkali, chhipkali",
  mosquito: "machhar, macchar, machar",
  "mosquito net": "machhardani, macchardani",
  butterfly: "titli",
  "honey bee": "bee, madhumakhi",
  spider: "makdi, makri",
  frog: "mendak, medak, maindak",
  tortoise: "turtle, kachua, kachhua",
  rabbit: "khargosh, bunny",
  horse: "ghoda, ghora",
  donkey: "gadha, gadhaa",
  hen: "murgi, murga, rooster, chicken",
  duck: "batakh, bathak",
  "banyan tree": "banyan, bargad",
  "mango tree": "aam ka ped",
  "flower pot": "gamla, plant pot",
  sunflower: "surajmukhi",
  rose: "gulab",
  dhol: "drum, dholak",
  flute: "bansuri, basuri, bansi",
  harmonium: "baaja, peti",
  mic: "microphone, mike",
  television: "tv, t v",
  remote: "remote control",
  "mobile phone": "mobile, phone, smartphone, cell phone, cellphone",
  headphones: "headphone, earphones",
  "alarm clock": "clock, alarm",
  "wrist watch": "watch, ghadi, wristwatch",
  book: "kitab, kitaab",
  eraser: "rubber",
  "school bag": "bag, bastaa, basta",
  blackboard: "chalkboard",
  ruler: "scale",
  scissors: "kainchi, kenchi, scissor",
  notebook: "copy, kopi",
  chappal: "slippers, slipper, flip flops, hawai chappal",
  shoes: "joote, joota, shoe",
  comb: "kanghi, kangi",
  mirror: "sheesha, shisha, aaina",
  soap: "sabun, saabun",
  towel: "tauliya, toliya",
  lock: "tala, taala",
  key: "chabi, chaabi",
  door: "darwaza, darvaja",
  window: "khidki, khirki",
  ladder: "seedhi, sidhi",
  candle: "mombatti, mom batti",
  matchbox: "maachis, machis, match box",
  iron: "istri, press, istree",
  "sewing machine": "silai machine",
  needle: "sui, suee",
  ring: "anguthi, angoothi",
  crown: "mukut, taj",
  "temple bell": "bell, ghanti, ghanta",
  spectacles: "glasses, specs, chashma, chasma, chashmah",
  "walking stick": "lathi, chhadi",
  postbox: "letter box, post box",
  letter: "chitthi, chithi",
  newspaper: "akhbaar, akhbar",
  "gift box": "gift, present",
  "teddy bear": "teddy",
  doll: "gudiya",
  ghost: "bhoot, bhut",
  clown: "joker, jokar",
  "circus tent": "circus",
  puppet: "kathputli, kathputhli",
  "snake charmer": "sapera, saperaa, been",
  dandiya: "dandiya sticks, garba",
  moustache: "mustache, mooch, moonch, muchh",
  beard: "dadhi, daadhi",
  yoga: "yoga pose",
  house: "ghar, home",
  hut: "jhopdi, jhopadi, jhonpdi",
  tap: "nal, nalka",
  bulb: "light bulb, lightbulb",
  "tube light": "tubelight",
  pillow: "takiya",
  blanket: "kambal, razai, rajai",
  bed: "palang",
  table: "mez, mej",
  chair: "kursi",
  almirah: "almari, alamari, cupboard, wardrobe",
  "washing machine": "washer",
  "satellite dish": "dish antenna, dish tv, dish",
  // Money & shopping
  coin: "sikka, coins",
  "rupee note": "note, currency note, currency, rupees, paisa",
  "rupee symbol": "rupee sign",
  wallet: "batua",
  "piggy bank": "gullak, golak",
  "atm card": "debit card",
  "atm machine": "atm",
  safe: "tijori",
  necklace: "haar",
  "treasure chest": "treasure, khazana, khajana",
  "money bag": "paisa bag",
  receipt: "bill",
  shop: "dukaan, dukan, store",
  shopkeeper: "dukandar, dukaandaar",
  "cash counter": "billing counter",
  "card machine": "swipe machine, pos machine",
  "shopping bag": "carry bag, grocery bag",
  "shopping cart": "shopping trolley",
  basket: "tokri, tokari",
  "weighing scale": "tarazu, taraju, weighing machine",
  "tea stall": "chai stall, tapri, chai tapri, chai shop",
  "sabzi cart": "thela, thelagadi, vegetable cart, pushcart",
  mall: "shopping mall",
  lift: "elevator",
  envelope: "lifafa",
  parcel: "package, courier",
  "cardboard box": "carton, box",
  "delivery boy": "delivery man, delivery guy",
  "donation box": "daan patra",
  stamp: "rubber stamp, mohar",
  "auction hammer": "gavel",
  "security guard": "watchman, chowkidar, guard",
  "cctv camera": "cctv, security camera",
  "medical shop": "chemist, chemist shop, pharmacy",
  "kirana shop": "kirana, kirana store, general store",
  "sweet shop": "mithai shop, mithai",
  "barber shop": "barber, salon, nai",
  tailor: "darzi, darji",
  cobbler: "mochi",
  mannequin: "dummy",
  hanger: "cloth hanger",
}

const PACKS: Record<Exclude<ScribblePack, "mix">, string[]> = {
  food: FOOD,
  travel: TRAVEL,
  desi: DESI,
  money: MONEY,
}

/** The words of a pack; "mix" is every pack together, each word once. */
export function wordsOf(pack: ScribblePack): string[] {
  if (pack !== "mix") return PACKS[pack]
  return Array.from(new Set([...FOOD, ...TRAVEL, ...DESI, ...MONEY]))
}

export const WORD_PACKS: Record<ScribblePack, string[]> = {
  mix: wordsOf("mix"),
  food: FOOD,
  travel: TRAVEL,
  desi: DESI,
  money: MONEY,
}

/* ── Guess matching ──────────────────────────────────────────────────── */

/** For matching only: no spaces or hyphens ("auto rickshaw" = "autorickshaw"). */
const squash = (s: string) => normalize(s).replace(/ /g, "")

/** The listed other spellings of a word (not the word itself). */
export const aliasesOf = (word: string): string[] =>
  ALIASES[word] ? words(ALIASES[word]) : []

/** The word and every listed way of writing it — for "close!" nudges on any of them. */
export const spellingsOf = (word: string): string[] => [
  word,
  ...aliasesOf(word),
]

let INDEX: Map<string, string[]> | null = null
/** Squashed spelling → the pack words it stands for. */
function index() {
  if (INDEX) return INDEX
  const map = new Map<string, string[]>()
  const add = (spelling: string, word: string) => {
    const k = squash(spelling)
    if (!k) return
    const list = map.get(k) ?? []
    if (!list.includes(word)) list.push(word)
    map.set(k, list)
  }
  for (const w of wordsOf("mix")) {
    add(w, w)
    for (const a of aliasesOf(w)) add(a, w)
  }
  INDEX = map
  return map
}

/**
 * Everything a guess could mean, to check against the word's hash: the guess
 * as typed, plus any pack word it's another spelling of — joined up or spaced
 * out, an alias, or with a plural "s" / "es" added or dropped. The guesser
 * never learns the word; their device just hashes a few more candidates.
 */
export function guessCandidates(guess: string): string[] {
  const g = normalize(guess)
  if (!g) return []
  const k = g.replace(/ /g, "")
  const keys = [k, `${k}s`, `${k}es`]
  if (k.endsWith("s")) keys.push(k.slice(0, -1))
  if (k.endsWith("es")) keys.push(k.slice(0, -2))
  const out = [g]
  for (const key of keys)
    for (const w of index().get(key) ?? []) if (!out.includes(w)) out.push(w)
  return out.slice(0, 8)
}

/* ── Picking ─────────────────────────────────────────────────────────── */

/** A uniform random integer in [0, n). Call from handlers / effects, never while rendering. */
export function randomInt(n: number): number {
  if (n <= 1) return 0
  const buf = new Uint32Array(1)
  // Rejection sampling keeps the pick uniform
  const limit = Math.floor(0x100000000 / n) * n
  do crypto.getRandomValues(buf)
  while (buf[0] >= limit)
  return buf[0] % n
}

/**
 * `n` different words from the pack for the drawer to choose from, avoiding
 * the ones in `exclude` (already drawn this game) while the pack allows.
 */
export function pickChoices(
  pack: ScribblePack,
  n: number,
  exclude: readonly string[] = []
): string[] {
  const skip = new Set(exclude)
  let pool = wordsOf(pack).filter((w) => !skip.has(w))
  if (pool.length < n) pool = wordsOf(pack)
  const out: string[] = []
  const left = pool.slice()
  while (out.length < n && left.length > 0) {
    const i = randomInt(left.length)
    out.push(left[i])
    left[i] = left[left.length - 1]
    left.pop()
  }
  return out
}
