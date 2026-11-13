/**
 * Scribble word packs: everyday Indian life, in words you can draw. Every
 * word is lowercase, 3–14 characters, letters with the odd space or hyphen
 * (see the test). "mix" is every pack together.
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
  samosa, masala chai, pani puri, dosa, idli, vada pav, pav bhaji, biryani, butter naan,
  paneer tikka, dal makhani, rajma chawal, chole bhature, jalebi, gulab jamun, rasgulla,
  ladoo, barfi, kheer, gajar halwa, kulfi, lassi, nimbu pani, jaljeera, filter coffee,
  cutting chai, bhel puri, sev puri, dahi puri, aloo tikki, kachori, dhokla, khandvi,
  thepla, poha, upma, uttapam, sambar, rasam, chutney, pickle, papad, raita, paratha,
  roti, chapati, puri, kulcha, tandoori roti, momos, chowmein, manchurian, fried rice,
  maggi, bread omelette, egg curry, chicken tikka, butter chicken, fish curry,
  prawn curry, mutton curry, seekh kebab, shawarma, pizza, burger, french fries,
  sandwich, hot dog, pasta, noodles, sushi, taco, popcorn, ice cream, chocolate, cake,
  cupcake, donut, cookie, pastry, brownie, pancake, waffle, honey, jam, butter, cheese,
  paneer, curd, ghee, milk, egg, bread, rice, dal, khichdi, bhindi, baingan, aloo gobi,
  palak paneer, kadhi, sarson saag, makki roti, litti chokha, misal pav, puran poli,
  shrikhand, modak, payasam, appam, puttu, fish fry, chaat, golgappa, rabri, falooda,
  badam milk, rooh afza, coconut water, mango, banana, apple, watermelon, guava, papaya,
  jackfruit, lychee, pomegranate, orange, grapes, pineapple, coconut, lemon, chilli,
  onion, tomato, potato, garlic, ginger, coriander, mint, cumin, turmeric, cardamom,
  clove, cinnamon, saffron, mustard oil, tea bag, sugar, salt, pepper, lunch box, dabba,
  thali, tawa, kadhai, belan, mixer grinder, fridge, stove, gas cylinder, kulhad,
  water bottle, biscuit, rusk, bun maska, keema pav, frankie, kathi roll, dabeli,
  medu vada, bonda, bajji, pakora, bhajiya, spring roll, chilli potato, paneer roll,
  egg roll, cold coffee, milkshake, soda, jeera soda, thandai, aam panna, sol kadhi,
  shikanji, mango pickle, carrot, radish, cabbage, cauliflower, capsicum, peas, corn,
  bhutta, peanuts, chana, chikki, gajak, til ladoo, petha, soan papdi, kaju katli,
  mysore pak, rasmalai, sandesh, malpua, imarti, balushahi, ghevar, phirni, sheer khurma,
  haleem, nihari, korma, rogan josh, dum aloo, pulao, jeera rice, curd rice, lemon rice,
  bisi bele bath, pongal, avial, parotta, fish moilee, omelette, boiled egg, toast,
  cornflakes, oats, porridge, dal chawal, roti sabzi, ghee roast
`)

const TRAVEL = words(`
  auto rickshaw, local train, passport, suitcase, backpack, boarding pass, airport,
  aeroplane, pilot, runway, platform, ticket, window seat, sleeper coach, chai wala,
  metro, bus stop, red bus, taxi, ola cab, scooter, bike, helmet, petrol pump,
  toll plaza, highway, traffic jam, signal, zebra crossing, footpath, flyover, bridge,
  tunnel, map, compass, hotel, hostel, dharamshala, homestay, tent, campfire,
  sleeping bag, trekking, mountain, hill station, snow, glacier, valley, river,
  waterfall, lake, beach, sand castle, sunset, lighthouse, boat, ferry, cruise ship,
  houseboat, shikara, camel, desert, sand dune, fort, palace, temple, mosque, church,
  gurudwara, taj mahal, india gate, qutub minar, red fort, charminar, hawa mahal,
  golden temple, ghat, pilgrim, monk, monastery, tea garden, spice market, bazaar,
  street food, souvenir, postcard, selfie, camera, tripod, binoculars, sunglasses,
  sunscreen, umbrella, raincoat, flood, visa, immigration, luggage belt, trolley bag,
  duty free, currency, travel pillow, eye mask, earphones, power bank, charger, sim card,
  roaming, hotel key, room service, lift, escalator, lobby, swimming pool, resort,
  safari, jeep, elephant, tiger, deer, peacock, zoo, national park, picnic, road trip,
  pit stop, dhaba, parking, traffic police, chalaan, speed breaker, pothole, flat tyre,
  puncture, toll booth, bullock cart, tonga, cycle rickshaw, tram, ship, anchor, port,
  island, coral reef, scuba diving, snorkel, surfing, paragliding, bungee jump, zipline,
  rafting, kayak, cable car, ropeway, toy train, ticket checker, coolie, waiting room,
  ac coach, general coach, train horn, railway track, overbridge, level crossing, jungle,
  bonfire, hammock, luggage, trolley, conveyor belt, check in, take off, landing,
  turbulence, seat belt, air hostess, cockpit, parachute, air balloon, helicopter, yacht,
  submarine, canoe, raft, paddle, life jacket, swim ring, flip flops, sun hat,
  water park, theme park, roller coaster, ferris wheel, carousel, bumper car, aquarium,
  museum, art gallery, planetarium, rose garden, fountain, statue, monument, pillar,
  dome, minaret, stupa, cave, hampi, goa beach, backwaters, shimla, manali, leh ladakh,
  rishikesh, varanasi, jaipur, udaipur, kashmir, darjeeling, ooty, munnar, andaman,
  rann of kutch, konark, sundarbans, jim corbett, ranthambore, gir forest, mahabalipuram,
  khajuraho, ajanta caves, ellora caves, marine drive, juhu beach, howrah bridge,
  lotus temple, akshardham, mysore palace, houseboat ride
`)

const DESI = words(`
  cricket bat, diwali, rangoli, monsoon, holi, pichkari, gulal, diya, lantern,
  firecracker, sparkler, kite, manja, mehendi, bindi, bangles, saree, lehenga, kurta,
  dupatta, dhoti, lungi, pagdi, turban, jhumka, nose ring, payal, mangalsutra, sindoor,
  tilak, aarti, puja thali, temple bell, agarbatti, garland, marigold, lotus, peacock,
  tiger, elephant, cow, buffalo, goat, monkey, langur, crow, pigeon, parrot, mynah, koel,
  sparrow, street dog, cat, mongoose, snake charmer, cobra, banyan tree, neem tree,
  mango tree, coconut tree, tulsi plant, rickshaw, bullock cart, tractor, water tank,
  hand pump, well, bucket, mug, lota, matka, charpai, jhula, ceiling fan, cooler,
  mosquito net, mosquito coil, chappal, kolhapuri, mojari, dhol, tabla, harmonium, sitar,
  flute, shehnai, nagada, bhangra, garba, dandiya, kathak, bharatanatyam, bollywood,
  item song, hero, villain, cricket, gully cricket, stumps, wicket, helmet, kabaddi,
  kho kho, gilli danda, lattu, marbles, carrom, ludo, snakes ladders, antakshari,
  chor police, pithoo, hopscotch, chai stall, paan shop, barber shop, tailor, dhobi,
  iron box, sabzi mandi, kirana store, autowala, doodhwala, postman, milkman, school bus,
  school bell, chalk, blackboard, exam, report card, wedding band, baraat, ghodi, sehra,
  varmala, pheras, shagun, lifafa, rakhi, raksha bandhan, eid, christmas, pongal, onam,
  bihu, lohri, baisakhi, navratri, dussehra, ravan effigy, ganpati, durga puja,
  chhath puja, karva chauth, janmashtami, matki phod, teej, sankranti, republic day,
  flag hoisting, tricolour, ashoka chakra, gandhi topi, charkha, khadi, power cut,
  inverter, candle, torch, dish antenna, doordarshan, radio, transistor, nokia phone,
  missed call, whatsapp, selfie, water tanker, bore well, chai kettle, steel glass,
  steel plate, tiffin box, gas stove, chulha, chakki, sil batta, jhadu, pocha,
  bucket bath, geyser, mandir, masjid, ashram, sadhu, pandit, kundli, horoscope,
  astrologer, palmist, nukkad, mohalla, galli, chowk, nukkad natak, nautanki,
  puppet show, kathputli, magician, madari, jadugar, circus, mela, giant wheel, toy gun,
  balloon, cotton candy, buddhi ke baal, ice gola, kulfi wala, chana jor, bhutta wala,
  nariyal pani, jugaad, chai charcha, adda, baithak, taash, teen patti, rummy,
  paper boat, paper plane, spinning top, yo yo, rubik cube, video game, cassette,
  walkman, cable tv, remote, antenna, set top box, torchlight, hawai chappal,
  nimbu mirchi, evil eye, kala teeka, nazar battu, swastik, kalash, toran, kolam, alpana,
  mandala, haldi, ubtan, chooda, kalire, maang tikka, nath, kamarband, bichhiya, anklet,
  gajra, jasmine, rose, hibiscus, champa, gulmohar, peepal tree, tamarind, jamun, amla,
  shahtoot, kathal, gulab, attar, sandalwood, rudraksh, mala
`)

const MONEY = words(`
  split bill, upi, wallet, receipt, paisa, rupee, coin, note, piggy bank, atm,
  debit card, credit card, cheque, bank, locker, passbook, otp, qr code, scan and pay,
  cashback, discount, coupon, sale, bargain, mrp, gst, tax, invoice, bill, tip,
  loose change, khulla, udhaar, loan, emi, interest, saving, budget, salary, bonus,
  pocket money, allowance, pay day, rent, deposit, landlord, light bill, water bill,
  gas bill, phone bill, wifi bill, recharge, top up, subscription, netflix, swiggy,
  zomato, delivery fee, service charge, cover charge, entry fee, parking fee, toll, fine,
  chalaan, penalty, late fee, refund, return, exchange, cash counter, cash register,
  cashier, shopkeeper, customer, queue, token, settle up, group expense, who paid,
  equal split, percent split, share, debt, lend, borrow, owe, dues, treat, party fund,
  kitty, chit fund, gold, silver, jewellery, insurance, policy, stock market,
  share market, bull, bear, crypto, bitcoin, mutual fund, sip, fixed deposit, ppf,
  provident fund, pension, retire, nest egg, rainy day fund, jackpot, lottery,
  lucky draw, scratch card, gift card, gift voucher, envelope, shagun, haggle, auction,
  bid, price tag, barcode, weighing scale, khata, ledger, calculator, abacus, accountant,
  auditor, bank manager, teller, vault, safe, money plant, cash cow, moneybag,
  treasure chest, gold coin, dollar, euro, pound, yen, forex, remittance, paytm, phonepe,
  google pay, net banking, cheque book, bounced cheque, overdraft, balance, statement,
  transaction, swipe machine, pos machine, card reader, tap to pay, split evenly,
  itemised bill, tip jar, donation box, charity, dakshina, chanda, hundi, gullak,
  payslip, income tax, tax return, form sixteen, pan card, aadhaar card, kyc,
  bank account, ifsc code, neft, imps, demand draft, money order, post office, savings,
  joint account, nominee, payee, iou, bill split, joysplit, expense, trip budget,
  food budget, grocery bill, kirana bill, dhaba bill, hotel bill, room rent, car pool,
  petrol money, movie ticket, birthday treat, dinner treat, chai treat, round of chai,
  pay later, no cost emi, interest free, down payment, home loan, car loan, gold loan,
  pawn shop, moneylender, sahukar, munim, bahi khata, tijori, galla, chillar,
  note bundle, fake note, counterfeit, new notes, two thousand, five hundred,
  hundred rupee, fifty rupee, ten rupee, one rupee, bank robbery, cash van,
  security guard, cctv, atm card, contactless, wallet app, bhim upi, amazon pay,
  bill reminder, due date, auto debit, autopay, premium, claim, maturity, bond, dividend,
  profit, loss, break even, margin, cost price, selling price, wholesale, retail,
  mandi rate, flash sale, clearance sale, combo offer, happy hour, loyalty card,
  reward points
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
