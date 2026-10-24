-- Sthamly: starter content slots (v1).
-- Every slug here is used by lib/dosha/plan-rules.ts.
-- Rows are inserted as DRAFT with placeholder text. The app shows only APPROVED items.
-- A BAMS/MD reviewer must write the real text and approve each row (see the template at the bottom).
-- Safe to re-run: existing slugs are not changed.

insert into content_items (slug, kind, title, body_md, dosha_fit, status, source_ref, version) values
  -- Vata (primary)
  ('vata-warm-oatmeal', 'food', 'गर्म ओट्स का नाश्ता', '[reviewer draft needed]', '{"vata":"favour"}', 'draft', null, 1),
  ('vata-regular-meal-times', 'routine', 'खाने का नियमित समय', '[reviewer draft needed]', '{"vata":"favour"}', 'draft', null, 1),
  ('vata-slow-stretching', 'yoga', 'धीमा स्ट्रेच', '[reviewer draft needed]', '{"vata":"favour"}', 'draft', null, 1),
  ('vata-gentle-oil-moisturiser', 'skin', 'हल्का तेल से moisturise', '[reviewer draft needed]', '{"vata":"favour"}', 'draft', null, 1),

  -- Pitta (primary)
  ('pitta-cooling-lunch', 'food', 'ठंडा और हल्का दोपहर का भोजन', '[reviewer draft needed]', '{"pitta":"favour"}', 'draft', null, 1),
  ('pitta-midday-rest', 'routine', 'दोपहर में थोड़ा आराम', '[reviewer draft needed]', '{"pitta":"favour"}', 'draft', null, 1),
  ('pitta-calming-breath', 'yoga', 'शांत करने वाली साँस', '[reviewer draft needed]', '{"pitta":"favour"}', 'draft', null, 1),
  ('pitta-cooling-toner', 'skin', 'ठंडक देने वाला toner', '[reviewer draft needed]', '{"pitta":"favour"}', 'draft', null, 1),

  -- Kapha (primary)
  ('kapha-light-spiced-dal', 'food', 'हल्की मसालेदार दाल', '[reviewer draft needed]', '{"kapha":"favour"}', 'draft', null, 1),
  ('kapha-brisk-walk', 'routine', 'सुबह की तेज़ सैर', '[reviewer draft needed]', '{"kapha":"favour"}', 'draft', null, 1),
  ('kapha-energising-breath', 'yoga', 'ऊर्जा देने वाली साँस', '[reviewer draft needed]', '{"kapha":"favour"}', 'draft', null, 1),
  ('kapha-light-cleanser', 'skin', 'हल्का cleanser', '[reviewer draft needed]', '{"kapha":"favour"}', 'draft', null, 1),

  -- Symptom-based general items
  ('general-acidity-light-dinner', 'food', 'एसिडिटी के लिए हल्का रात का खाना', '[reviewer draft needed]', '{}', 'draft', null, 1),
  ('general-screen-free-wind-down', 'routine', 'सोने से पहले स्क्रीन-मुक्त समय', '[reviewer draft needed]', '{}', 'draft', null, 1),
  ('general-calming-breath', 'yoga', 'सोने से पहले की शांत साँस', '[reviewer draft needed]', '{}', 'draft', null, 1),
  ('general-small-slow-meals', 'food', 'छोटे और धीरे खाए गए भोजन', '[reviewer draft needed]', '{}', 'draft', null, 1),
  ('general-short-walk-after-meal', 'routine', 'खाने के बाद छोटी सैर', '[reviewer draft needed]', '{}', 'draft', null, 1),
  ('general-patch-test-new-products', 'skin', 'नया product लगाने से पहले छोटा test', '[reviewer draft needed]', '{}', 'draft', null, 1),
  ('general-light-regular-meals', 'food', 'कम भूख में हल्के और नियमित भोजन', '[reviewer draft needed]', '{}', 'draft', null, 1),

  -- Seasonal items
  ('season-summer-cooling-drinks', 'food', 'गर्मी में ठंडे पेय', '[reviewer draft needed]', '{}', 'draft', null, 1),
  ('season-monsoon-warm-cooked', 'food', 'बरसात में गर्म और पका भोजन', '[reviewer draft needed]', '{}', 'draft', null, 1),
  ('season-winter-early-sleep', 'routine', 'सर्दी में जल्दी सोना', '[reviewer draft needed]', '{}', 'draft', null, 1)
on conflict (slug) do nothing;

-- ---------- Approval template (run by the admin after reviewer sign-off) ----------
-- Replace the values, one row at a time. The reviewer must be a verified BAMS/MD practitioner.
--
-- update content_items
--    set body_md = $$ <final reviewed text, no disease claims> $$,
--        source_ref = 'Charaka Samhita / reviewer note',
--        reviewed_by = '<practitioner profile uuid>',
--        reviewed_at = now(),
--        status = 'approved'
--  where slug = 'vata-warm-oatmeal';