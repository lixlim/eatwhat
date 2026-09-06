import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../theme";

interface ErrorScreenProps {
  imageUri: string;
  message: string;
  onRetry: () => void;
  onReset: () => void;
}

export function ErrorScreen({ imageUri, message, onRetry, onReset }: ErrorScreenProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.box}>
        <Text style={styles.emoji}>😕</Text>
        <Text style={styles.title}>We couldn't analyse that meal</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <Button label="Try again" onPress={onRetry} variant="primary" style={styles.gap} />
      <Button label="Scan another meal" onPress={onReset} variant="ghost" style={styles.gap} />
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
  box: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 20,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  message: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
  },
  gap: {
    marginTop: spacing.md,
  },
});
