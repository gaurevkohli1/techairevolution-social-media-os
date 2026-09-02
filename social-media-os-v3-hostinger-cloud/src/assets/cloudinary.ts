import { v2 as cloudinary } from "cloudinary";
import { config } from "../config.js";

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true
});

export async function uploadAsset(source: string, publicId: string) {
  const result = await cloudinary.uploader.upload(source, {
    public_id: publicId,
    overwrite: false,
    resource_type: "image"
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format
  };
}
