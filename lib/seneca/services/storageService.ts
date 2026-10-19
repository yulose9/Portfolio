import imageCompression from "browser-image-compression";
import { storage, auth } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const storageService = {
  /**
   * Uploads an image file to Firebase Storage with client-side compression.
   */
  async uploadImage(file: File, folder = "uploads"): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error("Must be logged in to upload files.");
    }

    if (!["uploads", "wealth-receipts"].includes(folder)) throw new Error("Invalid upload folder.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 8 * 1024 * 1024) {
      throw new Error("Choose a JPG, PNG or WebP image smaller than 8 MB.");
    }
    const checkSession = () => {
      if (auth.currentUser?.uid !== uid) throw new Error("Your session changed. Please retry the upload.");
    };
    // Re-encode rather than leaking original GPS/EXIF metadata on failure.
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/jpeg",
      preserveExif: false,
    };

    const fileToUpload = await imageCompression(file, options);
    checkSession();
    const magic = new Uint8Array(await fileToUpload.slice(0, 3).arrayBuffer());
    if (fileToUpload.size > 1024 * 1024 || magic[0] !== 255 || magic[1] !== 216 || magic[2] !== 255) {
      throw new Error("The photo could not be safely prepared. Please choose another image.");
    }
    checkSession();

    // 2. UPLOAD to Firebase Storage
    const storagePath = `users/${uid}/${folder}/${crypto.randomUUID()}.jpg`;

    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, fileToUpload, {
      contentType: "image/jpeg", cacheControl: "private, no-store",
    });
    checkSession();

    // 3. GET URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    checkSession();
    return downloadURL;
  },
};
