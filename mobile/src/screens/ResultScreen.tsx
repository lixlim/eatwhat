import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { capitalize, formatPortion, formatRange } from "../format";
import { colors, radius, spacing } from "../theme";
import { MealAnalysis } from "../types";

interface ResultScreenProps {
  imageUri: string;
  result: MealAnalysis;
  onScanAnother: () => void;
}

export function ResultScreen({ imageUri, result, onScanAnother }: ResultScreenProps) {
  const nutritionItems: [string, string][] = [
    ["Calories", formatRange(result.nutrition.calories_kcal, "kcal")],
    ["Protein", formatRange(result.nutrition.protein_g, "g")],
    ["Carbs", formatRange(result.nutrition.carbs_g, "g")],
    ["Fat", formatRange(result.nutrition.fat_g, "g")],
    ["Fibre", formatRange(result.nutrition.fibre_g, "g")],
    ["Sodium", formatRange(result.nutrition.sodium_mg, "mg")],
  ];

  return (
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
        {result.components.map((component, index) => (
          <View key={`${component.name}-${index}`} style={styles.componentRow}>
            <Text style={styles.componentName}>{component.name}</Text>
            <Text style={styles.componentPortion}>{formatPortion(component)}</Text>
          </View>
        ))}
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
  componentRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  componentName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    flexShrink: 1,
  },
  componentPortion: {
    fontSize: 13,
    color: colors.textMuted,
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
