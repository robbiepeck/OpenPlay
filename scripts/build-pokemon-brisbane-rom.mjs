import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import process from "node:process";

const EXPECTED_FIRE_RED_SHA1 = "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc";
const DECOMP_ROOT = "/tmp/pokefirered";
const DEFAULT_OUTPUT_PATH = resolve(
  process.cwd(),
  "public/local-roms/pokemon-fire-red-brisbane.gba",
);
const DEFAULT_INPUT_CANDIDATES = [];

const TOKEN_BYTES = {
  "\\l": [0xfa],
  "\\n": [0xfe],
  "\\p": [0xfb],
  B_PLAYER_NAME: [0xfd, 0x23],
  CIRCLE_1: [0xf9, 0x0a],
  CIRCLE_2: [0xf9, 0x0b],
  "COLOR BLUE": [0xfc, 0x01, 0x08],
  "COLOR DARK_GRAY": [0xfc, 0x01, 0x02],
  FONT_FEMALE: [0xfc, 0x06, 0x05],
  FONT_MALE: [0xfc, 0x06, 0x04],
  FONT_NORMAL: [0xfc, 0x06, 0x02],
  PAUSE_UNTIL_PRESS: [0xfc, 0x09],
  PLAYER: [0xfd, 0x01],
  RIVAL: [0xfd, 0x06],
  "SHADOW LIGHT_BLUE": [0xfc, 0x03, 0x09],
  "SHADOW LIGHT_GRAY": [0xfc, 0x03, 0x03],
};

const CHAR_BYTES = {
  " ": 0x00,
  "!": 0xab,
  "%": 0x5b,
  "&": 0x2d,
  "(": 0x5c,
  ")": 0x5d,
  $: 0xff,
  "+": 0x2e,
  "'": 0xb4,
  ",": 0xb8,
  "-": 0xae,
  ".": 0xad,
  "0": 0xa1,
  "1": 0xa2,
  "2": 0xa3,
  "3": 0xa4,
  "4": 0xa5,
  "5": 0xa6,
  "6": 0xa7,
  "7": 0xa8,
  "8": 0xa9,
  "9": 0xaa,
  ":": 0xf0,
  ";": 0x36,
  "?": 0xac,
  A: 0xbb,
  B: 0xbc,
  C: 0xbd,
  D: 0xbe,
  E: 0xbf,
  F: 0xc0,
  G: 0xc1,
  H: 0xc2,
  I: 0xc3,
  J: 0xc4,
  K: 0xc5,
  L: 0xc6,
  M: 0xc7,
  N: 0xc8,
  O: 0xc9,
  P: 0xca,
  Q: 0xcb,
  R: 0xcc,
  S: 0xcd,
  T: 0xce,
  U: 0xcf,
  V: 0xd0,
  W: 0xd1,
  X: 0xd2,
  Y: 0xd3,
  Z: 0xd4,
  "/": 0xba,
  a: 0xd5,
  b: 0xd6,
  c: 0xd7,
  d: 0xd8,
  e: 0xd9,
  f: 0xda,
  g: 0xdb,
  h: 0xdc,
  i: 0xdd,
  j: 0xde,
  k: 0xdf,
  l: 0xe0,
  m: 0xe1,
  n: 0xe2,
  o: 0xe3,
  p: 0xe4,
  q: 0xe5,
  r: 0xe6,
  s: 0xe7,
  t: 0xe8,
  u: 0xe9,
  v: 0xea,
  w: 0xeb,
  x: 0xec,
  y: 0xed,
  z: 0xee,
  é: 0x1b,
  "“": 0xb1,
  "”": 0xb2,
  "…": 0xb0,
};

const IN_PLACE_FALLBACKS = {
  OAK: "PEK",
  "PROF. OAK": "A. PECK",
};

const SPECIAL_FALLBACKS = {
  "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}OAK POKéMON RESEARCH LAB$":
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}PECK LAB$",
  "{FONT_NORMAL}PROF. OAK's rating:$": "{FONT_NORMAL}PECK's rating:$",
  "OAK POKéMON RESEARCH LAB$": "PECK LAB$",
  "OAK's POKéMON SEMINAR.$": "Peck's SEMINAR.$",
  "OAK'S POKéMON SEMINAR.$": "PECK'S SEMINAR.$",
};

