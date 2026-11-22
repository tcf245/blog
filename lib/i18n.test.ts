// Run: npm test  (node --test with built-in TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import { htmlLangFor, isLang, negotiateLang, otherLang } from "./i18n.ts";

test("isLang and helpers handle supported languages", () => {
    assert.equal(isLang("en"), true);
    assert.equal(isLang("zh"), true);
    assert.equal(isLang("ja"), false);
    assert.equal(isLang(""), false);
    assert.equal(isLang(undefined), false);

    assert.equal(htmlLangFor("en"), "en");
    assert.equal(htmlLangFor("zh"), "zh-CN");

    assert.equal(otherLang("en"), "zh");
    assert.equal(otherLang("zh"), "en");
});

test("negotiateLang prefers a valid lang cookie over Accept-Language", () => {
    assert.equal(negotiateLang("zh", "en-US,en;q=0.9"), "zh");
    assert.equal(negotiateLang("en", "zh-CN,zh;q=0.9"), "en");
    // Invalid cookie falls back to Accept-Language
    assert.equal(negotiateLang("ja", "zh-TW,zh;q=0.9"), "zh");
    assert.equal(negotiateLang("", "zh-CN"), "zh");
});

test("negotiateLang walks Accept-Language in descending q order", () => {
    assert.equal(negotiateLang(undefined, "zh-TW,zh;q=0.9"), "zh");
    assert.equal(negotiateLang(undefined, "en-US,en;q=0.9,zh-CN;q=0.8"), "en");
    assert.equal(negotiateLang(undefined, "ja,zh;q=0.5"), "zh");
    assert.equal(negotiateLang(undefined, ""), "en");
    assert.equal(negotiateLang(undefined, null), "en");
    assert.equal(negotiateLang(undefined, "en;q=0.5,zh;q=0.9"), "zh");
    assert.equal(negotiateLang(undefined, "zh;q=0,en;q=0.5"), "en");
    assert.equal(negotiateLang(undefined, "fr,de;q=0.8"), "en");
});
