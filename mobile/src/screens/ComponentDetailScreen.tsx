import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Card } from "../components/Card";
import { ModeDropdown, QuantityMode } from "../components/ModeDropdown";
import { portionStyles } from "../components/portionStyles";
import { QuantityStepper } from "../components/QuantityStepper";
import { EditableComponentFields } from "../api";
import { formatRange, NUTRIENT_FIELDS, parseNumber, usesUnitMode } from "../format";
import { colors, radius, spacing } from "../theme";
import { MealComponent } from "../types";

interface ComponentDetailScreenProps {
  component: MealComponent;
  isSaving: boolean;
  errorMessage: string;
  onSave: (fields: EditableComponentFields) => void;
  onBack: () => void;
}

function defaultModeFor(component: Pick<MealComponent, "quantity" | "unit">): QuantityMode {
  return usesUnitMode(component) ? "unit" : "grams";
}

function fieldsOf(component: MealComponent): EditableComponentFields {
  const { name, quantity, unit, estimated_grams_low, estimated_grams_high } = component;
  return { name, quantity, unit, estimated_grams_low, estimated_grams_high };
}

function fieldsEqual(a: EditableComponentFields, b: EditableComponentFields): boolean {
  return (
    a.name === b.name &&
    a.quantity === b.quantity &&
    a.unit === b.unit &&
    a.estimated_grams_low === b.estimated_grams_low &&
    a.estimated_grams_high === b.estimated_grams_high
  );
}

// Full detail view for one component, opened from a tap on its summary row.
// This is the only place quantity/unit are edited. Edits are held as local
// draft state - not sent to the server until "Save changes" is tapped, since
// saving now triggers a real AI recalculation of this component's nutrition
// (not a cheap write), so it shouldn't fire per keystroke/blur.
export function ComponentDetailScreen({ component, isSaving, errorMessage, onSave, onBack }: ComponentDetailScreenProps) {
  const [draft, setDraft] = useState<EditableComponentFields>(fieldsOf(component));
  const [mode, setMode] = useState<QuantityMode>(defaultModeFor(component));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isDirty = !fieldsEqual(draft, fieldsOf(component));

  const decrementQuantity = () => {
    setDraft((prev) => {
      const current = prev.quantity ?? 0;
      if (current <= 1) return prev;
      return { ...prev, quantity: current - 1 };
    });
  };

  const incrementQuantity = () => {
    setDraft((prev) => ({ ...prev, quantity: (prev.quantity ?? 0) + 1 }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} accessibilityLabel="Back to components" hitSlop={8}>
          <Text style={styles.backLabel}>‹ Components</Text>
        </TouchableOpacity>
        {isSaving ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>

      <Card>
        <Text style={styles.cardTitle}>Name</Text>
        <TextInput
          style={styles.nameInput}
          value={draft.name}
          onChangeText={(text) => setDraft((prev) => ({ ...prev, name: text }))}
          placeholder="Component name"
          placeholderTextColor={colors.textMuted}
        />
      </Card>

      <View style={[styles.cardWrap, isDropdownOpen && styles.cardWrapRaised]}>
        <Card>
          <Text style={styles.cardTitle}>Portion</Text>
          <View style={styles.portionRow}>
            {mode === "unit" ? (
              <View style={portionStyles.groupBox}>
                <QuantityStepper
                  value={draft.quantity}
                  onChangeText={(text) => setDraft((prev) => ({ ...prev, quantity: parseNumber(text) }))}
                  onDecrement={decrementQuantity}
                  onIncrement={incrementQuantity}
                  canDecrement={draft.quantity != null && draft.quantity > 1}
                  disabled={isSaving}
                />
                <TextInput
                  style={portionStyles.unitInputGrouped}
                  value={draft.unit ?? ""}
                  onChangeText={(text) => setDraft((prev) => ({ ...prev, unit: text }))}
                  placeholder="unit (e.g. piece, bowl)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ) : (
              <View style={portionStyles.groupBox}>
                <TextInput
                  style={portionStyles.portionInputGrouped}
                  value={draft.estimated_grams_low != null ? String(draft.estimated_grams_low) : ""}
                  onChangeText={(text) =>
                    setDraft((prev) => ({ ...prev, estimated_grams_low: parseNumber(text) }))
                  }
                  keyboardType="numeric"
                  placeholder="g"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={portionStyles.portionDash}>–</Text>
                <TextInput
                  style={portionStyles.portionInputGrouped}
                  value={draft.estimated_grams_high != null ? String(draft.estimated_grams_high) : ""}
                  onChangeText={(text) =>
                    setDraft((prev) => ({ ...prev, estimated_grams_high: parseNumber(text) }))
                  }
                  keyboardType="numeric"
                  placeholder="g"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={portionStyles.portionUnit}>g</Text>
              </View>
            )}
            <ModeDropdown
              mode={mode}
              isOpen={isDropdownOpen}
              onToggle={() => setIsDropdownOpen((prev) => !prev)}
              onSelect={(next) => {
                setMode(next);
                setIsDropdownOpen(false);
              }}
            />
          </View>
        </Card>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Nutrition (estimated)</Text>
        <View style={portionStyles.nutrientGrid}>
          {NUTRIENT_FIELDS.map((field) => (
            <View key={field.key} style={portionStyles.nutrientChip}>
              <Text style={portionStyles.nutrientChipLabel}>{field.shortLabel}</Text>
              <Text style={portionStyles.nutrientChipValue}>
                {formatRange(component.nutrition[field.key], field.unit)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.derivedNote}>
          Nutrition is estimated and can't be edited directly - saving a portion change
          recalculates it automatically.
        </Text>
      </Card>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <TouchableOpacity
        style={[styles.saveBtn, (!isDirty || isSaving) && styles.saveBtnDisabled]}
        onPress={() => onSave(draft)}
        disabled={!isDirty || isSaving}
      >
        <Text style={styles.saveBtnText}>{isSaving ? "Recalculating…" : "Save changes"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  cardWrap: {
    zIndex: 1,
  },
  cardWrapRaised: {
    zIndex: 30,
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    backgroundColor: colors.surface,
  },
  portionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  derivedNote: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: "#b3413a",
    textAlign: "center",
  },
  saveBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: colors.primaryContrast,
    fontWeight: "700",
    fontSize: 15,
  },
});
