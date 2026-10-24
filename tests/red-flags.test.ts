import { describe, expect, it } from "vitest";
import { checkRedFlags } from "@/lib/safety/red-flags";

describe("checkRedFlags", () => {
  it("does not flag ordinary wellness text", () => {
    expect(checkRedFlags("मुझे रोज़ थोड़ी एसिडिटी होती है").flagged).toBe(false);
    expect(checkRedFlags("I have acidity after dinner").flagged).toBe(false);
  });

  it("flags emergency symptoms in English", () => {
    const result = checkRedFlags("I have chest pain since morning");
    expect(result.flagged).toBe(true);
    if (result.flagged) expect(result.kind).toBe("emergency");
  });

  it("flags emergency symptoms in transliterated Hindi", () => {
    const result = checkRedFlags("seene mein dard ho raha hai");
    expect(result.flagged).toBe(true);
    if (result.flagged) expect(result.kind).toBe("emergency");
  });

  it("flags self-harm language and marks it as self_harm", () => {
    const result = checkRedFlags("I want to die");
    expect(result.flagged).toBe(true);
    if (result.flagged) expect(result.kind).toBe("self_harm");
  });

  it("gives self-harm priority when both kinds of text appear", () => {
    const result = checkRedFlags("chest pain and I want to die");
    expect(result.flagged).toBe(true);
    if (result.flagged) expect(result.kind).toBe("self_harm");
  });
});