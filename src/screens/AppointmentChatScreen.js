import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const AppointmentChatScreen = ({ route, navigation }) => {
  const doctor = route?.params?.doctor || {
    doctor: "Dr. Rakesh Sharma",
    speciality: "Cardiologist",
    hospital: "Max Hospital, Noida",
    experience: "12 yrs",
    fees: "₹800",
    rating: "⭐ 4.8",
  };

  const [messages, setMessages] = useState([
    {
      id: "1",
      type: "doctor",
      text: `Hi 👋, I’m ${doctor.doctor}. How can I assist you today?`,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [status, setStatus] = useState("Pending");

  const dates = ["25 Sep", "26 Sep", "27 Sep", "28 Sep", "29 Sep"];
  const times = ["10:00 AM", "11:30 AM", "1:00 PM", "3:30 PM", "5:00 PM"];

  const addMessage = (text, type = "user") => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), type, text }]);
  };

  const doctorReply = (text) => {
    setTimeout(() => {
      addMessage(text, "doctor");
    }, 600);
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    addMessage(`I choose ${date}`);
    doctorReply("Great! Now select a time.");
  };

  const handleSelectTime = (time) => {
    setSelectedTime(time);
    addMessage(`I prefer ${time}`);
    doctorReply("Perfect! Tap confirm to book your appointment.");
  };

  const handleBooking = () => {
    if (!selectedDate || !selectedTime) {
      alert("Please select date and time");
      return;
    }
    addMessage("Confirm ✅");
    setStatus("Booked");
    doctorReply(`Your appointment is booked on ${selectedDate} at ${selectedTime} 🎉`);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    addMessage(inputText);
    setInputText("");
    doctorReply("Thanks for your message. I will respond soon!");
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.type === "user" ? styles.userBubble : styles.doctorBubble,
      ]}
    >
      <Text style={item.type === "user" ? styles.userText : styles.doctorText}>
        {item.text}
      </Text>
    </View>
  );

  // Modern card design for appointment options
  const renderOptions = (options, onSelect, selected) => (
    <View style={styles.optionContainer}>
      {options.map((item) => (
        <TouchableOpacity
          key={item}
          style={[
            styles.optionCard,
            selected === item ? styles.selectedOptionCard : {},
          ]}
          onPress={() => onSelect(item)}
        >
          <Text
            style={[
              styles.optionCardText,
              selected === item ? styles.selectedOptionText : {},
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{doctor.doctor}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Doctor Card */}
        <View style={styles.doctorCard}>
          <Icon name="person-circle-outline" size={60} color="#FF7A00" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.docName}>{doctor.doctor}</Text>
            <Text style={styles.docSpeciality}>{doctor.speciality}</Text>
            <Text style={styles.docMeta}>
              {doctor.experience} • {doctor.fees} • {doctor.rating}
            </Text>
          </View>
        </View>

        {/* Chat */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15 }}
        />

        {/* Modern Appointment Options */}
        {!selectedDate
          ? renderOptions(dates, handleSelectDate, selectedDate)
          : !selectedTime
          ? renderOptions(times, handleSelectTime, selectedTime)
          : status === "Pending" ? (
            <TouchableOpacity style={styles.bookBtn} onPress={handleBooking}>
              <Text style={styles.bookText}>Confirm Appointment</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.bookedText}>Appointment Booked ✅</Text>
          )}

        {/* Chat Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Icon name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
  backgroundColor: "#FF7A00",
    paddingVertical: 15,
    paddingHorizontal: 15,
    justifyContent: "space-between",
    paddingTop: 50,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  doctorCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 12,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
    alignItems: "center",
  },
  docName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  docSpeciality: { fontSize: 14, color: "#555", marginTop: 2 },
  docMeta: { fontSize: 12, color: "#999", marginTop: 4 },

  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 15,
    marginVertical: 6,
  },
  doctorBubble: { backgroundColor: "#e3f2fd", alignSelf: "flex-start" },
  userBubble: { backgroundColor: "#FF7A00", alignSelf: "flex-end" },
  doctorText: { color: "#333" },
  userText: { color: "#fff" },

  optionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 12,
    marginVertical: 8,
    justifyContent: "flex-start",
  },
  optionCard: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    margin: 6,
    elevation: 3,
  },
  selectedOptionCard: { backgroundColor: "#FF7A00" },
  optionCardText: { fontSize: 14, color: "#333" },
  selectedOptionText: { color: "#fff", fontWeight: "bold" },

  bookBtn: {
  backgroundColor: "#FF7A00",
    margin: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  bookText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  bookedText: {
    textAlign: "center",
    margin: 12,
  color: "#FF7A00",
    fontWeight: "bold",
    fontSize: 16,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    backgroundColor: "#fff",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
  },
  sendBtn: {
  backgroundColor: "#FF7A00",
    padding: 10,
    borderRadius: 20,
    marginLeft: 6,
  },
});

export default AppointmentChatScreen;
