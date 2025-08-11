/**
 * src/utils/cardUtils.js
 *
 * (ChatGPT5 generated)
 *
 * Combined and corrected card utility functions (formatting, identity, ranking)
 * This file restores the original API while using the refactored, correct logic.
 *
 * Exports:
 *  - SUIT_CONSTANT_TO_NAME_MAP, SUIT_TO_CHAR_MAP, SUIT_TO_NAME_MAP,
 *    VALUE_TO_CHAR_MAP, VALUE_TO_NAME_MAP
 *  - normalizeSuit, getPartnerSuit,
 *    isRightBower, isLeftBower, getEffectiveSuit,
 *    getSuitColor, areSameColor
 *  - cardToId, idToCard
 *  - getBaseRankValue, getCardRank, sortHand
 */

import { CARD_SUITS, CARD_VALUES } from "../config/constants.js";
import { InvalidCardError } from "../game/logic/validation-errors.js";
import logger from "./logger.js";

/* -------------------------
   Format & mapping tables
   ------------------------- */

const SUIT_CONSTANT_TO_NAME_MAP = Object.freeze({
  [CARD_SUITS.CARD_SUIT_HEARTS]: "hearts",
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: "diamonds",
  [CARD_SUITS.CARD_SUIT_CLUBS]: "clubs",
  [CARD_SUITS.CARD_SUIT_SPADES]: "spades",
});

const SUIT_TO_NAME_MAP = Object.freeze({
  hearts: CARD_SUITS.CARD_SUIT_HEARTS,
  diamonds: CARD_SUITS.CARD_SUIT_DIAMONDS,
  clubs: CARD_SUITS.CARD_SUIT_CLUBS,
  spades: CARD_SUITS.CARD_SUIT_SPADES,
  // support some canonical variants
  [CARD_SUITS.CARD_SUIT_HEARTS]: CARD_SUITS.CARD_SUIT_HEARTS,
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: CARD_SUITS.CARD_SUIT_DIAMONDS,
  [CARD_SUITS.CARD_SUIT_CLUBS]: CARD_SUITS.CARD_SUIT_CLUBS,
  [CARD_SUITS.CARD_SUIT_SPADES]: CARD_SUITS.CARD_SUIT_SPADES,
});

const SUIT_TO_CHAR_MAP = Object.freeze({
  [CARD_SUITS.CARD_SUIT_HEARTS]: "H",
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: "D",
  [CARD_SUITS.CARD_SUIT_CLUBS]: "C",
  [CARD_SUITS.CARD_SUIT_SPADES]: "S",
});

const VALUE_TO_CHAR_MAP = Object.freeze({
  9: "9",
  10: "T",
  10: "T",
  J: "J",
  Q: "Q",
  K: "K",
  A: "A",
  9: "9",
  J: "J",
  Q: "Q",
  K: "K",
  A: "A",
});

const VALUE_TO_NAME_MAP = Object.freeze({
  9: "9",
  10: "10",
  10: "10",
  J: "J",
  Q: "Q",
  K: "K",
  A: "A",
  9: "9",
  J: "J",
  Q: "Q",
  K: "K",
  A: "A",
});

/* -------------------------
   Helper: normalizeSuit
   - Accepts:
     - canonical constant strings (CARD_SUIT_HEARTS)
     - short names (hearts, HEARTS)
     - canonical keys (CARD_SUIT_HEARTS)
   - Returns:
     - CARD_SUIT_* constant string or null for unknown string
     - throws InvalidCardError for non-string or empty input
   ------------------------- */
