import React, { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, radius } from "../theme";

interface CardProps {
  children: ReactNode;
  muted?: boolean;
  style?: ViewStyle;
}

export function Card({ children, muted, style }: CardProps) {
  return <View style={[styles.card, muted && styles.muted, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 18,
    shadowColor: "#2c2420",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
});
