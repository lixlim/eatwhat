import { StyleSheet } from "react-native";
import { colors, radius } from "../theme";

// Shared by anywhere a component's quantity/unit or grams range is edited
// or displayed (add-component form, component detail page) so the two
// stay visually consistent without duplicating style objects.
export const portionStyles = StyleSheet.create({
  // A single bordered control that groups two or three related inputs
  // (quantity+unit, or grams low-high) instead of each having its own
  // border - fewer separate boxes, less visual clutter.
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
});
