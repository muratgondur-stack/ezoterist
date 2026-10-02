// Ezoter.ist tarot destesinin resim tarifleri (bir kerelik üretim aracı; imaja girmez).
// Her karta ortak STIL eklenir; sahneler geleneksel Rider-Waite sembolizmini korur, çizim bize özeldir.
const STIL =
  "Ornate premium tarot card illustration, vertical 2:3 composition, luxurious cosmic art nouveau style. " +
  "Deep midnight indigo and royal violet palette with luminous gold-leaf linework, soft glowing starlight, subtle nebulae, " +
  "rich painterly detail, dramatic yet gentle lighting, elegant symmetrical gold ornamental border with celestial motifs on all four sides. " +
  "Keep the bottom tenth of the card as a calm dark ornamental area. Tasteful, fully clothed, family-friendly figures with expressive faces. " +
  "Absolutely no text, letters, numbers, words, captions or signatures anywhere on the card. Scene: ";

const buyuk = {
  deli: "a carefree young traveler in flowing star-patterned robes stepping toward a cliff edge under a golden sun, holding a white rose and a small bundle on a staff, a white dog leaping beside, distant mountains",
  buyucu: "a magician in a red and white robe raising a glowing wand to the sky, an infinity symbol of light above the head, a table holding a cup, a sword, a pentacle and a wand, roses and lilies around",
  azize: "a serene high priestess seated between a black pillar and a white pillar, crescent moon at her feet, a veil of pomegranates behind her, holding a sacred scroll, moonlit blue robes",
  imparatorice: "a radiant empress on a cushioned throne in a lush wheat field and forest, crown of twelve stars, flowing gown with pomegranate patterns, a waterfall nearby, abundance everywhere",
  imparator: "a stern bearded emperor on a stone throne carved with ram heads, red robe over armor, holding an ankh scepter and a golden orb, barren majestic mountains behind",
  aziz: "a wise hierophant in ornate red and gold vestments seated between two pillars, raising a hand in blessing, triple crown, two crossed golden keys at his feet, two acolytes kneeling",
  asiklar: "two lovers standing in a paradise garden beneath a radiant angel with outstretched wings in the clouds, a tree of fruit with a gentle serpent behind one, a flaming tree behind the other, golden sun",
  "savas-arabasi": "a triumphant armored charioteer in a starry canopied chariot, a black sphinx and a white sphinx pulling it, crescent moons on the shoulders, a city behind, determined forward motion",
  guc: "a gentle woman in white robes calmly closing the jaws of a powerful golden lion, an infinity symbol of light above her head, garlands of flowers, soft meadow",
  ermis: "an old hermit in a grey hooded cloak standing on a snowy mountain peak at night, holding a lantern with a glowing six-pointed star, leaning on a tall staff",
  "kader-carki": "a great golden wheel of fortune turning in the cosmic sky with alchemical symbols, a sphinx with a sword on top, a serpent descending and a jackal-headed figure rising, four winged creatures reading books in the clouds at the corners",
  adalet: "a dignified figure of justice seated between two pillars, holding upright a double-edged sword and golden balanced scales, red robe, purple veil behind",
  "asilan-adam": "a calm man hanging upside down by one foot from a living T-shaped tree, the other leg crossed, hands behind his back, a radiant golden halo around his peaceful face",
  olum: "a stylized skeletal knight in ornate black and gold armor riding a white horse, carrying a black banner with a white rose, a sunrise between two towers in the distance, solemn but hopeful atmosphere, not gory",
  denge: "a winged angel with one foot on land and one in a pool, pouring luminous water between two golden cups, a path leading to a glowing crown over distant mountains, irises blooming",
  seytan: "a horned winged dark figure with bat wings perched on a black pedestal under an inverted pentagram of light, two small chained figures with tails standing below, the chains loose, dramatic but tasteful",
  kule: "a tall stone tower on a rocky peak struck by a golden lightning bolt, its crown blown off, flames from the windows, two figures falling, sparks of light falling like stars, stormy night",
  yildiz: "a graceful woman kneeling by a pool under a great eight-pointed star and seven smaller stars, pouring water from two jugs onto land and into the pool, an ibis on a tree, tranquil night",
  ay: "a full moon with a serene face between two towers, a dog and a wolf howling at it, a crayfish emerging from a pool, a winding path into the distant mountains, dreamy mist",
  gunes: "a joyful child riding a white horse beneath a radiant smiling sun, holding a red banner, tall sunflowers behind a stone wall, bright golden light",
  mahkeme: "an angel blowing a golden trumpet from the clouds with a banner bearing a cross, people rising from stone coffins with arms raised toward the light, snowy mountains",
  dunya: "a dancer floating inside a large oval laurel wreath tied with ribbons, holding two wands, four winged creatures at the corners (angel, eagle, bull, lion) in the clouds",
};

