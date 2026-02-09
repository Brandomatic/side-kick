import * as React from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session'; // <--- THIS LINE
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  redirectUri: AuthSession.makeRedirectUri({
    scheme: 'side-kick', // matches 'scheme' in app.json
    useProxy: true,
  }),
});

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      
      // This actually signs them into Firebase
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          console.log("Logged in with Google:", userCredential.user.displayName);
        })
        .catch((error) => {
          console.error("Firebase Google Auth Error:", error);
        });
    }
  }, [response]);

  return { promptAsync, disabled: !request };
}