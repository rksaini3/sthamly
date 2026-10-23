import type { Dosha, DoshaResult } from "./types";

type Profile = {
  name: string;
  theme: string;
  traits: string[];
  balance: string[];
};

export const PROFILES: Record<Dosha, Profile> = {
  vata: {
    name: "Vata",
    theme: "हल्कापन, गति और रचनात्मकता",
    traits: ["तेज़ दिमाग और नई चीज़ें जल्दी सीखना", "रचनात्मक और बदलाव पसंद करने वाले"],
    balance: [
      "खाने का समय रोज़ लगभग एक जैसा रखें",
      "गर्म और पका हुआ भोजन चुनें",
      "सोने से पहले शांत routine अपनाएँ",
    ],
  },
  pitta: {
    name: "Pitta",
    theme: "ऊर्जा, फोकस और नेतृत्व",
    traits: ["साफ़ सोच और लक्ष्य पर फोकस", "मेहनती और जिम्मेदारी लेने वाले"],
    balance: [
      "दोपहर में थोड़ा आराम लें",
      "ठंडा और हल्का भोजन चुनें",
      "तनाव में एक छोटा ब्रेक लें",
    ],
  },
  kapha: {
    name: "Kapha",
    theme: "स्थिरता, धैर्य और सहनशक्ति",
    traits: ["शांत स्वभाव और मजबूत याददाश्त", "भरोसेमंद और स्थिर"],
    balance: [
      "रोज़ सुबह थोड़ी सैर करें",
      "हल्का और मसालेदार भोजन चुनें",
      "नई आदतें छोटे कदमों से शुरू करें",
    ],
  },
};

export type ResultView = {
  title: string;
  theme: string;
  traits: string[];
  balance: string[];
};

export function describe(result: DoshaResult): ResultView {
  const parts = result.split("_") as Dosha[];

  if (parts.length === 1) {
    const p = PROFILES[parts[0]];
    return { title: p.name, theme: p.theme, traits: p.traits, balance: p.balance };
  }

  const [a, b] = parts.map((d) => PROFILES[d]);
  return {
    title: `${a.name} + ${b.name}`,
    theme: `${a.theme} और ${b.theme} का मिश्रण`,
    traits: [
      a.traits[0],
      b.traits[0],
      "आप दोनों का मिश्रण हैं, इसलिए आपका plan दोनों को ध्यान में रखेगा",
    ],
    balance: [a.balance[0], b.balance[0], a.balance[1]],
  };
}

export const DISCLAIMER =
  "यह self-reflection tool है, जो पारंपरिक Ayurvedic श्रेणियों पर आधारित है। यह कोई medical test नहीं है।";