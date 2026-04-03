import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#07101d",
  },
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 96,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  headerCard: {
    borderWidth: 1,
    borderColor: "#31557c",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#122840",
    gap: 6,
  },
  kicker: {
    color: "#7cf2a2",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    color: "#f4f8ff",
    fontSize: 24,
    fontWeight: "700",
  },
  statusText: {
    color: "#1ecad3",
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: "#2d4b6d",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#122840",
    gap: 8,
  },
  cardTitle: {
    color: "#f4f8ff",
    fontSize: 18,
    fontWeight: "700",
  },
  cardDescription: {
    color: "#b3c6e0",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#31557c",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: "#f4f8ff",
    backgroundColor: "#0b1d31",
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  multilineLarge: {
    minHeight: 140,
    textAlignVertical: "top",
  },
  helper: {
    color: "#b3c6e0",
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: "#1ecad3",
    paddingVertical: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#061420",
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  secondaryButton: {
    borderRadius: 10,
    backgroundColor: "#163453",
    borderWidth: 1,
    borderColor: "#31557c",
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#ecf5ff",
    fontWeight: "700",
  },
  listItem: {
    color: "#d6e5f8",
    fontSize: 13,
  },
  checklistItemButton: {
    borderWidth: 1,
    borderColor: "#274261",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#0b1d31",
  },
  previewBox: {
    borderWidth: 1,
    borderColor: "#31557c",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#0b1d31",
    gap: 4,
  },
  previewTitle: {
    color: "#f4f8ff",
    fontWeight: "700",
  },
  previewText: {
    color: "#b3c6e0",
    fontSize: 12,
  },
  tabsRoot: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#31557c",
    backgroundColor: "#0b1d31",
    flexDirection: "row",
    padding: 6,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#1ecad3",
  },
  tabButtonText: {
    color: "#b3c6e0",
    fontWeight: "600",
    fontSize: 12,
  },
  tabButtonTextActive: {
    color: "#061420",
    fontWeight: "700",
  },
});
