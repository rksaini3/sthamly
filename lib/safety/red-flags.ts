// Keyword rules are the first safety layer. The term list must be reviewed by a
// medical reviewer, and it must include common Hindi and transliterated terms.

export const EMERGENCY_MESSAGE =
  "What you describe may need urgent medical care. Please call 112 (India emergency number) or go to the nearest hospital now. Sthamly cannot help with emergencies.";

export const SELF_HARM_MESSAGE =
  "I am sorry you are feeling this way. You deserve support right now. Please call Tele-MANAS on 14416 (or 1-800-891-4416), or 112 if you are in danger. Talking to someone you trust nearby can help too.";

const EMERGENCY_PATTERNS: RegExp[] = [
  /chest (pain|pressure|tightness)/i,
  /(can'?t|cannot|difficulty( in)?)\s+breath|breathless|shortness of breath/i,
  /fainted|passed out|unconscious/i,
  /vomiting blood|black stool|blood in (my )?(vomit|stool|urine)/i,
  /severe (abdominal|stomach|belly) pain/i,
  /pregnan\w*.*bleed|bleed\w*.*pregnan/i,
  /stiff neck.*fever|fever.*stiff neck/i,
  /face droop|slurred speech|one side (of (my|the) body )?(is )?numb/i,
  /seene (mein|me) (dard|dabav|jakad)|saans (nahi|ruk)|behosh/i,
];

const SELF_HARM_PATTERNS: RegExp[] = [
  /suicid|kill myself|end my life|self[- ]?harm|want to die/i,
  /khudkhushi|khud ko (maar|khatam)|marna chahta|marna chahti/i,
];

export type SafetyResult =
  | { flagged: false }
  | { flagged: true; kind: "emergency" | "self_harm"; message: string };

export function checkRedFlags(text: string): SafetyResult {
  if (SELF_HARM_PATTERNS.some((p) => p.test(text))) {
    return { flagged: true, kind: "self_harm", message: SELF_HARM_MESSAGE };
  }
  if (EMERGENCY_PATTERNS.some((p) => p.test(text))) {
    return { flagged: true, kind: "emergency", message: EMERGENCY_MESSAGE };
  }
  return { flagged: false };
}