import { describe, it, expect } from "vitest";
import { parseCookies, checkCookies } from "../src/lib/scanner/cookies";

describe("parseCookies", () => {
  it("flags missing Secure, HttpOnly and SameSite", () => {
    const [cookie] = parseCookies(["session=abc123; Path=/"]);
    expect(cookie.secure).toBe(false);
    expect(cookie.httpOnly).toBe(false);
    expect(cookie.sameSite).toBeNull();
    expect(cookie.issues).toHaveLength(3);
  });

  it("recognizes a fully secure cookie", () => {
    const [cookie] = parseCookies(["session=abc123; Path=/; Secure; HttpOnly; SameSite=Strict"]);
    expect(cookie.secure).toBe(true);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Strict");
    expect(cookie.issues).toHaveLength(0);
  });

  it("flags SameSite=None without Secure", () => {
    const [cookie] = parseCookies(["session=abc123; SameSite=None"]);
    expect(cookie.issues.some((i) => i.includes("SameSite=None"))).toBe(true);
  });

  it("parses multiple Set-Cookie entries independently", () => {
    const cookies = parseCookies(["a=1; Secure; HttpOnly; SameSite=Lax", "b=2; Path=/"]);
    expect(cookies).toHaveLength(2);
    expect(cookies[0].name).toBe("a");
    expect(cookies[1].name).toBe("b");
    expect(cookies[1].issues.length).toBeGreaterThan(0);
  });
});

describe("checkCookies", () => {
  it("passes when there are no cookies", () => {
    expect(checkCookies([]).status).toBe("PASS");
  });

  it("warns when a cookie is missing Secure or HttpOnly", () => {
    expect(checkCookies(["session=abc; Path=/"]).status).toBe("WARNING");
  });

  it("passes when every cookie is fully configured", () => {
    expect(checkCookies(["session=abc; Secure; HttpOnly; SameSite=Strict"]).status).toBe("PASS");
  });
});