const TRANSFORM_RULES = [
  ["PALLET TOWN", "NEW FARM"],
  ["Pallet Town", "New Farm"],
  ["VIRIDIAN CITY", "TOOWONG"],
  ["Viridian City", "Toowong"],
  ["PEWTER CITY", "MILTON"],
  ["Pewter City", "Milton"],
  ["CERULEAN CITY", "BULIMBA"],
  ["Cerulean City", "Bulimba"],
  ["LAVENDER TOWN", "BARDON"],
  ["Lavender Town", "Bardon"],
  ["VERMILION CITY", "WEST END"],
  ["Vermilion City", "West End"],
  ["CELADON CITY", "NEWSTEAD"],
  ["Celadon City", "Newstead"],
  ["FUCHSIA CITY", "ST LUCIA"],
  ["Fuchsia City", "St Lucia"],
  ["SAFFRON CITY", "SPRING HILL"],
  ["Saffron City", "Spring Hill"],
  ["CINNABAR ISLAND", "REDCLIFFE"],
  ["Cinnabar Island", "Redcliffe"],
  ["INDIGO PLATEAU", "MT COOT-THA"],
  ["Indigo Plateau", "Mt Coot-tha"],
  ["PROF. OAK's", "ANDREW PECK's"],
  ["PROF. OAK", "ANDREW PECK"],
  ["OAK'S", "ANDREW PECK'S"],
  ["OAK's", "Andrew Peck's"],
  ["OAK:", "ANDREW:"],
  ["OAK", "ANDREW PECK"],
];

const TARGET_TOKENS = TRANSFORM_RULES.map(([from]) => from);
const CHARMAP_PATH = join(DECOMP_ROOT, "charmap.txt");

