import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getSessionFromCookies } from "@/lib/auth";

function resolveMaiApiKey(): string | null {
  if (process.env.MAI_IMAGE_API_KEY) {
    return process.env.MAI_IMAGE_API_KEY.trim();
  }
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("MAI_IMAGE_API_KEY=")) {
          return trimmed
            .slice("MAI_IMAGE_API_KEY=".length)
            .replace(/^["']|["']$/g, "")
            .trim();
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || !["VENDOR", "ADMIN"].includes(session.role)) {
      return NextResponse.json(
        { error: "Vendor or Admin authorization required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const title = String(body.title || "").trim();
    const category = String(body.category || "Luxury Gift").trim();
    const description = String(body.description || "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Product title is required to generate an AI studio image." },
        { status: 400 }
      );
    }

    const apiKey = resolveMaiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "MAI_IMAGE_API_KEY is not configured in environment." },
        { status: 500 }
      );
    }

    const studioPrompt =
      `Editorial luxury commercial product photography of "${title}" (${category}). ` +
      `${description ? `${description}. ` : ""}` +
      `Set on a warm travertine stone and natural oak pedestal with soft diffused morning window light, subtle architectural shadows, Kinfolk & Aesop studio aesthetic, crisp macro textures, 85mm f/2.8 lens, photorealistic, no text or watermarks.`;

    const endpoint = "https://icsuaaieus.services.ai.azure.com/mai/v1/images/generations";
    const models = ["MAI-Image-2.6-Flash", "MAI-Image-2"];

    let b64Image: string | null = null;
    let usedModel = models[0];

    for (const model of models) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: studioPrompt,
          width: 1024,
          height: 1024,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data?.[0]?.b64_json) {
          b64Image = json.data[0].b64_json;
          usedModel = model;
          break;
        }
      }
    }

    if (!b64Image) {
      return NextResponse.json(
        { error: "AI studio image generation failed or rate-limited." },
        { status: 502 }
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);
    const fileName = `studio-${slug || "gift"}-${Date.now().toString(36)}.png`;
    const outputDir = path.join(process.cwd(), "public", "images", "gifts");
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, fileName), Buffer.from(b64Image, "base64"));

    return NextResponse.json({
      imageUrl: `/images/gifts/${fileName}`,
      model: usedModel,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate AI image." },
      { status: 500 }
    );
  }
}
