import { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';

// Configure with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Basic auth check - Ensure only authenticated users can use this endpoint
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // For signing an upload
  if (req.method === 'POST') {
    const { paramsToSign } = req.body || {};
    
    if (!paramsToSign) {
      // If no specific params provided, generate a default timestamp-based signature
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, upload_preset: 'calebdeck' },
        process.env.CLOUDINARY_API_SECRET || ''
      );
      
      return res.status(200).json({ 
        timestamp, 
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY 
      });
    }

    // Sign provided params
    try {
      const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET || ''
      );
      return res.status(200).json({ 
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY 
      });
    } catch (error) {
      console.error('Signing error:', error);
      return res.status(500).json({ error: 'Failed to sign request' });
    }
  }

  // For deleting media
  if (req.method === 'DELETE') {
    const { public_id, resource_type = 'image' } = req.query;
    
    if (!public_id || typeof public_id !== 'string') {
      return res.status(400).json({ error: 'Missing public_id' });
    }

    try {
      const result = await cloudinary.uploader.destroy(public_id, { resource_type: resource_type as string });
      return res.status(200).json(result);
    } catch (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete media' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
