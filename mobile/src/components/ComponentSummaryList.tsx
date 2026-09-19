import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { formatPortion, formatRange, NUTRIENT_FIELDS, parseNumber, SaveStatus, usesUnitMode } from "../format";
import { colors, radius, spacing } from "../theme";
import { MealComponent, NutrientRanges } from "../types";
import { ModeDropdown, QuantityMode } from "./ModeDropdown";
import { portionStyles } from "./portionStyles";

// Nutrition is never user-entered here - a manually added component has no
// AI estimate behind it, so every field is locked at 0 until the backend
// grows a real way to derive it (see PATCH /records/:id/components gotcha
// in CLAUDE.md - recomputing dish totals on edit is separate follow-up work).
const ZERO_NUTRITION: NutrientRanges = NUTRIENT_FIELDS.reduce((acc, field) => {
  acc[field.key] = { low: 0, high: 0 };
  return acc;
}, {} as NutrientRanges);

function defaultModeFor(component: Pick<MealComponent, "quantity" | "unit">): QuantityMode {
  return usesUnitMode(component) ? "unit" : "grams";
}

interface ComponentSummaryListProps {
  components: MealComponent[];
  status: SaveStatus;
  onAdd: (component: MealComponent) => void;
  onRemove: (index: number) => void;
  onSelect: (index: number) => void;
}

export function ComponentSummaryList({ components, status, onAdd, onRemove, onSelect }: ComponentSummaryListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<QuantityMode>("unit");
  const [newQuantity, setNewQuantity] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newLow, setNewLow] = useState("");
  const [newHigh, setNewHigh] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const resetAddForm = () => {
    setNewName("");
    setNewMode("unit");
    setNewQuantity("");
    setNewUnit("");
    setNewLow("");
    setNewHigh("");
    setIsDropdownOpen(false);
  };

  const cancelAdd = () => {
    resetAddForm();
    setIsAdding(false);
  };

  const confirmAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAdd({
      name: trimmed,
      quantity: newMode === "unit" ? parseNumber(newQuantity) : null,
      unit: newMode === "unit" ? newUnit.trim() || null : null,
      estimated_grams_low: newMode === "grams" ? parseNumber(newLow) : null,
      estimated_grams_high: newMode === "grams" ? parseNumber(newHigh) : null,
      nutrition: ZERO_NUTRITION,
      confidence: "high",
    });
    resetAddForm();
    setIsAdding(false);
  };

  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.statusText}>
          {status === "saving" && "Saving…"}
          {status === "saved" && "Saved"}
          {status === "error" && "Couldn't save"}
        </Text>
      </View>

      {components.map((component, index) => (
        <TouchableOpacity
          key={index}
          style={styles.row}
          onPress={() => onSelect(index)}
          activeOpacity={0.7}
          accessibilityLabel={`View details for ${component.name}`}
        >
          <View style={styles.rowMain}>
            <Text style={styles.rowName} numberOfLines={1}>
              {component.name}
            </Text>
            <Text style={styles.rowPortion}>{formatPortion(component)}</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.rowCalories}>
              {formatRange(component.nutrition.calories_kcal, "kcal")}
            </Text>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(index)}
              accessibilityLabel={`Remove ${component.name}`}
            >
              <Text style={styles.removeBtnText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
      ))}

      {!isAdding ? (
        <TouchableOpacity
          style={styles.addTrigger}
          onPress={() => setIsAdding(true)}
          accessibilityLabel="Add a component"
        >
          <Text style={styles.addTriggerText}>+ Add a component</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.addForm}>
          <Text style={styles.addFormTitle}>New component</Text>

          <TextInput
            style={styles.nameInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Component name"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Portion</Text>
          <View style={[styles.portionRow, isDropdownOpen && styles.portionRowRaised]}>
            {newMode === "unit" ? (
              <View style={portionStyles.groupBox}>
                <TextInput
                  style={portionStyles.quantityInputGrouped}
                  value={newQuantity}
                  onChangeText={setNewQuantity}
                  keyboardType="numeric"
                  placeholder="qty"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={portionStyles.unitInputGrouped}
                  value={newUnit}
                  onChangeText={setNewUnit}
                  placeholder="unit (e.g. piece, bowl)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ) : (
              <View style={portionStyles.groupBox}>
                <TextInput
                  style={portionStyles.portionInputGrouped}
                  value={newLow}
                  onChangeText={setNewLow}
                  keyboardType="numeric"
                  placeholder="g"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={portionStyles.portionDash}>–</Text>
                <TextInput
                  style={portionStyles.portionInputGrouped}
                  value={newHigh}
                  onChangeText={setNewHigh}
                  keyboardType="numeric"
                  placeholder="g"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={portionStyles.portionUnit}>g</Text>
              </View>
            )}
            <ModeDropdown
              mode={newMode}
              isOpen={isDropdownOpen}
              onToggle={() => setIsDropdownOpen((prev) => !prev)}
              onSelect={(mode) => {
                setNewMode(mode);
                setIsDropdownOpen(false);
              }}
            />
          </View>

          <Text style={styles.lockedNote}>
            Nutrition for a manually added component isn't estimated yet - it'll show as 0 until you edit it later.
          </Text>

          <View style={styles.addFormActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelAdd}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmAddBtn} onPress={confirmAdd}>
              <Text style={styles.confirmAddBtnText}>Add component</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    alignItems: "flex-end",
    marginBottom: spacing.sm,
    minHeight: 14,
  },
  statusText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  rowPortion: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowCalories: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 15,
  },
  chevron: {
    fontSize: 18,
    color: colors.textMuted,
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    backgroundColor: colors.surface,
  },
  portionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  portionRowRaised: {
    zIndex: 30,
  },
  addTrigger: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  addTriggerText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  addForm: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
    marginTop: 10,
  },
  addFormTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 4,
  },
  lockedNote: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  addFormActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  confirmAddBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  confirmAddBtnText: {
    color: colors.primaryContrast,
    fontWeight: "700",
    fontSize: 13,
  },
});