const REPLACEMENT_PAIRS = JSON.parse(String.raw`[
  [
    " Using “PROF. OAK'S PC”$",
    " Using “ANDREW PECK'S PC”$"
  ],
  [
    "…PALLET TOWN?\n",
    "…NEW FARM?\n"
  ],
  [
    "{CIRCLE_1} Select “PROF. OAK'S PC” on the PC.\n",
    "{CIRCLE_1} Select “ANDREW PECK'S PC” on the PC.\n"
  ],
  [
    "{CIRCLE_2} PROF. OAK will evaluate your\n",
    "{CIRCLE_2} ANDREW PECK will evaluate your\n"
  ],
  [
    "{COLOR BLUE}{SHADOW LIGHT_BLUE}From: PROF. OAK\n",
    "{COLOR BLUE}{SHADOW LIGHT_BLUE}From: ANDREW PECK\n"
  ],
  [
    "{COLOR BLUE}{SHADOW LIGHT_BLUE}PROF. OAK$",
    "{COLOR BLUE}{SHADOW LIGHT_BLUE}ANDREW PECK$"
  ],
  [
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}CELADON CITY POKéMON GYM\n",
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}NEWSTEAD POKéMON GYM\n"
  ],
  [
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}CERULEAN CITY POKéMON GYM\n",
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}BULIMBA POKéMON GYM\n"
  ],
  [
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}CINNABAR ISLAND POKéMON GYM\n",
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}REDCLIFFE POKéMON GYM\n"
  ],
  [
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}FUCHSIA CITY POKéMON GYM\n",
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}ST LUCIA POKéMON GYM\n"
  ],
  [
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}OAK POKéMON RESEARCH LAB$",
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}ANDREW PECK POKéMON RESEARCH LAB$"
  ],
  [
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}PEWTER CITY POKéMON GYM\n",
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}MILTON POKéMON GYM\n"
  ],
  [
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}PROF. OAK reportedly lives with his\n",
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}ANDREW PECK reportedly lives with his\n"
  ],
  [
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}SAFFRON CITY POKéMON GYM\n",
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}SPRING HILL POKéMON GYM\n"
  ],
  [
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}VERMILION CITY POKéMON GYM\n",
    "{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}WEST END POKéMON GYM\n"
  ],
  [
    "{FONT_FEMALE}{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}A girl from PALLET TOWN, DAISY,\n",
    "{FONT_FEMALE}{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}A girl from NEW FARM, DAISY,\n"
  ],
  [
    "{FONT_FEMALE}{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}I hear OAK's taken a lot of\n",
    "{FONT_FEMALE}{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}I hear Andrew Peck's taken a lot of\n"
  ],
  [
    "{FONT_FEMALE}{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}PROF. OAK may not look like much,\n",
    "{FONT_FEMALE}{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}ANDREW PECK may not look like much,\n"
  ],
  [
    "{FONT_MALE}{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}PROF. OAK is going to have his own\n",
    "{FONT_MALE}{COLOR DARK_GRAY}{SHADOW LIGHT_GRAY}ANDREW PECK is going to have his own\n"
  ],
  [
    "{FONT_NORMAL}PROF. OAK's rating:$",
    "{FONT_NORMAL}ANDREW PECK's rating:$"
  ],
  [
    "{PLAYER} delivered OAK'S PARCEL.$",
    "{PLAYER} delivered ANDREW PECK'S PARCEL.$"
  ],
  [
    "{PLAYER} left PROF. OAK's POKéMON\nRESEARCH LAB.",
    "{PLAYER} left ANDREW PECK's POKéMON\nRESEARCH LAB."
  ],
  [
    "{PLAYER} received OAK'S PARCEL\n",
    "{PLAYER} received ANDREW PECK'S PARCEL\n"
  ],
  [
    "A decrepit, burned-down mansion\non CINNABAR ISLAND.\nIt got its name because a famous\nPOKéMON researcher lived there.",
    "A decrepit, burned-down mansion\non REDCLIFFE.\nIt got its name because a famous\nPOKéMON researcher lived there."
  ],
  [
    "A deep and sprawling forest that\nextends around VIRIDIAN CITY.\nA natural maze, many people\nbecome lost inside.",
    "A deep and sprawling forest that\nextends around TOOWONG.\nA natural maze, many people\nbecome lost inside."
  ],
  [
    "A girl from PALLET TOWN, DAISY,\n",
    "A girl from NEW FARM, DAISY,\n"
  ],
  [
    "Accessed PROF. OAK's PC…\p",
    "Accessed ANDREW PECK's PC…\p"
  ],
  [
    "AIDES to PROF. OAK.\p",
    "AIDES to ANDREW PECK.\p"
  ],
  [
    "and respected in LAVENDER TOWN.$",
    "and respected in BARDON.$"
  ],
  [
    "around VERMILION CITY?$",
    "around WEST END?$"
  ],
  [
    "BIKE SHOP in CERULEAN CITY.\p",
    "BIKE SHOP in BULIMBA.\p"
  ],
  [
    "CELADON CITY - FUCHSIA CITY$",
    "NEWSTEAD - ST LUCIA$"
  ],
  [
    "CELADON CITY - LAVENDER TOWN$",
    "NEWSTEAD - BARDON$"
  ],
  [
    "CELADON CITY POKéMON GYM\n",
    "NEWSTEAD POKéMON GYM\n"
  ],
  [
    "CELADON CITY\n",
    "NEWSTEAD\n"
  ],
  [
    "CELADON CITY$",
    "NEWSTEAD$"
  ],
  [
    "CERULEAN CITY - LAVENDER TOWN$",
    "BULIMBA - BARDON$"
  ],
  [
    "CERULEAN CITY - ROCK TUNNEL$",
    "BULIMBA - ROCK TUNNEL$"
  ],
  [
    "CERULEAN CITY - VERMILION CITY$",
    "BULIMBA - WEST END$"
  ],
  [
    "CERULEAN CITY POKéMON GYM\n",
    "BULIMBA POKéMON GYM\n"
  ],
  [
    "CERULEAN CITY…\p",
    "BULIMBA…\p"
  ],
  [
    "CERULEAN CITY.$",
    "BULIMBA.$"
  ],
  [
    "CERULEAN CITY\n",
    "BULIMBA\n"
  ],
  [
    "CERULEAN CITY$",
    "BULIMBA$"
  ],
  [
    "chance, from PALLET TOWN?\p",
    "chance, from NEW FARM?\p"
  ],
  [
    "CINNABAR ISLAND POKéMON GYM\n",
    "REDCLIFFE POKéMON GYM\n"
  ],
  [
    "CINNABAR ISLAND\n",
    "REDCLIFFE\n"
  ],
  [
    "CINNABAR ISLAND$",
    "REDCLIFFE$"
  ],
  [
    "Closed link to PROF. OAK's PC.$",
    "Closed link to ANDREW PECK's PC.$"
  ],
  [
    "Contact PROF. OAK via a PC to\n",
    "Contact ANDREW PECK via a PC to\n"
  ],
  [
    "dare go soft like that coot OAK!\p",
    "dare go soft like that coot ANDREW PECK!\p"
  ],
  [
    "Detour to LAVENDER TOWN$",
    "Detour to BARDON$"
  ],
  [
    "Far away, on CINNABAR ISLAND,\n",
    "Far away, on REDCLIFFE,\n"
  ],
  [
    "from CELADON CITY.\p",
    "from NEWSTEAD.\p"
  ],
  [
    "from PROF. OAK!$",
    "from ANDREW PECK!$"
  ],
  [
    "from PROF. OAK.$",
    "from ANDREW PECK.$"
  ],
  [
    "FUCHSIA CITY - SEAFOAM ISLANDS$",
    "ST LUCIA - SEAFOAM ISLANDS$"
  ],
  [
    "FUCHSIA CITY POKéMON GYM\n",
    "ST LUCIA POKéMON GYM\n"
  ],
  [
    "FUCHSIA CITY\n",
    "ST LUCIA\n"
  ],
  [
    "FUCHSIA CITY$",
    "ST LUCIA$"
  ],
  [
    "give you a reward from PROF. OAK.\p",
    "give you a reward from ANDREW PECK.\p"
  ],
  [
    "Grand Champion is DAISY OAK of\l",
    "Grand Champion is DAISY ANDREW PECK of\l"
  ],
  [
    "He had a package from PROF. OAK\n",
    "He had a package from ANDREW PECK\n"
  ],
  [
    "I go shopping in PEWTER CITY\n",
    "I go shopping in MILTON\n"
  ],
  [
    "I hear OAK's taken a lot of\n",
    "I hear Andrew Peck's taken a lot of\n"
  ],
  [
    "I just heard from PROF. OAK.\p",
    "I just heard from ANDREW PECK.\p"
  ],
  [
    "I study POKéMON as PROF. OAK's\n",
    "I study POKéMON as ANDREW PECK's\n"
  ],
  [
    "I swam here from CINNABAR ISLAND.\n",
    "I swam here from REDCLIFFE.\n"
  ],
  [
    "I'm one of PROF. OAK's AIDES.\p",
    "I'm one of ANDREW PECK's AIDES.\p"
  ],
  [
    "I'm PROF. OAK's AIDE.\p",
    "I'm ANDREW PECK's AIDE.\p"
  ],
  [
    "in FUCHSIA CITY?\p",
    "in ST LUCIA?\p"
  ],
  [
    "In LAVENDER TOWN, there's a man\n",
    "In BARDON, there's a man\n"
  ],
  [
    "in SAFFRON CITY?\p",
    "in SPRING HILL?\p"
  ],
  [
    "INDIGO PLATEAU\p",
    "MT COOT-THA\p"
  ],
  [
    "INDIGO PLATEAU$",
    "MT COOT-THA$"
  ],
  [
    "It goes right to VIRIDIAN CITY,\n",
    "It goes right to TOOWONG,\n"
  ],
  [
    "It's me, one of PROF. OAK's AIDES.\p",
    "It's me, one of ANDREW PECK's AIDES.\p"
  ],
  [
    "LAVENDER TOWN.\p",
    "BARDON.\p"
  ],
  [
    "LAVENDER TOWN.$",
    "BARDON.$"
  ],
  [
    "LAVENDER TOWN\n",
    "BARDON\n"
  ],
  [
    "LAVENDER TOWN$",
    "BARDON$"
  ],
  [
    "MT. MOON - CERULEAN CITY$",
    "MT. MOON - BULIMBA$"
  ],
  [
    "My name is OAK.\p",
    "My name is ANDREW PECK.\p"
  ],
  [
    "OAK",
    "ANDREW PECK"
  ],
  [
    "OAK POKéMON RESEARCH LAB$",
    "ANDREW PECK POKéMON RESEARCH LAB$"
  ],
  [
    "OAK RESEARCH LAB",
    "ANDREW PECK RESEARCH LAB"
  ],
  [
    "OAK were rivals who vied for\l",
    "ANDREW PECK were rivals who vied for\l"
  ],
  [
    "OAK: {PLAYER} and {RIVAL}.\n",
    "ANDREW: {PLAYER} and {RIVAL}.\n"
  ],
  [
    "OAK: {PLAYER}, raise your young\n",
    "ANDREW: {PLAYER}, raise your young\n"
  ],
  [
    "OAK: {PLAYER}!\nThis isn't the time to use that!{PAUSE_UNTIL_PRESS}",
    "ANDREW: {PLAYER}!\nThis isn't the time to use that!{PAUSE_UNTIL_PRESS}"
  ],
  [
    "OAK: {PLAYER}!$",
    "ANDREW: {PLAYER}!$"
  ],
  [
    "OAK: {PLAYER}.\p",
    "ANDREW: {PLAYER}.\p"
  ],
  [
    "OAK: {RIVAL}?\n",
    "ANDREW: {RIVAL}?\n"
  ],
  [
    "OAK: {RIVAL}…\n",
    "ANDREW: {RIVAL}…\n"
  ],
  [
    "OAK: Ah, {PLAYER}!\n",
    "ANDREW: Ah, {PLAYER}!\n"
  ],
  [
    "OAK: Ah, welcome!\p",
    "ANDREW: Ah, welcome!\p"
  ],
  [
    "OAK: Be patient, {RIVAL}.\n",
    "ANDREW: Be patient, {RIVAL}.\n"
  ],
  [
    "OAK: Come see me sometime.\p",
    "ANDREW: Come see me sometime.\p"
  ],
  [
    "OAK: Er-hem!\n",
    "ANDREW: Er-hem!\n"
  ],
  [
    "OAK: Good to see you!\n",
    "ANDREW: Good to see you!\n"
  ],
  [
    "OAK: Hey! Wait!\n",
    "ANDREW: Hey! Wait!\n"
  ],
  [
    "OAK: Hey!\n",
    "ANDREW: Hey!\n"
  ],
  [
    "OAK: Hm! Excellent!\pIf you win, you earn prize money,\nand your POKéMON will grow!\pBattle other TRAINERS and make\nyour POKéMON strong!\p",
    "ANDREW: Hm! Excellent!\pIf you win, you earn prize money,\nand your POKéMON will grow!\pBattle other TRAINERS and make\nyour POKéMON strong!\p"
  ],
  [
    "OAK: Hm…\nHow disappointing…\pIf you win, you earn prize money,\nand your POKéMON grow.\pBut if you lose, {B_PLAYER_NAME}, you end\nup paying prize money…\pHowever, since you had no warning\nthis time, I'll pay for you.\pBut things won't be this way once\nyou step outside these doors.\pThat's why you must strengthen your\nPOKéMON by battling wild POKéMON.\p",
    "ANDREW: Hm…\nHow disappointing…\pIf you win, you earn prize money,\nand your POKéMON grow.\pBut if you lose, {B_PLAYER_NAME}, you end\nup paying prize money…\pHowever, since you had no warning\nthis time, I'll pay for you.\pBut things won't be this way once\nyou step outside these doors.\pThat's why you must strengthen your\nPOKéMON by battling wild POKéMON.\p"
  ],
  [
    "OAK: I know, I know.\n",
    "ANDREW: I know, I know.\n"
  ],
  [
    "OAK: If a wild POKéMON appears,\n",
    "ANDREW: If a wild POKéMON appears,\n"
  ],
  [
    "OAK: Inflicting damage on the foe\nis the key to any battle.\p",
    "ANDREW: Inflicting damage on the foe\nis the key to any battle.\p"
  ],
  [
    "OAK: It's important to get to know\nyour POKéMON thoroughly.\p",
    "ANDREW: It's important to get to know\nyour POKéMON thoroughly.\p"
  ],
  [
    "OAK: It's unsafe!\n",
    "ANDREW: It's unsafe!\n"
  ],
  [
    "OAK: Keep your eyes on your\nPOKéMON's HP.\pIt will faint if the HP drops to\n“0.”\p",
    "ANDREW: Keep your eyes on your\nPOKéMON's HP.\pIt will faint if the HP drops to\n“0.”\p"
  ],
  [
    "OAK: Lowering the foe's stats\nwill put you at an advantage.\p",
    "ANDREW: Lowering the foe's stats\nwill put you at an advantage.\p"
  ],
  [
    "OAK: No! There's no running away\nfrom a TRAINER POKéMON battle!\p",
    "ANDREW: No! There's no running away\nfrom a TRAINER POKéMON battle!\p"
  ],
  [
    "OAK: Now, {PLAYER}.\p",
    "ANDREW: Now, {PLAYER}.\p"
  ],
  [
    "OAK: Oh, {PLAYER}!\n",
    "ANDREW: Oh, {PLAYER}!\n"
  ],
  [
    "OAK: Oh, for Pete's sake…\nSo pushy, as always.\p{B_PLAYER_NAME}.\pYou've never had a POKéMON battle\nbefore, have you?\pA POKéMON battle is when TRAINERS\npit their POKéMON against each\lother.\p",
    "ANDREW: Oh, for Pete's sake…\nSo pushy, as always.\p{B_PLAYER_NAME}.\pYou've never had a POKéMON battle\nbefore, have you?\pA POKéMON battle is when TRAINERS\npit their POKéMON against each\lother.\p"
  ],
  [
    "OAK: Oh, right!\n",
    "ANDREW: Oh, right!\n"
  ],
  [
    "OAK: So, you've won!\n",
    "ANDREW: So, you've won!\n"
  ],
  [
    "OAK: You can't get detailed data\n",
    "ANDREW: You can't get detailed data\n"
  ],
  [
    "OAK's POKéMON SEMINAR.$",
    "Andrew Peck's POKéMON SEMINAR.$"
  ],
  [
    "OAK'S POKéMON SEMINAR.$",
    "ANDREW PECK'S POKéMON SEMINAR.$"
  ],
  [
    "Oh, yes. PROF. OAK, next door, was\n",
    "Oh, yes. ANDREW PECK, next door, was\n"
  ],
  [
    "out near CELADON CITY, too.$",
    "out near NEWSTEAD, too.$"
  ],
  [
    "PALLET TOWN - VIRIDIAN CITY$",
    "NEW FARM - TOOWONG$"
  ],
  [
    "PALLET TOWN is in the west.$",
    "NEW FARM is in the west.$"
  ],
  [
    "PALLET TOWN, aren't you?\p",
    "NEW FARM, aren't you?\p"
  ],
  [
    "PALLET TOWN!$",
    "NEW FARM!$"
  ],
  [
    "PALLET TOWN\n",
    "NEW FARM\n"
  ],
  [
    "PALLET TOWN$",
    "NEW FARM$"
  ],
  [
    "PEWTER CITY AHEAD$",
    "MILTON AHEAD$"
  ],
  [
    "PEWTER CITY POKéMON GYM\n",
    "MILTON POKéMON GYM\n"
  ],
  [
    "PEWTER CITY\n",
    "MILTON\n"
  ],
  [
    "PEWTER CITY$",
    "MILTON$"
  ],
  [
    "Please, visit us in VIRIDIAN CITY.\p",
    "Please, visit us in TOOWONG.\p"
  ],
  [
    "PROF. OAK",
    "ANDREW PECK"
  ],
  [
    "PROF. OAK entrusted me with an\n",
    "ANDREW PECK entrusted me with an\n"
  ],
  [
    "PROF. OAK entrusted me with the\n",
    "ANDREW PECK entrusted me with the\n"
  ],
  [
    "PROF. OAK entrusted me with\n",
    "ANDREW PECK entrusted me with\n"
  ],
  [
    "PROF. OAK for me, too.$",
    "ANDREW PECK for me, too.$"
  ],
  [
    "PROF. OAK is going to have his own\n",
    "ANDREW PECK is going to have his own\n"
  ],
  [
    "PROF. OAK may not look like much,\n",
    "ANDREW PECK may not look like much,\n"
  ],
  [
    "PROF. OAK reportedly lives with his\n",
    "ANDREW PECK reportedly lives with his\n"
  ],
  [
    "PROF. OAK took both POKéDEX\n",
    "ANDREW PECK took both POKéDEX\n"
  ],
  [
    "PROF. OAK, please visit us!\n",
    "ANDREW PECK, please visit us!\n"
  ],
  [
    "PROF. OAK's AIDE came by here.$",
    "ANDREW PECK's AIDE came by here.$"
  ],
  [
    "PROF. OAK's PC",
    "ANDREW PECK's PC"
  ],
  [
    "PROF. OAK$",
    "ANDREW PECK$"
  ],
  [
    "SAFFRON CITY POKéMON GYM\n",
    "SPRING HILL POKéMON GYM\n"
  ],
  [
    "SAFFRON CITY\n",
    "SPRING HILL\n"
  ],
  [
    "SAFFRON CITY$",
    "SPRING HILL$"
  ],
  [
    "Special Feature: PROF. OAK,\n",
    "Special Feature: ANDREW PECK,\n"
  ],
  [
    "That's PROF. OAK's last POKéMON.$",
    "That's ANDREW PECK's last POKéMON.$"
  ],
  [
    "the S.S. ANNE at VERMILION CITY.$",
    "the S.S. ANNE at WEST END.$"
  ],
  [
    "to get to CERULEAN CITY.$",
    "to get to BULIMBA.$"
  ],
  [
    "To get to LAVENDER TOWN from\n",
    "To get to BARDON from\n"
  ],
  [
    "VERMILION CITY POKéMON GYM\n",
    "WEST END POKéMON GYM\n"
  ],
  [
    "VERMILION CITY port.\p",
    "WEST END port.\p"
  ],
  [
    "VERMILION CITY!$",
    "WEST END!$"
  ],
  [
    "VERMILION CITY?$",
    "WEST END?$"
  ],
  [
    "VERMILION CITY.\p",
    "WEST END.\p"
  ],
  [
    "VERMILION CITY\n",
    "WEST END\n"
  ],
  [
    "VERMILION CITY$",
    "WEST END$"
  ],
  [
    "VIRIDIAN CITY - PEWTER CITY$",
    "TOOWONG - MILTON$"
  ],
  [
    "VIRIDIAN CITY \n",
    "TOOWONG \n"
  ],
  [
    "VIRIDIAN CITY POKéMON GYM$",
    "TOOWONG POKéMON GYM$"
  ],
  [
    "VIRIDIAN CITY.\p",
    "TOOWONG.\p"
  ],
  [
    "VIRIDIAN CITY$",
    "TOOWONG$"
  ],
  [
    "West to FUCHSIA CITY$",
    "West to ST LUCIA$"
  ],
  [
    "You came from PALLET TOWN?$",
    "You came from NEW FARM?$"
  ],
  [
    "You can get back to PALLET TOWN\n",
    "You can get back to NEW FARM\n"
  ],
  [
    "You know PROF. OAK, right?\p",
    "You know ANDREW PECK, right?\p"
  ],
  [
    "You're the child that OAK's taken\n",
    "You're the child that Andrew Peck's taken\n"
  ]
]`.replace(/\\([lp])/g, "\\\\$1")).map(([oldText, newText]) => [
  oldText.replace(/\n/g, "\\n"),
  newText.replace(/\n/g, "\\n"),
]);

