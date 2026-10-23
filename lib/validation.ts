import { z } from "zod";
import { SYMPTOMS } from "@/lib/symptoms";

const score = z.number().int().min(0).max(60);

export const doshaResultSchema = z.object({
  quiz_version: z.string().min(1).max(20),
  scores: z.object({
    vata: score,
    pitta: score,
    kapha: score,
  }),
  primary_dosha: z.enum([
    "vata",
    "pitta",
    "kapha",
    "vata_pitta",
    "pitta_kapha",
    "vata_kapha",
  ]),
  consent: z.literal(true),
});

export const logSchema = z.object({
  symptoms: z.array(z.enum(SYMPTOMS)).min(1).max(7),
  severity: z.number().int().min(1).max(5),
  note: z.string().max(280).optional(),
});

export const askSchema = z.object({
  question: z.string().trim().min(3).max(500),
});