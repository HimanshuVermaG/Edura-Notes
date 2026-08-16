import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isConfigured =
  typeof cloudName === 'string' && cloudName.trim() !== '' &&
  typeof apiKey === 'string' && apiKey.trim() !== '' &&
  typeof apiSecret === 'string' && apiSecret.trim() !== '';

if (!isConfigured) {
  console.warn(
    'Cloudinary: missing or empty env vars (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). ' +
    'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env. File uploads will fail until then.'
  );
} else {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export default cloudinary;
export { isConfigured as isCloudinaryConfigured };