function parseCharmap(contents) {
  const entries = new Map();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.replace(/@.*$/, "").trim();
    if (!line || !line.includes("=")) {
      continue;
    }

    const [leftHandSide, rightHandSide] = line.split("=").map((value) => value.trim());
    const bytes = rightHandSide
      .split(/\s+/)
      .filter(Boolean)
      .map((hex) => Number.parseInt(hex, 16));

    if (/^'.*'$/.test(leftHandSide)) {
      const charKey = leftHandSide.slice(1, -1).replace(/\\'/g, "'");
      entries.set(charKey, bytes);
      continue;
    }

    entries.set(leftHandSide, bytes);
  }

  return entries;
}

const CHARMAP = existsSync(CHARMAP_PATH)
  ? parseCharmap(readFileSync(CHARMAP_PATH, "utf8"))
  : new Map();

function findArg(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha1(bytes) {
  return createHash("sha1").update(bytes).digest("hex");
}

function readRomBytes(inputPath) {
  if (extname(inputPath).toLowerCase() !== ".zip") {
    return new Uint8Array(readFileSync(inputPath));
  }

  const listing = spawnSync("unzip", ["-Z1", inputPath], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (listing.status !== 0) {
    throw new Error(listing.stderr || "Unable to inspect the FireRed zip archive.");
  }

  const romEntry = listing.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.toLowerCase().endsWith(".gba"));

  if (!romEntry) {
    throw new Error("The provided zip does not contain a .gba file.");
  }

  const extracted = spawnSync("unzip", ["-p", inputPath, romEntry], {
    maxBuffer: 64 * 1024 * 1024,
  });

  if (extracted.status !== 0) {
    throw new Error("Unable to extract the FireRed ROM from the zip archive.");
  }

  return new Uint8Array(extracted.stdout);
}

function encodeText(text) {
  const bytes = [];
  let endedWithTerminator = false;

  for (let index = 0; index < text.length; ) {
    const current = text[index];

    if (current === "$") {
      bytes.push(0xff);
      endedWithTerminator = true;
      index += 1;
      continue;
    }

    if (current === "{") {
      const endIndex = text.indexOf("}", index);
      if (endIndex === -1) {
        throw new Error(`Unclosed token in "${text}"`);
      }

      const token = text.slice(index + 1, endIndex);
      const parameterizedTokenParts = token.split(" ");
      const parameterizedBytes =
        parameterizedTokenParts.length === 2 &&
        CHARMAP.get(parameterizedTokenParts[0]) &&
        CHARMAP.get(parameterizedTokenParts[1])
          ? [
              ...CHARMAP.get(parameterizedTokenParts[0]),
              ...CHARMAP.get(parameterizedTokenParts[1]),
            ]
          : undefined;
      const tokenBytes =
        TOKEN_BYTES[token] ?? CHARMAP.get(token) ?? parameterizedBytes;
      if (!tokenBytes) {
        throw new Error(`Unsupported token "${token}" in "${text}"`);
      }

      bytes.push(...tokenBytes);
      index = endIndex + 1;
      continue;
    }

    if (current === "\\") {
      const escape = text.slice(index, index + 2);
      const tokenBytes = TOKEN_BYTES[escape];
      if (!tokenBytes) {
        throw new Error(`Unsupported escape "${escape}" in "${text}"`);
      }

      bytes.push(...tokenBytes);
      index += 2;
      continue;
    }

    const charByte = CHAR_BYTES[current] ?? CHARMAP.get(current)?.[0];
    if (charByte === undefined) {
      throw new Error(`Unsupported character "${current}" in "${text}"`);
    }

    bytes.push(charByte);
    index += 1;
  }

  if (!endedWithTerminator) {
    bytes.push(0xff);
  }
  return Uint8Array.from(bytes);
}

function findAllOccurrences(haystack, needle) {
  const haystackBuffer = Buffer.from(
    haystack.buffer,
    haystack.byteOffset,
    haystack.byteLength,
  );
  const needleBuffer = Buffer.from(
    needle.buffer,
    needle.byteOffset,
    needle.byteLength,
  );
  const offsets = [];

  let start = 0;
  while (start <= haystackBuffer.length - needleBuffer.length) {
    const foundAt = haystackBuffer.indexOf(needleBuffer, start);
    if (foundAt === -1) {
      break;
    }

    offsets.push(foundAt);
    start = foundAt + 1;
  }

  return offsets;
}

function pointerBytes(offset) {
  const address = 0x08000000 + offset;
  return Uint8Array.from([
    address & 0xff,
    (address >> 8) & 0xff,
    (address >> 16) & 0xff,
    (address >> 24) & 0xff,
  ]);
}

function appendBytes(rom, bytes) {
  const expanded = new Uint8Array(rom.length + bytes.length);
  expanded.set(rom);
  expanded.set(bytes, rom.length);
  return {
    offset: rom.length,
    rom: expanded,
  };
}

function walkTextFiles(rootPath) {
  const files = [];

  function visit(currentPath) {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      if ([".git", "graphics", "sound", "build"].includes(entry.name)) {
        continue;
      }

      const nextPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        visit(nextPath);
        continue;
      }

      if (/\.(c|h|inc|s)$/.test(entry.name)) {
        files.push(nextPath);
      }
    }
  }

  visit(rootPath);
  return files;
}

