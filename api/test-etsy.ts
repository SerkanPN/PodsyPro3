import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = process.env.ETSY_API_KEY || "34axrr0o1tzjvfcdn2mexpp4";
  const secret = process.env.ETSY_SHARED_SECRET || "f5njekm23y";
  const authString = `${key}:${secret}`;

  const maskedKey = key.substring(0, 4) + "..." + key.substring(key.length - 4);
  const maskedSecret = secret.substring(0, 3) + "...";

  try {
    const etsyRes = await fetch("https://openapi.etsy.com/v3/application/listings/active?limit=1", {
      headers: { "x-api-key": authString }
    });

    const text = await etsyRes.text();
    let parsedData = text;
    try {
      parsedData = JSON.parse(text);
    } catch (e) {}

    return res.json({
      vercel_read_keys: {
        ETSY_API_KEY: maskedKey,
        ETSY_SHARED_SECRET: maskedSecret,
        using_placeholder_fallback: key === "34axrr0o1tzjvfcdn2mexpp4"
      },
      etsy_raw_response: {
        status: etsyRes.status,
        data: parsedData
      }
    });
  } catch (err: any) {
    return res.json({ error: err.message });
  }
}
