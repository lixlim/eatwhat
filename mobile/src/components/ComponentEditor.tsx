import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { updateComponents } from "../api";
import { parseGrams } from "../format";
import { colors, radius, spacing } from "../theme";
import { MealComponent } from "../types";

interface ComponentEditorProps {
  recordId: string;
  initialComponents: MealComponent[];
}

type SaveStatus = "" | "saving" | "saved" | "error";

export function ComponentEditor({ recordId, initialComponents }: ComponentEditorProps) {
  const [components, setComponents] = useState<MealComponent[]>(initialComponents);
  const [status, setStatus] = useState<SaveStatus>("");
  const [newName, setNewName] = useState("");
  const [newLow, setNewLow] = useState("");
  const [newHigh, setNewHigh] = useState("");

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
    persist(next);
  };

  const addRow = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const next: MealComponent[] = [
      ...components,
      {
        name: trimmed,
        estimated_grams_low: parseGrams(newLow),
        estimated_grams_high: parseGrams(newHigh),
        confidence: "high",
      },
    ];
    setComponents(next);
    persist(next);
    setNewName("");
    setNewLow("");
    setNewHigh("");
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
        <View key={index} style={styles.row}>
          <TextInput
            style={styles.nameInput}
            value={component.name}
            onChangeText={(text) => updateRow(index, { name: text })}
            onBlur={commitRow}
            placeholder="Component name"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.portionGroup}>
            <TextInput
              style={styles.portionInput}
              value={component.estimated_grams_low != null ? String(component.estimated_grams_low) : ""}
              onChangeText={(text) => updateRow(index, { estimated_grams_low: parseGrams(text) })}
              onBlur={commitRow}
              keyboardType="numeric"
              placeholder="g"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.portionDash}>–</Text>
            <TextInput
              style={styles.portionInput}
              value={component.estimated_grams_high != null ? String(component.estimated_grams_high) : ""}
              onChangeText={(text) => updateRow(index, { estimated_grams_high: parseGrams(text) })}
              onBlur={commitRow}
              keyboardType="numeric"
              placeholder="g"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.portionUnit}>g</Text>
          </View>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeRow(index)}
            accessibilityLabel={`Remove ${component.name}`}
          >
            <Text style={styles.removeBtnText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          style={styles.nameInput}
          value={newName}
          onChangeText={setNewName}
          placeholder="Add a component…"
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.portionGroup}>
          <TextInput
            style={styles.portionInput}
            value={newLow}
            onChangeText={setNewLow}
            keyboardType="numeric"
            placeholder="g"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.portionDash}>–</Text>
          <TextInput
            style={styles.portionInput}
            value={newHigh}
            onChangeText={setNewHigh}
            keyboardType="numeric"
            placeholder="g"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={addRow} accessibilityLabel="Add component">
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
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
    gap: 8,
    marginBottom: spacing.sm,
  },
  nameInput: {
    flex: 1,
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
  portionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  portionInput: {
    width: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 4,
    fontSize: 13,
    textAlign: "center",
    color: colors.text,
    backgroundColor: colors.surface,
  },
  portionDash: {
    color: colors.textMuted,
    fontSize: 13,
  },
  portionUnit: {
    color: colors.textMuted,
    fontSize: 13,
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
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: "dashed",
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    fontSize: 18,
    color: colors.primaryContrast,
    lineHeight: 18,
  },
});
