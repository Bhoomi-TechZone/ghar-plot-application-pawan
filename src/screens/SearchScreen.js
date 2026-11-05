import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  ScrollView,
  Keyboard,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { searchPropertiesAPI } from "../services/propertyapi";
import { formatPrice } from "../services/homeApi";

const { width } = Dimensions.get("window");

// Quick Budget Presets
const BUDGET_PRESETS = [
  { label: "Sabhi (All)", min: null, max: null },
  { label: "Under ₹10 Lac", min: 0, max: 1000000 },
  { label: "₹10L - ₹25L", min: 1000000, max: 2500000 },
  { label: "₹25L - ₹50L", min: 2500000, max: 5000000 },
  { label: "₹50L - ₹1 Cr", min: 5000000, max: 10000000 },
  { label: "Above ₹1 Cr", min: 10000000, max: null },
];

// Property Type Presets
const TYPE_PRESETS = [
  { label: "All Properties", value: "all", icon: "grid-outline" },
  { label: "🏢 Flat / Apartment", value: "flat", icon: "business-outline" },
  { label: "🏡 Independent / Villa / Plot", value: "independent", icon: "home-outline" },
];

const SearchScreen = ({ navigation, route }) => {
  const initialQuery = route?.params?.initialQuery || "";

  // Filter States
  const [locationText, setLocationText] = useState(initialQuery);
  const [selectedBudgetIndex, setSelectedBudgetIndex] = useState(0);
  const [customMaxPrice, setCustomMaxPrice] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Results & Loading
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);

  // Fetch properties from backend API
  const performSearch = useCallback(async (locOverride, budgetOverride, typeOverride) => {
    try {
      setLoading(true);
      const loc = locOverride !== undefined ? locOverride : locationText;
      const budget = budgetOverride !== undefined ? budgetOverride : BUDGET_PRESETS[selectedBudgetIndex];
      const type = typeOverride !== undefined ? typeOverride : selectedType;

      let minPrice = budget.min !== null ? budget.min : undefined;
      let maxPrice = budget.max !== null ? budget.max : undefined;

      // Custom budget override if provided
      if (customMaxPrice && customMaxPrice.trim()) {
        const parsed = Number(customMaxPrice.replace(/[^0-9]/g, ""));
        if (!isNaN(parsed) && parsed > 0) {
          maxPrice = parsed;
          minPrice = 0;
        }
      }

      const results = await searchPropertiesAPI({
        location: loc.trim(),
        minPrice,
        maxPrice,
        residentialType: type,
      });

      setProperties(results);
      setSearchedOnce(true);
    } catch (error) {
      console.error("Search error:", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [locationText, selectedBudgetIndex, customMaxPrice, selectedType]);

  // Initial load or on parameter change
  useEffect(() => {
    performSearch(initialQuery);
  }, []);

  const handleLocationSubmit = () => {
    Keyboard.dismiss();
    performSearch();
  };

  const handleBudgetSelect = (index) => {
    setSelectedBudgetIndex(index);
    setCustomMaxPrice("");
    performSearch(locationText, BUDGET_PRESETS[index], selectedType);
  };

  const handleApplyCustomBudget = () => {
    Keyboard.dismiss();
    performSearch();
  };

  const handleTypeSelect = (typeValue) => {
    setSelectedType(typeValue);
    performSearch(locationText, BUDGET_PRESETS[selectedBudgetIndex], typeValue);
  };

  const handleClearFilters = () => {
    setLocationText("");
    setSelectedBudgetIndex(0);
    setCustomMaxPrice("");
    setSelectedType("all");
    performSearch("", BUDGET_PRESETS[0], "all");
  };

  // Helper to extract image URL
  const getImageUrl = (item) => {
    if (item?.photosAndVideo && Array.isArray(item.photosAndVideo) && item.photosAndVideo.length > 0) {
      const img = item.photosAndVideo[0];
      if (img.startsWith("http://") || img.startsWith("https://")) return img;
      const clean = img.replace(/^\/+/, "");
      return `https://gharplotbackend.gntechnology.de/${clean}`;
    }
    return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=500&fit=crop";
  };

  // Render individual property card
  const renderPropertyCard = ({ item }) => {
    const imgUrl = getImageUrl(item);
    const propId = item.customPropertyId || item._id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("PropertyDetailsScreen", { property: item })}
      >
        <Image source={{ uri: imgUrl }} style={styles.cardImage} resizeMode="cover" />

        <View style={styles.cardContent}>
          {/* Top Row: Unique ID + Subcategory */}
          <View style={styles.cardHeaderRow}>
            {item.customPropertyId ? (
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>{item.customPropertyId}</Text>
              </View>
            ) : null}
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {item.residentialType || item.propertyType || "Property"}
              </Text>
            </View>
          </View>

          {/* Price */}
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>

          {/* Location */}
          <View style={styles.cardLocRow}>
            <Icon name="location-sharp" size={14} color="#0066ff" />
            <Text style={styles.cardLocation} numberOfLines={1}>
              {item.propertyLocation || "Location not specified"}
            </Text>
          </View>

          {/* Specs: Bedrooms, Area, Purpose */}
          <View style={styles.specsRow}>
            {item.bedrooms ? (
              <Text style={styles.specText}>🛏️ {item.bedrooms} BHK</Text>
            ) : null}
            {item.areaDetails ? (
              <Text style={styles.specText}>📐 {item.areaDetails} sq ft</Text>
            ) : null}
            <Text style={styles.purposeText}>
              🏷️ For {item.purpose || "Sale"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <LinearGradient colors={["#0066ff", "#0044cc"]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Search</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleClearFilters}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Search Bar: Step 1 (Location) ── */}
      <View style={styles.searchBarContainer}>
        <Icon name="search-outline" size={20} color="#0066ff" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search location (e.g. Delhi, Kalka ji)..."
          placeholderTextColor="#9ca3af"
          value={locationText}
          onChangeText={setLocationText}
          onSubmitEditing={handleLocationSubmit}
          returnKeyType="search"
        />
        {locationText.length > 0 && (
          <TouchableOpacity onPress={() => { setLocationText(""); performSearch(""); }}>
            <Icon name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Step 2: "Kitne rupees ka property chahiye?" (Budget Filter) ── */}
        <View style={styles.filterSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>💰 Kitne rupees ka property chahiye?</Text>
          </View>

          {/* Quick Budget Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {BUDGET_PRESETS.map((preset, idx) => {
              const isActive = selectedBudgetIndex === idx && !customMaxPrice;
              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.pill, isActive && styles.pillActive]}
                  onPress={() => handleBudgetSelect(idx)}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Custom Budget Input */}
          <View style={styles.customBudgetRow}>
            <TextInput
              style={styles.customBudgetInput}
              placeholder="Or enter custom ₹ (e.g. 100000, 4000000)..."
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={customMaxPrice}
              onChangeText={setCustomMaxPrice}
            />
            <TouchableOpacity style={styles.customApplyBtn} onPress={handleApplyCustomBudget}>
              <Text style={styles.customApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Step 3: "Flat chahiye ya Independent?" (Type Filter) ── */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>🏠 Flat chahiye ya Independent?</Text>
          <View style={styles.typeRow}>
            {TYPE_PRESETS.map((t) => {
              const isActive = selectedType === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeBtn, isActive && styles.typeBtnActive]}
                  onPress={() => handleTypeSelect(t.value)}
                >
                  <Text style={[styles.typeBtnText, isActive && styles.typeBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Results Header ── */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCountText}>
            {locationText.trim()
              ? `Properties in "${locationText.trim()}"`
              : "All Matched Properties"}
          </Text>
          <Text style={styles.resultsBadge}>{properties.length} found</Text>
        </View>

        {/* ── Property List (All Matched) ── */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0066ff" />
            <Text style={styles.loaderText}>Searching properties...</Text>
          </View>
        ) : properties.length > 0 ? (
          properties.map((item) => (
            <View key={item._id} style={{ marginBottom: 12 }}>
              {renderPropertyCard({ item })}
            </View>
          ))
        ) : searchedOnce ? (
          <View style={styles.emptyContainer}>
            <Icon name="home-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Koi Property Nahi Mili</Text>
            <Text style={styles.emptySubText}>
              Is location ya budget me filhal property available nahi hai.
            </Text>
            <TouchableOpacity style={styles.viewAllBtn} onPress={handleClearFilters}>
              <Text style={styles.viewAllText}>View All Available Properties</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  resetBtn: {
    padding: 6,
  },
  resetText: {
    color: "#bfdbfe",
    fontSize: 14,
    fontWeight: "600",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#1e293b",
    paddingVertical: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  filterSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  pillRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  pill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pillActive: {
    backgroundColor: "#0066ff",
    borderColor: "#0066ff",
  },
  pillText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  customBudgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customBudgetInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#1e293b",
  },
  customApplyBtn: {
    backgroundColor: "#0066ff",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  customApplyText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  typeRow: {
    flexDirection: "column",
    gap: 8,
    marginTop: 8,
  },
  typeBtn: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  typeBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#0066ff",
  },
  typeBtnText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  typeBtnTextActive: {
    color: "#0066ff",
    fontWeight: "700",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  resultsCountText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  resultsBadge: {
    fontSize: 12,
    color: "#0066ff",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardImage: {
    width: "100%",
    height: 160,
  },
  cardContent: {
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  idBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  idBadgeText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
  },
  typeBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  typeBadgeText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  cardLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  cardLocation: {
    fontSize: 13,
    color: "#64748b",
    flex: 1,
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  specText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  purposeText: {
    fontSize: 12,
    color: "#0066ff",
    fontWeight: "600",
    marginLeft: "auto",
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: "#64748b",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  viewAllBtn: {
    backgroundColor: "#0066ff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewAllText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
