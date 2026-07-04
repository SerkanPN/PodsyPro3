import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = (req.query.key as string) || process.env.ETSY_API_KEY || "34axrr0o1tzjvfcdn2mexpp4";
  const secret = (req.query.secret as string) || process.env.ETSY_SHARED_SECRET || "f5njekm23y";
  const listingId = (req.query.listing_id as string) || "1250961052";

  const authString = `${key}:${secret}`;

  const maskedKey = key.substring(0, 4) + "..." + key.substring(key.length - 4);
  const maskedSecret = secret.substring(0, 3) + "...";

  try {
    const etsyRes = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}`, {
      headers: { "x-api-key": authString }
    });

    const text = await etsyRes.text();
    let parsedData = text;
    try {
      parsedData = JSON.parse(text);
    } catch (e) {}

    retu
