import cloudinary from './cloudinary.js';

export function getResourceType(mimeType) {
  if (!mimeType) return 'raw';
  if (mimeType === 'application/pdf') return 'raw';
  if (mimeType.startsWith('image/')) return 'image';
  return 'raw';
}

export function destroyCloudinaryAsset(publicId, resourceType) {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
