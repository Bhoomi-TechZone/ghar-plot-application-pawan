// EditProfileScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const EditProfileScreen = ({ navigation }) => {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("johndoe@gmail.com");
  const [phone, setPhone] = useState("9876543210");
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image
            source={require("../assets/profile.png")}
            style={styles.avatar}
          />
          <TouchableOpacity
            style={styles.editAvatar}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="camera-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Card Form */}
        <View style={styles.formCard}>
          {/* Name */}
          <View style={styles.inputRow}>
            <Icon name="person-outline" size={20} color="#FF7A00" />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              placeholderTextColor="#999"
            />
          </View>

          {/* Email */}
          <View style={styles.inputRow}>
            <Icon name="mail-outline" size={20} color="#FF7A00" />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email Address"
              keyboardType="email-address"
              placeholderTextColor="#999"
            />
          </View>

          {/* Phone */}
          <View style={styles.inputRow}>
            <Icon name="call-outline" size={20} color="#FF7A00" />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn}>
            <Text style={styles.saveText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Sheet for Avatar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalItem}>
              <Icon name="camera" size={22} color="#FF7A00" />
              <Text style={styles.modalText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalItem}>
              <Icon name="image" size={22} color="#FF7A00" />
              <Text style={styles.modalText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f5f9" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
  backgroundColor: "#FF7A00",
    padding: 15,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 15,
  },

  // Avatar
  avatarContainer: {
    alignItems: "center",
    marginTop: -40,
    marginBottom: 20,
    paddingTop: 60,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#eee",
    elevation: 4,
  },
  editAvatar: {
    position: "absolute",
    bottom: 0,
    right: "38%",
  backgroundColor: "#FF7A00",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },

  // Form Card
  formCard: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: "#fafafa",
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#333",
  },

  // Save button
  saveBtn: {
  backgroundColor: "#FF7A00",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    elevation: 3,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  modalText: { marginLeft: 10, fontSize: 15, color: "#333" },
});

export default EditProfileScreen;
