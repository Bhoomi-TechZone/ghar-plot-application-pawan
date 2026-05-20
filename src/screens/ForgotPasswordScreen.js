// ForgotPasswordScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");

  return (
    <LinearGradient colors={["#6BA3BE", "#27496D"]} style={styles.container}>
      <View style={styles.card}>
        {/* Title */}
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your registered email or phone number to reset your password
        </Text>

        {/* Input */}
        <View style={styles.inputContainer}>
          <Icon name="mail-outline" size={20} color="#666" style={styles.icon} />
          <TextInput
            placeholder="Email or Phone Number"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholderTextColor="#999"
          />
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            // 🔹 You can add Firebase/Backend integration here
            alert("Password reset link has been sent!");
            navigation.navigate("LoginScreen");
          }}
        >
          <Text style={styles.btnText}>Send Reset Link</Text>
        </TouchableOpacity>

        {/* Back to Login */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 45,
    fontSize: 14,
    color: "#000",
  },
  resetBtn: {
  backgroundColor: "#FF7A00",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  backText: {
    textAlign: "center",
    marginTop: 15,
  color: "#FF7A00",
    fontSize: 14,
  },
});

export default ForgotPasswordScreen;