function normalizeSuit(suit) {
  if (suit === null || suit === undefined) {
    throw new InvalidCardError("Suit must be a non-empty string");
  }
  if (typeof suit !== "string") {
    throw new InvalidCardError("Suit must be a string");
  }
  const trimmed = suit.trim();
  if (trimmed === "") {
    throw new InvalidCardError("Suit must be a non-empty string");
  }

  // direct match for constant form
  if (SUIT_CONSTANT_TO_NAME_MAP[trimmed]) {
    return trimmed; // already CARD_SUIT_*
  }

  const lower = trimmed.toLowerCase();

  // common names: hearts, diamonds, clubs, spades
  if (SUIT_TO_NAME_MAP[lower]) {
    return SUIT_TO_NAME_MAP[lower];
  }

  // Accept input like 'HEARTS' or 'SPADES' as synonyms
  if (lower === "hearts") return CARD_SUITS.CARD_SUIT_HEARTS;
  if (lower === "diamonds") return CARD_SUITS.CARD_SUIT_DIAMONDS;
  if (lower === "clubs") return CARD_SUITS.CARD_SUIT_CLUBS;
  if (lower === "spades") return CARD_SUITS.CARD_SUIT_SPADES;

  // unknown but string -> return null (tests expect null for invalid suited strings)
  return null;
}

/* -------------------------
   getPartnerSuit
   - Returns the same-color partner suit (hearts <-> diamonds, spades <-> clubs)
   - Accepts normalized suit constant or anything accepted by normalizeSuit
   - Throws InvalidCardError for unknown suit
   ------------------------- */
function getPartnerSuit(suit) {
  const normalized = normalizeSuit(suit);
  if (!normalized) throw new InvalidCardError(`Invalid suit: ${suit}`);

  switch (normalized) {
    case CARD_SUITS.CARD_SUIT_HEARTS:
      return CARD_SUITS.CARD_SUIT_DIAMONDS;
    case CARD_SUITS.CARD_SUIT_DIAMONDS:
      return CARD_SUITS.CARD_SUIT_HEARTS;
    case CARD_SUITS.CARD_SUIT_SPADES:
      return CARD_SUITS.CARD_SUIT_CLUBS;
    case CARD_SUITS.CARD_SUIT_CLUBS:
      return CARD_SUITS.CARD_SUIT_SPADES;
    default:
      throw new InvalidCardError(`Invalid suit: ${suit}`);
  }
}

/* -------------------------
   Bower identification
   - isRightBower(card, trumpSuit)
   - isLeftBower(card, trumpSuit)
   - getEffectiveSuit(card, trumpSuit)
   ------------------------- */
function isRightBower(card, trumpSuit) {
  if (!card || typeof card !== "object") {
    throw new InvalidCardError("Invalid card object");
  }
  if (!card.hasOwnProperty("suit")) {
    throw new InvalidCardError("Card must have suit");
  }
  if (!card.hasOwnProperty("value")) {
    throw new InvalidCardError("Card must have value");
  }
  if (!trumpSuit) return false;

  if (String(card.value) !== "J") return false;

  const normalizedCardSuit = normalizeSuit(card.suit);
  const normalizedTrump = normalizeSuit(trumpSuit);
  if (!normalizedCardSuit || !normalizedTrump) {
    throw new InvalidCardError("Invalid suit");
  }
  return normalizedCardSuit === normalizedTrump;
}

function isLeftBower(card, trumpSuit) {
  if (!card || typeof card !== "object") {
    throw new InvalidCardError("Invalid card object");
  }
  if (!card.hasOwnProperty("suit")) {
    throw new InvalidCardError("Card must have suit");
  }
  if (!card.hasOwnProperty("value")) {
    throw new InvalidCardError("Card must have value");
  }
  if (!trumpSuit) return false;

  if (String(card.value) !== "J") return false;

  const normalizedCardSuit = normalizeSuit(card.suit);
  const normalizedTrump = normalizeSuit(trumpSuit);
  if (!normalizedCardSuit || !normalizedTrump) {
    throw new InvalidCardError("Invalid suit");
  }

  const partner = getPartnerSuit(normalizedTrump);
  return normalizedCardSuit === partner;
}

//original before gpt5 attempted fixes
//function getEffectiveSuit(card, trumpSuit) {
//  if (!card || typeof card !== "object") return null;
//  if (!card.suit) return null;
//
//  // Left bower behaves as trump suit
//  if (isLeftBower(card, trumpSuit)) {
//    return normalizeSuit(trumpSuit);
//  }
//
//  return normalizeSuit(card.suit);
//}

