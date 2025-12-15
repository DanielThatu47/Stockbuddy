const cloudinary = require('cloudinary').v2;
const multer = require('multer');
require('dotenv').config();

/* -------------------- Cloudinary Configuration -------------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/* -------------------- Multer Configuration (Vercel Safe) -------------------- */
/*
  NOTE:
  - Same variable name: upload
  - Same usage: upload.single('image')
  - Internally switched to memoryStorage (required for Vercel)
*/
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/png'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload only JPG or PNG images.'), false);
    }
  }
});

/* -------------------- Upload to Cloudinary -------------------- */
/*
  Replaces disk-based upload.
  Input: fileBuffer (req.file.buffer)
*/
const uploadToCloudinary = async (fileBuffer) => {
  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'profile-pictures',
          resource_type: 'image',
          transformation: [{ width: 500, height: 500, crop: 'limit' }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/* -------------------- Delete from Cloudinary -------------------- */
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return { result: 'not_deleted', reason: 'invalid_url' };
    }

    const publicId = getPublicIdFromUrl(imageUrl);
    if (!publicId) {
      return { result: 'not_deleted', reason: 'invalid_public_id' };
    }

    const result = await cloudinary.api.delete_resources([publicId], {
      type: 'upload',
      resource_type: 'image'
    });

    if (result?.deleted?.[publicId] === 'deleted') {
      return { result: 'deleted', public_id: publicId };
    }

    return { result: 'partial', details: result };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/* -------------------- Update Image (Delete + Upload) -------------------- */
/*
  Cloudinary does NOT support in-place updates.
  Correct update = delete old image + upload new one
*/
const updateCloudinaryImage = async (oldImageUrl, newFileBuffer) => {
  if (oldImageUrl) {
    await deleteFromCloudinary(oldImageUrl);
  }
  return await uploadToCloudinary(newFileBuffer);
};

/* -------------------- Extract Public ID from URL -------------------- */
const getPublicIdFromUrl = (url) => {
  try {
    if (!url.includes('cloudinary.com')) return null;

    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    let publicPath = url.substring(uploadIndex + 8);
    publicPath = publicPath.split('?')[0];
    publicPath = publicPath.replace(/^v\d+\//, '');
    publicPath = publicPath.substring(0, publicPath.lastIndexOf('.'));

    return publicPath;
  } catch (error) {
    console.error('Public ID extraction error:', error);
    return null;
  }
};

/* -------------------- Exports (UNCHANGED CONTRACT) -------------------- */
module.exports = {
  cloudinary,
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  updateCloudinaryImage
};