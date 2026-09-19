import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { EditableComponentFields, reestimateComponent, updateComponents } from "../api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ComponentSummaryList } from "../components/ComponentSummaryList";
import { capitalize, formatRange, SaveStatus } from "../format";
import { colors, radius, spacing } from "../theme";
import { MealAnalysis, MealComponent, NutrientRanges } from "../types";
import { ComponentDetailScreen } from "./ComponentDetailScreen";

interface ResultScreenProps {
  imageUri: string;
  result: MealAnalysis;
  onScanAnother: () => void;
}

export function ResultScreen({ imageUri, result, onScanAnother }: ResultScreenProps) {
  const [components, setComponents] = useState<MealComponent[]>(result.components);
  // Dish-level totals are no longer static once components can be edited -
  // each recalculation returns fresh totals that replace this.
  const [nutrition, setNutrition] = useState<NutrientRanges>(result.nutrition);
  const [status, setStatus] = useState<SaveStatus>("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSavingComponent, setIsSavingComponent] = useState(false);
  const [componentError, setComponentError] = useState("");

  const persist = async (next: MealComponent[]) => {
    setStatus("saving");
    try {
      const updated = await updateComponents(result.id, next);
      setNutrition(updated.nutrition);
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus(""), 2000);
    }
  };

  const handleSelect = (index: number) => {
    setComponentError("");
    setSelectedIndex(index);
  };

  const handleSaveComponent = async (fields: EditableComponentFields) => {
    if (selectedIndex === null) return;
    setIsSavingComponent(true);
    setComponentError("");
    try {
      const updated = await reestimateComponent(result.id, selectedIndex, fields);
      setComponents(updated.components);
      setNutrition(updated.nutrition);
    } catch (err) {
      setComponentError(err instanceof Error ? err.message : "Couldn't save changes");
    } finally {
      setIsSavingComponent(false);
    }
  };

  const handleAdd = (component: MealComponent) => {
    const next = [...components, component];
    setComponents(next);
    persist(next);
  };

  const handleRemove = (index: number) => {
    const next = components.filter((_, i) => i !== index);
    setComponents(next);
    if (selectedIndex === index) setSelectedIndex(null);
    persist(next);
  };

  const nutritionItems: [string, string][] = [
    ["Calories", formatRange(nutrition.calories_kcal, "kcal")],
    ["Protein", formatRange(nutrition.protein_g, "g")],
    ["Carbs", formatRange(nutrition.carbs_g, "g")],
    ["Fat", formatRange(nutrition.fat_g, "g")],
    ["Fibre", formatRange(nutrition.fibre_g, "g")],
    ["Sodium", formatRange(nutrition.sodium_mg, "mg")],
  ];

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Image source={{ uri: imageUri }} style={styles.image} />

        <Card style={styles.headerCard}>
          <View style={styles.titleRow}>
            <Text style={styles.dishName}>{result.dish_name}</Text>
            <Text style={styles.confidencePill}>{capitalize(result.overall_confidence)} confidence</Text>
          </View>
          {result.dish_name_local ? (
            <Text style={styles.dishLocal}>{result.dish_name_local}</Text>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Estimated components</Text>
          <ComponentSummaryList
            components={components}
            status={status}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onSelect={handleSelect}
          />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Estimated nutrition</Text>
          <View style={styles.nutritionGrid}>
            {nutritionItems.map(([label, value]) => (
              <View key={label} style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>{label}</Text>
                <Text style={styles.nutritionValue}>{value}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>What this means</Text>
          <Text style={styles.interpretation}>{result.interpretation}</Text>
        </Card>

        <Card muted>
          <Text style={styles.cardTitle}>Good to know</Text>
          {result.uncertainties.map((point, index) => (
            <Text key={index} style={styles.uncertaintyItem}>
              {"•"} {point}
            </Text>
          ))}
          <Text style={styles.disclaimer}>{result.disclaimer}</Text>
        </Card>

        <Button label="Scan another meal" onPress={onScanAnother} variant="primary" style={styles.gap} />
      </ScrollView>

      {selectedIndex !== null && components[selectedIndex] ? (
        <View style={styles.detailOverlay}>
          <ComponentDetailScreen
            key={selectedIndex}
            component={components[selectedIndex]}
            isSaving={isSavingComponent}
            errorMessage={componentError}
            onSave={handleSaveComponent}
            onBack={() => setSelectedIndex(null)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Rendered as an overlay (rather than swapped in for the ScrollView)
  // so the main ScrollView never unmounts - that's what keeps its scroll
  // offset intact when the user backs out of a component's detail page.
  detailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    zIndex: 10,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  headerCard: {
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  dishName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    flexShrink: 1,
  },
  dishLocal: {
    fontSize: 15,
    color: colors.textMuted,
  },
  confidencePill: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  nutritionItem: {
    width: "45%",
  },
  nutritionLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  nutritionValue: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  interpretation: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  uncertaintyItem: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
  gap: {
    marginTop: spacing.xs,
  },
});
