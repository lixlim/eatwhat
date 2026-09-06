import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button } from "../components/Button";
import { radius, spacing, colors } from "../theme";

interface PreviewScreenProps {
  imageUri: string;
  onAnalyse: () => void;
  onPickDifferent: () => void;
}

export function PreviewScreen({ imageUri, onAnalyse, onPickDifferent }: PreviewScreenProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.image} />
      <Button label="Analyse meal" onPress={onAnalyse} variant="primary" style={styles.gap} />
      <Button
        label="Choose a different photo"
        onPress={onPickDifferent}
        variant="ghost"
        style={styles.gap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  gap: {
    marginTop: spacing.md,
  },
});
