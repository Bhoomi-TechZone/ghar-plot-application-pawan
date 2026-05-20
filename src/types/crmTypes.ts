// ===============================================
// GHAR CRM API Types & Interfaces
// ===============================================

// Base response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Pagination interface
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===============================================
// 1. AUTHENTICATION TYPES
// ===============================================
export interface PhoneOtpData {
  phoneNumber: string;
  countryCode?: string;
}

export interface VerifyOtpData {
  phoneNumber: string;
  otp: string;
  countryCode?: string;
}

export interface UserSignupData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

export interface LoginCredentials {
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface GoogleLoginData {
  accessToken: string;
  idToken: string;
  email: string;
  name: string;
}

export interface AdminSignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  lastActivity: string;
  createdAt: string;
}

// ===============================================
// 2. PROPERTY TYPES
// ===============================================
export interface Property {
  id: string;
  title: string;
  description: string;
  type: 'rent' | 'sell' | 'bought';
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  images: string[];
  amenities: string[];
  ownerId: string;
  agentId?: string;
  status: 'available' | 'sold' | 'rented' | 'inactive';
  isBookmarked?: boolean;
  isSaved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyCreateData {
  title: string;
  description: string;
  type: 'rent' | 'sell';
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  images?: string[];
  amenities?: string[];
}

export interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  propertiesSold: number;
  propertiesRented: number;
  avgPropertyPrice: number;
}

// ===============================================
// 3. USER TYPES
// ===============================================
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  avatar?: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  preferences?: {
    propertyTypes: string[];
    budgetRange: {
      min: number;
      max: number;
    };
    locations: string[];
  };
  isActive: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  avatar?: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  preferences?: {
    propertyTypes: string[];
    budgetRange: {
      min: number;
      max: number;
    };
    locations: string[];
  };
}

// ===============================================
// 4. EMPLOYEE TYPES
// ===============================================
export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  position: string;
  role: string;
  managerId?: string;
  salary?: number;
  joiningDate: string;
  isActive: boolean;
  avatar?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeCreateData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  position: string;
  role: string;
  managerId?: string;
  salary?: number;
  password: string;
}

export interface EmployeeDashboard {
  totalLeads: number;
  activeLeads: number;
  closedLeads: number;
  todayReminders: number;
  pendingFollowUps: number;
  thisMonthTarget: number;
  achieved: number;
  performance: number;
}

export interface EmployeeReport {
  employeeId: string;
  name: string;
  department: string;
  leadsAssigned: number;
  leadsConverted: number;
  conversionRate: number;
  revenue: number;
  remindersCompleted: number;
  followUpsCompleted: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

// ===============================================
// 5. ROLE & PERMISSION TYPES
// ===============================================
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  module: string;
  actions: string[];
}

export interface RoleCreateData {
  name: string;
  description: string;
  permissions: string[];
}

// ===============================================
// 6. LEAD TYPES
// ===============================================
export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  source: string;
  status: 'new' | 'contacted' | 'interested' | 'not_interested' | 'converted' | 'lost';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  assignedToName?: string;
  propertyInterest?: {
    type: string;
    budget: {
      min: number;
      max: number;
    };
    locations: string[];
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadCreateData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  source: string;
  status?: 'new' | 'contacted' | 'interested' | 'not_interested';
  priority?: 'low' | 'medium' | 'high';
  propertyInterest?: {
    type: string;
    budget: {
      min: number;
      max: number;
    };
    locations: string[];
  };
  notes?: string;
}

export interface LeadAssignmentData {
  employeeId: string;
  notes?: string;
}

export interface UserLead {
  id: string;
  userId: string;
  leadId: string;
  assignedTo: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  company?: string;
  assignedTo: string;
  status: 'active' | 'inactive' | 'potential';
  totalValue: number;
  lastContact: string;
  createdAt: string;
  updatedAt: string;
}

// ===============================================
// 7. REMINDER TYPES
// ===============================================
export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'overdue';
  type: 'follow_up' | 'meeting' | 'call' | 'email' | 'task';
  assignedTo: string;
  assignedBy?: string;
  relatedTo?: {
    type: 'lead' | 'client' | 'property';
    id: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReminderCreateData {
  title: string;
  description: string;
  dueDate: string;
  priority?: 'low' | 'medium' | 'high';
  type: 'follow_up' | 'meeting' | 'call' | 'email' | 'task';
  assignedTo?: string;
  relatedTo?: {
    type: 'lead' | 'client' | 'property';
    id: string;
  };
}

export interface ReminderStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  todayDue: number;
}

export interface EmployeeReminderStatus {
  employeeId: string;
  name: string;
  department: string;
  totalReminders: number;
  pendingReminders: number;
  completedReminders: number;
  overdueReminders: number;
}

