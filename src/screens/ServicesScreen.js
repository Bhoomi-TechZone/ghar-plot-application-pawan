//This is my ServicesScreen.js

import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    SafeAreaView,
    Platform,
    StatusBar,
    Modal,
    TouchableWithoutFeedback,
    Pressable,
    TextInput,
    Animated,
    Alert,
    ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from 'react-native-linear-gradient';
import { createOrder, verifyPayment, submitServiceRequest } from '../services/paymentapi';
import { getServices } from '../services/homeApi';
import CrossPlatformAlert from '../utils/crossPlatformAlert';
// RazorpayCheckout was unused here — remove unused import to avoid warnings

const { width } = Dimensions.get("window");

// Services will be loaded from API. We keep a small placeholder until services load.
const categories = [];

const propertyTypes = [
    { id: 'office', label: 'Office', icon: 'business-outline', color: '#8B5CF6' },
    { id: 'apartment', label: 'Apartment', icon: 'home-outline', color: '#1E90FF' },
    { id: 'pg', label: 'PG / Hostel', icon: 'bed-outline', color: '#EC4899' },
    { id: 'villa', label: 'Villa', icon: 'location-outline', color: '#10B981' },
];

// ----------------------------------------------------------------------
// --- ANIMATED SUCCESS MODAL ---
// ----------------------------------------------------------------------

const SuccessModal = ({ visible, onClose, serviceName }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }).start();
        } else {
            scaleAnim.setValue(0);
        }
    }, [visible]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={modalStyles.successOverlay}>
                <Animated.View style={[modalStyles.successCard, { transform: [{ scale: scaleAnim }] }]}>
                    <View style={modalStyles.successIconContainer}>
                        <Icon name="checkmark-circle" size={80} color="#10B981" />
                    </View>
                    <Text style={modalStyles.successTitle}>Booking Confirmed!</Text>
                    <Text style={modalStyles.successMessage}>
                        Your service request for {serviceName} has been successfully booked.
                    </Text>
                    <Text style={modalStyles.successSubMessage}>
                        You'll receive a confirmation email shortly with all the details. Our team will contact you to confirm the appointment.
                    </Text>
                    <TouchableOpacity style={modalStyles.successButton} onPress={onClose}>
                        <Icon name="calendar" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={modalStyles.successButtonText}>View My Bookings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={modalStyles.successSecondaryButton} 
                        onPress={() => {
                            onClose();
                            // Navigate back to home or services
                        }}
                    >
                        <Text style={modalStyles.successSecondaryButtonText}>Back to Services</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ----------------------------------------------------------------------
// --- ENHANCED PAYMENT MODAL ---
// ----------------------------------------------------------------------

