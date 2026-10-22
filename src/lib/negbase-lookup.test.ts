import { describe, expect, it } from "vitest";
import { negbase } from "@/data/edd";
import { negbaseLookup } from "./edd-flow";

describe("Negative Database lookup", () => {
  it("money mule UPI is found", () => expect(negbaseLookup(negbase, { account: "XXXX4821", upi: "rahul.v88@okbank" }).match?.id).toBe("NB-09"));
  it("Sailee's account is found", () => expect(negbaseLookup(negbase, { account: "9120303032" }).match?.id).toBe("NB-10"));
  it("decoy mobile with country code is found", () => expect(negbaseLookup(negbase, { account: "9120303030", mobile: "+91 90000 11122" }).match?.id).toBe("NB-11"));
  it("Ranga has no match", () => expect(negbaseLookup(negbase, { account: "9120303030", mobile: "9876543210" }).hit).toBe(false));
  it("Anita has no match", () => expect(negbaseLookup(negbase, { account: "XXXX1205", upi: "anita.j@okhdfc" }).hit).toBe(false));
});