const takimNesne = {
  degnek: "flowering wooden wands (staffs) sprouting small green leaves",
  kupa: "ornate golden chalices (cups)",
  kilic: "gleaming silver swords with golden hilts",
  tilsim: "large golden coins engraved with a pentagram (pentacles)",
};

const kucuk = {
  degnek: {
    as: "a radiant hand emerging from a glowing cloud holding a single sprouting wand, a castle on a distant hill, a river below",
    2: "a nobleman on castle battlements holding a small globe and one wand, a second wand fixed to the wall, looking out over sea and land",
    3: "a figure on a cliff seen from behind watching ships sail at golden sunset, three wands planted beside",
    4: "four wands with a garland of flowers forming a festive canopy, two joyful figures raising bouquets, a castle behind",
    5: "five young people playfully clashing wands in a lively contest",
    6: "a laurel-crowned rider on a white horse in a victory parade, holding a wand with a wreath, a crowd raising wands",
    7: "a determined figure on a hilltop defending with one wand against six wands rising from below",
    8: "eight wands flying swiftly through a clear sky over a peaceful river valley",
    9: "a wounded but vigilant guard with a bandaged head leaning on a wand, eight wands standing like a fence behind",
    10: "a figure bent forward carrying a heavy bundle of ten wands toward a distant town",
    prens: "a young page in a feathered hat and salamander-patterned tunic gazing curiously at a sprouting wand in a desert with pyramids",
    sovalye: "a knight in salamander-patterned armor on a rearing horse, holding a wand, desert and pyramids behind",
    kralice: "a confident queen on a lion-carved throne holding a wand and a sunflower, a black cat at her feet",
    kral: "a king on a throne decorated with lions and salamanders, holding a flowering wand, a small salamander nearby",
  },
  kupa: {
    as: "a hand emerging from a glowing cloud holding an overflowing golden chalice with five streams of water, a dove descending with a wafer, water lilies below",
    2: "a young couple exchanging cups, a winged lion head above a caduceus between them",
    3: "three joyful women raising cups in a celebration dance among harvest fruits",
    4: "a young man sitting under a tree with folded arms looking at three cups, a hand from a cloud offering a fourth cup",
    5: "a figure in a black cloak mourning three spilled cups, two cups still standing behind, a bridge and a castle in the distance",
    6: "two children in a sunny village garden, one offering the other a cup filled with white flowers",
    7: "a figure facing seven cups floating in clouds, each holding a vision: a castle, jewels, a laurel wreath, a dragon, a serpent, a veiled glowing figure, a face",
    8: "a cloaked traveler with a staff walking away from eight stacked cups toward mountains under an eclipsed moon",
    9: "a contented man seated with arms crossed before an arc of nine golden cups on a draped table",
    10: "a happy couple with arms raised and two children dancing, a rainbow of ten cups arching over their cozy home",
    prens: "a young page in floral tunic holding a cup with a small fish peeking out, sea waves behind",
    sovalye: "a graceful knight on a calm white horse holding out a cup, winged helmet, a gentle river",
    kralice: "a dreamy queen on a shell-decorated throne at the sea's edge, gazing at an ornate closed chalice",
    kral: "a calm king on a throne floating on a stormy sea, holding a cup and scepter, a ship and a dolphin behind",
  },
  kilic: {
    as: "a hand emerging from a glowing cloud holding an upright sword crowned with a golden crown and olive and palm branches, mountains below",
    2: "a blindfolded woman in white sitting by the sea at night, holding two crossed swords over her chest, crescent moon",
    3: "a red heart pierced by three swords under a rainy grey sky, rain turning into falling stars",
    4: "an effigy of a knight resting on a tomb in a quiet chapel, hands in prayer, three swords on the wall, one sword beneath, stained glass",
    5: "a smug figure gathering swords while two defeated figures walk away toward the sea, jagged clouds",
    6: "a ferryman guiding a boat carrying a cloaked woman and child across calm water, six swords standing in the boat",
    7: "a sly figure tiptoeing away from a camp carrying five swords, two left behind",
    8: "a bound and blindfolded woman standing among eight swords planted in the ground, a castle on a cliff",
    9: "a person sitting up in bed with face in hands at night, nine swords on the dark wall, a quilt of roses and zodiac signs",
    10: "a figure lying face down at dusk with ten swords, a golden dawn breaking over calm water, symbolic and not gory",
    prens: "a young page standing on a windy hill holding a raised sword, birds and clouds swirling",
    sovalye: "a knight charging at full speed on a white horse with sword raised, storm clouds and wind-bent trees",
    kralice: "a stern but fair queen on a throne decorated with butterflies, raising a sword, one hand extended, clouds below",
    kral: "a wise king on a throne carved with butterflies and crescents, holding an upright sword, tall trees behind",
  },
  tilsim: {
    as: "a hand emerging from a glowing cloud holding a large golden pentacle coin, a blooming garden archway leading to mountains",
    2: "a juggler dancing while balancing two pentacles within an infinity loop of ribbon, ships riding waves behind",
    3: "a stonemason working on a cathedral arch decorated with three pentacles, two figures holding plans",
    4: "a crowned man sitting firmly clutching a pentacle, one on his crown and two under his feet, a city behind",
    5: "two poor figures walking through snow past a glowing stained glass window with five pentacles",
    6: "a merchant weighing coins on balanced scales and giving coins to two kneeling figures",
    7: "a farmer leaning on a hoe gazing thoughtfully at seven pentacles growing on a green bush",
    8: "a craftsman at a workbench carving pentacles, six finished pentacles displayed on a post",
    9: "an elegant woman in a lush vineyard with a hooded falcon on her gloved hand, nine pentacles among the grapes",
    10: "an elderly patriarch with two dogs, a family under a stone archway, ten pentacles arranged in a tree of life pattern",
    prens: "a young page standing in a green field gazing at a pentacle held up in both hands",
    sovalye: "a patient knight seated on a sturdy black horse holding a pentacle, plowed fields behind",
    kralice: "a nurturing queen on a throne in a flowering garden holding a pentacle in her lap, a rabbit nearby",
    kral: "a prosperous king on a throne adorned with bulls and grapevines, holding a pentacle and scepter, a castle behind",
  },
};

const ARKA =
  "Ornate premium tarot card back design, vertical 2:3, perfectly symmetrical, luxurious cosmic art nouveau style. " +
  "Deep midnight indigo and royal violet with luminous gold-leaf ornamental linework, a central all-seeing eye with a blue iris inside a golden circle, " +
  "a crescent moon above it and a small star below, radiating golden rays, celestial ornaments, stars and moon phases around the border. " +
  "Absolutely no text, letters, numbers or words.";

function tarifler() {
  const liste = Object.entries(buyuk).map(([id, sahne]) => ({ id, prompt: STIL + sahne }));
  for (const [takim, kartlar] of Object.entries(kucuk)) {
    for (const [rutbe, sahne] of Object.entries(kartlar)) {
      liste.push({ id: `${takim}-${rutbe}`, prompt: `${STIL}${sahne}. The suit symbols are ${takimNesne[takim]}.` });
    }
  }
  liste.push({ id: "arka", prompt: ARKA });
  return liste;
}

module.exports = { tarifler };
if (require.main === module) process.stdout.write(JSON.stringify(tarifler()));
