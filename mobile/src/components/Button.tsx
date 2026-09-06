import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { colors, radius } from "../theme";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: string;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = "primary", icon, style }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, variantStyles[variant], style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon ? <Text style={styles.icon}>{icon} </Text> : null}
      <Text style={[styles.label, variantTextStyles[variant]]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  icon: {
    fontSize: 17,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
});

const variantTextStyles = StyleSheet.create({
  primary: {
    color: colors.primaryContrast,
  },
  secondary: {
    color: colors.text,
  },
  ghost: {
    color: colors.textMuted,
    fontWeight: "500",
  },
});
