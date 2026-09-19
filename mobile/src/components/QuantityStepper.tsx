import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors, radius } from "../theme";

interface QuantityStepperProps {
  value: number | null;
  onChangeText: (text: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  disabled?: boolean;
}

// −/+ pair flanking the quantity input, meant to sit inside an existing
// bordered groupBox (see portionStyles) alongside the unit input - it has
// no border of its own. The text field stays live so a custom or
// fractional value (e.g. "1.5") can still be typed directly; the buttons
// are just a fast path for whole-unit steps.
export function QuantityStepper({
  value,
  onChangeText,
  onDecrement,
  onIncrement,
  canDecrement,
  disabled,
}: QuantityStepperProps) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.btn, (disabled || !canDecrement) && styles.btnDisabled]}
        onPress={onDecrement}
        disabled={disabled || !canDecrement}
        accessibilityLabel="Decrease quantity"
        hitSlop={6}
      >
        <Text style={styles.btnText}>−</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={value != null ? String(value) : ""}
        onChangeText={onChangeText}
        editable={!disabled}
        keyboardType="numeric"
        placeholder="qty"
        placeholderTextColor={colors.textMuted}
      />
      <TouchableOpacity
        style={[styles.btn, disabled && styles.btnDisabled]}
        onPress={onIncrement}
        disabled={disabled}
        accessibilityLabel="Increase quantity"
        hitSlop={6}
      >
        <Text style={styles.btnText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  btn: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 15,
  },
  input: {
    width: 34,
    flexShrink: 0,
    paddingVertical: 9,
    fontSize: 13,
    textAlign: "center",
    color: colors.text,
  },
});