function extractSourceStrings(filePath, contents) {
  const results = [];

  if (/\.(inc|s)$/.test(filePath)) {
    const lines = contents.split(/\r?\n/);
    let currentBlock = [];

    for (const line of lines) {
      const stringMatch = line.match(/\.string\s+"((?:[^"\\]|\\.)*)"/);
      if (stringMatch) {
        currentBlock.push(stringMatch[1]);
        continue;
      }

      if (currentBlock.length > 0) {
        results.push(currentBlock.join(""));
        currentBlock = [];
      }
    }

    if (currentBlock.length > 0) {
      results.push(currentBlock.join(""));
    }
  }

  for (const match of contents.matchAll(/_\("((?:[^"\\]|\\.)*)"\)/g)) {
    results.push(match[1]);
  }

  return results;
}

function buildSourceReplacementPairs() {
  if (!existsSync(DECOMP_ROOT)) {
    return [];
  }

  const replacements = new Map();
  for (const filePath of walkTextFiles(DECOMP_ROOT)) {
    const contents = readFileSync(filePath, "utf8");
    for (const sourceString of extractSourceStrings(filePath, contents)) {
      if (!TARGET_TOKENS.some((token) => sourceString.includes(token))) {
        continue;
      }

      let transformed = sourceString;
      for (const [from, to] of TRANSFORM_RULES) {
        transformed = transformed.split(from).join(to);
      }

      if (transformed === sourceString || sourceString.includes("ROAK")) {
        continue;
      }

      replacements.set(sourceString, transformed);
    }
  }

  return [...replacements.entries()];
}

