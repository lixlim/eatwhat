import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { updateComponents } from "../api";
import { formatRange, NUTRIENT_FIELDS, parseNumber, usesUnitMode } from "../format";
import { colors, radius, spacing } from "../theme";
import { MealComponent, NutrientRanges } from "../types";

interface ComponentEditorProps {
  recordId: string;
  initialComponents: MealComponent[];
}

type SaveStatus = "" | "saving" | "saved" | "error";
type QuantityMode = "unit" | "grams";
type NutrientDraft = Record<keyof NutrientRanges, { low: string; high: string }>;

function defaultModeFor(component: Pick<MealComponent, "quantity" | "unit">): QuantityMode {
  return usesUnitMode(component) ? "unit" : "grams";
}

function emptyNutrientDraft(): NutrientDraft {
  return NUTRIENT_FIELDS.reduce((acc, field) => {
    acc[field.key] = { low: "", high: "" };
    return acc;
  }, {} as NutrientDraft);
}

interface ModeDropdownProps {
  mode: QuantityMode;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (mode: QuantityMode) => void;
}

function ModeDropdown({ mode, isOpen, onToggle, onSelect }: ModeDropdownProps) {
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

export function ComponentEditor({ recordId, initialComponents }: ComponentEditorProps) {
  const [components, setComponents] = useState<MealComponent[]>(initialComponents);
  const [modes, setModes] = useState<QuantityMode[]>(initialComponents.map(defaultModeFor));
  const [openDropdownFor, setOpenDropdownFor] = useState<number | "new" | null>(null);
  const [status, setStatus] = useState<SaveStatus>("");

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<QuantityMode>("unit");
  const [newQuantity, setNewQuantity] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newLow, setNewLow] = useState("");
  const [newHigh, setNewHigh] = useState("");
  const [newNutrients, setNewNutrients] = useState<NutrientDraft>(emptyNutrientDraft);

  const persist = async (next: MealComponent[]) => {
    setStatus("saving");
    try {
      await updateComponents(recordId, next);
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus(""), 2000);
    }
  };

  const updateRow = (index: number, patch: Partial<MealComponent>) => {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const commitRow = () => {
    persist(components);
  };

  const removeRow = (index: number) => {
    const next = components.filter((_, i) => i !== index);
    setComponents(next);
    setModes((prev) => prev.filter((_, i) => i !== index));
    setOpenDropdownFor(null);
    persist(next);
  };

  const selectMode = (index: number, mode: QuantityMode) => {
    setModes((prev) => prev.map((m, i) => (i === index ? mode : m)));
    setOpenDropdownFor(null);
  };

  const updateNewNutrient = (key: keyof NutrientRanges, bound: "low" | "high", value: string) => {
    setNewNutrients((prev) => ({ ...prev, [key]: { ...prev[key], [bound]: value } }));
  };

  const resetAddForm = () => {
    setNewName("");
    setNewMode("unit");
    setNewQuantity("");
    setNewUnit("");
    setNewLow("");
    setNewHigh("");
    setNewNutrients(emptyNutrientDraft());
    setOpenDropdownFor(null);
  };

  const cancelAdd = () => {
    resetAddForm();
    setIsAdding(false);
  };

  const addRow = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const nutrition = NUTRIENT_FIELDS.reduce((acc, field) => {
      const draft = newNutrients[field.key];
      acc[field.key] = { low: parseNumber(draft.low) ?? 0, high: parseNumber(draft.high) ?? 0 };
      return acc;
    }, {} as NutrientRanges);

    const next: MealComponent[] = [
      ...components,
      {
        name: trimmed,
        quantity: newMode === "unit" ? parseNumber(newQuantity) : null,
        unit: newMode === "unit" ? newUnit.trim() || null : null,
        estimated_grams_low: newMode === "grams" ? parseNumber(newLow) : null,
        estimated_grams_high: newMode === "grams" ? parseNumber(newHigh) : null,
        nutrition,
        confidence: "high",
      },
    ];
    setComponents(next);
    setModes((prev) => [...prev, newMode]);
    persist(next);
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
        <View
          key={index}
          style={[styles.row, openDropdownFor === index && styles.rowRaised]}
        >
          <TextInput
            style={styles.nameInput}
            value={component.name}
            onChangeText={(text) => updateRow(index, { name: text })}
            onBlur={commitRow}
            placeholder="Component name"
            placeholderTextColor={colors.textMuted}
          />
          <View
            style={[styles.portionRow, openDropdownFor === index && styles.portionRowRaised]}
          >
            {modes[index] === "unit" ? (
              <View style={styles.groupBox}>
                <TextInput
                  style={styles.quantityInputGrouped}
                  value={component.quantity != null ? String(component.quantity) : ""}
                  onChangeText={(text) => updateRow(index, { quantity: parseNumber(text) })}
                  onBlur={commitRow}
                  keyboardType="numeric"
                  placeholder="qty"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={styles.unitInputGrouped}
                  value={component.unit ?? ""}
                  onChangeText={(text) => updateRow(index, { unit: text })}
                  onBlur={commitRow}
                  placeholder="unit (e.g. piece, bowl)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ) : (
              <View style={styles.groupBox}>
                <TextInput
                  style={styles.portionInputGrouped}
                  value={component.estimated_grams_low != null ? String(component.estimated_grams_low) : ""}
                  onChangeText={(text) => updateRow(index, { estimated_grams_low: parseNumber(text) })}
                  onBlur={commitRow}
                  keyboardType="numeric"
                  placeholder="g"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.portionDash}>–</Text>
                <TextInput
                  style={styles.portionInputGrouped}
                  value={component.estimated_grams_high != null ? String(component.estimated_grams_high) : ""}
                  onChangeText={(text) => updateRow(index, { estimated_grams_high: parseNumber(text) })}
                  onBlur={commitRow}
                  keyboardType="numeric"
                  placeholder="g"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.portionUnit}>g</Text>
              </View>
            )}
            <ModeDropdown
              mode={modes[index]}
              isOpen={openDropdownFor === index}
              onToggle={() => setOpenDropdownFor((prev) => (prev === index ? null : index))}
              onSelect={(mode) => selectMode(index, mode)}
            />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeRow(index)}
              accessibilityLabel={`Remove ${component.name}`}
            >
              <Text style={styles.removeBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.nutrientGrid}>
            {NUTRIENT_FIELDS.map((field) => (
              <View key={field.key} style={styles.nutrientChip}>
                <Text style={styles.nutrientChipLabel}>{field.shortLabel}</Text>
                <Text style={styles.nutrientChipValue}>
                  {formatRange(component.nutrition[field.key], field.unit)}
                </Text>
              </View>
            ))}
          </View>
        </View>
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
          <View
            style={[styles.portionRow, openDropdownFor === "new" && styles.portionRowRaised]}
          >
            {newMode === "unit" ? (
              <View style={styles.groupBox}>
                <TextInput
                  style={styles.quantityInputGrouped}
                  value={newQuantity}
                  onChangeText={setNewQuantity}
                  keyboardType="numeric"
                  placeholder="qty"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={styles.unitInputGrouped}
                  value={newUnit}
                  onChangeText={setNewUnit}
                  placeholder="unit (e.g. piece, bowl)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ) : (
              <View style={styles.groupBox}>
                <TextInput
                  style={styles.portionInputGrouped}
                  value={newLow}
                  onChangeText={setNewLow}
                  keyboardType="numeric"
                  placeholder="g"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.portionDash}>–</Text>
                <TextInput
                  style={styles.portionInputGrouped}
                  value={newHigh}
                  onChangeText={setNewHigh}
                  keyboardType="numeric"
                  placeholder="g"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.portionUnit}>g</Text>
              </View>
            )}
            <ModeDropdown
              mode={newMode}
              isOpen={openDropdownFor === "new"}
              onToggle={() => setOpenDropdownFor((prev) => (prev === "new" ? null : "new"))}
              onSelect={(mode) => {
                setNewMode(mode);
                setOpenDropdownFor(null);
              }}
            />
          </View>

          <Text style={styles.fieldLabel}>Nutrition (per component)</Text>
          {NUTRIENT_FIELDS.map((field) => (
            <View key={field.key} style={styles.nutrientInputRow}>
              <Text style={styles.nutrientInputLabel}>{field.label}</Text>
              <View style={styles.groupBox}>
                <TextInput
                  style={styles.portionInputGrouped}
                  value={newNutrients[field.key].low}
                  onChangeText={(text) => updateNewNutrient(field.key, "low", text)}
                  keyboardType="numeric"
                  placeholder="low"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.portionDash}>–</Text>
                <TextInput
                  style={styles.portionInputGrouped}
                  value={newNutrients[field.key].high}
                  onChangeText={(text) => updateNewNutrient(field.key, "high", text)}
                  keyboardType="numeric"
                  placeholder="high"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.portionUnit}>{field.unit}</Text>
              </View>
            </View>
          ))}

          <View style={styles.addFormActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelAdd}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmAddBtn} onPress={addRow}>
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
    gap: 6,
    marginBottom: spacing.md,
    zIndex: 1,
  },
  rowRaised: {
    zIndex: 20,
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
    zIndex: 0,
  },
  portionRowRaised: {
    zIndex: 30,
  },
  // A single bordered control that groups two or three related inputs
  // (quantity+unit, or grams low–high) instead of each having its own
  // border — fewer separate boxes, less visual clutter.
  groupBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
  },
  quantityInputGrouped: {
    width: 40,
    flexShrink: 0,
    paddingVertical: 9,
    fontSize: 13,
    textAlign: "center",
    color: colors.text,
  },
  unitInputGrouped: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 9,
    paddingLeft: 6,
    fontSize: 13,
    color: colors.text,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  portionInputGrouped: {
    width: 40,
    flexShrink: 0,
    paddingVertical: 9,
    fontSize: 13,
    textAlign: "center",
    color: colors.text,
  },
  portionDash: {
    color: colors.textMuted,
    fontSize: 13,
  },
  portionUnit: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: 2,
  },
  nutrientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
    zIndex: 0,
  },
  nutrientChip: {
    width: "31%",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  nutrientChipLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  nutrientChipValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
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
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 16,
  },
  addTrigger: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
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
    marginTop: 4,
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
  nutrientInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    zIndex: 0,
  },
  nutrientInputLabel: {
    fontSize: 13,
    color: colors.text,
    width: 64,
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
