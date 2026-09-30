import CryptoJS from "crypto-js";

const STORAGE_KEY = "biometricData";
const APP_SALT = "AlssonFeesPortal_v1";

export function saveBiometricData(data) {
  const key = CryptoJS.SHA256(
    `${APP_SALT}:${data.familyId}:${data.mobile}`
  ).toString();

  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    key
  ).toString();

  localStorage.setItem(STORAGE_KEY, encrypted);
}

export function getBiometricData(familyId, mobile) {
  const encrypted = localStorage.getItem(STORAGE_KEY);

  if (!encrypted) return null;

  const key = CryptoJS.SHA256(
    `${APP_SALT}:${familyId}:${mobile}`
  ).toString();

  const bytes = CryptoJS.AES.decrypt(encrypted, key);

  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}