const PaymentModal = ({ visible, onClose, amount = 0, onPaid, order, rzpKey, onVerify, creatingOrder }) => {
    const [selected, setSelected] = useState('upi');
    const [processing, setProcessing] = useState(false);
    const [upiId, setUpiId] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCVV, setCardCVV] = useState('');
    const [cardName, setCardName] = useState('');
    const [paymentErrors, setPaymentErrors] = useState({});

    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }).start();
        } else {
            scaleAnim.setValue(0.9);
        }
    }, [visible]);

    const handlePay = () => {
        const errors = {};
        
        // Validate based on payment method
        if (selected === 'upi') {
            if (!upiId || !upiId.includes('@')) {
                errors.upiId = 'Please enter a valid UPI ID';
            }
        } else if (selected === 'card') {
            if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
                errors.cardNumber = 'Please enter a valid 16-digit card number';
            }
            if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
                errors.cardExpiry = 'Please enter expiry in MM/YY format';
            }
            if (!cardCVV || cardCVV.length !== 3) {
                errors.cardCVV = 'Please enter a valid 3-digit CVV';
            }
            if (!cardName || cardName.trim().length < 3) {
                errors.cardName = 'Please enter cardholder name';
            }
        }
        
        setPaymentErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setProcessing(true);
        // Simulate payment delay
        setTimeout(() => {
            setProcessing(false);
            onPaid && onPaid({ method: selected, amount, upiId, cardNumber: cardNumber ? `****${cardNumber.slice(-4)}` : '' });
            // Reset fields
            setUpiId('');
            setCardNumber('');
            setCardExpiry('');
            setCardCVV('');
            setCardName('');
            setPaymentErrors({});
        }, 1800);
    };

    const formatCardNumber = (text) => {
        const cleaned = text.replace(/\s/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        return formatted.substring(0, 19); // Max 16 digits + 3 spaces
    };

    const formatExpiry = (text) => {
        const cleaned = text.replace(/\D/g, '');
        if (cleaned.length >= 2) {
            return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
        }
        return cleaned;
    };

    const paymentMethods = [
        { id: 'upi', label: 'UPI', icon: 'wallet-outline', color: '#8B5CF6', description: 'Pay via UPI apps' },
        { id: 'card', label: 'Card', icon: 'card-outline', color: '#1E90FF', description: 'Credit/Debit card' },
        { id: 'cod', label: 'Cash', icon: 'cash-outline', color: '#10B981', description: 'Pay on service' },
    ];

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.centeredView}>
                    <TouchableWithoutFeedback>
                        <Animated.View style={[modalStyles.modalView, { transform: [{ scale: scaleAnim }] }]}>
                            <View style={modalStyles.modalHeader}>
                                <View>
                                    <Text style={modalStyles.modalTitle}>Payment</Text>
                                    <Text style={modalStyles.modalSubtitle}>Secure checkout • SSL encrypted</Text>
                                </View>
                                <TouchableOpacity onPress={onClose} disabled={processing}>
                                    <Icon name="close-circle" size={28} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ paddingHorizontal: 20, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
                                {/* Amount Display */}
                                <LinearGradient
                                    colors={['#F0FDF4', '#DCFCE7']}
                                    style={modalStyles.paymentAmountCard}
                                >
                                    <Text style={modalStyles.paymentAmountLabel}>Total Amount</Text>
                                    <Text style={modalStyles.paymentAmountText}>₹{Number(amount || 0).toLocaleString('en-IN')}</Text>
                                    <Text style={modalStyles.paymentAmountNote}>Including all taxes</Text>
                                </LinearGradient>

                                <Text style={{ fontSize: 16, color: '#111827', fontWeight: '700', marginTop: 20, marginBottom: 12 }}>
                                    Choose Payment Method
                                </Text>
                                
                                {/* Payment Method Options */}
                                <View style={{ marginBottom: 20 }}>
                                    {paymentMethods.map((method, idx) => (
                                        <TouchableOpacity
                                            key={method.id}
                                            onPress={() => {
                                                setSelected(method.id);
                                                setPaymentErrors({});
                                            }}
                                            style={[
                                                modalStyles.paymentMethodCard,
                                                selected === method.id && modalStyles.paymentMethodCardActive,
                                                { marginBottom: idx === paymentMethods.length - 1 ? 0 : 12 }
                                            ]}
                                            disabled={processing}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <View style={[modalStyles.paymentMethodIcon, { backgroundColor: method.color + '15' }]}>
                                                    <Icon name={method.icon} size={24} color={method.color} />
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={modalStyles.paymentMethodLabel}>{method.label}</Text>
                                                    <Text style={modalStyles.paymentMethodDescription}>{method.description}</Text>
                                                </View>
                                            </View>
                                            <View style={[
                                                modalStyles.radioOuter,
                                                selected === method.id && modalStyles.radioOuterActive
                                            ]}>
                                                {selected === method.id && <View style={modalStyles.radioInner} />}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Payment details form */}
                                {selected === 'upi' && (
                                    <View style={modalStyles.paymentDetailsContainer}>
                                        <Text style={modalStyles.paymentDetailsTitle}>Enter UPI Details</Text>
                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>UPI ID *</Text>
                                            <View style={[modalStyles.inputWithIcon, paymentErrors.upiId && modalStyles.inputError]}>
                                                <Icon name="at" size={20} color="#6B7280" />
                                                <TextInput
                                                    value={upiId}
                                                    onChangeText={setUpiId}
                                                    placeholder="yourname@upi"
                                                    style={modalStyles.inputFieldWithIcon}
                                                    autoCapitalize="none"
                                                    editable={!processing}
                                                />
                                            </View>
                                            {paymentErrors.upiId && <Text style={modalStyles.errorText}>{paymentErrors.upiId}</Text>}
                                        </View>
                                    </View>
                                )}

                                {selected === 'card' && (
                                    <View style={modalStyles.paymentDetailsContainer}>
                                        <Text style={modalStyles.paymentDetailsTitle}>Enter Card Details</Text>
                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Card Number *</Text>
                                            <View style={[modalStyles.inputWithIcon, paymentErrors.cardNumber && modalStyles.inputError]}>
                                                <Icon name="card" size={20} color="#6B7280" />
                                                <TextInput
                                                    value={cardNumber}
                                                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                                                    placeholder="1234 5678 9012 3456"
                                                    style={modalStyles.inputFieldWithIcon}
                                                    keyboardType="number-pad"
                                                    maxLength={19}
                                                    editable={!processing}
                                                />
                                            </View>
                                            {paymentErrors.cardNumber && <Text style={modalStyles.errorText}>{paymentErrors.cardNumber}</Text>}
                                        </View>

                                        <View style={{ flexDirection: 'row' }}>
                                            <View style={[modalStyles.inputGroup, { flex: 1, marginRight: 12 }]}>
                                                <Text style={modalStyles.label}>Expiry *</Text>
                                                <TextInput
                                                    value={cardExpiry}
                                                    onChangeText={(text) => setCardExpiry(formatExpiry(text))}
                                                    placeholder="MM/YY"
                                                    style={[modalStyles.inputField, paymentErrors.cardExpiry && modalStyles.inputError]}
                                                    keyboardType="number-pad"
                                                    maxLength={5}
                                                    editable={!processing}
                                                />
                                                {paymentErrors.cardExpiry && <Text style={modalStyles.errorText}>{paymentErrors.cardExpiry}</Text>}
                                            </View>

                                            <View style={[modalStyles.inputGroup, { flex: 1 }]}>
                                                <Text style={modalStyles.label}>CVV *</Text>
                                                <TextInput
                                                    value={cardCVV}
                                                    onChangeText={(text) => setCardCVV(text.replace(/\D/g, ''))}
                                                    placeholder="123"
                                                    style={[modalStyles.inputField, paymentErrors.cardCVV && modalStyles.inputError]}
                                                    keyboardType="number-pad"
                                                    maxLength={3}
                                                    secureTextEntry
                                                    editable={!processing}
                                                />
                                                {paymentErrors.cardCVV && <Text style={modalStyles.errorText}>{paymentErrors.cardCVV}</Text>}
                                            </View>
                                        </View>

                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Cardholder Name *</Text>
                                            <TextInput
                                                value={cardName}
                                                onChangeText={setCardName}
                                                placeholder="Name on card"
                                                style={[modalStyles.inputField, paymentErrors.cardName && modalStyles.inputError]}
                                                autoCapitalize="words"
                                                editable={!processing}
                                            />
                                            {paymentErrors.cardName && <Text style={modalStyles.errorText}>{paymentErrors.cardName}</Text>}
                                        </View>
                                    </View>
                                )}

                                {selected === 'cod' && (
                                    <View style={modalStyles.paymentDetailsContainer}>
                                        <View style={modalStyles.codInfoCard}>
                                            <Icon name="information-circle" size={24} color="#10B981" />
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={modalStyles.codInfoTitle}>Cash on Service</Text>
                                                <Text style={modalStyles.codInfoText}>
                                                    Pay ₹{Number(amount || 0).toLocaleString('en-IN')} directly to the service professional when they arrive.
                                                </Text>
                                                <Text style={[modalStyles.codInfoText, { marginTop: 8, fontWeight: '600', color: '#059669' }]}>
                                                    ✓ No advance payment required{'\n'}
                                                    ✓ Pay only after service is completed{'\n'}
                                                    ✓ Cash or UPI accepted on-site
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Security Badge */}
                                <View style={modalStyles.securityBadge}>
                                    <Icon name="shield-checkmark" size={16} color="#10B981" />
                                    <Text style={modalStyles.securityText}>Secured by 256-bit SSL encryption</Text>
                                </View>

                                {/* --- Order Debug / Info (only show in dev mode) --- */}
                                {__DEV__ && (
                                    <View style={{ marginTop: 16 }}>
                                        <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>Debug: Order info (server)</Text>
                                        {creatingOrder ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <ActivityIndicator size="small" />
                                                <Text style={{ marginLeft: 8, color: '#6B7280' }}>Creating order...</Text>
                                            </View>
                                        ) : (
                                            <View style={{ backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8 }}>
                                                <Text style={{ fontSize: 13, color: '#111827' }}>Order ID: {order?.id || '—'}</Text>
                                                <Text style={{ fontSize: 13, color: '#111827' }}>Status: {order?.status || '—'}</Text>
                                                <Text style={{ fontSize: 13, color: '#111827' }}>Amount: {order?.amount ? `₹${(order.amount/100).toLocaleString('en-IN')}` : '—'}</Text>
                                                <Text style={{ fontSize: 13, color: '#111827' }}>Razorpay Key: {rzpKey || '—'}</Text>
                                            </View>
                                        )}

                                        <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 8 }}>Manual verification (dev)</Text>
                                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>If you have a payment_id and signature (from checkout), you can paste them below to call the verify API for testing.</Text>
                                        <ManualVerifyForm onVerify={onVerify} order={order} />
                                    </View>
                                )}

                                <View style={{ height: 20 }} />
                            </ScrollView>

                            <View style={modalStyles.modalFooter}>
                                <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose} disabled={processing}>
                                    <Text style={modalStyles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <LinearGradient colors={['#10B981', '#059669']} style={modalStyles.submitButtonGradient} start={{x:0,y:0}} end={{x:1,y:0}}>
                                    <TouchableOpacity style={modalStyles.submitButton} onPress={handlePay} activeOpacity={0.9} disabled={processing}>
                                        {processing ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <ActivityIndicator color="#fff" />
                                                <Text style={[modalStyles.submitButtonText, { marginLeft: 10 }]}>Processing...</Text>
                                            </View>
                                        ) : (
                                            <>
                                                <Icon name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
                                                <Text style={modalStyles.submitButtonText}>
                                                    {selected === 'cod' ? 'Confirm Booking' : `Pay ₹${Number(amount || 0).toLocaleString('en-IN')}`}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </LinearGradient>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// Small internal component to collect manual verify fields and call onVerify
const ManualVerifyForm = ({ onVerify, order }) => {
    const [paymentId, setPaymentId] = useState('');
    const [signature, setSignature] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!paymentId || !signature) {
            CrossPlatformAlert.alert('Missing fields', 'Enter payment id and signature to verify');
            return;
        }
        setLoading(true);
        try {
            await onVerify({ razorpay_payment_id: paymentId, razorpay_order_id: order?.id, razorpay_signature: signature });
        } catch (e) {
            // handled in parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ marginTop: 8 }}>
            <TextInput placeholder="razorpay_payment_id" value={paymentId} onChangeText={setPaymentId} style={[modalStyles.inputField, { marginBottom: 8 }]} autoCapitalize="none" />
            <TextInput placeholder="razorpay_signature" value={signature} onChangeText={setSignature} style={[modalStyles.inputField, { marginBottom: 8 }]} autoCapitalize="none" />
                <TouchableOpacity onPress={submit} style={{ backgroundColor: '#1E90FF', padding: 10, borderRadius: 8, alignItems: 'center' }} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Verify Payment</Text>}
            </TouchableOpacity>
        </View>
    );
};

