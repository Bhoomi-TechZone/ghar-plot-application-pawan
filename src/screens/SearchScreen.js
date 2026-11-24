import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  ScrollView,
  Keyboard,
  Platform,
  Modal,
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

// Sort Options (Price Low to High, High to Low, etc.)
const SORT_OPTIONS = [
  { label: "Price: Low to High", value: "price_asc", icon: "trending-up-outline" },
  { label: "Price: High to Low", value: "price_desc", icon: "trending-down-outline" },
  { label: "Newest First", value: "newest", icon: "sparkles-outline" },
];

// Popular Locations for Quick Filter
const POPULAR_LOCATIONS = ["Delhi", "Kalka ji", "Noida", "Gurgaon", "Faridabad", "Ghaziabad"];

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
  const [selectedSort, setSelectedSort] = useState("newest");
  const [selectedBudgetIndex, setSelectedBudgetIndex] = useState(0);
  const [customMaxPrice, setCustomMaxPrice] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Mobile Filter Modal State
  const initialOpenFilter = route?.params?.openFilter || false;
  const [filterModalVisible, setFilterModalVisible] = useState(initialOpenFilter);

  useEffect(() => {
    if (route?.params?.openFilter) {
      setFilterModalVisible(true);
    }
  }, [route?.params?.openFilter]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSort !== "newest") count++;
    if (selectedBudgetIndex !== 0 || customMaxPrice) count++;
    if (selectedType !== "all") count++;
    return count;
  }, [selectedSort, selectedBudgetIndex, customMaxPrice, selectedType]);

  // Results & Loading
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);

  // Sort helper function
  const sortResults = (list, sortMode) => {
    const sorted = [...list];
    if (sortMode === "price_asc") {
      sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortMode === "price_desc") {
      sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sortMode === "newest") {
      sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return sorted;
  };

  // Fetch properties from backend API
  const performSearch = useCallback(async (locOverride, budgetOverride, typeOverride, sortOverride) => {
    try {
      setLoading(true);
      const loc = locOverride !== undefined ? locOverride : locationText;
      const budget = budgetOverride !== undefined ? budgetOverride : BUDGET_PRESETS[selectedBudgetIndex];
      const type = typeOverride !== undefined ? typeOverride : selectedType;
      const sort = sortOverride !== undefined ? sortOverride : selectedSort;

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
        sortBy: sort,
      });

      // Apply client-side sorting guarantee
      const finalSorted = sortResults(results, sort);
      setProperties(finalSorted);
      setSearchedOnce(true);
    } catch (error) {
      console.error("Search error:", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [locationText, selectedBudgetIndex, customMaxPrice, selectedType, selectedSort]);

  // Initial load
  useEffect(() => {
    performSearch(initialQuery);
  }, []);

  const handleLocationSubmit = () => {
    Keyboard.dismiss();
    performSearch();
  };

  const handleQuickLocationSelect = (loc) => {
    Keyboard.dismiss();
    setLocationText(loc);
    performSearch(loc, BUDGET_PRESETS[selectedBudgetIndex], selectedType, selectedSort);
  };

  const handleSortSelect = (sortValue) => {
    setSelectedSort(sortValue);
    // Instantly sort already loaded properties
    setProperties((prev) => sortResults(prev, sortValue));
    // Also re-query backend
    performSearch(locationText, BUDGET_PRESETS[selectedBudgetIndex], selectedType, sortValue);
  };

  const handleBudgetSelect = (index) => {
    setSelectedBudgetIndex(index);
    setCustomMaxPrice("");
    performSearch(locationText, BUDGET_PRESETS[index], selectedType, selectedSort);
  };

  const handleApplyCustomBudget = () => {
    Keyboard.dismiss();
    performSearch();
  };

  const handleTypeSelect = (typeValue) => {
    setSelectedType(typeValue);
    performSearch(locationText, BUDGET_PRESETS[selectedBudgetIndex], typeValue, selectedSort);
  };

  const handleClearFilters = () => {
    setLocationText("");
    setSelectedSort("newest");
    setSelectedBudgetIndex(0);
    setCustomMaxPrice("");
    setSelectedType("all");
    performSearch("", BUDGET_PRESETS[0], "all", "newest");
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

      {/* ── Search Bar with Native Filter Button ── */}
      <View style={styles.searchBarContainer}>
        <Icon name="location" size={20} color="#0066ff" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search location (e.g. Delhi, Kalka ji, Noida)..."
          placeholderTextColor="#9ca3af"
          value={locationText}
          onChangeText={setLocationText}
          onSubmitEditing={handleLocationSubmit}
          returnKeyType="search"
        />
        {locationText.length > 0 && (
          <TouchableOpacity
            style={{ padding: 4, marginRight: 4 }}
            onPress={() => { setLocationText(""); performSearch(""); }}
          >
            <Icon name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Quick Filter Bar & Popular Chips ── */}
      <View style={styles.quickBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickBarScroll}>
          {/* Filter Modal Trigger Pill */}
          <TouchableOpacity
            style={[styles.quickFilterTrigger, activeFilterCount > 0 && styles.quickFilterTriggerActive]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.8}
          >
            <Icon
              name="options-outline"
              size={14}
              color={activeFilterCount > 0 ? "#ffffff" : "#0066ff"}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.quickFilterTriggerText, activeFilterCount > 0 && styles.quickFilterTriggerTextActive]}>
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
            </Text>
            <Icon
              name="chevron-down"
              size={13}
              color={activeFilterCount > 0 ? "#ffffff" : "#0066ff"}
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>

          {/* Active Filter Removable Chips */}
          {selectedType !== "all" && (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => handleTypeSelect("all")}
            >
              <Text style={styles.activeFilterChipText}>
                {TYPE_PRESETS.find((t) => t.value === selectedType)?.label || selectedType}
              </Text>
              <Icon name="close-circle" size={14} color="#0066ff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}

          {(selectedBudgetIndex !== 0 || customMaxPrice) && (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => {
                setSelectedBudgetIndex(0);
                setCustomMaxPrice("");
                performSearch(locationText, BUDGET_PRESETS[0], selectedType, selectedSort);
              }}
            >
              <Text style={styles.activeFilterChipText}>
                {customMaxPrice ? `Max ₹${customMaxPrice}` : BUDGET_PRESETS[selectedBudgetIndex].label}
              </Text>
              <Icon name="close-circle" size={14} color="#0066ff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}

          {selectedSort !== "newest" && (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => handleSortSelect("newest")}
            >
              <Text style={styles.activeFilterChipText}>
                {SORT_OPTIONS.find((s) => s.value === selectedSort)?.label}
              </Text>
              <Icon name="close-circle" size={14} color="#0066ff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={styles.quickBarDivider} />

          {/* Popular Locations Chips */}
          {POPULAR_LOCATIONS.map((loc) => {
            const isSelected = locationText.toLowerCase().includes(loc.toLowerCase());
            return (
              <TouchableOpacity
                key={loc}
                style={[styles.locChip, isSelected && styles.locChipActive]}
                onPress={() => handleQuickLocationSelect(loc)}
              >
                <Text style={[styles.locChipText, isSelected && styles.locChipTextActive]}>
                  {loc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Native Mobile Filter BottomSheet Modal ── */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            {/* Sheet Handle */}
            <View style={styles.sheetDragHandle} />

            {/* Modal Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="options" size={20} color="#0066ff" />
                <Text style={styles.sheetTitle}>Filters & Sort</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.activeCountBadge}>
                    <Text style={styles.activeCountBadgeText}>{activeFilterCount} active</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <TouchableOpacity onPress={handleClearFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.modalResetLink}>Reset All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterModalVisible(false)}
                  style={styles.sheetCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable Filters Content */}
            <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
              {/* 1. Sort by Price & Relevance */}
              <View style={styles.modalSectionCard}>
                <Text style={styles.modalSectionTitle}>⚡ Sort by Price & Relevance</Text>
                <View style={styles.sortRow}>
                  {SORT_OPTIONS.map((sortOpt) => {
                    const isActive = selectedSort === sortOpt.value;
                    return (
                      <TouchableOpacity
                        key={sortOpt.value}
                        style={[styles.sortBtn, isActive && styles.sortBtnActive]}
                        onPress={() => handleSortSelect(sortOpt.value)}
                        activeOpacity={0.8}
                      >
                        <Icon
                          name={sortOpt.icon}
                          size={16}
                          color={isActive ? "#0066ff" : "#64748b"}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.sortBtnText, isActive && styles.sortBtnTextActive]}>
                          {sortOpt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. Budget (Price Range) */}
              <View style={styles.modalSectionCard}>
                <Text style={styles.modalSectionTitle}>💰 Budget (Price Range)</Text>
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
                    placeholder="Or enter custom max ₹ (e.g. 2500000)..."
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

              {/* 3. Property Type */}
              <View style={styles.modalSectionCard}>
                <Text style={styles.modalSectionTitle}>🏠 Property Type</Text>
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
            </ScrollView>

            {/* Sticky Sheet Footer Actions */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.sheetClearBtn}
                onPress={handleClearFilters}
              >
                <Text style={styles.sheetClearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetApplyBtn}
                onPress={() => {
                  setFilterModalVisible(false);
                  performSearch();
                }}
              >
                <Text style={styles.sheetApplyBtnText}>
                  Show Properties ({properties.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Results Header ── */}
        <View style={styles.resultsHeader}>
          <View>
            <Text style={styles.resultsCountText}>
              {locationText.trim()
                ? `Properties in "${locationText.trim()}"`
                : "All Properties"}
            </Text>
            <Text style={styles.sortIndicatorText}>
              Sorted by:{" "}
              <Text style={{ fontWeight: "700", color: "#0066ff" }}>
                {SORT_OPTIONS.find((s) => s.value === selectedSort)?.label}
              </Text>
            </Text>
          </View>
          <Text style={styles.resultsBadge}>{properties.length} found</Text>
        </View>

        {/* ── Property List ── */}
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
              Is location ya filter criteria me property available nahi hai. Filter reset karke dobara dekhein.
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
  // --- Native Filter Button & Badges in Search Bar ---
  filterIconBtn: {
    backgroundColor: '#eff6ff',
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  filterIconBtnActive: {
    backgroundColor: '#0066ff',
    borderColor: '#0066ff',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },

  // --- Quick Horizontal Filter Bar ---
  quickBarContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  quickBarScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
  },
  quickFilterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0066ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickFilterTriggerActive: {
    backgroundColor: '#0066ff',
    borderColor: '#0066ff',
  },
  quickFilterTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0066ff',
  },
  quickFilterTriggerTextActive: {
    color: '#ffffff',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 6,
  },
  activeFilterChipText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  quickBarDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 6,
  },

  // --- Native Bottom Sheet Modal Styles ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
    overflow: 'hidden',
  },
  sheetDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  activeCountBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  activeCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0066ff',
  },
  modalResetLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  modalSectionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  sheetClearBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  sheetClearBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  sheetApplyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#0066ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sheetApplyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1e293b",
    paddingVertical: 0,
  },
  searchIconBtn: {
    backgroundColor: "#0066ff",
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  popularLocContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  popularLocTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginRight: 6,
  },
  locChip: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  locChipActive: {
    backgroundColor: "#0066ff",
  },
  locChipText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  locChipTextActive: {
    color: "#fff",
  },
  filterSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
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
    marginBottom: 8,
  },
  sortRow: {
    flexDirection: "column",
    gap: 8,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  sortBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#0066ff",
  },
  sortBtnText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  sortBtnTextActive: {
    color: "#0066ff",
    fontWeight: "700",
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
    marginTop: 4,
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
    marginTop: 6,
  },
  resultsCountText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  sortIndicatorText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  resultsBadge: {
    fontSize: 13,
    color: "#0066ff",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardImage: {
    width: "100%",
    height: 165,
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
