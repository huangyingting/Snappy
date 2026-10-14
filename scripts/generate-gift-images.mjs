import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");
const OUT_DIR = path.join(ROOT, "public", "images", "gifts");

function loadApiKey() {
  if (process.env.MAI_IMAGE_API_KEY) return process.env.MAI_IMAGE_API_KEY.trim();
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error("Missing .env file with image model key");
  }
  const raw = fs.readFileSync(ENV_PATH, "utf8").trim();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.includes("=")) {
      const keyName = trimmed.split("=")[0].trim();
      if (keyName === "DATABASE_URL" || keyName === "DB_PROVIDER" || keyName === "NODE_ENV") {
        continue;
      }
      const val = trimmed.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
      if (val) return val;
    } else {
      return trimmed;
    }
  }
  throw new Error("No valid key found in .env");
}

export const GIFT_IMAGE_MANIFEST = [
  {
    slug: "apex-anc-headphones",
    prompt:
      "Commercial luxury studio product photography of wireless active noise cancelling over-ear headphones in brushed obsidian aluminum and cognac leather earcups, resting on a warm architectural travertine stone plinth, soft golden hour studio lighting, clean warm alabaster cyclorama background, 85mm f/4 lens, ultra detailed, no text, no watermark.",
  },
  {
    slug: "apex-magsafe-valet",
    prompt:
      "Commercial luxury studio product photography of a minimalist 3-in-1 magnetic wireless charging desk valet crafted from solid American walnut wood and anodized space-gray aluminum on an executive desk surface, soft warm studio lighting, clean stone background, 85mm studio lens, no text, no watermark.",
  },
  {
    slug: "apex-mechanical-keyboard",
    prompt:
      "Commercial luxury studio product photography of a compact 75-percent wireless mechanical keyboard with CNC machined bead-blasted aluminum frame and warm ivory and terracotta PBT keycaps, coiled aviator cable, resting on a warm travertine desk mat, soft editorial studio lighting, no text, no watermark.",
  },
  {
    slug: "apex-smart-mug",
    prompt:
      "Commercial luxury studio product photography of a matte ceramic temperature-control smart coffee mug in warm charcoal with a brushed copper charging coaster, gentle wisp of steam rising from espresso, warm sunlit architectural stone surface, editorial studio lighting, no text, no watermark.",
  },
  {
    slug: "nordic-merino-throw",
    prompt:
      "Commercial luxury studio product photography of a Scandinavian 100% merino wool woven throw blanket in warm oatmeal and sage herringbone pattern, artfully draped over a minimalist white oak bench with a ceramic cup beside it, soft natural Nordic daylight, no text, no watermark.",
  },
  {
    slug: "nordic-espresso-bar",
    prompt:
      "Commercial luxury studio product photography of an architectural stainless steel and matte black compact espresso maker machine with a walnut portafilter handle and two double-walled glass espresso cups on a limestone counter, warm editorial lighting, no text, no watermark.",
  },
  {
    slug: "nordic-aroma-diffuser",
    prompt:
      "Commercial luxury studio product photography of a hand-crafted matte sand-colored stoneware ultrasonic essential oil diffuser with a delicate mist rising, accompanied by two amber glass botanical oil bottles and dried eucalyptus on travertine stone, serene spa lighting, no text, no watermark.",
  },
  {
    slug: "nordic-sculptural-lamp",
    prompt:
      "Commercial luxury studio product photography of a cordless rechargeable architectural brass and pleated opal glass portable table lamp glowing with a warm candlelit ambiance on a travertine pedestal, Scandinavian luxury interior lighting, no text, no watermark.",
  },
  {
    slug: "kyoto-pourover-kettle",
    prompt:
      "Commercial luxury studio product photography of a Japanese hammered matte black and brass gooseneck pour-over coffee kettle with a ceramic origami dripper and walnut server carafe on a hinoki wood tray, soft zen studio lighting, no text, no watermark.",
  },
  {
    slug: "kyoto-matcha-set",
    prompt:
      "Commercial luxury studio product photography of an authentic Kyoto ceremonial matcha gift set featuring a hand-glazed emerald and charcoal chawan tea bowl, handcrafted bamboo whisk chasen on a ceramic stand, bamboo scoop, and brushed tin of vibrant green matcha powder on hinoki wood, no text, no watermark.",
  },
  {
    slug: "kyoto-titanium-tumbler",
    prompt:
      "Commercial luxury studio product photography of a double-wall vacuum insulated pure titanium travel tumbler with an anodized iridescent indigo-bronze finish and minimalist wooden lid on a dark slate stone block, crisp studio lighting, no text, no watermark.",
  },
  {
    slug: "andes-weekender-duffel",
    prompt:
      "Commercial luxury studio product photography of a handcrafted full-grain saddle tan leather and woven olive canvas weekender travel duffel bag with solid brass hardware and luggage tag, resting on a warm travertine studio plinth, luxury editorial lighting, no text, no watermark.",
  },
  {
    slug: "andes-cacao-tasting-box",
    prompt:
      "Commercial luxury studio product photography of an artisanal single-origin South American dark chocolate and specialty coffee tasting gift box in a linen-wrapped presentation case with gold foil accents, roasted cacao beans, and dark chocolate bars on warm stone, no text, no watermark.",
  },
  {
    slug: "andes-alpaca-travel-set",
    prompt:
      "Commercial luxury studio product photography of a plush Peruvian baby alpaca wool travel scarf and sleep mask set in warm caramel and ivory inside a minimalist linen gift box on a limestone surface, soft warm editorial studio lighting, no text, no watermark.",
  },
  {
    slug: "pacifica-botanical-spa",
    prompt:
      "Commercial luxury studio product photography of a luxury botanical apothecary spa gift collection featuring amber glass bath soak, organic body oil, volcanic clay mask, and a cedarwood soy candle arranged on a warm travertine tray with fresh olive branches, no text, no watermark.",
  },
  {
    slug: "pacifica-solar-pack",
    prompt:
      "Commercial luxury studio product photography of a sleek sustainable recycled ocean-canvas commuter backpack in deep forest green with leather accents and a magnetic portable power bank beside it on a natural stone plinth, crisp modern studio lighting, no text, no watermark.",
  },
];

