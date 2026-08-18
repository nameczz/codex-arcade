(function attachSolitaireCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SolitaireCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function makeSolitaireCore() {
  "use strict";

  const SUITS = Object.freeze(["spades", "hearts", "diamonds", "clubs"]);
  const SUIT_SYMBOLS = Object.freeze({ spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" });

  function colorOf(suit) { return suit === "hearts" || suit === "diamonds" ? "red" : "black"; }
  function rankLabel(rank) { return rank === 1 ? "A" : rank === 11 ? "J" : rank === 12 ? "Q" : rank === 13 ? "K" : String(rank); }
  function makeDeck() {
    const deck = [];
    for (const suit of SUITS) for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ id: `${suit}-${rank}`, suit, rank, color: colorOf(suit), faceUp: false });
    }
    return deck;
  }
  function cloneCard(card) { return { ...card }; }
  function clonePiles(piles) { return piles.map((pile) => pile.map(cloneCard)); }
  function isDescendingAlternating(upper, lower) { return upper.faceUp && lower.faceUp && upper.rank === lower.rank + 1 && upper.color !== lower.color; }
  function canPlaceOnTableau(card, target) { return target ? target.faceUp && target.rank === card.rank + 1 && target.color !== card.color : card.rank === 13; }
  function canPlaceOnFoundation(card, pile) { return card.suit === pile.suit && card.rank === pile.cards.length + 1; }

  class SolitaireGame {
    constructor(options = {}) {
      this.random = typeof options.random === "function" ? options.random : Math.random;
      this.newGame();
    }

    shuffledDeck() {
      const deck = makeDeck();
      for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.max(0, Math.min(i, Math.floor(this.random() * (i + 1))));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    }

    newGame() {
      const deck = this.shuffledDeck();
      this.tableau = Array.from({ length: 7 }, () => []);
      for (let col = 0; col < 7; col += 1) {
        for (let row = 0; row <= col; row += 1) {
          const card = deck.pop();
          card.faceUp = row === col;
          this.tableau[col].push(card);
        }
      }
      this.stock = deck;
      this.waste = [];
      this.foundations = Object.fromEntries(SUITS.map((suit) => [suit, []]));
      this.score = 0;
      this.moves = 0;
      this.redeals = 0;
      this.won = false;
      this.lost = false;
      this.history = [];
      this.events = [{ type: "new-game" }];
      return this.snapshot();
    }

    capture() {
      return {
        tableau: clonePiles(this.tableau), stock: this.stock.map(cloneCard), waste: this.waste.map(cloneCard),
        foundations: Object.fromEntries(SUITS.map((suit) => [suit, this.foundations[suit].map(cloneCard)])),
        score: this.score, moves: this.moves, redeals: this.redeals, won: this.won, lost: this.lost,
      };
    }

    restore(state) {
      this.tableau = clonePiles(state.tableau); this.stock = state.stock.map(cloneCard); this.waste = state.waste.map(cloneCard);
      this.foundations = Object.fromEntries(SUITS.map((suit) => [suit, state.foundations[suit].map(cloneCard)]));
      this.score = state.score; this.moves = state.moves; this.redeals = state.redeals; this.won = state.won; this.lost = state.lost;
    }

    record() { this.history.push(this.capture()); if (this.history.length > 200) this.history.shift(); }
    commit(event) { this.moves += 1; this.events = [event]; this.updateOutcome(); return this.snapshot(); }

    undo() {
      if (!this.history.length) return false;
      this.restore(this.history.pop()); this.events = [{ type: "undo" }]; return true;
    }

    draw() {
      if (this.won) return false;
      if (this.stock.length) {
        this.record(); const card = this.stock.pop(); card.faceUp = true; this.waste.push(card);
        this.commit({ type: "draw", card: card.id }); return true;
      }
      if (this.waste.length) {
        this.record(); this.stock = this.waste.reverse(); this.waste = [];
        for (const card of this.stock) card.faceUp = false;
        this.redeals += 1; this.score = Math.max(0, this.score - 20);
        this.commit({ type: "redeal" }); return true;
      }
      return false;
    }

    validRun(cards) {
      if (!cards.length || cards.some((card) => !card.faceUp)) return false;
      for (let i = 0; i < cards.length - 1; i += 1) if (!isDescendingAlternating(cards[i], cards[i + 1])) return false;
      return true;
    }

    revealTop(col) {
      const pile = this.tableau[col]; const top = pile[pile.length - 1];
      if (top && !top.faceUp) { top.faceUp = true; this.score += 5; this.events.push({ type: "reveal", card: top.id }); return true; }
      return false;
    }

    moveTableauToTableau(fromCol, start, toCol) {
      if (fromCol === toCol || !this.tableau[fromCol] || !this.tableau[toCol]) return false;
      const source = this.tableau[fromCol];
      if (!Number.isInteger(start) || start < 0 || start >= source.length) return false;
      const run = source.slice(start); if (!this.validRun(run)) return false;
      const target = this.tableau[toCol]; if (!canPlaceOnTableau(run[0], target[target.length - 1])) return false;
      this.record(); target.push(...source.splice(start)); this.score += 5; this.events = [{ type: "move-tableau", count: run.length }];
      this.revealTop(fromCol); this.commit(this.events.shift()); return true;
    }

    moveWasteToTableau(toCol) {
      const card = this.waste[this.waste.length - 1]; const target = this.tableau[toCol];
      if (!card || !target || !canPlaceOnTableau(card, target[target.length - 1])) return false;
      this.record(); target.push(this.waste.pop()); this.score += 5; this.commit({ type: "waste-tableau", card: card.id }); return true;
    }

    moveFoundationToTableau(suit, toCol) {
      const pile = this.foundations[suit]; const target = this.tableau[toCol]; const card = pile && pile[pile.length - 1];
      if (!card || !target || !canPlaceOnTableau(card, target[target.length - 1])) return false;
      this.record(); target.push(pile.pop()); this.score = Math.max(0, this.score - 10); this.commit({ type: "foundation-tableau", card: card.id }); return true;
    }

    moveToFoundation(source) {
      let card;
      if (source.type === "waste") card = this.waste[this.waste.length - 1];
      else if (source.type === "tableau" && this.tableau[source.col]) card = this.tableau[source.col][this.tableau[source.col].length - 1];
      else return false;
      if (!card || !card.faceUp || !canPlaceOnFoundation(card, { suit: card.suit, cards: this.foundations[card.suit] })) return false;
      this.record();
      if (source.type === "waste") this.waste.pop(); else this.tableau[source.col].pop();
      this.foundations[card.suit].push(card); this.score += 10; this.events = [{ type: "foundation", card: card.id }];
      if (source.type === "tableau") this.revealTop(source.col);
      this.commit(this.events.shift()); return true;
    }

    autoMove(source) { return this.moveToFoundation(source); }

    availableMoves() {
      const moves = [];
      const waste = this.waste[this.waste.length - 1];
      if (waste) {
        if (canPlaceOnFoundation(waste, { suit: waste.suit, cards: this.foundations[waste.suit] })) moves.push({ from: "waste", to: "foundation", card: waste });
        this.tableau.forEach((pile, col) => { if (canPlaceOnTableau(waste, pile[pile.length - 1])) moves.push({ from: "waste", to: "tableau", col, card: waste }); });
      }
      this.tableau.forEach((pile, fromCol) => {
        const top = pile[pile.length - 1];
        if (top && top.faceUp && canPlaceOnFoundation(top, { suit: top.suit, cards: this.foundations[top.suit] })) moves.push({ from: "tableau", fromCol, start: pile.length - 1, to: "foundation", card: top });
        pile.forEach((card, start) => {
          if (!card.faceUp || !this.validRun(pile.slice(start))) return;
          this.tableau.forEach((target, toCol) => { if (fromCol !== toCol && canPlaceOnTableau(card, target[target.length - 1])) moves.push({ from: "tableau", fromCol, start, to: "tableau", toCol, card }); });
        });
      });
      for (const suit of SUITS) {
        const card = this.foundations[suit][this.foundations[suit].length - 1];
        if (!card) continue;
        this.tableau.forEach((pile, col) => {
          if (canPlaceOnTableau(card, pile[pile.length - 1])) moves.push({ from: "foundation", suit, to: "tableau", col, card });
        });
      }
      return moves;
    }

    hint() {
      const moves = this.availableMoves();
      if (moves.length) return moves[0];
      if (this.stock.length || this.waste.length) return { from: "stock", to: "waste" };
      return null;
    }

    updateOutcome() {
      this.won = SUITS.every((suit) => this.foundations[suit].length === 13);
      this.lost = !this.won && !this.stock.length && !this.waste.length && this.availableMoves().length === 0;
    }

    countCards() {
      return this.stock.length + this.waste.length + this.tableau.reduce((sum, pile) => sum + pile.length, 0) + SUITS.reduce((sum, suit) => sum + this.foundations[suit].length, 0);
    }

    snapshot() {
      return {
        tableau: clonePiles(this.tableau), stock: this.stock.map(cloneCard), waste: this.waste.map(cloneCard),
        foundations: Object.fromEntries(SUITS.map((suit) => [suit, this.foundations[suit].map(cloneCard)])),
        score: this.score, moves: this.moves, redeals: this.redeals, won: this.won, lost: this.lost,
        canUndo: this.history.length > 0, events: this.events.map((event) => ({ ...event })),
      };
    }
  }

  return { SolitaireGame, SUITS, SUIT_SYMBOLS, makeDeck, colorOf, rankLabel, isDescendingAlternating, canPlaceOnTableau, canPlaceOnFoundation };
});
