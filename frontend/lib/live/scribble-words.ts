/**
 * Scribble word packs: everyday Indian things that are quick to draw — one
 * object you can sketch in a few lines (samosa, auto rickshaw, diya, gullak),
 * nothing abstract, no abbreviations, no regional dishes few would know.
 * Every word is lowercase, 3–14 characters, letters with the odd space or
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
  samosa, chai, dosa, idli, vada pav, pav bhaji, biryani, jalebi, gulab jamun, rasgulla,
  ladoo, kulfi, lassi, pani puri, roti, paratha, naan, dal, rice, curd, ghee, butter,
  paneer, momos, noodles, maggi, pizza, burger, sandwich, french fries, popcorn,
  ice cream, chocolate, cake, cupcake, donut, cookie, biscuit, bread, toast, omelette,
  egg, milk, tea cup, coffee, cold drink, juice, coconut water, sugarcane, mango,
  banana, apple, orange, grapes, watermelon, papaya, pineapple, coconut, lemon, chilli,
  onion, tomato, potato, carrot, cabbage, cauliflower, brinjal, bhindi, peas, corn,
  bhutta, peanuts, garlic, pumpkin, cucumber, strawberry, cherry, pear, guava,
  pomegranate, lollipop, candy, honey, jam, cheese, pickle, papad, thali, plate, spoon,
  fork, bowl, glass, kettle, tawa, kadhai, cooker, belan, fridge, gas stove, lunch box,
  tiffin, water bottle, matka, kulhad, straw, fruit basket, kathi roll, pakora, chaat,
  poha, khichdi, sambar, chutney, kheer, halwa, barfi, modak, cotton candy, ice gola,
  sugar, salt, frying pan, milkshake, chapati, puri, kachori, dhokla, mushroom, jar,
  egg roll, chicken leg, fish, prawn, soup, salad, spaghetti
`)

const TRAVEL = words(`
  auto rickshaw, train, bus, car, taxi, bike, scooter, cycle, aeroplane, helicopter,
  ship, boat, rocket, truck, tractor, jeep, metro, bullock cart, helmet, suitcase,
  backpack, ticket, passport, map, compass, airport, railway track, platform, bus stop,
  petrol pump, traffic light, zebra crossing, bridge, tunnel, road, signboard,
  speed breaker, flat tyre, steering wheel, seat belt, parachute, air balloon, tent,
  campfire, sleeping bag, mountain, hill, snow, snowman, river, waterfall, lake, sea,
  beach, wave, sand castle, island, palm tree, sunset, sunrise, moon, star, rainbow,
  cloud, rain, umbrella, raincoat, desert, camel, cactus, forest, tree, tiger, elephant,
  lion, monkey, deer, peacock, zoo, fort, palace, temple, mosque, church, taj mahal,
  india gate, lighthouse, hotel, swimming pool, camera, sunglasses, cap, hat,
  binoculars, torch, anchor, fishing rod, crab, starfish, shell, surfboard,
  ferris wheel, roller coaster, slide, swing, see saw, luggage, trolley, globe, statue,
  fountain, bench, park, picnic basket, flag, canoe, paddle, life jacket, cable car,
  toy train, footpath, parking, toll gate, giraffe, zebra, kangaroo, penguin, dolphin,
  whale, shark, octopus, volcano, cave, windmill, pyramid, eiffel tower, ambulance,
  fire engine, police car, school bus, road roller, crane, jcb, rickshaw, horse cart
`)

const DESI = words(`
  diya, rangoli, rakhi, kite, pichkari, firecracker, sparkler, lantern, mehendi, bindi,
  bangles, saree, kurta, dhoti, turban, jhumka, payal, garland, marigold, lotus,
  cricket bat, cricket ball, stumps, carrom, ludo, chess, playing cards, marbles, lattu,
  gilli danda, yo yo, paper boat, paper plane, balloon, jhula, charpai, ceiling fan,
  cooler, bucket, mug, broom, hand pump, well, cow, buffalo, goat, dog, cat, crow,
  parrot, sparrow, pigeon, snake, mouse, lizard, mosquito, butterfly, bee, ant, spider,
  frog, tortoise, rabbit, horse, donkey, hen, duck, banyan tree, tulsi plant,
  flower pot, sunflower, rose, dhol, tabla, flute, guitar, harmonium, drum, mic, radio,
  television, remote, mobile phone, laptop, headphones, clock, alarm clock, watch,
  calendar, book, pencil, pen, eraser, school bag, blackboard, chalk, ruler, scissors,
  notebook, chappal, shoes, socks, comb, mirror, toothbrush, toothpaste, soap, towel,
  lock, key, door, window, ladder, candle, matchbox, iron, sewing machine, needle,
  button, ring, crown, temple bell, shankh, trishul, national flag, spectacles,
  walking stick, postbox, letter, newspaper, gift box, teddy bear, doll, toy car, robot,
  ghost, clown, circus tent, puppet, snowflake, sun, house, hut, tap, bulb, fan, sofa,
  bed, pillow, blanket, table, chair, almirah, photo frame
`)

// Money and shopping: things you can actually draw (no GST / KYC / NEFT)
// Money and shopping: things you can actually draw (no GST / KYC / NEFT)
const MONEY = words(`
  coin, rupee note, wallet, purse, piggy bank, gullak, atm, atm card, credit card,
  cheque, bank, locker, safe, gold coin, gold bar, diamond, necklace, treasure chest,
  money bag, calculator, receipt, bill, price tag, barcode, qr code, shop, shopkeeper,
  cash counter, shopping bag, shopping cart, basket, weighing scale, tea stall,
  fruit stall, sabzi cart, mall, gift card, envelope, lottery ticket, cash box, cashier,
  queue, token, coupon, tip jar, donation box, handshake, thumbs up, signature, stamp,
  sale board, discount, money plant, golden egg, jackpot, slot machine, dice,
  auction hammer, cash register, pos machine, phone pay, bank vault, security guard,
  cctv camera, lock box, briefcase, cheque book, passbook, money tree, crorepati,
  bag of coins, coin stack, note bundle, rich man, poor man, beggar bowl, chillar,
  dollar, gold ring, silver coin, bangle shop, jewellery box, toy shop, sweet shop,
  medical shop, kirana shop, petrol pump, ticket counter, ice cream cart
`)

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