function mergeReplacementPairs(...lists) {
  const merged = new Map();
  for (const list of lists) {
    for (const [oldText, newText] of list) {
      merged.set(oldText, newText);
    }
  }

  return [...merged.entries()];
}

function applyInPlace(rom, offset, encodedText) {
  rom.set(encodedText, offset);
  return rom;
}

function deriveFallbackText(oldText, newText, maxLength) {
  const candidates = [
    SPECIAL_FALLBACKS[oldText],
    IN_PLACE_FALLBACKS[oldText],
    newText
      .replaceAll("ANDREW PECK'S", "PECK'S")
      .replaceAll("ANDREW PECK's", "Peck's")
      .replaceAll("ANDREW PECK", "PECK")
      .replaceAll("Andrew Peck", "Peck")
      .replaceAll("ANDREW:", "PECK:"),
    newText
      .replaceAll("ANDREW PECK'S", "A. PECK'S")
      .replaceAll("ANDREW PECK's", "A. Peck's")
      .replaceAll("ANDREW PECK", "A. PECK")
      .replaceAll("Andrew Peck", "A. Peck")
      .replaceAll("ANDREW:", "A.P.:"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (encodeText(candidate).length <= maxLength) {
      return candidate;
    }
  }

  return undefined;
}

function patchString(rom, oldText, newText, stats) {
  const oldEncoded = encodeText(oldText);
  const newEncoded = encodeText(newText);
  const matches = findAllOccurrences(rom, oldEncoded);

  if (matches.length === 0) {
    stats.missing.push(oldText);
    return rom;
  }

  for (const matchOffset of matches) {
    if (newEncoded.length <= oldEncoded.length) {
      applyInPlace(rom, matchOffset, newEncoded);
      stats.inPlace += 1;
      continue;
    }

    const pointerLocations = findAllOccurrences(rom, pointerBytes(matchOffset));
    if (pointerLocations.length === 0) {
      const fallbackText = deriveFallbackText(oldText, newText, oldEncoded.length);
      if (!fallbackText) {
        stats.unresolved.push(oldText);
        continue;
      }

      const fallbackEncoded = encodeText(fallbackText);
      if (fallbackEncoded.length > oldEncoded.length) {
        stats.unresolved.push(oldText);
        continue;
      }

      applyInPlace(rom, matchOffset, fallbackEncoded);
      stats.fallback += 1;
      continue;
    }

    const appendResult = appendBytes(rom, newEncoded);
    rom = appendResult.rom;
    const replacementPointer = pointerBytes(appendResult.offset);
    for (const pointerLocation of pointerLocations) {
      rom.set(replacementPointer, pointerLocation);
    }
    stats.repointed += pointerLocations.length;
  }

  return rom;
}

function main() {
  const inputPath =
    findArg("--input") ?? DEFAULT_INPUT_CANDIDATES.find((candidate) => existsSync(candidate));
  const outputPath = resolve(findArg("--output") ?? DEFAULT_OUTPUT_PATH);

  if (!inputPath) {
    console.error(
      "No FireRed ROM provided. Use `npm run build:brisbane-rom -- --input <path-to-rom-or-zip>`.",
    );
    process.exit(1);
  }

  const romBytes = readRomBytes(inputPath);
  const romSha1 = sha1(romBytes);

  if (romSha1 !== EXPECTED_FIRE_RED_SHA1) {
    console.error(`Expected FireRed sha1 ${EXPECTED_FIRE_RED_SHA1}, got ${romSha1}.`);
    process.exit(1);
  }

  let patchedRom = romBytes;
  const stats = {
    fallback: 0,
    inPlace: 0,
    missing: [],
    repointed: 0,
    unresolved: [],
  };

  const replacementPairs = mergeReplacementPairs(
    REPLACEMENT_PAIRS,
    buildSourceReplacementPairs(),
  );

  for (const [oldText, newText] of replacementPairs) {
    patchedRom = patchString(patchedRom, oldText, newText, stats);
  }

  if (stats.unresolved.length > 0) {
    console.error("Some strings could not be patched safely:");
    for (const text of [...new Set(stats.unresolved)].slice(0, 20)) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, patchedRom);

  console.log(`Input ROM: ${inputPath}`);
  console.log(`Output ROM: ${outputPath}`);
  console.log(`Patched ROM sha1: ${sha1(patchedRom)}`);
  console.log(
    `Applied ${replacementPairs.length} replacement rules (${stats.inPlace} in-place writes, ${stats.repointed} pointer repoints, ${stats.fallback} short fallbacks).`,
  );

  if (stats.missing.length > 0) {
    console.log(`Skipped ${new Set(stats.missing).size} strings that were not present in this build.`);
  }
}

main();
