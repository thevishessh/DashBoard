import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildAssertion, parseServiceAccount } from "./serviceAccount";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

describe("service account", () => {
  it("parses a key file, including escaped newlines", () => {
    const k = parseServiceAccount(JSON.stringify({ client_email: "x@p.iam.gserviceaccount.com", private_key: pem.replace(/\n/g, "\\n") }));
    expect(k.private_key).toContain("\n-----END PRIVATE KEY-----");
  });

  it("explains a missing or broken key", () => {
    expect(() => parseServiceAccount(undefined)).toThrow(/not set/);
    expect(() => parseServiceAccount("{oops")).toThrow(/not valid JSON/);
    expect(() => parseServiceAccount("{}")).toThrow(/client_email/);
  });

  it("builds a verifiable RS256 assertion with the right claims", () => {
    const jwt = buildAssertion({ client_email: "x@p.iam.gserviceaccount.com", private_key: pem }, "scope-a", 1000);
    const [h, c, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(c, "base64url").toString())).toMatchObject({ iss: "x@p.iam.gserviceaccount.com", scope: "scope-a", iat: 1000, exp: 4600 });
    const v = createVerify("RSA-SHA256");
    v.update(`${h}.${c}`);
    expect(v.verify(publicKey, Buffer.from(s, "base64url"))).toBe(true);
  });
});
