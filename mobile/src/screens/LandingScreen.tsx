import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { colors, spacing } from "../theme";

interface LandingScreenProps {
  onTakePhoto: () => void;
  onUploadPhoto: () => void;
}

export function LandingScreen({ onTakePhoto, onUploadPhoto }: LandingScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🍽️</Text>
      <Text style={styles.brand}>EatWhat</Text>
      <Text style={styles.tagline}>Snap your meal. Know what's in it.</Text>

      <View style={styles.actions}>
        <Button label="Take photo" icon="📷" onPress={onTakePhoto} variant="primary" />
        <Button label="Upload photo" onPress={onUploadPhoto} variant="secondary" style={styles.gap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 17,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  actions: {
    width: "100%",
  },
  gap: {
    marginTop: spacing.sm,
  },
});