async function generateOneImage(item, index, apiKey) {
  const outPath = path.join(OUT_DIR, `${item.slug}.png`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 50_000) {
    console.log(`[skip] ${item.slug}.png already exists`);
    return outPath;
  }

  // Alternate between MAI-Image-2.6-Flash (cap 6/min) and MAI-Image-2 (cap 9/min) to maximize throughput
  const models = index % 2 === 0 ? ["MAI-Image-2.6-Flash", "MAI-Image-2"] : ["MAI-Image-2", "MAI-Image-2.6-Flash"];
  const endpoint = "https://icsuaaieus.services.ai.azure.com/mai/v1/images/generations";

  for (let attempt = 0; attempt < 6; attempt++) {
    const model = models[attempt % models.length];
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: item.prompt,
          width: 1024,
          height: 1024,
        }),
      });

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") || "12");
        const waitMs = Math.max(retryAfter * 1000, 10_000) + Math.floor(Math.random() * 2000);
        console.log(`[429] ${item.slug} on ${model}, waiting ${(waitMs / 1000).toFixed(1)}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("Missing b64_json in response");
      }
      const buf = Buffer.from(b64, "base64");
      fs.writeFileSync(outPath, buf);
      console.log(`[ok] Generated ${item.slug}.png via ${model} (${(buf.length / 1024).toFixed(0)} KB)`);
      return outPath;
    } catch (err) {
      console.warn(`[warn] Attempt ${attempt + 1} failed for ${item.slug} (${model}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
  throw new Error(`Failed to generate ${item.slug} after retries`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const apiKey = loadApiKey();

  // Remove any temporary test image
  const testImg = path.join(OUT_DIR, "test-headphones.png");
  if (fs.existsSync(testImg)) fs.unlinkSync(testImg);

  // Process in controlled concurrency (2 at a time across the two deployments)
  const queue = GIFT_IMAGE_MANIFEST.map((item, idx) => ({ item, idx }));
  const workers = Array.from({ length: 2 }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      await generateOneImage(next.item, next.idx, apiKey);
    }
  });

  await Promise.all(workers);
  console.log(`All ${GIFT_IMAGE_MANIFEST.length} gift studio images ready in public/images/gifts/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
