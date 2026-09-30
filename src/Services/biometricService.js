import { Capacitor } from "@capacitor/core"; //import capacitor core to check if the app is running on a native platform (iOS/Android) or web
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth"; //import biometric authentication plugin for native platforms to handle fingerprint/face recognition authentication

export async function enableBiometricLogin({registerWebAuthn,registerNativeBiometric,}) 
{
  //check wheather the browser supports the biometric login or not
  if (Capacitor.isNativePlatform()) {
    return await registerNativeBiometric();
  }
  //register the authentication
  return await registerWebAuthn();
}

//to test the existance of the fingerprint 
export async function isNativeBiometricAvailable() {
  //return JSON to show that the biometric is not available
  if (!Capacitor.isNativePlatform()) {
    return {
      isAvailable: false,
      reason: "Not running as a native app",
    };
  }

  try {
    const result = await BiometricAuth.checkBiometry();

    console.log("Biometry:", result);
    //return JSON with the result object returned by the checkBiometry function
    return {
      isAvailable: result.isAvailable,
      biometryType: result.biometryType,
    };
  } catch (err) {
    console.error(err);

    return {
      isAvailable: false,
      reason: err.message,
    };
  }
}

export async function authenticateWithBiometric() {
  //return the authentication result
  return await BiometricAuth.authenticate({
    reason: "Enable fingerprint login",
    cancelTitle: "Cancel",
    allowDeviceCredential: true,
  });
}
// //to ask the Android system to show the fingerprint dialogue
// export async function authenticateWithBiometric() {
//   try {
//     const result = await BiometricAuth.authenticate({
//       reason: "Sign in to Parents' Fees Portal",
//       cancelTitle: "Cancel",
//       allowDeviceCredential: true,
//     });

//     console.log("Authentication:", result);

//     return result;
//   } catch (err) {
//     console.error(err);
//     throw err;
//   }
// }