function getEffectiveSuit(card, trumpSuit) {
  if (typeof card !== "object" || card === null) {
    throw new InvalidCardError("Card must be a non-null object");
  }
  if (typeof card.suit !== "string" || typeof card.value !== "string") {
    throw new InvalidCardError("Card must have suit and value strings");
  }
  if (isLeftBower(card, trumpSuit)) return trumpSuit;
  return card.suit;
}



/* -------------------------
   Suit color helpers
   ------------------------- */
function getSuitColor(suit) {
  const normalized = normalizeSuit(suit);
  if (!normalized) throw new InvalidCardError(`Invalid suit: ${suit}`);

  switch (normalized) {
    case CARD_SUITS.CARD_SUIT_HEARTS:
    case CARD_SUITS.CARD_SUIT_DIAMONDS:
      return "red";
    case CARD_SUITS.CARD_SUIT_CLUBS:
    case CARD_SUITS.CARD_SUIT_SPADES:
      return "black";
    default:
      throw new InvalidCardError(`Invalid suit: ${suit}`);
  }
}

function areSameColor(suit1, suit2) {
  if (
    suit1 === null ||
    suit1 === undefined ||
    suit2 === null ||
    suit2 === undefined
  ) {
    return false;
  }
  try {
    return getSuitColor(suit1) === getSuitColor(suit2);
  } catch (e) {
    return false;
  }
}

/* -------------------------
   Formatting helpers: cardToId, idToCard
   - cardToId({ suit, value }) => "AH", "TD", "9C", "JS"
   - idToCard("AH") => { suit: CARD_SUIT_HEARTS, value: 'A' }
   - Accepts both "10H" and "TH"
   ------------------------- */
function cardToId(card) {
  if (!card || typeof card !== "object") {
    throw new InvalidCardError("Card must be an object");
  }
  if (!card.hasOwnProperty("suit")) {
    throw new InvalidCardError("Card is missing suit property");
  }
  if (!card.hasOwnProperty("value")) {
    throw new InvalidCardError("Card is missing value property");
  }

  const normalizedSuit = normalizeSuit(card.suit);
  if (!normalizedSuit) {
    throw new InvalidCardError(`Invalid suit: ${card.suit}`);
  }

  const char = VALUE_TO_CHAR_MAP[String(card.value)];
  if (!char) {
    // If value isn't a known value, use first character uppercased (keeps old behavior)
    const v = String(card.value);
    if (!v || v.length === 0) {
      throw new InvalidCardError("Card is missing value property");
    }
    return `${v.charAt(0).toUpperCase()}${SUIT_TO_CHAR_MAP[normalizedSuit]}`;
  }

  const suitChar = SUIT_TO_CHAR_MAP[normalizedSuit];
  return `${char}${suitChar}`;
}

function idToCard(id) {
  if (id === null || id === undefined) {
    throw new InvalidCardError("ID must be provided");
  }
  if (typeof id !== "string") {
    throw new InvalidCardError("ID must be a string");
  }
  const trimmed = id.trim();
  if (trimmed.length < 2) {
    throw new InvalidCardError("Invalid card id");
  }

  // Accept '10H' or 'TH'
  let valuePart;
  let suitChar;
  if (trimmed.length === 3) {
    // likely '10H'
    valuePart = trimmed.slice(0, 2);
    suitChar = trimmed.charAt(2).toUpperCase();
  } else {
    valuePart = trimmed.charAt(0).toUpperCase();
    suitChar = trimmed.charAt(1).toUpperCase();
  }

  // convert 'T' to '10'
  if (valuePart === "T") valuePart = "10";

  // value validation
  if (!Object.values(VALUE_TO_NAME_MAP).includes(valuePart)) {
    throw new InvalidCardError(`Invalid card value: ${valuePart}`);
  }

  // suit char -> suit constant
  const suitEntry = Object.entries(SUIT_TO_CHAR_MAP).find(
    ([, ch]) => ch === suitChar
  );
  if (!suitEntry) {
    throw new InvalidCardError(`Invalid suit character: ${suitChar}`);
  }
  const suitConstant = suitEntry[0];

  return {
    suit: suitConstant,
    value: VALUE_TO_NAME_MAP[valuePart] || valuePart,
  };
}