// ===============================================
// 8. FOLLOW-UP TYPES
// ===============================================
export interface FollowUp {
  id: string;
  leadId: string;
  employeeId: string;
  type: 'call' | 'email' | 'meeting' | 'whatsapp';
  scheduledDate: string;
  actualDate?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  outcome?: string;
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpCreateData {
  leadId: string;
  type: 'call' | 'email' | 'meeting' | 'whatsapp';
  scheduledDate: string;
  notes?: string;
}

// ===============================================
// 9. SERVICE TYPES
// ===============================================
export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  duration?: string;
  isActive: boolean;
  features: string[];
  providerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCreateData {
  name: string;
  description: string;
  category: string;
  price: number;
  duration?: string;
  features: string[];
}

export interface ServicePayment {
  id: string;
  serviceId: string;
  userId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// ===============================================
// 10. INQUIRY TYPES
// ===============================================
export interface Inquiry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  subject: string;
  message: string;
  type: 'general' | 'property' | 'service' | 'complaint';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface InquiryCreateData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  subject: string;
  message: string;
  type: 'general' | 'property' | 'service' | 'complaint';
  priority?: 'low' | 'medium' | 'high';
}

// ===============================================
// 11. NOTIFICATION TYPES
// ===============================================
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'reminder' | 'lead' | 'property' | 'payment';
  isRead: boolean;
  data?: any;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCreateData {
  userId?: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'reminder' | 'lead' | 'property' | 'payment';
  data?: any;
}

export interface FCMTokenData {
  token: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
}

// ===============================================
// 12. CHAT TYPES
// ===============================================
export interface Chat {
  id: string;
  participants: string[];
  participantDetails: User[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  message: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  fileUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatCreateData {
  participants: string[];
  isGroup?: boolean;
  groupName?: string;
  initialMessage?: string;
}

export interface MessageCreateData {
  message: string;
  type?: 'text' | 'image' | 'file' | 'audio' | 'video';
  fileUrl?: string;
}

// ===============================================
// 13. PAYMENT TYPES
// ===============================================
export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  paymentMethod: 'card' | 'upi' | 'netbanking' | 'wallet';
  transactionId?: string;
  gatewayResponse?: any;
  description: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentCreateData {
  amount: number;
  currency?: string;
  paymentMethod: 'card' | 'upi' | 'netbanking' | 'wallet';
  description: string;
  metadata?: any;
}

export interface RefundData {
  amount: number;
  reason: string;
}

// ===============================================
// 14. CONTACT TYPES
// ===============================================
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  company?: string;
  position?: string;
  category: 'client' | 'vendor' | 'partner' | 'lead';
  tags: string[];
  notes?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContactCreateData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  company?: string;
  position?: string;
  category: 'client' | 'vendor' | 'partner' | 'lead';
  tags?: string[];
  notes?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
}

// ===============================================
// 15. ALERT TYPES
// ===============================================
export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'urgent';
  category: 'system' | 'security' | 'maintenance' | 'update';
  isActive: boolean;
  isRead: boolean;
  targetUsers?: string[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertCreateData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'urgent';
  category: 'system' | 'security' | 'maintenance' | 'update';
  targetUsers?: string[];
  startDate?: string;
  endDate?: string;
}

// ===============================================
// 16. USP TYPES
// ===============================================
export interface USPCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface USPCategoryCreateData {
  name: string;
  description: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface USPEmployee {
  id: string;
  employeeId: string;
  categoryId: string;
  categoryName: string;
  specialization: string;
  experience: number;
  certification?: string;
  rating: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface USPEmployeeCreateData {
  employeeId: string;
  categoryId: string;
  specialization: string;
  experience: number;
  certification?: string;
}

// ===============================================
// 17. APPLICATION UPDATE TYPES
// ===============================================
export interface ApplicationUpdate {
  version: string;
  buildNumber: string;
  releaseNotes: string;
  downloadUrl: string;
  isMandatory: boolean;
  isAvailable: boolean;
  releaseDate: string;
  platform: 'ios' | 'android' | 'web';
}

export interface UpdateDownloadData {
  version: string;
  platform: 'ios' | 'android' | 'web';
}

// ===============================================
// BULK OPERATION TYPES
// ===============================================
export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkLeadStatusUpdate {
  leadIds: string[];
  status: string;
  notes?: string;
}

export interface BulkLeadAssignment {
  leadIds: string[];
  employeeId: string;
  notes?: string;
}

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  employeeId?: string;
  format?: 'csv' | 'excel' | 'pdf';
}

// ===============================================
// DASHBOARD TYPES
// ===============================================
export interface DashboardData {
  employees: Employee[];
  reminders: ReminderStats;
  properties: Property[];
  leads: Lead[];
}

// ===============================================
// ERROR TYPES
// ===============================================
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

// ===============================================
// HOOKS TYPES
// ===============================================
export interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  enabled?: boolean;
}

export interface UseMutationOptions<T = any> {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  onMutate?: () => void;
}

// ===============================================
// STORE TYPES
// ===============================================
export interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  checkAuth: () => Promise<void>;
}

export interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export interface ChatStore {
  chats: Chat[];
  activeChat: Chat | null;
  messages: { [chatId: string]: ChatMessage[] };
  isLoading: boolean;
  fetchChats: () => Promise<void>;
  setActiveChat: (chat: Chat) => void;
  sendMessage: (chatId: string, message: MessageCreateData) => Promise<void>;
  markMessagesAsRead: (chatId: string) => Promise<void>;
}