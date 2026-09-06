import React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme";

interface LoadingScreenProps {
  imageUri: string;
}

export function LoadingScreen({ imageUri }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.indicator}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Figuring out what you're eating…</Text>
      </View>
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
    opacity: 0.85,
  },
  indicator: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 28,
  },
  text: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
});
