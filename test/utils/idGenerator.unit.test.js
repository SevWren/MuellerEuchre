// filepath: test/utils/idGenerator.unit.test.js

import { expect } from "chai";
import { generateGameId } from "../../src/utils/idGenerator.js";

describe("idGenerator", () => {
  describe("generateGameId()", () => {
    it("should return a string", () => {
      const id = generateGameId();
      expect(id).to.be.a("string");
    });

    it("should return an ID of length 10", () => {
      const id = generateGameId();
      expect(id).to.have.lengthOf(10);
    });

    it("should generate unique IDs on successive calls", () => {
      const id1 = generateGameId();
      const id2 = generateGameId();
      expect(id1).to.not.equal(id2);
    });

    it("should generate a large number of unique IDs", () => {
      const numIds = 1000;
      const ids = new Set();
      for (let i = 0; i < numIds; i++) {
        ids.add(generateGameId());
      }
      expect(ids.size).to.equal(numIds);
    });
  });
});
