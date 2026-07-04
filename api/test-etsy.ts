import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const key = (req.query.key as string) || process.env.ETSY_API_KEY || "34axrr0o1tzjvfcdn2mexpp4";
    const secret = (req.query.secret as string) || process.env.ETSY_SHARED_SECRET || "f5njekm23y";
    const listingId = (req.query.listing_id as string) || "1250961052";

    const authString = `${key}:${secret}`;

    const maskedKey = key && key.length > 8 
      ? key.substring(0, 4) + "..." + key.substring(key.length - 4)
      : "invalid-key";
      
    const maskedSecret = secret && secret.length > 3 
      ? secret.substring(0, 3) + "..." 
      : "invalid-secret";

    try {
      const response = await axios.get(`https://openapi.etsy.com/v3/application/listings/${listingId}`, {
        headers: {
          'x-api-key': authString
        },
        timeout: 10000
      });

      return res.status(200).json({
        success: true,
        keys_used: {
          ETSY_API_KEY: maskedKey,
          ETSY_SHARED_SECRET: maskedSecret
        },
        etsy_response: {
          status: response.status,
          data: response.data
        }
      });
    } catch (etsyErr: any) {
      return res.status(200).json({
        success: false,
        keys_used: {
          ETSY_API_KEY: maskedKey,
          ETSY_SHARED_SECRET: maskedSecret
        },
        error_source: "Etsy API Call",
        status: etsyErr.response?.status || 500,
        data: etsyErr.response?.data || etsyErr.message
      });
    }

  } catch (globalErr: any) {
    return res.status(200).json({
      success: false,
      error_source: "Server Internal",
      message: globalErr.message
    });
  }
}