// ----------------------------------------------------------------------
// --- DATE PICKER MODAL ---
// ----------------------------------------------------------------------

const DatePickerModal = ({ visible, onClose, dates = [], onSelect }) => {
    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.centeredView}>
                    <TouchableWithoutFeedback>
                        <View style={[modalStyles.modalView, { paddingHorizontal: 12 }]}>
                            <View style={modalStyles.modalHeader}>
                                <Text style={modalStyles.modalTitle}>Select Date</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Icon name="close-circle" size={28} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={{ maxHeight: 320 }}>
                                {dates.map((d) => {
                                    const key = d.toISOString();
                                    const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                                    return (
                                        <TouchableOpacity key={key} style={modalStyles.dateRow} onPress={() => { onSelect(label); onClose(); }}>
                                            <Text style={modalStyles.dateText}>{label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ----------------------------------------------------------------------
// --- TIME PICKER MODAL ---
// ----------------------------------------------------------------------

const TimePickerModal = ({ visible, onClose, slots = [], onSelect }) => (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={modalStyles.centeredView}>
                <TouchableWithoutFeedback>
                    <View style={[modalStyles.modalView, { paddingHorizontal: 12 }]}>
                        <View style={modalStyles.modalHeader}>
                            <Text style={modalStyles.modalTitle}>Select Time Slot</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Icon name="close-circle" size={28} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {slots.map((s) => (
                                <TouchableOpacity key={s} style={modalStyles.dateRow} onPress={() => { onSelect(s); onClose(); }}>
                                    <Text style={modalStyles.dateText}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
    </Modal>
);

// ----------------------------------------------------------------------
// --- MAIN SCREEN COMPONENT ---
// ----------------------------------------------------------------------

const ServicesScreen = ({ navigation }) => {
    const [selectedService, setSelectedService] = useState(null);
    const [services, setServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [servicesError, setServicesError] = useState(null);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [paymentVisible, setPaymentVisible] = useState(false);
    const [pendingPayload, setPendingPayload] = useState(null);
    const [order, setOrder] = useState(null);
    const [rzpKey, setRzpKey] = useState(null);
    const [creatingOrder, setCreatingOrder] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);
    
    // Address fields
    const [place, setPlace] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [pincode, setPincode] = useState('');
    const [landmark, setLandmark] = useState('');
    
    // Contact fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [alternatePhone, setAlternatePhone] = useState('');
    const [email, setEmail] = useState('');
    const [alternateEmail, setAlternateEmail] = useState('');
    
    // Property & scheduling fields
    const [propertySize, setPropertySize] = useState('');
    const [preferredDate, setPreferredDate] = useState('');
    const [preferredTime, setPreferredTime] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [estimatedCost, setEstimatedCost] = useState(0);
    
    // UI state
    const [errors, setErrors] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchInput, setShowSearchInput] = useState(false);

    const slideAnim = useRef(new Animated.Value(100)).current;

    const timeSlots = ['Morning (8AM-12PM)', 'Afternoon (12PM-4PM)', 'Evening (4PM-8PM)'];
    const propertySizes = {
        apartment: ['1 BHK', '2 BHK', '3 BHK', '4+ BHK'],
        office: ['Small (< 1000 sq ft)', 'Medium (1000-3000 sq ft)', 'Large (> 3000 sq ft)'],
        pg: ['Single Room', 'Shared Room', 'Entire Floor'],
        villa: ['2 BHK', '3 BHK', '4 BHK', '5+ BHK'],
    };

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 9,
            useNativeDriver: true,
        }).start();
    }, []);

    // Load services list from backend
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setServicesLoading(true);
            setServicesError(null);
            try {
                const res = await getServices();
                if (!mounted) return;
                // Normalize to { id, name, serviceTypes, raw }
                const normalized = (res || []).map(s => ({ id: s._id || s.id, name: s.mainService || s.name, serviceTypes: s.serviceTypes || [], raw: s }));
                setServices(normalized);
                
                // Clear error if services loaded successfully
                if (normalized.length > 0) {
                    setServicesError(null);
                }
            } catch (e) {
                console.warn('Failed to load services:', e);
                if (mounted) {
                    // Provide user-friendly error message
                    if (e.message && e.message.includes('404')) {
                        setServicesError('Services are loading with sample data. Backend is being prepared.');
                    } else if (e.message && e.message.includes('Network')) {
                        setServicesError('Network error. Please check your internet connection.');
                    } else {
                        setServicesError('Unable to load services. Please try again.');
                    }
                }
            } finally {
                if (mounted) setServicesLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const retryLoadServices = async () => {
        setServicesLoading(true);
        setServicesError(null);
        try {
            const res = await getServices();
            const normalized = (res || []).map(s => ({ id: s._id || s.id, name: s.mainService || s.name, serviceTypes: s.serviceTypes || [], raw: s }));
            setServices(normalized);
            
            // Clear error if services loaded successfully
            if (normalized.length > 0) {
                setServicesError(null);
            }
        } catch (e) {
            console.warn('retryLoadServices failed:', e);
            // Provide user-friendly error message
            if (e.message && e.message.includes('404')) {
                setServicesError('Services are loading with sample data. Backend is being prepared.');
            } else if (e.message && e.message.includes('Network')) {
                setServicesError('Network error. Please check your internet connection.');
            } else {
                setServicesError('Unable to load services. Please try again.');
            }
        } finally {
            setServicesLoading(false);
        }
    };

    // Date & Time picker modal state
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [timePickerVisible, setTimePickerVisible] = useState(false);

    // Build a small array of next 30 dates for quick selection
    const nextNDates = (n = 30) => {
        const arr = [];
        const now = new Date();
        for (let i = 0; i < n; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);
            arr.push(d);
        }
        return arr;
    };
    const upcomingDates = nextNDates(30);

    const handleCategoryPress = (category) => {
        setSelectedService(category);
        setPropertySize(''); // Reset property size when service changes
        setEstimatedCost(0); // Reset cost
        // Haptic feedback simulation
        if (Platform.OS === 'ios') {
            // Add haptic feedback for iOS
        }
    };

    const handlePropertyPress = (typeId) => {
        setSelectedProperty((prev) => (prev === typeId ? null : typeId));
        setPropertySize(''); // Reset property size when property type changes
        setEstimatedCost(0); // Reset cost
    };

    const handlePropertySizeSelect = (size) => {
        setPropertySize(size);
        // Calculate estimated cost with improved error handling
        if (selectedService && selectedProperty) {
            // selectedProperty is an id like 'apartment' -> map to label
            const selLabel = propertyTypes.find(p => p.id === selectedProperty)?.label || selectedProperty;
            const serviceType = (selectedService.serviceTypes || []).find(st => (st.typeName || '').toLowerCase() === (selLabel || '').toLowerCase());
            const charges = serviceType?.adminConfig?.baseCharges || {};

            // Try direct lookup first, then fallback to a case-insensitive/space-insensitive key match
            let baseCharge = undefined;
            if (charges && typeof charges === 'object') {
                if (Object.prototype.hasOwnProperty.call(charges, size)) {
                    baseCharge = charges[size];
                } else {
                    const normalize = (s) => (s || '').toString().replace(/\s+/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
                    const target = normalize(size);
                    // try exact normalized match first
                    for (const k of Object.keys(charges)) {
                        if (normalize(k) === target) {
                            baseCharge = charges[k];
                            break;
                        }
                    }
                    // fallback: substring match (handles 'Small (< 1000 sq ft)' vs 'Small')
                    if (baseCharge === undefined) {
                        for (const k of Object.keys(charges)) {
                            const nk = normalize(k);
                            if (nk.includes(target) || target.includes(nk)) {
                                baseCharge = charges[k];
                                break;
                            }
                        }
                    }
                }
            }

            // If we still don't have a numeric baseCharge, try to pick a sensible default
            if (baseCharge === undefined || baseCharge === null) {
                // If charges contains any numeric value, use the smallest one as a conservative estimate
                const nums = Object.values(charges).filter(v => typeof v === 'number');
                if (nums.length > 0) baseCharge = Math.min(...nums);
                else {
                    // Default fallback prices based on property type and size
                    console.warn('[ServicesScreen] No price found in backend, using fallback prices');
                    baseCharge = 1000; // Minimum default
                }
            }

            if (__DEV__) {
                // Helpful debug info when mapping fails or is ambiguous
                try {
                    const sample = { size, selectedService: selectedService?.name, selectedProperty, serviceTypeName: serviceType?.typeName, charges };
                    console.log('[ServicesScreen] Service price mapping', sample, 'resolvedBaseCharge=', baseCharge);
                } catch (e) {
                    // ignore
                }
            }

            // Ensure numeric
            const numeric = Number(baseCharge) || 1000;
            setEstimatedCost(numeric);
        }
    };

    const handleRequestPress = () => {
        if (!selectedService || !selectedProperty) return;
        const propLabel = propertyTypes.find(p => p.id === selectedProperty)?.label || '';
        setPlace(propLabel);
        setAddress('');
        setCity('');
        setPincode('');
        setLandmark('');
        setFullName('');
        setPhone('');
        setAlternatePhone('');
        setEmail('');
        setAlternateEmail('');
        setPropertySize('');
        setPreferredDate('');
        setPreferredTime('');
        setSpecialInstructions('');
        setErrors({});
        setConfirmVisible(true);
    };

    const validateAndSubmit = () => {
        const e = {};
        if (!place || place.trim().length < 2) e.place = 'Please select property type';
        if (!address || address.trim().length < 5) e.address = 'Please enter complete address';
        if (!city || city.trim().length < 2) e.city = 'Please enter city name';
        if (!pincode || !/^\d{6}$/.test(pincode)) e.pincode = 'Enter valid 6-digit pincode';
        if (!fullName || fullName.trim().length < 2) e.fullName = 'Please enter your full name';
        if (!propertySize) e.propertySize = 'Please select property size';
        if (!preferredDate) e.preferredDate = 'Please select preferred date';
        if (!preferredTime) e.preferredTime = 'Please select time slot';
        
        const phoneDigits = phone.replace(/\D/g, '');
        if (!phoneDigits || phoneDigits.length < 10) e.phone = 'Enter a valid 10-digit phone number';
        
        // Validate alternate phone if provided
        if (alternatePhone) {
            const altPhoneDigits = alternatePhone.replace(/\D/g, '');
            if (altPhoneDigits.length > 0 && altPhoneDigits.length < 10) {
                e.alternatePhone = 'Enter a valid 10-digit alternate phone number';
            }
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) e.email = 'Enter a valid email';
        
        // Validate alternate email if provided
        if (alternateEmail && !emailRegex.test(alternateEmail)) {
            e.alternateEmail = 'Enter a valid alternate email';
        }
        
        setErrors(e);
        if (Object.keys(e).length > 0) return;

        const payload = {
            serviceId: selectedService.id,
            serviceName: selectedService.name,
            propertyType: selectedProperty,
            place,
            address,
            city,
            pincode,
            landmark,
            fullName,
            propertySize,
            preferredDate,
            preferredTime,
            specialInstructions,
            phone,
            alternatePhone,
            email,
            alternateEmail,
            estimatedCost,
            requestedAt: new Date().toISOString(),
        };
        console.log('Request service payload:', payload);
        // Open payment modal before final submission
        setPendingPayload(payload);
        setConfirmVisible(false);
        setPaymentVisible(true);
    };

    const handlePaymentComplete = (paymentInfo) => {
        // paymentInfo: { method, amount }
        console.log('[ServicesScreen] Payment completed', paymentInfo, 'payload:', pendingPayload);

        (async () => {
            try {
                const submitPayload = {
                    ...pendingPayload,
                    payment: paymentInfo,
                    orderId: order?.id,
                    razorpayKey: rzpKey,
                };
                
                console.log('[ServicesScreen] Submitting service request:', submitPayload);
                
                // Attempt to submit booking to backend (this should trigger email on server)
                const res = await submitServiceRequest(submitPayload);
                console.log('[ServicesScreen] submitServiceRequest result:', res);
                
                // Check for success in multiple ways (backend may return different formats)
                const isSuccess = res && (
                    res.success === true || 
                    res.status === 'success' || 
                    res.status === 'ok' ||
                    res.message === 'success' ||
                    (res.data && res.data.success === true)
                );
                
                if (isSuccess) {
                    // Show warning if it's a mock response (backend not ready)
                    if (res.warning && __DEV__) {
                        console.warn('[ServicesScreen] ⚠️ Mock Response:', res.warning);
                        console.log('[ServicesScreen] 📝 Booking data saved locally (needs backend):', submitPayload);
                    }
                    
                    setPaymentVisible(false);
                    setPendingPayload(null);
                    setSuccessVisible(true);
                } else {
                    // Backend returned non-success: show error message
                    const errorMsg = res?.message || res?.error || 'Booking submission failed';
                    CrossPlatformAlert.alert(
                        'Booking Failed', 
                        errorMsg,
                        [{ text: 'OK', onPress: () => console.log('[ServicesScreen] User acknowledged booking failure') }]
                    );
                }
            } catch (err) {
                console.error('[ServicesScreen] submitServiceRequest error:', err);
                
                // User-friendly error message
                let errorMessage = 'Unable to process your booking. Please try again.';
                
                if (err.message && err.message.includes('404')) {
                    errorMessage = 'Service booking endpoint not available. Please contact support.';
                    console.error('[ServicesScreen] 🔴 Backend API missing: /api/services/request');
                } else if (err.message && err.message.includes('Network')) {
                    errorMessage = 'Network error. Please check your internet connection.';
                } else if (err.message) {
                    errorMessage = err.message;
                }
                
                CrossPlatformAlert.alert(
                    'Booking Failed', 
                    errorMessage,
                    [{ text: 'OK' }]
                );
            }
        })();
    };

    // When payment modal opens, create an order with backend so the client has order id + key
    useEffect(() => {
        // Create order when payment modal opens and we have a pending payload
        let mounted = true;
        const doCreate = async () => {
            if (!paymentVisible) return;
            if (!pendingPayload) return;
            if (!estimatedCost || Number(estimatedCost) <= 0) return;
            setCreatingOrder(true);
            setOrder(null);
            setRzpKey(null);
            try {
                // Backend expects amount in paise
                const amountPaise = Math.round(Number(estimatedCost) * 100);
                // Include service/context info in notes so backend can validate and attach to the order
                const notes = {
                    serviceId: pendingPayload.serviceId,
                    serviceName: pendingPayload.serviceName,
                    propertyType: pendingPayload.propertyType,
                    propertySize: pendingPayload.propertySize,
                    customerName: pendingPayload.fullName,
                    customerPhone: pendingPayload.phone,
                    customerEmail: pendingPayload.email,
                };
                const payload = { amount: amountPaise, currency: 'INR', receipt: `receipt_${Date.now()}`, notes };
                const res = await createOrder(payload);
                if (!mounted) return;
                if (res && res.success) {
                    setOrder(res.order || null);
                    setRzpKey(res.key || null);
                } else {
                    // still set raw response in order for debugging
                    setOrder(res.order || null);
                    setRzpKey(res.key || null);
                }
            } catch (e) {
                console.warn('[paymentapi] createOrder failed:', e);
                // keep order null and allow user to retry or proceed with COD
            } finally {
                if (mounted) setCreatingOrder(false);
            }
        };
        doCreate();
        return () => { mounted = false; };
    }, [paymentVisible, estimatedCost, pendingPayload]);

    const handleVerify = async ({ razorpay_payment_id, razorpay_order_id, razorpay_signature }) => {
        try {
            const payload = { razorpay_payment_id, razorpay_order_id, razorpay_signature };
            const res = await verifyPayment(payload);
            setVerifyResult(res);
            CrossPlatformAlert.alert('Verification Result', JSON.stringify(res));
            return res;
        } catch (err) {
            console.error('verifyPayment error:', err);
            CrossPlatformAlert.alert('Verification failed', err.message || 'Unknown error');
            throw err;
        }
    };

    const handleSuccessClose = () => {
        setSuccessVisible(false);
        navigation.navigate('MyBookingsScreen'); // Placeholder navigation
    };

    const filteredCategories = (services.length ? services : categories).filter(cat =>
        (cat.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View style={styles.container}>
                {/* Enhanced Header */}
                <LinearGradient
                    colors={['#FFFFFF', '#F9FAFB']}
                    style={styles.header}
                >
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Services</Text>
                        <Text style={styles.headerSubtitle}>Professional home services</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.searchButton}
                        onPress={() => setShowSearchInput(!showSearchInput)}
                    >
                        <Icon name="search" size={22} color="#1F2937" />
                    </TouchableOpacity>
                </LinearGradient>

                <Animated.ScrollView 
                    contentContainerStyle={[styles.scrollContent, { paddingHorizontal: 16 }]}
                    style={{ transform: [{ translateY: slideAnim }] }}
                    showsVerticalScrollIndicator={false}
                > 
                    {/* Stats Banner */}
                    <LinearGradient
                        colors={['#1E90FF', '#5DA9F6']}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={styles.statsBanner}
                    >
                        <View style={styles.statsItem}>
                            <Icon name="checkmark-done-circle" size={24} color="#fff" />
                            <Text style={styles.statsNumber}>500+</Text>
                            <Text style={styles.statsLabel}>Services</Text>
                        </View>
                        <View style={styles.statsItem}>
                            <Icon name="star" size={24} color="#FFD700" />
                            <Text style={styles.statsNumber}>4.8</Text>
                            <Text style={styles.statsLabel}>Rating</Text>
                        </View>
                        <View style={styles.statsItem}>
                            <Icon name="people" size={24} color="#fff" />
                            <Text style={styles.statsNumber}>10K+</Text>
                            <Text style={styles.statsLabel}>Customers</Text>
                        </View>
                    </LinearGradient>

                    {/* Search Bar */}
                    {showSearchInput && (
                        <View style={styles.searchBarContainer}>
                            <Icon name="search" size={20} color="#6B7280" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search services..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Icon name="close-circle" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Choose a Service</Text>
                        {selectedService && (
                            <TouchableOpacity onPress={() => setSelectedService(null)}>
                                <Text style={styles.clearText}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Categories Grid (from backend) */}
                    {servicesLoading ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="small" />
                        </View>
                    ) : servicesError ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: '#6B7280' }}>{servicesError}</Text>
                            <TouchableOpacity onPress={retryLoadServices} style={{ marginTop: 8 }}>
                                <Text style={{ color: '#1E90FF' }}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        filteredCategories.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#6B7280' }}>No services found.</Text>
                            </View>
                        ) : (
                        <FlatList
                            data={filteredCategories}
                            keyExtractor={(i, idx) => i.id || i.name || String(idx)}
                            numColumns={3}
                            columnWrapperStyle={{ justifyContent: 'space-between' }}
                            contentContainerStyle={{ marginTop: 8, paddingBottom: 8 }}
                            scrollEnabled={false}
                            renderItem={({ item }) => {
                                const active = selectedService && selectedService.id === item.id;
                                return (
                                    <Pressable
                                        onPress={() => handleCategoryPress(item)}
                                        style={({ pressed }) => [
                                            styles.categoryTile,
                                            active && styles.categoryTileActive,
                                            pressed && { transform: [{ scale: 0.95 }] },
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={active ? ['#BEE3FF', '#1E90FF'] : ['#F3F4F6', '#E5E7EB']}
                                            style={[styles.iconCircle, active && styles.iconCircleActive]}
                                        >
                                            {/* If backend provides an image use it, otherwise show initials */}
                                            {item.raw && item.raw.image ? (
                                                <Image source={{ uri: item.raw.image }} style={styles.iconImage} />
                                            ) : (
                                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                                                    <Text style={{ fontWeight: '700', color: '#4B5563' }}>{(item.name||'').charAt(0)}</Text>
                                                </View>
                                            )}
                                        </LinearGradient>
                                        <Text 
                                            style={[
                                                styles.categoryTileText, 
                                                active && { color: '#1F2937', fontWeight: '700' }
                                            ]} 
                                            numberOfLines={2}
                                        >
                                            {item.name}
                                        </Text>
                                        {item.raw && item.raw.trending && (
                                            <View style={styles.trendingBadgeSmall}>
                                                <Icon name="flame" size={8} color="#5DA9F6" />
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            }}
                        />
                    ))}

                    {/* Property Type Selection */}
                    {selectedService && (
                        <>
                            <Text style={[styles.sectionTitle, { marginTop: 24, fontSize: 16 }]}>
                                Select Property Type
                            </Text>
                            <View style={styles.propertyGrid}>
                                {propertyTypes.map((p) => {
                                    const isSelected = selectedProperty === p.id;
                                    return (
                                        <TouchableOpacity
                                            key={p.id}
                                            onPress={() => handlePropertyPress(p.id)}
                                            style={[
                                                styles.propertyCard,
                                                isSelected && styles.propertyCardActive
                                            ]}
                                        >
                                            <LinearGradient
                                                colors={isSelected ? [p.color, p.color + 'CC'] : ['#F9FAFB', '#F9FAFB']}
                                                style={styles.propertyIconContainer}
                                            >
                                                <Icon 
                                                    name={p.icon} 
                                                    size={28} 
                                                    color={isSelected ? '#fff' : p.color} 
                                                />
                                            </LinearGradient>
                                            <Text style={[
                                                styles.propertyCardText,
                                                isSelected && { color: '#1F2937', fontWeight: '700' }
                                            ]}>
                                                {p.label}
                                            </Text>
                                            {isSelected && (
                                                <View style={styles.checkmarkContainer}>
                                                    <Icon name="checkmark-circle" size={20} color="#10B981" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    <View style={{ height: 180 }} />
                </Animated.ScrollView>

                {/* Floating CTA Button */}
                {selectedService && selectedProperty && (
                    <Animated.View style={[styles.floatingCta, { transform: [{ translateY: slideAnim }] }]}>
                        <LinearGradient 
                            colors={["#10B981", "#059669"]} 
                            style={styles.ctaGradient}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 0}}
                        >
                            <TouchableOpacity 
                                onPress={handleRequestPress} 
                                style={styles.ctaButtonInner}
                                activeOpacity={0.9}
                            >
                                <View style={styles.ctaLeft}>
                                    <Text style={styles.ctaTitle}>{selectedService.name}</Text>
                                    <Text style={styles.ctaSubtitle}>
                                        {propertyTypes.find(p => p.id === selectedProperty)?.label}
                                    </Text>
                                </View>
                                <View style={styles.ctaRight}>
                                    {selectedService && selectedService.image ? (
                                        <Image source={selectedService.image} style={styles.ctaServiceImage} />
                                    ) : (
                                        <Icon name="arrow-forward-circle" size={32} color="#fff" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                )}

                {/* Bottom Tab Bar */}
                <View style={styles.bottomTabBar}>
                    <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('HomeScreen')}>
                        <Icon name="home" size={24} color="#9CA3AF" />
                        <Text style={styles.tabLabel}>Home</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.tabItem}>
                        <Icon name="briefcase" size={24} color="#1E90FF" />
                        <Text style={[styles.tabLabel, styles.tabLabelActive]}>Services</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.tabItem}
                        onPress={() => navigation.navigate('MyBookingsScreen')}
                    >
                        <Icon name="bookmark" size={24} color="#9CA3AF" />
                        <Text style={styles.tabLabel}>Bookings</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ProfileScreen')}>
                        <Icon name="person" size={24} color="#9CA3AF" />
                        <Text style={styles.tabLabel}>Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Request Form Modal */}
                <Modal
                    visible={confirmVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setConfirmVisible(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setConfirmVisible(false)}>
                        <View style={modalStyles.centeredView}>
                            <TouchableWithoutFeedback>
                                <View style={modalStyles.modalView}>
                                    <View style={modalStyles.modalHeader}>
                                        <View>
                                            <Text style={modalStyles.modalTitle}>Request Service</Text>
                                            <Text style={modalStyles.modalSubtitle}>
                                                {selectedService?.name} • {propertyTypes.find(p => p.id === selectedProperty)?.label}
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setConfirmVisible(false)}>
                                            <Icon name="close-circle" size={28} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView style={modalStyles.formContainer} showsVerticalScrollIndicator={false}>
                                        {/* Property Type Display */}
                                        <View style={modalStyles.propertyTypeDisplay}>
                                            <Icon name={propertyTypes.find(p => p.id === selectedProperty)?.icon} size={24} color="#1E90FF" />
                                            <Text style={modalStyles.propertyTypeText}>{place}</Text>
                                        </View>

                                        {/* Address Details Section */}
                                        <Text style={modalStyles.sectionTitle}>
                                            <Icon name="location" size={16} color="#1F2937" /> Address Details
                                        </Text>

                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Complete Address *</Text>
                                            <TextInput
                                                value={address}
                                                onChangeText={setAddress}
                                                placeholder="House/Flat No., Building Name, Street"
                                                style={[modalStyles.inputField, errors.address && modalStyles.inputError]}
                                                multiline
                                                numberOfLines={2}
                                            />
                                            {errors.address && <Text style={modalStyles.errorText}>{errors.address}</Text>}
                                        </View>

                                        <View style={modalStyles.rowInputs}>
                                            <View style={[modalStyles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                                <Text style={modalStyles.label}>City *</Text>
                                                <TextInput
                                                    value={city}
                                                    onChangeText={setCity}
                                                    placeholder="Delhi"
                                                    style={[modalStyles.inputField, errors.city && modalStyles.inputError]}
                                                />
                                                {errors.city && <Text style={modalStyles.errorText}>{errors.city}</Text>}
                                            </View>

                                            <View style={[modalStyles.inputGroup, { flex: 1 }]}>
                                                <Text style={modalStyles.label}>Pincode *</Text>
                                                <TextInput
                                                    value={pincode}
                                                    onChangeText={setPincode}
                                                    placeholder="110001"
                                                    keyboardType="number-pad"
                                                    maxLength={6}
                                                    style={[modalStyles.inputField, errors.pincode && modalStyles.inputError]}
                                                />
                                                {errors.pincode && <Text style={modalStyles.errorText}>{errors.pincode}</Text>}
                                            </View>
                                        </View>

                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Landmark (Optional)</Text>
                                            <TextInput
                                                value={landmark}
                                                onChangeText={setLandmark}
                                                placeholder="Near Metro Station, Mall, etc."
                                                style={modalStyles.inputField}
                                            />
                                        </View>

                                        {/* Property Details Section */}
                                        <Text style={modalStyles.sectionTitle}>
                                            <Icon name="home" size={16} color="#1F2937" /> Property Details
                                        </Text>

                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Property Size *</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                                                <View style={{ flexDirection: 'row' }}>
                                                    {propertySizes[selectedProperty]?.map((size, si, arr) => (
                                                        <TouchableOpacity
                                                            key={size}
                                                            onPress={() => handlePropertySizeSelect(size)}
                                                            style={[
                                                                modalStyles.chipButton,
                                                                propertySize === size && modalStyles.chipButtonActive,
                                                                { marginRight: si === (arr.length - 1) ? 0 : 8 }
                                                            ]}
                                                        >
                                                            <Text style={[
                                                                modalStyles.chipButtonText,
                                                                propertySize === size && { color: '#fff' }
                                                            ]}>
                                                                {size}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </ScrollView>
                                            {errors.propertySize && <Text style={modalStyles.errorText}>{errors.propertySize}</Text>}
                                        </View>

                                        {/* Cost Display */}
                                        {estimatedCost > 0 && (
                                            <View style={modalStyles.costCard}>
                                                <View style={modalStyles.costHeader}>
                                                    <Icon name="pricetag" size={20} color="#10B981" />
                                                    <Text style={modalStyles.costLabel}>Estimated Cost</Text>
                                                </View>
                                                <Text style={modalStyles.costAmount}>₹{estimatedCost.toLocaleString('en-IN')}</Text>
                                                <Text style={modalStyles.costNote}>*Final cost may vary based on actual requirements</Text>
                                            </View>
                                        )}

                                        {/* Scheduling Section */}
                                        <Text style={modalStyles.sectionTitle}>
                                            <Icon name="calendar" size={16} color="#1F2937" /> Schedule Service
                                        </Text>

                                        <View style={modalStyles.rowInputs}>
                                            <View style={[modalStyles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                                <Text style={modalStyles.label}>Preferred Date *</Text>
                                                <Pressable onPress={() => setDatePickerVisible(true)} style={modalStyles.pickerInput}>
                                                    <Icon name="calendar-outline" size={20} color="#6B7280" />
                                                    <Text style={modalStyles.pickerText}>{preferredDate || 'Select Date'}</Text>
                                                </Pressable>
                                                {errors.preferredDate && <Text style={modalStyles.errorText}>{errors.preferredDate}</Text>}
                                            </View>
                                            <View style={[modalStyles.inputGroup, { flex: 1 }]}>
                                                <Text style={modalStyles.label}>Time Slot *</Text>
                                                <Pressable onPress={() => setTimePickerVisible(true)} style={modalStyles.pickerInput}>
                                                    <Icon name="time-outline" size={20} color="#6B7280" />
                                                    <Text style={modalStyles.pickerText}>{preferredTime || 'Select Time'}</Text>
                                                </Pressable>
                                                {errors.preferredTime && <Text style={modalStyles.errorText}>{errors.preferredTime}</Text>}
                                            </View>
                                        </View>

                                        {/* Contact Details Section */}
                                        <Text style={modalStyles.sectionTitle}>
                                            <Icon name="person-circle" size={16} color="#1F2937" /> Contact Details
                                        </Text>

                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Full Name *</Text>
                                            <TextInput
                                                value={fullName}
                                                onChangeText={setFullName}
                                                placeholder="Your Full Name"
                                                style={[modalStyles.inputField, errors.fullName && modalStyles.inputError]}
                                            />
                                            {errors.fullName && <Text style={modalStyles.errorText}>{errors.fullName}</Text>}
                                        </View>

                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Phone Number *</Text>
                                            <TextInput
                                                value={phone}
                                                onChangeText={setPhone}
                                                placeholder="e.g. 9876543210"
                                                keyboardType="phone-pad"
                                                maxLength={10}
                                                style={[modalStyles.inputField, errors.phone && modalStyles.inputError]}
                                            />
                                            {errors.phone && <Text style={modalStyles.errorText}>{errors.phone}</Text>}
                                        </View>
                                        
                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Alternate Phone (Optional)</Text>
                                            <TextInput
                                                value={alternatePhone}
                                                onChangeText={setAlternatePhone}
                                                placeholder="Alternate contact number"
                                                keyboardType="phone-pad"
                                                maxLength={10}
                                                style={[modalStyles.inputField, errors.alternatePhone && modalStyles.inputError]}
                                            />
                                            {errors.alternatePhone && <Text style={modalStyles.errorText}>{errors.alternatePhone}</Text>}
                                        </View>

                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Email Address *</Text>
                                            <TextInput
                                                value={email}
                                                onChangeText={setEmail}
                                                placeholder="your.email@example.com"
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                style={[modalStyles.inputField, errors.email && modalStyles.inputError]}
                                            />
                                            {errors.email && <Text style={modalStyles.errorText}>{errors.email}</Text>}
                                        </View>
                                        
                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Alternate Email (Optional)</Text>
                                            <TextInput
                                                value={alternateEmail}
                                                onChangeText={setAlternateEmail}
                                                placeholder="another.email@example.com"
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                style={[modalStyles.inputField, errors.alternateEmail && modalStyles.inputError]}
                                            />
                                            {errors.alternateEmail && <Text style={modalStyles.errorText}>{errors.alternateEmail}</Text>}
                                        </View>

                                        {/* Special Instructions */}
                                        <Text style={modalStyles.sectionTitle}>
                                            <Icon name="chatbox" size={16} color="#1F2937" /> Special Instructions
                                        </Text>
                                        <View style={modalStyles.inputGroup}>
                                            <Text style={modalStyles.label}>Any specific requirements for the service?</Text>
                                            <TextInput
                                                value={specialInstructions}
                                                onChangeText={setSpecialInstructions}
                                                placeholder="e.g., 'Please use eco-friendly products', 'Need service after 5 PM', etc."
                                                style={modalStyles.textArea}
                                                multiline
                                                numberOfLines={4}
                                            />
                                        </View>

                                        <View style={{ height: 20 }} />

                                    </ScrollView>

                                    <View style={modalStyles.modalFooter}>
                                        <TouchableOpacity 
                                            style={modalStyles.cancelButton} 
                                            onPress={() => setConfirmVisible(false)}
                                        >
                                            <Text style={modalStyles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <LinearGradient
                                            colors={['#10B981', '#059669']}
                                            style={modalStyles.submitButtonGradient}
                                            start={{x: 0, y: 0}}
                                            end={{x: 1, y: 0}}
                                        >
                                            <TouchableOpacity 
                                                style={modalStyles.submitButton} 
                                                onPress={validateAndSubmit}
                                                activeOpacity={0.9}
                                            >
                                                <Text style={modalStyles.submitButtonText}>Confirm Request</Text>
                                                <Icon name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                                            </TouchableOpacity>
                                        </LinearGradient>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* Date & Time picker modals */}
                <DatePickerModal
                    visible={datePickerVisible}
                    dates={upcomingDates}
                    onClose={() => setDatePickerVisible(false)}
                    onSelect={(label) => setPreferredDate(label)}
                />
                <TimePickerModal
                    visible={timePickerVisible}
                    slots={timeSlots}
                    onClose={() => setTimePickerVisible(false)}
                    onSelect={(slot) => setPreferredTime(slot)}
                />
                
                {/* Payment Modal */}
                <PaymentModal
                    visible={paymentVisible}
                    onClose={() => setPaymentVisible(false)}
                    amount={estimatedCost}
                    onPaid={handlePaymentComplete}
                    order={order}
                    rzpKey={rzpKey}
                    creatingOrder={creatingOrder}
                    onVerify={handleVerify}
                />

                {/* Success Modal */}
                <SuccessModal 
                    visible={successVisible} 
                    onClose={handleSuccessClose} 
                    serviceName={selectedService?.name} 
                />
            </View>
        </SafeAreaView>
    );
};

// ----------------------------------------------------------------------
// --- STYLES ---
// ----------------------------------------------------------------------

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#fff",
    },
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    // --- Header Styles ---
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    searchButton: {
        padding: 8,
        marginLeft: 8,
    },
    // --- Search Bar Styles ---
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        marginTop: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1F2937',
        paddingVertical: 0,
    },
    // --- Scroll Content & Sections ---
    scrollContent: {
        paddingBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    clearText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E90FF',
    },
    // --- Category Grid Styles ---
    categoryTile: {
        width: (width - 32 - 16) / 3,
        maxWidth: 120,
        aspectRatio: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    categoryTileActive: {
        borderColor: '#1E90FF',
        borderWidth: 2,
        backgroundColor: '#E6F4FF',
        shadowOpacity: 0.15,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        overflow: 'hidden',
    },
    iconCircleActive: {},
    iconImage: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
    },
    categoryTileText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        color: '#4B5563',
    },
    trendingBadgeSmall: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#FEF3C7',
        borderRadius: 10,
        padding: 4,
    },
    // --- Property Type Styles ---
    propertyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 10,
    },
    propertyCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        alignItems: 'center',
        position: 'relative',
    },
    propertyCardActive: {
        borderColor: '#1E90FF',
        backgroundColor: '#E6F4FF',
        borderWidth: 2,
    },
    propertyIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    propertyCardText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
        textAlign: 'center',
    },
    checkmarkContainer: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    // --- Stats Banner Styles ---
    statsBanner: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },
    statsItem: {
        alignItems: 'center',
    },
    statsNumber: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        marginTop: 4,
    },
    statsLabel: {
        fontSize: 12,
        color: '#E5E7EB',
        fontWeight: '500',
        marginTop: 2,
    },
    // --- Floating CTA Styles ---
    floatingCta: {
        position: 'absolute',
        // raised a bit so the CTA sits above the bottom tab bar on both platforms
        bottom: Platform.OS === 'ios' ? 110 : 90,
        left: 16,
        right: 16,
    },
    ctaGradient: {
        borderRadius: 14,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    ctaButtonInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    ctaLeft: {
        flexDirection: 'column',
    },
    ctaRight: {
        padding: 4,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ctaTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    ctaSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#E5E7EB',
        marginTop: 2,
    },
    ctaServiceImage: {
        width: 32,
        height: 32,
        resizeMode: 'contain',
        borderRadius: 4,
    },
    // --- Bottom Tab Bar Styles ---
    bottomTabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: Platform.OS === 'ios' ? 20 : 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    tabItem: {
        alignItems: 'center',
        flex: 1,
    },
    tabLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4,
        fontWeight: '600',
    },
    tabLabelActive: {
        color: '#1E90FF',
    },
});

// ----------------------------------------------------------------------
// --- MODAL STYLES ---
// ----------------------------------------------------------------------

const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: Dimensions.get('window').height * 0.9,
        paddingTop: 16,
        paddingHorizontal: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 16,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
        fontWeight: '500',
    },
    formContainer: {
        paddingHorizontal: 20,
        flexGrow: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 8,
        paddingVertical: 4,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    inputField: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
    },
    inputError: {
        borderColor: '#EF4444',
        borderWidth: 2,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
    },
    rowInputs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    chipButton: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    chipButtonActive: {
        backgroundColor: '#1E90FF',
    },
    chipButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4B5563',
    },
    submitButtonGradient: {
        flex: 1.5,
        borderRadius: 12,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    propertyTypeDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6F4FF',
        padding: 12,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#1E90FF',
        marginBottom: 16,
    },
    propertyTypeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E90FF',
        marginLeft: 10,
    },
    pickerInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    pickerText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#4B5563',
    },
    dateRow: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    dateText: {
        fontSize: 16,
        color: '#111827',
    },
    costCard: {
        backgroundColor: '#ECFDF5',
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        marginBottom: 16,
    },
    costHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    costLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#059669',
        marginLeft: 8,
    },
    costAmount: {
        fontSize: 24,
        fontWeight: '800',
        color: '#047857',
        marginLeft: 8,
    },
    costNote: {
        fontSize: 12,
        color: '#059669',
        marginTop: 4,
        fontStyle: 'italic',
    },
    // --- Success Modal Styles ---
    successOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    successCard: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 20,
    },
    successIconContainer: {
        marginBottom: 15,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#10B981',
        marginBottom: 10,
    },
    successMessage: {
        fontSize: 16,
        color: '#4B5563',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 24,
    },
    successSubMessage: {
        fontSize: 14,
        textAlign: 'center',
        color: '#6B7280',
        marginBottom: 20,
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    successButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 30,
        width: '100%',
        marginBottom: 10,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    successButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    successSecondaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
    },
    successSecondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    // --- Enhanced Payment Modal Styles ---
    paymentAmountCard: {
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    paymentAmountLabel: {
        fontSize: 13,
        color: '#16A34A',
        fontWeight: '600',
        marginBottom: 4,
    },
    paymentAmountText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#047857',
        letterSpacing: 0.5,
    },
    paymentAmountNote: {
        fontSize: 12,
        color: '#059669',
        marginTop: 4,
    },
    paymentMethodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    paymentMethodCardActive: {
        backgroundColor: '#E6F4FF',
        borderColor: '#1E90FF',
    },
    paymentMethodIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentMethodLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    paymentMethodDescription: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterActive: {
        borderColor: '#1E90FF',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#1E90FF',
    },
    paymentDetailsContainer: {
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    paymentDetailsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    inputFieldWithIcon: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        fontSize: 16,
        color: '#1F2937',
    },
    codInfoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#ECFDF5',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    codInfoTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#059669',
        marginBottom: 6,
    },
    codInfoText: {
        fontSize: 14,
        color: '#047857',
        lineHeight: 20,
    },
    securityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
        marginTop: 8,
    },
    securityText: {
        fontSize: 13,
        color: '#047857',
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default ServicesScreen;