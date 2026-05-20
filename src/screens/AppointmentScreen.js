import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const AppointmentScreen = () => {
  const navigation = useNavigation();

  // Sample appointment data
  const [appointments, setAppointments] = useState([
    {
      id: "1",
      doctor: "Dr. Rakesh Sharma",
      speciality: "Cardiologist",
      hospital: "Max Hospital, Noida",
      date: "19 Sep",
      time: "10:00 AM",
      status: "Booked",
    },
    {
      id: "2",
      doctor: "Dr. Priya Verma",
      speciality: "Dermatologist",
      hospital: "Apollo Hospital, Delhi",
      date: "15 Sep",
      time: "11:30 AM",
      status: "Completed",
    },
  ]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("AppointmentChatScreen", { doctor: item })
      }
    >
  <Icon name="person-circle-outline" size={50} color="#FF7A00" />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={styles.docName}>{item.doctor}</Text>
        <Text style={styles.docSpeciality}>{item.speciality}</Text>
        <Text style={styles.docHospital}>{item.hospital}</Text>
        <Text style={styles.docHospital}>
          {item.date} at {item.time}
        </Text>
      </View>
      <Text
        style={[
          styles.status,
          item.status === "Completed" ? styles.completed : styles.booked,
        ]}
      >
        {item.status}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Back Arrow */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Header Title */}
        <Text style={styles.headerTitle}>My Appointments</Text>

        {/* Chat Icon */}
        <TouchableOpacity
          onPress={() => navigation.navigate("AppointmentChat")}
        >
          <Icon name="chatbubbles-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Appointment List */}
      <FlatList
        data={appointments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  backgroundColor: "#FF7A00",
    paddingVertical: 15,
    paddingHorizontal: 15,
    paddingTop: 50,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginBottom: 12,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    alignItems: "center",
  },
  docName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  docSpeciality: { fontSize: 14, color: "#555", marginTop: 2 },
  docHospital: { fontSize: 13, color: "#777", marginTop: 2 },

  status: { fontSize: 13, fontWeight: "bold", marginLeft: 8 },
  booked: { color: "#FF7A00" },
  completed: { color: "green" },
});

export default AppointmentScreen;
