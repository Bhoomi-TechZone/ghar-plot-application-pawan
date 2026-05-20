import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  StatusBar,
} from "react-native";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    image: require("../assets/onboard1.webp"),
    title: "Discover Tranquility,\nRedefine Luxury",
    subtitle: "Find your dream estate with breathtaking views and exceptional experiences.",
  },
  {
    id: "2",
    image: require("../assets/onboard2.webp"),
    title: "Explore Top Listings",
    subtitle: "View detailed information with images & pricing.",
  },
  {
    id: "3",
    image: require("../assets/onboard3.png"),
    title: "Connect with Agents",
    subtitle: "Get in touch with verified real estate agents instantly.",
  },
];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    animateContent();
  }, [currentIndex]);

  const animateContent = () => {
    fadeAnim.setValue(0);
    slideUpAnim.setValue(50);
    scaleAnim.setValue(0.9);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      navigation.replace("Login");
    }
  };

  const handleSkip = () => {
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ImageBackground source={item.image} style={styles.bgImage}>
            {/* Gradient Overlay */}
            <View style={styles.gradientOverlay} />

            {/* Skip Button */}
            {currentIndex < slides.length - 1 && (
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}

            {/* Animated Content */}
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideUpAnim },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              {/* Dots Indicator */}
              <View style={styles.dotsContainer}>
                {slides.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === currentIndex && styles.activeDot,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>

              {/* Button Container */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleNext}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>
                    {currentIndex === slides.length - 1 ? "Get Started" : "Continue"}
                  </Text>
                  <View style={styles.buttonArrow}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.replace("Home")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>
                    Already have an account? <Text style={styles.boldText}>Log In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ImageBackground>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  bgImage: {
    width,
    height,
    justifyContent: "flex-end",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  skipButton: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  skipText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  content: {
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 5,
  },
  activeDot: {
    width: 28,
    backgroundColor: "#007bff",
    borderWidth: 2,
    borderColor: "#fff",
  },
  textContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 15,
    lineHeight: 38,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  buttonContainer: {
    gap: 15,
  },
  primaryButton: {
    backgroundColor: "#007bff",
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007bff",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  buttonArrow: {
    marginLeft: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  boldText: {
    fontWeight: "800",
    color: "#fff",
    textDecorationLine: "underline",
  },
});

export default OnboardingScreen;