/* -------------------------
   Ranking helpers
   - getBaseRankValue(value)
   - getCardRank(card, trumpSuit)
   - sortHand(hand, trumpSuit)
   ------------------------- */
function getBaseRankValue(value) {
  if (value === null || value === undefined) {
    throw new InvalidCardError("Invalid card value");
  }
  const v = String(value).toUpperCase();
  switch (v) {
    case "A":
    case "ACE":
      return 6;
    case "K":
    case "KING":
      return 5;
    case "Q":
    case "QUEEN":
      return 4;
    case "J":
    case "JACK":
      return 3;
    case "10":
    case "T":
      return 2;
    case "9":
      return 1;
    default:
      throw new InvalidCardError(`Invalid card value: ${value}`);
  }
}

/**
 * getCardRank
 * - Right bower: 100
 * - Left bower: 90
 * - Other trump: 50 + baseValue
 * - Non-trump: baseValue
 */
function getCardRank(card, trumpSuit) {
  if (!card || typeof card !== "object") {
    throw new InvalidCardError("Invalid card object");
  }
  if (!card.hasOwnProperty("value")) {
    throw new InvalidCardError("Card must have value");
  }
  // Right bower
  if (isRightBower(card, trumpSuit)) return 100;
  // Left bower
  if (isLeftBower(card, trumpSuit)) return 90;

  const base = getBaseRankValue(card.value);

  // If card's effective suit is trump, offset by 50
  const effSuit = getEffectiveSuit(card, trumpSuit);
  if (effSuit && normalizeSuit(effSuit) === normalizeSuit(trumpSuit)) {
    return 50 + base;
  }
  return base;
}

/**
 * sortHand
 * - Returns new array sorted by: trump (desc), rank (desc), suit char (asc)
 * - Invalid cards placed at the end and logger.warn called
 */
function sortHand(hand, trumpSuit) {
  if (!Array.isArray(hand)) return [];

  const processed = [];
  const invalids = [];

  for (const c of hand) {
    try {
      if (!c || typeof c !== "object" || !c.value || !c.suit) {
        throw new Error("Invalid card");
      }
      // compute rank; this may throw InvalidCardError for invalid values
      const rank = getCardRank(c, trumpSuit);
      const suitNorm =
        normalizeSuit(getEffectiveSuit(c, trumpSuit) || c.suit) || c.suit;
      const suitChar = SUIT_TO_CHAR_MAP[suitNorm] || "Z";
      processed.push({ card: c, rank, suitChar });
    } catch (err) {
      invalids.push(c && c.id ? c : { id: c && c.id ? c.id : "invalid" });
      logger &&
        typeof logger.warn === "function" &&
        logger.warn(
          `Invalid card in sortHand: ${JSON.stringify(c)} -- placed at end`
        );
    }
  }

  processed.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank; // higher ranks first
    // tie-break by suit char ascending
    if (a.suitChar < b.suitChar) return -1;
    if (a.suitChar > b.suitChar) return 1;
    return 0;
  });

  const ordered = processed.map((p) => p.card).concat(invalids);
  return ordered;
}

/* -------------------------
   Exports
   ------------------------- */
export {
  SUIT_CONSTANT_TO_NAME_MAP,
  SUIT_TO_CHAR_MAP,
  SUIT_TO_NAME_MAP,
  VALUE_TO_CHAR_MAP,
  VALUE_TO_NAME_MAP,
  normalizeSuit,
  getPartnerSuit,
  isRightBower,
  isLeftBower,
  getEffectiveSuit,
  getSuitColor,
  areSameColor,
  cardToId,
  idToCard,
  getBaseRankValue,
  getCardRank,
  sortHand,
};
