import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radius } from "../theme";

export type QuantityMode = "unit" | "grams";

interface ModeDropdownProps {
  mode: QuantityMode;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (mode: QuantityMode) => void;
}

// Reused wherever a component's quantity is edited (the add-component form,
// the component detail page): a pressable trigger + an absolutely-positioned
// options list, since RN has no native <select>. The parent must raise its
// own zIndex while isOpen is true so this menu paints above sibling content
// (e.g. a nutrient grid) rendered below it.
export function ModeDropdown({ mode, isOpen, onToggle, onSelect }: ModeDropdownProps) {
  return (
    <View style={styles.dropdownWrap}>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={onToggle}
        accessibilityLabel="Change how this quantity is entered"
      >
        <Text style={styles.dropdownTriggerText}>{mode === "unit" ? "Unit" : "Grams"}</Text>
        <Text style={styles.dropdownCaret}>▾</Text>
      </TouchableOpacity>
      {isOpen ? (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity style={styles.dropdownOption} onPress={() => onSelect("unit")}>
            <Text style={styles.dropdownOptionText}>Unit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownOption} onPress={() => onSelect("grams")}>
            <Text style={styles.dropdownOptionText}>Grams</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownWrap: {
    position: "relative",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  dropdownTriggerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  dropdownCaret: {
    fontSize: 10,
    color: colors.textMuted,
  },
  dropdownMenu: {
    position: "absolute",
    top: 38,
    right: 0,
    minWidth: 84,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    overflow: "hidden",
    shadowColor: "#2c2420",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  dropdownOption: {
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  dropdownOptionText: {
    fontSize: 13,
    color: colors.text,
  },
});
