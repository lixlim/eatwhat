import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useState } from "react";
import { Alert, SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { analyzeMeal } from "./src/api";
import { ErrorScreen } from "./src/screens/ErrorScreen";
import { LandingScreen } from "./src/screens/LandingScreen";
import { LoadingScreen } from "./src/screens/LoadingScreen";
import { PreviewScreen } from "./src/screens/PreviewScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { colors } from "./src/theme";
import { MealAnalysis, SelectedImage } from "./src/types";

type Step = "landing" | "preview" | "loading" | "result" | "error";

export default function App() {
  const [step, setStep] = useState<Step>("landing");
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [result, setResult] = useState<MealAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const reset = useCallback(() => {
    setImage(null);
    setResult(null);
    setErrorMessage("");
    setStep("landing");
  }, []);

  const selectAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    setImage({ uri: asset.uri });
    setStep("preview");
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "EatWhat needs camera access to take a photo of your meal.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      selectAsset(result.assets[0]);
    }
  }, [selectAsset]);

  const handleUploadPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "EatWhat needs access to your photos to upload a meal image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      selectAsset(result.assets[0]);
    }
  }, [selectAsset]);

  const handleAnalyse = useCallback(async () => {
    if (!image) return;
    setStep("loading");
    try {
      const data = await analyzeMeal(image);
      setResult(data);
      setStep("result");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "We couldn't reach the server. Please check your connection and try again."
      );
      setStep("error");
    }
  }, [image]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <React.Fragment>
        {step === "landing" && (
          <LandingScreen onTakePhoto={handleTakePhoto} onUploadPhoto={handleUploadPhoto} />
        )}
        {step === "preview" && image && (
          <PreviewScreen imageUri={image.uri} onAnalyse={handleAnalyse} onPickDifferent={reset} />
        )}
        {step === "loading" && image && <LoadingScreen imageUri={image.uri} />}
        {step === "result" && image && result && (
          <ResultScreen imageUri={image.uri} result={result} onScanAnother={reset} />
        )}
        {step === "error" && image && (
          <ErrorScreen imageUri={image.uri} message={errorMessage} onRetry={handleAnalyse} onReset={reset} />
        )}
      </React.Fragment>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
  },
});
