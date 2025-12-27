/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Video from 'react-native-video';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
// Import Notifee for simple push notifications - handle gracefully if not available
let notifee: any = null;
let AndroidImportance: any = null;
try {
  const notifeeModule = require('@notifee/react-native');
  notifee = notifeeModule.default || notifeeModule;
  AndroidImportance = notifeeModule.AndroidImportance;
  if (!notifee || typeof notifee.displayNotification !== 'function') {
    console.warn('Notifee module loaded but displayNotification not available');
    notifee = null;
  }
} catch (e) {
  console.warn('Notifee not available, will use Alert fallback:', e);
  notifee = null;
}

import { API_BASE_URL } from './src/apiConfig';

type Screen = 'home' | 'signin' | 'signup' | 'hub' | 'orders' | 'orderEdit' | 'exitInspections' | 'cleaningInspections' | 'monthlyInspections' | 'warehouse' | 'warehouseMenu' | 'warehouseOrders' | 'warehouseInventory' | 'warehouseInventoryDetail' | 'newWarehouse' | 'newWarehouseItem' | 'newWarehouseOrder' | 'maintenance' | 'maintenanceTasks' | 'maintenanceTaskDetail' | 'newMaintenanceTask' | 'reports' | 'chat' | 'attendance' | 'invoices' | 'cleaningSchedule';
type OrderStatus = 'חדש' | 'באישור' | 'שולם חלקית' | 'שולם' | 'בוטל';
type InspectionStatus =
  | 'זמן הביקורות טרם הגיע'
  | 'דורש ביקורת היום'
  | 'זמן הביקורת עבר'
  | 'הביקורת הושלמה';

type Order = {
  id: string;
  guestName: string;
  unitNumber: string;
  arrivalDate: string;
  departureDate: string;
  status: OrderStatus;
  guestsCount: number;
  specialRequests?: string;
  internalNotes?: string;
  paidAmount: number;
  totalAmount: number;
  paymentMethod: string;
};

type InspectionMission = {
  id: string;
  orderId: string;
  unitNumber: string;
  guestName: string;
  departureDate: string;
  status: InspectionStatus;
  tasks: InspectionTask[];
};

type InspectionTask = {
  id: string;
  name: string;
  completed: boolean;
};

type InventoryItem = {
  id: string;
  name: string;
  category: 'מצעים' | 'מוצרי ניקיון' | 'ציוד מתכלה' | 'אחר';
  unit: string;
  currentStock: number;
  minStock: number;
};

type InventoryOrderItem = {
  id: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  unit: string;
};

type InventoryOrder = {
  id: string;
  orderDate: string;
  deliveryDate?: string;
  status: 'שולם מלא' | 'מחכה להשלמת תשלום';
  orderType: 'הזמנת עובד' | 'הזמנה כללית';
  orderedBy?: string;
  unitNumber?: string;
  items: InventoryOrderItem[]; // Items in this order
  // Legacy fields for backward compatibility during migration
  itemId?: string;
  itemName?: string;
  quantity?: number;
  unit?: string;
  orderGroupId?: string;
};

type MaintenanceStatus = 'פתוח' | 'בטיפול' | 'סגור';

type SystemUser = {
  id: string;
  username: string;
};

type SelectedMedia = {
  uri: string;
  type: string;
  name: string;
};

type MaintenanceTask = {
  id: string;
  unitId: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  createdDate: string;
  assignedTo?: string;
  imageUri?: string;
  media?: SelectedMedia | null;
};

type MaintenanceUnit = {
  id: string;
  name: string;
  type: 'יחידה' | 'קוטג׳';
  tasks: MaintenanceTask[];
};

const statusOptions: OrderStatus[] = [
  'חדש',
  'באישור',
  'שולם חלקית',
  'שולם',
  'בוטל',
];

const paymentOptions = [
  'מזומן',
  'אשראי',
  'העברה בנקאית',
  'ביט',
  'צ׳ק',
  'אחר',
];

// Single source of truth for vacation units in the system
type UnitCategory = {
  name: string;
  units: string[];
};

const UNIT_CATEGORIES: UnitCategory[] = [
  {
    name: 'מתחמים מושב כלנית',
    units: [
      'צימרים כלנית ריזורט',
      'וילה ויקטוריה',
      'וילה כלנית',
      'וילה ממלכת אהרון',
      'וילה בוטיק אהרון',
      'וילה אירופה',
    ],
  },
  {
    name: 'מושב מגדל',
    units: [
      'וילאה 1',
      'וילאה 2',
      'לה כינרה',
    ],
  },
  {
    name: 'גבעת יואב',
    units: [
      'הודולה 1',
      'הודולה 2',
      'הודולה 3',
      'הודולה 4',
      'הודולה 5',
    ],
  },
  {
    name: 'צפת',
    units: [
      'בית קונפיטה',
    ],
  },
];

// Flatten all unit names for validation and easy access
const UNIT_NAMES = UNIT_CATEGORIES.flatMap(category => category.units);

function normalizeUnitName(raw?: string | null): string {
  const s = (raw ?? '').toString().trim();
  if (!s) return '';
  if (UNIT_NAMES.includes(s)) return s;
  // Try to find a match by partial name
  const normalized = UNIT_NAMES.find(name => 
    name.toLowerCase().includes(s.toLowerCase()) || 
    s.toLowerCase().includes(name.toLowerCase())
  );
  return normalized || s;
}

function unitIdFromName(name: string): string {
  // Generate a stable ID from the unit name
  // Replace spaces and special chars with hyphens, convert to lowercase
  const id = name
    .replace(/\s+/g, '-')
    .replace(/[^\u0590-\u05FF\w-]/g, '')
    .toLowerCase();
  return `unit-${id}`;
}

function normalizeMaintenanceUnitId(raw?: string | null): string {
  const s = (raw ?? '').toString().trim();
  if (!s) {
    // Default to first unit if empty
    return UNIT_NAMES.length > 0 ? unitIdFromName(UNIT_NAMES[0]) : 'unit-default';
  }
  // If it's already a unit-* format, check if it matches a known unit
  if (/^unit-/.test(s)) {
    // Try to find matching unit name
    const unitName = UNIT_NAMES.find(name => unitIdFromName(name) === s);
    if (unitName) return s;
  }
  // Try to find by name match
  const matchingUnit = UNIT_NAMES.find(name => 
    name.toLowerCase() === s.toLowerCase() ||
    name.includes(s) ||
    s.includes(name)
  );
  if (matchingUnit) {
    return unitIdFromName(matchingUnit);
  }
  // If no match, generate ID from the string itself
  return unitIdFromName(s);
}

function normalizeISODate(raw?: string | null): string {
  const s = (raw ?? '').toString().trim();
  if (!s) return '';
  // Handles both "YYYY-MM-DD" and ISO timestamps
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computeInspectionStatus(mission: Pick<InspectionMission, 'departureDate' | 'tasks'>): InspectionStatus {
  const total = (mission.tasks || []).length;
  const done = (mission.tasks || []).filter(t => t.completed).length;
  if (total > 0 && done === total) return 'הביקורת הושלמה';

  const dep = normalizeISODate(mission.departureDate);
  const today = todayLocalISODate();
  if (!dep) return 'זמן הביקורות טרם הגיע';
  if (dep > today) return 'זמן הביקורות טרם הגיע';
  if (dep === today) return 'דורש ביקורת היום';
  return 'זמן הביקורת עבר';
}

const seaBackground = {
  uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
};

// Orders are loaded from the backend; keep initial empty to avoid fake data.
const initialOrders: Order[] = [];

const initialInventoryItems: InventoryItem[] = [
  { id: 'INV-001', name: 'מצעים יחידים', category: 'מצעים', unit: 'סט', currentStock: 45, minStock: 30 },
  { id: 'INV-002', name: 'מצעים זוגיים', category: 'מצעים', unit: 'סט', currentStock: 35, minStock: 25 },
  { id: 'INV-003', name: 'כריות', category: 'מצעים', unit: 'יחידה', currentStock: 80, minStock: 50 },
  { id: 'INV-004', name: 'שמיכות', category: 'מצעים', unit: 'יחידה', currentStock: 60, minStock: 40 },
  { id: 'INV-005', name: 'מגבות אמבטיה', category: 'מצעים', unit: 'יחידה', currentStock: 120, minStock: 80 },
  { id: 'INV-006', name: 'מגבות יד', category: 'מצעים', unit: 'יחידה', currentStock: 150, minStock: 100 },
  { id: 'INV-007', name: 'דטרגנט', category: 'מוצרי ניקיון', unit: 'ליטר', currentStock: 25, minStock: 15 },
  { id: 'INV-008', name: 'מרכך כביסה', category: 'מוצרי ניקיון', unit: 'ליטר', currentStock: 18, minStock: 10 },
  { id: 'INV-009', name: 'חומר ניקוי כללי', category: 'מוצרי ניקיון', unit: 'ליטר', currentStock: 30, minStock: 20 },
  { id: 'INV-010', name: 'חומר ניקוי שירותים', category: 'מוצרי ניקיון', unit: 'ליטר', currentStock: 20, minStock: 12 },
  { id: 'INV-011', name: 'ספוגים', category: 'מוצרי ניקיון', unit: 'יחידה', currentStock: 50, minStock: 30 },
  { id: 'INV-012', name: 'שקיות זבל', category: 'ציוד מתכלה', unit: 'רול', currentStock: 40, minStock: 25 },
  { id: 'INV-013', name: 'סבון ידיים', category: 'ציוד מתכלה', unit: 'בקבוק', currentStock: 35, minStock: 20 },
  { id: 'INV-014', name: 'נייר טואלט', category: 'ציוד מתכלה', unit: 'רול', currentStock: 100, minStock: 60 },
  { id: 'INV-015', name: 'מפיות נייר', category: 'ציוד מתכלה', unit: 'חבילה', currentStock: 45, minStock: 30 },
];

const initialInventoryOrders: InventoryOrder[] = [
  {
    id: 'ORD-INV-001',
    itemId: 'INV-001',
    itemName: 'מצעים יחידים',
    quantity: 20,
    unit: 'סט',
    orderDate: '2025-12-15',
    deliveryDate: '2025-12-20',
    status: 'שולם מלא',
    orderType: 'הזמנה כללית',
  },
  {
    id: 'ORD-INV-002',
    itemId: 'INV-007',
    itemName: 'דטרגנט',
    quantity: 15,
    unit: 'ליטר',
    orderDate: '2025-12-18',
    status: 'מחכה להשלמת תשלום',
    orderType: 'הזמנת עובד',
    orderedBy: 'שירה לוי',
    unitNumber: UNIT_NAMES[0] || '',
  },
];

const initialMaintenanceUnits: MaintenanceUnit[] = UNIT_NAMES.map(name => ({
  id: unitIdFromName(name),
  name,
  type: 'יחידה',
  tasks: [],
}));

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'עובד תחזוקה' | 'מנהל'>('עובד תחזוקה');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [systemUsersLoaded, setSystemUsersLoaded] = useState(false);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [inspectionMissions, setInspectionMissions] = useState<InspectionMission[]>([]);
  const [cleaningInspectionMissions, setCleaningInspectionMissions] = useState<InspectionMission[]>([]);
  const [monthlyInspectionMissions, setMonthlyInspectionMissions] = useState<InspectionMission[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(initialInventoryItems);
  const [inventoryOrders, setInventoryOrders] = useState<InventoryOrder[]>(initialInventoryOrders);
  const [warehouses, setWarehouses] = useState<Array<{id: string; name: string; location?: string}>>([]);
  const [warehouseItems, setWarehouseItems] = useState<Array<{id: string; warehouse_id: string; item_id: string; item_name: string; quantity: number; unit: string}>>([]);
  const [allWarehouseItems, setAllWarehouseItems] = useState<Array<{id: string; warehouse_id: string; item_id: string; item_name: string; quantity: number; unit: string}>>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('כל המתחמים');
  const [maintenanceUnits, setMaintenanceUnits] = useState<MaintenanceUnit[]>(initialMaintenanceUnits);
  const [selectedMaintenanceUnitId, setSelectedMaintenanceUnitId] = useState<string | null>(null);
  const [selectedMaintenanceTaskId, setSelectedMaintenanceTaskId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{id: number; sender: string; content: string; created_at: string}>>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<{is_clocked_in: boolean; session: any} | null>(null);
  const [attendanceLogsReport, setAttendanceLogsReport] = useState<any[]>([]);
  const [reportsSummary, setReportsSummary] = useState<{totalRevenue: number; totalPaid: number; totalExpenses: number} | null>(null);
  const [reportsSummaryError, setReportsSummaryError] = useState<string | null>(null);
  const [maintenanceTasksReport, setMaintenanceTasksReport] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Array<{id: string; total_price?: number | null; extracted_data?: any}>>([]);
  // Track previous state for notifications
  const [previousMaintenanceTasks, setPreviousMaintenanceTasks] = useState<any[]>([]);
  const [previousChatMessages, setPreviousChatMessages] = useState<Array<{id: number; sender: string; content: string; created_at: string}>>([]);
  const statusBarStyle = screen === 'home' ? 'light-content' : 'dark-content';
  const statusBar = <StatusBar barStyle={statusBarStyle} />;

  // Initialize push notifications using Notifee (simple and reliable)
  useEffect(() => {
    const initializeNotifications = async () => {
      // Check if Notifee is available
      if (!notifee) {
        console.warn('Notifee not available - notifications will use Alert fallback');
        return;
      }

      try {
        // Request permissions
        if (Platform.OS === 'android' && notifee.requestPermission) {
          await notifee.requestPermission();
        }

        // Create a channel for Android
        if (Platform.OS === 'android' && notifee.createChannel && AndroidImportance) {
          await notifee.createChannel({
            id: 'default',
            name: 'התראות מערכת',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            vibration: true,
          });
        }

        console.log('Notifications initialized successfully');
      } catch (error) {
        console.warn('Error initializing notifications:', error);
        // Continue without notifications - will use Alert fallback
      }
    };

    initializeNotifications();
  }, []);

  // Simple notification function using Notifee
  const showNotification = async (title: string, message: string) => {
    // Check if Notifee is available
    if (!notifee || typeof notifee.displayNotification !== 'function') {
      // Fallback to Alert if Notifee is not available
      Alert.alert(title, message, [{ text: 'OK' }]);
      return;
    }

    try {
      await notifee.displayNotification({
        title,
        body: message,
        android: {
          channelId: 'default',
          importance: AndroidImportance?.HIGH || 4,
          sound: 'default',
          vibrationPattern: [300, 500],
        },
      });
    } catch (error) {
      console.warn('Error showing notification, using Alert fallback:', error);
      // Fallback to alert if notification fails
      Alert.alert(title, message, [{ text: 'OK' }]);
    }
  };

  const systemUserNameById = useMemo(() => {
    const m = new Map<string, string>();
    (systemUsers || []).forEach(u => {
      if (u?.id) m.set(u.id.toString(), (u.username || '').toString());
    });
    return m;
  }, [systemUsers]);

  const resolveAssigneeLabel = (assignedTo?: string | null) => {
    const raw = (assignedTo ?? '').toString().trim();
    if (!raw) return '';
    return systemUserNameById.get(raw) || raw;
  };

  const loadSystemUsers = async (force = false) => {
    if (systemUsersLoaded && !force) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`);
      if (!res.ok) return;
      const data = await res.json();
      setSystemUsers(Array.isArray(data) ? data : []);
      setSystemUsersLoaded(true);
    } catch (err) {
      console.warn('Error loading system users', err);
    }
  };

  const inspectionMissionsEffective = useMemo(() => {
    return (inspectionMissions || []).map(m => ({
      ...m,
      status: computeInspectionStatus(m),
      unitNumber: normalizeUnitName(m.unitNumber) || m.unitNumber,
      departureDate: normalizeISODate(m.departureDate),
    }));
  }, [inspectionMissions]);

  useEffect(() => {
    if (screen === 'newMaintenanceTask' || screen === 'maintenanceTasks' || screen === 'maintenanceTaskDetail') {
      loadSystemUsers(false);
    }
  }, [screen]);

  const totals = useMemo(() => {
    const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0);
    return { count: orders.length, totalPaid };
  }, [orders]);

  const defaultInspectionTasks: InspectionTask[] = useMemo(() => [
    // טיפול ברכיה
    { id: '1', name: 'לשים כלור בבריכה', completed: false },
    { id: '2', name: 'להוסיף מים בבריכה', completed: false },
    { id: '3', name: 'לנקות רובוט ולהפעיל', completed: false },
    { id: '4', name: 'לנקות רשת פנים המנוע', completed: false },
    { id: '5', name: 'לעשות בקווש שטיפה לפילטר', completed: false },
    { id: '6', name: 'לטאטא הבק מהמדרגות ומשטחי רביצה', completed: false },
    // טיפול גקוזי
    { id: '7', name: 'לשים כלור בגקוזי', completed: false },
    { id: '8', name: 'להוסיף מים בגקוזי', completed: false },
    { id: '9', name: 'לנקות רובוט גקוזי ולהפעיל', completed: false },
    { id: '10', name: 'לנקות רשת פנים המנוע גקוזי', completed: false },
    { id: '11', name: 'לעשות בקווש שטיפה לפילטר גקוזי', completed: false },
    { id: '12', name: 'לטאטא הבק מהמדרגות ומשטחי רביצה גקוזי', completed: false },
    // ניקיון
    { id: '13', name: 'ניקיון חדרים', completed: false },
    { id: '14', name: 'ניקיון מטבח', completed: false },
    { id: '15', name: 'ניקיון שירותים', completed: false },
    { id: '16', name: 'פינוי זבל לפח אשפה פנים וחוץ הוילה', completed: false },
    // בדיקות
    { id: '17', name: 'בדיקת מכשירים', completed: false },
    { id: '18', name: 'בדיקת מצב ריהוט', completed: false },
    { id: '19', name: 'החלפת מצעים', completed: false },
    { id: '20', name: 'החלפת מגבות', completed: false },
    { id: '21', name: 'בדיקת מלאי', completed: false },
    { id: '22', name: 'לבדוק תקינות חדרים', completed: false },
    // כיבוי ונעילה
    { id: '23', name: 'כיבוי אורות פנים וחוץ הוילה', completed: false },
    { id: '24', name: 'לנעול דלת ראשית', completed: false },
  ], []);

  const defaultCleaningInspectionTasks: InspectionTask[] = useMemo(() => [
    // מטבח (Kitchen)
    { id: '1', name: 'מכונת קפה, לנקות ולהחליף פילטר קפה', completed: false },
    { id: '2', name: 'קפה תה סוכר וכו׳', completed: false },
    { id: '3', name: 'להעביר סמרטוט במתקן מים', completed: false },
    { id: '4', name: 'מקרר – בפנים ובחוץ', completed: false },
    { id: '5', name: 'תנור – בפנים ובחוץ', completed: false },
    { id: '6', name: 'כיריים וגריל', completed: false },
    { id: '7', name: 'מיקרו', completed: false },
    { id: '8', name: 'כיור', completed: false },
    { id: '9', name: 'כלים – לשטוף ליבש ולהחזיר לארון', completed: false },
    { id: '10', name: 'לבדוק שכל הכלים נקיים', completed: false },
    { id: '11', name: 'לבדוק שיש לפחות 20 כוסות אוכל מכל דבר', completed: false },
    { id: '12', name: 'ארונות מטבח – לפתוח ולראות שאין דברים להוציא דברים לא קשורים', completed: false },
    { id: '13', name: 'להעביר סמרטוט על הדלתות מטבח בחוץ', completed: false },
    { id: '14', name: 'להעביר סמרטוט על הפח ולראות שנקי', completed: false },
    { id: '15', name: 'פלטת שבת ומיחם מים חמים – לראות שאין אבן', completed: false },
    { id: '16', name: 'סכו״ם, כלים, סמרטוט, סקוֹץ׳ חדשים לאורחים', completed: false },
    { id: '17', name: 'סבון', completed: false },
    // סלון (Living Room)
    { id: '18', name: 'סלון שטיפה יסודית גם מתחת לספות ולשולחן, להזיז כורסאות ולבדוק שאין פירורים של אוכל', completed: false },
    { id: '19', name: 'שולחן אוכל וספסלים (לנקות בשפריצר ולהעביר סמרטוט)', completed: false },
    { id: '20', name: 'סלון – לנגב אבק ולהעביר סמרטוט גם על הספה. כיריות לנקות לסדר יפה', completed: false },
    { id: '21', name: 'שולחן אוכל וספסלים – להעביר סמרטוט נקי עם תריס', completed: false },
    { id: '22', name: 'חלונות ותריסים – עם ספריי חלונות וסמרטוט נקי. שלא יהיו סימנים. מסילות לנקות', completed: false },
    // מסדרון (Hallway)
    { id: '23', name: 'מסדרון – לנגב בחוץ שטיחים. לנקות מסילות בחלונות. לנקות חלונות', completed: false },
    // חצר (Yard)
    { id: '24', name: 'טיפול ברזים וניקוי', completed: false },
    { id: '25', name: 'להשקות עציצים בכל המתחם', completed: false },
    { id: '26', name: 'פינת מנגל – לרוקן פחים ולנקות רשת, וכל אזור המנגל', completed: false },
    { id: '27', name: 'לנקות דשא ולסדר פינות ישיבה', completed: false },
    { id: '28', name: 'שולחן חוץ – להעביר סמרטוט עם חומר. כיסאות נקיים', completed: false },
    { id: '29', name: 'שטיפה לרצפה בחוץ', completed: false },
    { id: '30', name: 'לרוקן את הפחים, לשים שקית חדשה', completed: false },
    { id: '31', name: 'להעביר סמרטוט על הפחים ולשים שקיות', completed: false },
  ], []);

  const defaultMonthlyInspectionTasks: InspectionTask[] = useMemo(() => [
    { id: '1', name: 'בדיקת תקינות מערכות חשמל', completed: false },
    { id: '2', name: 'בדיקת תקינות מערכות מים', completed: false },
    { id: '3', name: 'בדיקת תקינות מערכות גז', completed: false },
    { id: '4', name: 'בדיקת תקינות מזגנים', completed: false },
    { id: '5', name: 'בדיקת תקינות דודי שמש', completed: false },
    { id: '6', name: 'בדיקת תקינות מערכות אבטחה', completed: false },
    { id: '7', name: 'בדיקת תקינות מערכות תאורה', completed: false },
    { id: '8', name: 'בדיקת תקינות דלתות וחלונות', completed: false },
    { id: '9', name: 'בדיקת תקינות ריהוט וציוד', completed: false },
    { id: '10', name: 'בדיקת תקינות מערכות ניקוז', completed: false },
    { id: '11', name: 'בדיקת תקינות מערכות אוורור', completed: false },
    { id: '12', name: 'בדיקת תקינות מערכות כיבוי אש', completed: false },
    { id: '13', name: 'בדיקת תקינות מערכות אינטרנט', completed: false },
    { id: '14', name: 'בדיקת תקינות מערכות טלוויזיה', completed: false },
    { id: '15', name: 'בדיקת תקינות מערכות מיזוג', completed: false },
    { id: '16', name: 'בדיקת תקינות מערכות מים חמים', completed: false },
    { id: '17', name: 'בדיקת תקינות מערכות תאורה חוץ', completed: false },
    { id: '18', name: 'בדיקת תקינות מערכות השקיה', completed: false },
    { id: '19', name: 'בדיקת תקינות מערכות בריכה', completed: false },
    { id: '20', name: 'בדיקת תקינות מערכות גקוזי', completed: false },
  ], []);

  // Load inspections from backend
  const syncInspectionsWithOrders = async () => {
    try {
      // Call backend sync endpoint which handles adding and removing inspections
      // The backend will fetch orders itself, so we don't need to check orders.length
      const res = await fetch(`${API_BASE_URL}/api/inspections/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        console.log('Synced inspections with orders via backend');
      } else {
        console.error('Sync failed with status:', res.status);
      }
    } catch (err) {
      console.error('Error syncing inspections with orders:', err);
    }
  };

  const loadInspections = async () => {
    // First, sync inspections with orders to ensure all departure dates have inspections
    await syncInspectionsWithOrders();
    try {
      const res = await fetch(`${API_BASE_URL}/api/inspections`);
      if (res.ok) {
        const data = await res.json();
        const loadedMissions: InspectionMission[] = (data || []).map((insp: any) => {
          const backendTasks = (insp.tasks || []).map((t: any) => ({
            id: String(t.id), // Ensure ID is a string
            name: String(t.name || ''),
            completed: Boolean(t.completed), // Ensure it's a boolean, not string
          }));
          
          console.log('Loaded inspection:', insp.id, 'with', backendTasks.length, 'tasks from backend');
          console.log('Backend tasks:', backendTasks.map(t => ({ id: t.id, name: t.name, completed: t.completed })));
          
          // If no tasks from backend, use default tasks
          // Otherwise, merge backend tasks with default tasks to ensure all tasks are present
          let tasks: InspectionTask[] = [];
          if (backendTasks.length === 0) {
            // No tasks in backend, use all default tasks
            tasks = defaultInspectionTasks.map(t => ({ ...t }));
          } else {
            // Merge: use backend tasks for completion status, but ensure all default tasks are present
            // Match by ID first, then by name as fallback (in case IDs don't match)
            const tasksMapById = new Map(backendTasks.map(t => [String(t.id), t]));
            const tasksMapByName = new Map(backendTasks.map(t => [String(t.name).trim().toLowerCase(), t]));
            
            tasks = defaultInspectionTasks.map(defaultTask => {
              // Try to find by ID first
              let backendTask = tasksMapById.get(String(defaultTask.id));
              
              // If not found by ID, try to find by name (case-insensitive, trimmed)
              if (!backendTask) {
                const defaultTaskName = String(defaultTask.name).trim().toLowerCase();
                backendTask = tasksMapByName.get(defaultTaskName);
              }
              
              if (backendTask) {
                // Use backend task (preserves completion status)
                const completed = Boolean(backendTask.completed);
                console.log(`Task ${defaultTask.id} (${defaultTask.name}): completed=${completed} from backend (matched by ${tasksMapById.has(String(defaultTask.id)) ? 'ID' : 'name'})`);
                return { 
                  id: String(defaultTask.id), // Always use default task ID to ensure consistency
                  name: String(backendTask.name || defaultTask.name),
                  completed: completed // Ensure it's a boolean
                };
              } else {
                // Default task not in backend, add it as incomplete
                console.log(`Task ${defaultTask.id} (${defaultTask.name}): not in backend, using default (incomplete)`);
                return { ...defaultTask };
              }
            });
            console.log('Final merged tasks:', tasks.map(t => ({ id: t.id, name: t.name, completed: t.completed })));
          }
          
          return {
            id: insp.id,
            orderId: insp.order_id || insp.orderId || '',
            unitNumber: insp.unit_number || insp.unitNumber || '',
            guestName: insp.guest_name || insp.guestName || '',
            departureDate: insp.departure_date || insp.departureDate || '',
            status: (insp.status || 'זמן הביקורות טרם הגיע') as InspectionStatus,
            tasks,
          };
        });
        
        if (loadedMissions.length > 0) {
          hasLoadedFromBackend.current = true;
          // Group by departure date - one mission per departure date
          const missionsByDate = new Map<string, InspectionMission>();
          loadedMissions.forEach(m => {
            const date = m.departureDate;
            const existing = missionsByDate.get(date);
            if (!existing || (existing.tasks.filter(t => t.completed).length < m.tasks.filter(t => t.completed).length)) {
              // Use the mission with more completed tasks, or the new one if none exists
              missionsByDate.set(date, m);
            }
          });
          setInspectionMissions(Array.from(missionsByDate.values()));
          
          // Only derive missing missions for departure dates that don't have inspections yet
          if (orders.length > 0) {
            setInspectionMissions(prev => {
              const prevByDate = new Map<string, InspectionMission>();
              prev.forEach(m => prevByDate.set(m.departureDate, m));
              
              const next = [...prev];
              const ordersByDate = new Map<string, Order[]>();
              (orders || [])
                .filter(o => o.status !== 'בוטל')
                .forEach(o => {
                  const date = o.departureDate;
                  if (!ordersByDate.has(date)) {
                    ordersByDate.set(date, []);
                  }
                  ordersByDate.get(date)!.push(o);
                });
              
              ordersByDate.forEach((ordersForDate, date) => {
                // Only add if this departure date doesn't have an inspection yet
                if (!prevByDate.has(date)) {
                  const firstOrder = ordersForDate[0];
                  const tasks = defaultInspectionTasks.map(t => ({ ...t }));
                  next.push({
                    id: `INSP-${date}`,
                    orderId: firstOrder.id, // Keep first order ID for reference
                    unitNumber: firstOrder.unitNumber,
                    guestName: ordersForDate.map(o => o.guestName).join(', '), // Combine guest names
                    departureDate: date,
                    tasks,
                    status: computeInspectionStatus({ departureDate: date, tasks }),
                  });
                }
              });
              return next;
            });
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Error loading inspections from backend:', err);
    }
    
    // Fallback: derive from orders if backend has no data
    if (orders.length > 0) {
      deriveMissionsFromOrders();
    }
  };

  // Reconcile missions from orders (fallback if backend has no data)
  // Group by departure date - one mission per departure date
  const deriveMissionsFromOrders = async () => {
    setInspectionMissions(prev => {
      const prevByDate = new Map<string, InspectionMission>();
      (prev || []).forEach(m => {
        const date = m.departureDate;
        const existing = prevByDate.get(date);
        if (!existing || (existing.tasks.filter(t => t.completed).length < m.tasks.filter(t => t.completed).length)) {
          // Use the mission with more completed tasks, or the new one if none exists
          prevByDate.set(date, m);
        }
      });

      const next: InspectionMission[] = [];
      const newMissions: InspectionMission[] = [];
      const ordersByDate = new Map<string, Order[]>();
      
      // Group orders by departure date
      (orders || [])
        .filter(o => o.status !== 'בוטל')
        .forEach(o => {
          const date = o.departureDate;
          if (!ordersByDate.has(date)) {
            ordersByDate.set(date, []);
          }
          ordersByDate.get(date)!.push(o);
        });
      
      // Create one mission per departure date
      ordersByDate.forEach((ordersForDate, date) => {
        const existing = prevByDate.get(date);
        const isNew = !existing;
        const firstOrder = ordersForDate[0];
        
        // Ensure tasks are always populated with all default tasks
        let tasks: InspectionTask[] = [];
        if (existing?.tasks?.length) {
          // Merge existing tasks with default tasks to ensure all are present
          const tasksMap = new Map(existing.tasks.map(t => [t.id, t]));
          tasks = defaultInspectionTasks.map(defaultTask => {
            const existingTask = tasksMap.get(defaultTask.id);
            if (existingTask) {
              // Use existing task (preserves completion status)
              return { ...existingTask };
            } else {
              // Default task not in existing, add it as incomplete
              return { ...defaultTask };
            }
          });
        } else {
          // No existing tasks, use all default tasks
          tasks = defaultInspectionTasks.map(t => ({ ...t }));
        }
        
        const mission: InspectionMission = {
          id: existing?.id || `INSP-${date}`,
          orderId: firstOrder.id, // Keep first order ID for reference
          unitNumber: firstOrder.unitNumber,
          guestName: ordersForDate.map(o => o.guestName).join(', '), // Combine guest names
          departureDate: date,
          tasks,
          status: computeInspectionStatus({ departureDate: date, tasks }),
        };
        next.push(mission);
        if (isNew) {
          newMissions.push(mission);
        }
      });

      // Save new missions to backend
      if (newMissions.length > 0) {
        newMissions.forEach(async (mission) => {
          try {
            await fetch(`${API_BASE_URL}/api/inspections`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: mission.id,
                orderId: mission.orderId,
                unitNumber: mission.unitNumber,
                guestName: mission.guestName,
                departureDate: mission.departureDate,
                status: mission.status,
                tasks: mission.tasks,
              }),
            });
          } catch (err) {
            console.error('Error saving new inspection to backend:', err);
          }
        });
      }

      return next;
    });
  };

  useEffect(() => {
    loadInspections();
  }, []);

  const syncCleaningInspectionsWithOrders = async () => {
    try {
      // Call backend sync endpoint which handles adding and removing cleaning inspections
      // The backend will fetch orders itself, so we don't need to check orders.length
      const res = await fetch(`${API_BASE_URL}/api/cleaning-inspections/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        console.log('Synced cleaning inspections with orders via backend');
      } else {
        console.error('Cleaning inspections sync failed with status:', res.status);
      }
    } catch (err) {
      console.error('Error syncing cleaning inspections with orders:', err);
    }
  };

  const loadCleaningInspections = async () => {
    // First, sync cleaning inspections with orders to ensure all departure dates have cleaning inspections
    await syncCleaningInspectionsWithOrders();
    try {
      const res = await fetch(`${API_BASE_URL}/api/cleaning-inspections`);
      if (res.ok) {
        const data = await res.json();
        const loadedMissions: InspectionMission[] = (data || []).map((insp: any) => {
          const backendTasks = (insp.tasks || []).map((t: any) => ({
            id: String(t.id),
            name: String(t.name || ''),
            completed: Boolean(t.completed),
          }));
          
          // Merge backend tasks with default cleaning inspection tasks
          let tasks: InspectionTask[] = [];
          if (backendTasks.length === 0) {
            tasks = defaultCleaningInspectionTasks.map(t => ({ ...t }));
          } else {
            const tasksMapById = new Map(backendTasks.map(t => [String(t.id), t]));
            const tasksMapByName = new Map(backendTasks.map(t => [String(t.name).trim().toLowerCase(), t]));
            
            tasks = defaultCleaningInspectionTasks.map(defaultTask => {
              let backendTask = tasksMapById.get(String(defaultTask.id));
              if (!backendTask) {
                const defaultTaskName = String(defaultTask.name).trim().toLowerCase();
                backendTask = tasksMapByName.get(defaultTaskName);
              }
              
              if (backendTask) {
                return { 
                  id: String(defaultTask.id),
                  name: String(backendTask.name || defaultTask.name),
                  completed: Boolean(backendTask.completed)
                };
              } else {
                return { ...defaultTask };
              }
            });
          }
          
          return {
            id: insp.id,
            orderId: insp.order_id || insp.orderId || '',
            unitNumber: insp.unit_number || insp.unitNumber || '',
            guestName: insp.guest_name || insp.guestName || '',
            departureDate: insp.departure_date || insp.departureDate || '',
            status: (insp.status || 'זמן הביקורות טרם הגיע') as InspectionStatus,
            tasks,
          };
        });
        
        // Group by departure date - one mission per departure date
        const missionsByDate = new Map<string, InspectionMission>();
        loadedMissions.forEach(m => {
          const date = m.departureDate;
          const existing = missionsByDate.get(date);
          if (!existing || (existing.tasks.filter(t => t.completed).length < m.tasks.filter(t => t.completed).length)) {
            missionsByDate.set(date, m);
          }
        });
        setCleaningInspectionMissions(Array.from(missionsByDate.values()));
      }
    } catch (err) {
      console.warn('Error loading cleaning inspections from backend:', err);
    }
  };

  const syncMonthlyInspections = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/monthly-inspections/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        console.log('Synced monthly inspections via backend');
      } else {
        console.error('Monthly inspections sync failed with status:', res.status);
      }
    } catch (err) {
      console.error('Error syncing monthly inspections:', err);
    }
  };

  const loadMonthlyInspections = async () => {
    await syncMonthlyInspections();
    try {
      const res = await fetch(`${API_BASE_URL}/api/monthly-inspections`);
      console.log('Monthly inspections response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Backend returned', data?.length || 0, 'monthly inspections');
        if (data && data.length > 0) {
          console.log('Sample inspection:', JSON.stringify(data[0], null, 2));
        } else {
          console.warn('WARNING: Backend returned empty array for monthly inspections');
        }
        const loadedMissions: InspectionMission[] = (data || []).map((insp: any) => {
          const backendTasks = (insp.tasks || []).map((t: any) => ({
            id: String(t.id),
            name: String(t.name || ''),
            completed: Boolean(t.completed),
          }));
          
          // Merge backend tasks with default monthly inspection tasks
          let tasks: InspectionTask[] = [];
          if (backendTasks.length === 0) {
            tasks = defaultMonthlyInspectionTasks.map(t => ({ ...t }));
          } else {
            const tasksMapById = new Map(backendTasks.map((t: any) => [String(t.id), t]));
            const tasksMapByName = new Map(backendTasks.map((t: any) => [String(t.name).trim().toLowerCase(), t]));
            
            tasks = defaultMonthlyInspectionTasks.map(defaultTask => {
              let backendTask = tasksMapById.get(String(defaultTask.id));
              if (!backendTask) {
                const defaultTaskName = String(defaultTask.name).trim().toLowerCase();
                backendTask = tasksMapByName.get(defaultTaskName);
              }
              
              if (backendTask) {
                return { 
                  id: String(defaultTask.id),
                  name: String(backendTask.name || defaultTask.name),
                  completed: Boolean(backendTask.completed)
                };
              } else {
                return { ...defaultTask };
              }
            });
          }
          
          // For monthly inspections, use inspectionMonth as departureDate for compatibility
          const inspectionMonth = insp.inspectionMonth || insp.inspection_month || '';
          
          return {
            id: insp.id,
            orderId: '', // Monthly inspections don't have order IDs
            unitNumber: insp.unitNumber || insp.unit_number || '',
            guestName: '', // Monthly inspections don't have guest names
            departureDate: inspectionMonth, // Use month as date for compatibility
            status: (insp.status || 'זמן הביקורות טרם הגיע') as InspectionStatus,
            tasks,
          };
        });
        
        setMonthlyInspectionMissions(loadedMissions);
      }
    } catch (err) {
      console.warn('Error loading monthly inspections from backend:', err);
    }
  };

  // Sync and reload inspections when screen opens
  useEffect(() => {
    if (screen === 'exitInspections') {
      const syncAndLoad = async () => {
        await syncInspectionsWithOrders();
        await loadInspections();
      };
      syncAndLoad();
    } else if (screen === 'cleaningInspections') {
      const syncAndLoad = async () => {
        await syncCleaningInspectionsWithOrders();
        await loadCleaningInspections();
      };
      syncAndLoad();
    } else if (screen === 'monthlyInspections') {
      const syncAndLoad = async () => {
        await syncMonthlyInspections();
        await loadMonthlyInspections();
      };
      syncAndLoad();
    }
  }, [screen]);

  // Use a ref to track if we've loaded from backend to prevent overwriting
  const hasLoadedFromBackend = React.useRef(false);
  
  // Sync inspections when orders change - ensure inspections table stays in sync with orders
  // Group by departure date - one mission per departure date
  useEffect(() => {
    if (orders.length > 0 && hasLoadedFromBackend.current) {
      // Sync inspections with backend when orders change
      const syncWithBackend = async () => {
        try {
          await fetch(`${API_BASE_URL}/api/inspections/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          // Reload inspections after syncing
          await loadInspections();
        } catch (err) {
          console.error('Error syncing inspections with backend:', err);
        }
      };
      syncWithBackend();
    } else if (orders.length > 0 && !hasLoadedFromBackend.current) {
      // Only derive if we haven't loaded from backend yet (initial load)
      deriveMissionsFromOrders();
    }
  }, [orders.length]); // Only trigger when number of orders changes

  const loadChatMessages = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages`);
      if (!res.ok) {
        console.warn('Failed to load chat messages', res.status);
        return;
      }
      const data = await res.json();
      // Reverse to show oldest first (backend returns newest first)
      const messages = (data ?? []).reverse();
      
      // Check for new messages (not from current user)
      if (userName && previousChatMessages.length > 0 && messages.length > previousChatMessages.length) {
        const previousMessageIds = new Set(previousChatMessages.map(m => m.id));
        const newMessages = messages.filter(m => 
          !previousMessageIds.has(m.id) && m.sender !== userName
        );
        
        if (newMessages.length > 0) {
          const latestMessage = newMessages[newMessages.length - 1];
          showNotification(
            `הודעה חדשה מ-${latestMessage.sender}`,
            latestMessage.content.length > 50 
              ? latestMessage.content.substring(0, 50) + '...' 
              : latestMessage.content
          );
        }
      }
      
      setPreviousChatMessages(messages);
      setChatMessages(messages);
    } catch (err) {
      console.warn('Error loading chat messages', err);
    }
  };

  const sendChatMessage = async (content: string) => {
    if (!content.trim() || !userName) return;
    
    try {
      const url = `${API_BASE_URL}/api/chat/messages`;
      console.log('Sending chat message:', { url, sender: userName, content: content.trim() });
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          sender: userName,
          content: content.trim(),
        }),
      });
      
      console.log('Chat message response:', res.status, res.statusText);
      
      if (!res.ok) {
        let errorMsg = `שגיאה ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.detail || errorData.message || errorMsg;
        } catch {
          const errorText = await res.text();
          errorMsg = errorText || errorMsg;
        }
        console.error('Failed to send chat message:', res.status, errorMsg);
        Alert.alert('שגיאה', `נכשל בשליחת ההודעה: ${errorMsg}`);
        return;
      }
      
      const responseData = await res.json().catch(() => null);
      console.log('Chat message sent successfully:', responseData);
      await loadChatMessages();
    } catch (err: any) {
      console.error('Error sending chat message:', err);
      const errorMsg = err.message || 'אירעה שגיאה בשליחת ההודעה';
      Alert.alert('שגיאה', errorMsg);
    }
  };

  useEffect(() => {
    if (screen === 'chat') {
      loadChatMessages();
      // Refresh messages every 5 seconds
      const interval = setInterval(loadChatMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // Poll for new messages and assignments when user is logged in (but not on chat screen - it has its own polling)
  useEffect(() => {
    if (!userName || screen === 'chat') return;
    
    // Load maintenance tasks and chat messages periodically
    const pollInterval = setInterval(() => {
      loadMaintenanceTasksReport();
      loadChatMessages();
    }, 10000); // Check every 10 seconds
    
    // Initial load
    loadMaintenanceTasksReport();
    loadChatMessages();
    
    return () => clearInterval(pollInterval);
  }, [userName, screen]);

  const loadAttendanceStatus = async () => {
    if (!userName) return;
    try {
      const url = `${API_BASE_URL}/attendance/status/${encodeURIComponent(userName)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceStatus(data);
      }
    } catch (err) {
      console.error('Error loading attendance status:', err);
    }
  };

  const startAttendance = async () => {
    if (!userName) {
      Alert.alert('שגיאה', 'אנא התחברו תחילה');
      return;
    }
    try {
      const url = `${API_BASE_URL}/attendance/start`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee: userName }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'שגיאה לא ידועה' }));
        Alert.alert('שגיאה', errorData.detail || 'לא ניתן להתחיל את שעון הנוכחות');
        return;
      }
      await loadAttendanceStatus();
      Alert.alert('הצלחה', 'התחלת עבודה נרשמה בהצלחה');
    } catch (err: any) {
      Alert.alert('שגיאה', err.message || 'אירעה שגיאה בהתחלת העבודה');
    }
  };

  const stopAttendance = async () => {
    if (!userName) {
      Alert.alert('שגיאה', 'אנא התחברו תחילה');
      return;
    }
    try {
      const url = `${API_BASE_URL}/attendance/stop`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee: userName }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'שגיאה לא ידועה' }));
        Alert.alert('שגיאה', errorData.detail || 'לא ניתן לסיים את שעון הנוכחות');
        return;
      }
      await loadAttendanceStatus();
      Alert.alert('הצלחה', 'סיום עבודה נרשם בהצלחה');
    } catch (err: any) {
      Alert.alert('שגיאה', err.message || 'אירעה שגיאה בסיום העבודה');
    }
  };

  useEffect(() => {
    if (screen === 'attendance' && userName) {
      loadAttendanceStatus();
      loadAttendanceLogsReport();
      // Refresh status and logs every 10 seconds
      const interval = setInterval(() => {
        loadAttendanceStatus();
        loadAttendanceLogsReport();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [screen, userName]);

  const loadWarehouses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/warehouses`);
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data || []);
      }
    } catch (err) {
      console.error('Error loading warehouses:', err);
    }
  };

  const loadWarehouseItems = async (warehouseId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/warehouses/${warehouseId}/items`);
      if (res.ok) {
        const data = await res.json();
        setWarehouseItems(data || []);
      }
    } catch (err) {
      console.error('Error loading warehouse items:', err);
    }
  };

  const loadAllWarehouseItemsForReports = async () => {
    try {
      const warehousesRes = await fetch(`${API_BASE_URL}/api/warehouses`);
      if (!warehousesRes.ok) return;
      const ws = (await warehousesRes.json()) || [];
      setWarehouses(ws);

      const lists = await Promise.all(
        (ws as Array<{ id: string }>).map(async w => {
          try {
            const itemsRes = await fetch(`${API_BASE_URL}/api/warehouses/${w.id}/items`);
            if (!itemsRes.ok) return [];
            return (await itemsRes.json()) || [];
          } catch {
            return [];
          }
        }),
      );
      setAllWarehouseItems(lists.flat());
    } catch (err) {
      console.error('Error loading all warehouse items for reports:', err);
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invoices`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data || []);
      } else {
        console.error('Failed to load invoices:', response.status);
        setInvoices([]);
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
      setInvoices([]);
    }
  };

  const loadReportsSummary = async () => {
    try {
      setReportsSummaryError(null);
      const res = await fetch(`${API_BASE_URL}/api/reports/summary`);
      if (!res.ok) {
        const text = await res.text();
        setReportsSummary(null);
        setReportsSummaryError(text || `שגיאה ${res.status}`);
        return;
      }
      const data = await res.json();
      setReportsSummary(data || null);
    } catch (err: any) {
      setReportsSummary(null);
      setReportsSummaryError(err?.message || 'שגיאה בטעינת דוחות');
    }
  };

  const loadAttendanceLogsReport = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/attendance/logs`);
      if (!res.ok) return;
      const data = await res.json();
      setAttendanceLogsReport(data || []);
    } catch (err) {
      console.error('Error loading attendance logs for reports:', err);
    }
  };

  const loadMaintenanceTasksReport = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/maintenance/tasks`);
      if (!res.ok) return;
      const data = await res.json();
      const tasks = data || [];
      
      // Check for new assignments to current user
      if (userName && previousMaintenanceTasks.length > 0) {
        const previousTasksMap = new Map(previousMaintenanceTasks.map((t: any) => [t.id, t]));
        const currentUser = systemUsers.find(u => u.username === userName);
        const currentUserId = currentUser?.id?.toString();
        
        tasks.forEach((t: any) => {
          const prevTask = previousTasksMap.get(t.id);
          const currentAssignedTo = (t.assigned_to || t.assignedTo || '').toString().trim();
          const prevAssignedTo = prevTask ? ((prevTask.assigned_to || prevTask.assignedTo || '').toString().trim()) : '';
          
          // Check if this task was just assigned to the current user
          // Assignment happens when: wasn't assigned before OR was assigned to someone else, now assigned to me
          if (currentAssignedTo && currentAssignedTo !== prevAssignedTo) {
            // Check if assigned to current user (by username or user ID)
            const isAssignedToMe = 
              currentAssignedTo === userName || 
              (currentUserId && currentAssignedTo === currentUserId);
            
            if (isAssignedToMe) {
              showNotification(
                'משימה חדשה הוקצתה לך',
                `משימת תחזוקה חדשה: ${t.title || 'ללא כותרת'}`
              );
            }
          }
        });
      }
      
      setPreviousMaintenanceTasks(tasks);
      setMaintenanceTasksReport(tasks);
    } catch (err) {
      console.error('Error loading maintenance tasks for reports:', err);
    }
  };

  const loadMaintenanceUnits = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/maintenance/tasks`);
      if (!res.ok) return;
      const data = (await res.json()) || [];

      // Keep the 10 units always visible, and attach tasks by unit_id
      const baseUnits: MaintenanceUnit[] = UNIT_NAMES.map(name => ({
        id: unitIdFromName(name),
        name,
        type: 'יחידה',
        tasks: [],
      }));

      const byId = new Map<string, MaintenanceUnit>();
      baseUnits.forEach(u => byId.set(u.id, u));

      (data || []).forEach((t: any) => {
        const unitId = normalizeMaintenanceUnitId(t.unit_id || t.unitId || t.unit);
        const unit = byId.get(unitId) || byId.get('unit-1');
        if (!unit) return;

        const task: MaintenanceTask = {
          id: (t.id || `task-${Date.now()}`).toString(),
          unitId,
          title: (t.title || '').toString(),
          description: (t.description || '').toString(),
          status: (t.status || 'פתוח') as MaintenanceStatus,
          createdDate: (t.created_date || t.createdDate || new Date().toISOString().split('T')[0]).toString(),
          assignedTo: (t.assigned_to || t.assignedTo || undefined)?.toString(),
          imageUri: (t.image_uri || t.imageUri || undefined)?.toString(),
          media: null,
        };

        unit.tasks.push(task);
      });

      // Sort tasks newest first per unit
      baseUnits.forEach(u => {
        u.tasks.sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || ''));
      });

      setMaintenanceUnits(baseUnits);
      setMaintenanceTasksReport(data || []);
    } catch (err) {
      console.error('Error loading maintenance units:', err);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`);
      if (!res.ok) return;
      const data = await res.json();
      const list = (data || []).map((o: any): Order => ({
        id: o.id,
        guestName: o.guest_name ?? o.guestName ?? '',
        unitNumber: normalizeUnitName(o.unit_number ?? o.unitNumber ?? ''),
        arrivalDate: o.arrival_date ?? o.arrivalDate ?? '',
        departureDate: o.departure_date ?? o.departureDate ?? '',
        status: (o.status ?? 'חדש') as OrderStatus,
        guestsCount: Number(o.guests_count ?? o.guestsCount ?? 0),
        specialRequests: o.special_requests ?? o.specialRequests ?? '',
        internalNotes: o.internal_notes ?? o.internalNotes ?? '',
        paidAmount: Number(o.paid_amount ?? o.paidAmount ?? 0),
        totalAmount: Number(o.total_amount ?? o.totalAmount ?? 0),
        paymentMethod: o.payment_method ?? o.paymentMethod ?? 'לא צוין',
      }));
      setOrders(list);
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  };

  const loadInventoryOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/orders`);
      if (!res.ok) return;
      const data = await res.json();
      
      // Handle both new structure (with items array) and old structure (flat)
      const list = (data || []).map((o: any): InventoryOrder => {
        const status = (o.status ?? 'מחכה להשלמת תשלום') as InventoryOrder['status'];
        const orderType = (o.order_type ?? o.orderType ?? 'הזמנה כללית') as InventoryOrder['orderType'];
        
        // New structure: orders have items array
        if (o.items && Array.isArray(o.items)) {
          return {
            id: o.id,
            orderDate: o.order_date ?? o.orderDate ?? '',
            deliveryDate: o.delivery_date ?? o.deliveryDate ?? undefined,
            status,
            orderType,
            orderedBy: o.ordered_by ?? o.orderedBy ?? undefined,
            unitNumber: normalizeUnitName(o.unit_number ?? o.unitNumber ?? '') || undefined,
            items: o.items.map((item: any): InventoryOrderItem => ({
              id: item.id,
              itemId: item.item_id ?? item.itemId,
              itemName: item.item_name ?? item.itemName ?? '',
              quantity: Number(item.quantity ?? 0),
              unit: item.unit ?? '',
            })),
          };
        }
        
        // Old structure: flat order with single item (backward compatibility)
        return {
          id: o.id,
          orderDate: o.order_date ?? o.orderDate ?? '',
          deliveryDate: o.delivery_date ?? o.deliveryDate ?? undefined,
          status,
          orderType,
          orderedBy: o.ordered_by ?? o.orderedBy ?? undefined,
          unitNumber: normalizeUnitName(o.unit_number ?? o.unitNumber ?? '') || undefined,
          items: [{
            id: o.id + '-item',
            itemId: o.item_id ?? o.itemId ?? '',
            itemName: o.item_name ?? o.itemName ?? '',
            quantity: Number(o.quantity ?? 0),
            unit: o.unit ?? '',
          }],
        };
      });
      setInventoryOrders(list);
    } catch (err) {
      console.error('Error loading inventory orders:', err);
    }
  };

  const createInventoryOrder = async (order: InventoryOrder) => {
    try {
      // New structure: create order with items array
      const res = await fetch(`${API_BASE_URL}/api/inventory/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Don't send ID - let backend generate UUID
          orderDate: order.orderDate,
          deliveryDate: order.deliveryDate,
          status: order.status,
          orderType: order.orderType,
          orderedBy: order.orderedBy,
          unitNumber: order.unitNumber,
          items: order.items.map(item => ({
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
          })),
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'שגיאה לא ידועה' }));
        throw new Error(errorData.detail || 'לא ניתן ליצור הזמנה');
      }
      const data = await res.json();
      await loadInventoryOrders();
      return data;
    } catch (err: any) {
      Alert.alert('שגיאה', err.message || 'אירעה שגיאה ביצירת ההזמנה');
      throw err;
    }
  };

  useEffect(() => {
    if (screen === 'reports') {
      loadOrders();
      loadInventoryOrders();
      loadReportsSummary();
      loadAllWarehouseItemsForReports();
      loadMaintenanceTasksReport();
      loadAttendanceLogsReport();
      if (userName) loadAttendanceStatus();
    }
  }, [screen, userName]);

  useEffect(() => {
    if (screen === 'hub' || screen === 'orders') {
      loadOrders();
      loadInvoices();
    }
    if (screen === 'exitInspections') {
      loadOrders();
    }
    if (screen === 'warehouseOrders') {
      loadInventoryOrders();
    }
    if (screen === 'maintenance' || screen === 'maintenanceTasks' || screen === 'maintenanceTaskDetail') {
      loadMaintenanceUnits();
    }
  }, [screen]);

  const createWarehouse = async (name: string, location?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location }),
      });
      if (res.ok) {
        const data = await res.json();
        await loadWarehouses();
        return data;
      } else {
        const errorData = await res.json().catch(() => ({ detail: 'שגיאה לא ידועה' }));
        throw new Error(errorData.detail || 'לא ניתן ליצור מחסן');
      }
    } catch (err: any) {
      Alert.alert('שגיאה', err.message || 'אירעה שגיאה ביצירת המחסן');
      throw err;
    }
  };

  const createWarehouseItem = async (warehouseId: string, itemId: string, itemName: string, quantity: number, unit: string) => {
    try {
      const payload: any = { 
        item_name: itemName, 
        quantity, 
        unit 
      };
      // Only include item_id if it's provided and not empty
      if (itemId && itemId.trim()) {
        payload.item_id = itemId;
      }
      
      console.log('Creating warehouse item:', { warehouseId, payload });
      const res = await fetch(`${API_BASE_URL}/api/warehouses/${warehouseId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      console.log('Response status:', res.status, res.statusText);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Warehouse item created successfully:', data);
        await loadWarehouseItems(warehouseId);
        return data;
      } else {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || 'שגיאה לא ידועה' };
        }
        const errorMsg = errorData.detail || errorData.message || 'לא ניתן להוסיף מוצר';
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Error creating warehouse item:', err);
      const errorMsg = err.message || 'אירעה שגיאה בהוספת המוצר';
      Alert.alert('שגיאה', errorMsg);
      throw err;
    }
  };

  const updateWarehouseItem = async (warehouseId: string, itemId: string, quantity: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/warehouses/${warehouseId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) {
        await loadWarehouseItems(warehouseId);
        return true;
      } else {
        const errorData = await res.json().catch(() => ({ detail: 'שגיאה לא ידועה' }));
        throw new Error(errorData.detail || 'לא ניתן לעדכן את הכמות');
      }
    } catch (err: any) {
      Alert.alert('שגיאה', err.message || 'אירעה שגיאה בעדכון הכמות');
      throw err;
    }
  };

  useEffect(() => {
    if (screen === 'warehouseInventory' || screen === 'warehouseMenu') {
      loadWarehouses();
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 'warehouseInventoryDetail' && selectedWarehouseId) {
      loadWarehouseItems(selectedWarehouseId);
    }
  }, [screen, selectedWarehouseId]);

  const handlePickImage = () => {
    const options: any = {
      mediaType: 'photo' as const,
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: true,
    };
    
    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorMessage) {
        Alert.alert('שגיאה', 'שגיאה בבחירת תמונה');
      } else if (response.assets && response.assets[0]) {
        setImageUri(response.assets[0].uri || null);
        if (response.assets[0].base64) {
          setImageBase64(`data:image/jpeg;base64,${response.assets[0].base64}`);
        } else {
          setImageBase64(null);
        }
      }
    });
  };

  const handleSign = async (mode: 'signin' | 'signup') => {
    if (!name.trim() || !password.trim()) {
      setError('אנא מלאו שם וסיסמה');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    
    setError('');
    
    try {
      let imageUrl: string | undefined = undefined;
      
      // If signup and image selected, use stored base64
      if (mode === 'signup' && imageBase64) {
        imageUrl = imageBase64;
      }

      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('Attempting auth:', { mode, url, username: name.trim() });
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: name.trim(),
          password: password,
          ...(mode === 'signup' && { role, image_url: imageUrl }),
        }),
      });
      
      console.log('Auth response status:', res.status, res.statusText);
      
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        const text = await res.text();
        console.error('Failed to parse JSON response:', text);
        setError(`שגיאת שרת: ${res.status} ${res.statusText}`);
        return;
      }
      
      console.log('Auth response data:', data);
      
      if (!res.ok) {
        const errorMsg = data.detail || data.message || `שגיאה ${res.status}: ${res.statusText}`;
        setError(errorMsg);
        return;
      }
      
      // Success - set user and navigate to hub
      setUserName(data.username || name.trim());
      setUserRole(data.role || null);
      setUserImageUrl(data.image_url || null);
      setScreen('hub');
      setName('');
      setPassword('');
      setConfirmPassword('');
      setImageUri(null);
      setImageBase64(null);
    } catch (err: any) {
      console.error('Auth error:', err);
      const errorMsg = err.message || 'אירעה שגיאה בחיבור לשרת. נסה שוב.';
      setError(errorMsg);
    }
  };

  const updateOrder = (
    id: string,
    changes: Partial<Pick<Order, 'status' | 'paidAmount' | 'paymentMethod'>>,
  ) => {
    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, ...changes } : o)),
    );
  };

  const createOrder = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const newOrderData = {
        guest_name: '',
        unit_number: '',
        arrival_date: today,
        departure_date: nextWeek,
        status: 'חדש',
        guests_count: 0,
        special_requests: '',
        internal_notes: '',
        paid_amount: 0,
        total_amount: 0,
        payment_method: null,
      };

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'שגיאה לא ידועה' }));
        Alert.alert('שגיאה', errorData.detail || 'לא ניתן ליצור הזמנה');
        return;
      }

      const createdOrder = await res.json();
      
      // Map backend order to frontend order format
      const mappedOrder: Order = {
        id: createdOrder.id,
        guestName: createdOrder.guest_name || '',
        unitNumber: createdOrder.unit_number || '',
        arrivalDate: createdOrder.arrival_date || today,
        departureDate: createdOrder.departure_date || nextWeek,
        status: createdOrder.status || 'חדש',
        guestsCount: createdOrder.guests_count || 0,
        specialRequests: createdOrder.special_requests || '',
        internalNotes: createdOrder.internal_notes || '',
        paidAmount: createdOrder.paid_amount || 0,
        totalAmount: createdOrder.total_amount || 0,
        paymentMethod: createdOrder.payment_method || undefined,
      };

      setOrders(prev => [...prev, mappedOrder]);
      setSelectedOrderId(mappedOrder.id);
      setScreen('orderEdit');
    } catch (err: any) {
      console.error('Error creating order:', err);
      Alert.alert('שגיאה', err.message || 'אירעה שגיאה ביצירת ההזמנה');
    }
  };

  if (screen === 'home') {
    return (
      <SafeAreaView style={styles.fullBleed}>
        {statusBar}
        <ImageBackground
          source={seaBackground}
          style={styles.bg}
          imageStyle={styles.bgImage}
        >
          <View style={styles.bgOverlay} />

          <View
            style={[styles.topBar, { paddingTop: safeAreaInsets.top + 4 }]}
          >
            <View style={styles.brandBadge}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>Seisignes</Text>
            </View>
            <View style={styles.topChip}>
              <Text style={styles.topChipText}>מתחם נופש בוטיק</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.heroScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>חלון ניהול חכם</Text>
              <Text style={styles.heroHeading}>Seisignes Retreat</Text>
              <Text style={styles.heroBody}>
                ניהול אורחים, הזמנות ותחזוקה מתוך ממשק אחד אלגנטי. שליטה מלאה
                במצב המתחם, תשלומים ועדכוני צוות בזמן אמת.
              </Text>
            </View>

            <View style={styles.ctaCard}>
              <Text style={styles.ctaTitle}>התחברות מהירה</Text>
              <View style={styles.ctaButtons}>
                <PrimaryButton
                  label="כניסה"
                  onPress={() => setScreen('signin')}
                  style={styles.ctaPrimary}
                />
                <OutlineButton
                  label="הרשמה"
                  onPress={() => setScreen('signup')}
                  style={styles.ctaOutline}
                />
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  if (!userName && (screen === 'signin' || screen === 'signup')) {
    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: safeAreaInsets.top }]}
      >
        {statusBar}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>
            {screen === 'signin' ? 'כניסה' : 'הרשמה'}
          </Text>
          <Text style={styles.subtitle}>ניהול מתחם נופש – הזדהות מאובטחת</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>שם משתמש</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="הקלד שם"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>סיסמה</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                textAlign="right"
              />
            </View>
            {screen === 'signup' ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>אישור סיסמה</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    textAlign="right"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>תפקיד</Text>
                  <View style={styles.pickerContainer}>
                    <Pressable
                      style={[styles.pickerButton, role === 'עובד תחזוקה' && styles.pickerButtonSelected]}
                      onPress={() => setRole('עובד תחזוקה')}
                    >
                      <Text style={[styles.pickerButtonText, role === 'עובד תחזוקה' && styles.pickerButtonTextSelected]}>
                        עובד תחזוקה
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.pickerButton, role === 'מנהל' && styles.pickerButtonSelected]}
                      onPress={() => setRole('מנהל')}
                    >
                      <Text style={[styles.pickerButtonText, role === 'מנהל' && styles.pickerButtonTextSelected]}>
                        מנהל
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>תמונת פרופיל</Text>
                  {imageUri ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                      <Pressable
                        style={styles.removeImageButton}
                        onPress={() => {
                          setImageUri(null);
                          setImageBase64(null);
                        }}
                      >
                        <Text style={styles.removeImageButtonText}>✕</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.imageUploadButton} onPress={handlePickImage}>
                      <Text style={styles.imageUploadButtonText}>+ בחר תמונה</Text>
                    </Pressable>
                  )}
                </View>
              </>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              label={screen === 'signin' ? 'כניסה' : 'הרשמה'}
              onPress={() => handleSign(screen)}
            />
            <OutlineButton
              label="חזרה למסך הבית"
              onPress={() => setScreen('home')}
              style={{ marginTop: 10 }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'hub') {
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingAmount = totalRevenue - totals.totalPaid;
    const activeOrders = orders.filter(o => o.status !== 'בוטל' && o.status !== 'שולם').length;
    const completedOrders = orders.filter(o => o.status === 'שולם').length;
    
    // Calculate total expenses from invoices
    const totalExpenses = invoices.reduce((sum, invoice) => {
      // Try to get amount from extracted_data first (simplified schema)
      let amount = 0;
      const extractedData = invoice.extracted_data;
      if (extractedData) {
        if (typeof extractedData === 'string') {
          try {
            const parsed = JSON.parse(extractedData);
            amount = parsed.total_price || 0;
          } catch {
            amount = 0;
          }
        } else if (typeof extractedData === 'object' && extractedData !== null) {
          amount = extractedData.total_price || 0;
        }
      }
      // Fallback to invoice-level total_price
      if (!amount) {
        amount = invoice.total_price || 0;
      }
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0);
    
    return (
      <SafeAreaView style={[styles.hubContainer, { paddingTop: safeAreaInsets.top }]}>
        {statusBar}
        <ScrollView
          contentContainerStyle={styles.hubScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hubTopRow}>
            <View style={styles.brandBadge}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>Seisignes</Text>
            </View>
            <View style={styles.userChip}>
              <Text style={styles.userChipText}>שלום {userName}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#dbeafe', borderColor: '#3b82f6' }]}>
              <Text style={styles.statValue}>{totals.count}</Text>
              <Text style={styles.statLabel}>מספר הזמנות</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#dcfce7', borderColor: '#22c55e' }]}>
              <Text style={styles.statValue}>₪{totalRevenue.toLocaleString('he-IL')}</Text>
              <Text style={styles.statLabel}>הכנסות</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}>
              <Text style={styles.statValue}>₪{totalExpenses.toLocaleString('he-IL')}</Text>
              <Text style={styles.statLabel}>הוצאות</Text>
            </View>
          </View>

          <View style={styles.welcomeSection}>
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeAvatar}>
                {userImageUrl ? (
                  <Image source={{ uri: userImageUrl }} style={styles.welcomeAvatarImage} />
                ) : (
                  <View style={styles.welcomeAvatarPlaceholder}>
                    <Text style={styles.welcomeAvatarIcon}>👤</Text>
                  </View>
                )}
              </View>
              <View style={styles.welcomeContent}>
                <Text style={styles.welcomeTitle}>שלום {userName}</Text>
                <Text style={styles.welcomeSubtitle}>ברוך הבא למערכת הניהול</Text>
              </View>
            </View>
          </View>

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>אפשרויות</Text>
            <View style={styles.quickActionsRow}>
              {userRole === 'מנהל' && (
                <Pressable
                  style={[styles.quickActionBtn, { backgroundColor: '#3b82f6' }]}
                  onPress={() => setScreen('orders')}
                >
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={styles.quickActionIcon}>📑</Text>
                    <Text style={styles.quickActionText}>הזמנות</Text>
                  </View>
                </Pressable>
              )}
              <Pressable
                style={[styles.quickActionBtn, { backgroundColor: '#f97316' }]}
                onPress={() => setScreen('exitInspections')}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.quickActionIcon}>🧹</Text>
                  <Text style={styles.quickActionText}>ביקורת יציאה</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.quickActionBtn, { backgroundColor: '#f7fee7', borderWidth: 2, borderColor: '#84cc16' }]}
                onPress={() => setScreen('cleaningInspections')}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.quickActionIcon}>✨</Text>
                  <Text style={[styles.quickActionText, { color: '#0f172a' }]}>ביקורת ניקיון</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.quickActionBtn, { backgroundColor: '#fef3c7', borderWidth: 2, borderColor: '#f59e0b' }]}
                onPress={() => setScreen('monthlyInspections')}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.quickActionIcon}>📅</Text>
                  <Text style={[styles.quickActionText, { color: '#0f172a' }]}>ביקורות חודשיות</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.quickActionBtn, { backgroundColor: '#a78bfa' }]}
                onPress={() => setScreen('warehouse')}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.quickActionIcon}>📦</Text>
                  <Text style={styles.quickActionText}>מחסן</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.quickActionBtn, { backgroundColor: '#22c55e' }]}
                onPress={() => setScreen('maintenance')}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.quickActionIcon}>🛠️</Text>
                  <Text style={styles.quickActionText}>תחזוקה</Text>
                </View>
              </Pressable>
              {userRole === 'מנהל' && (
                <>
                  <Pressable
                    style={[styles.quickActionBtn, { backgroundColor: '#6366f1' }]}
                    onPress={() => setScreen('reports')}
                  >
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={styles.quickActionIcon}>📊</Text>
                      <Text style={styles.quickActionText}>דוחות</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={[styles.quickActionBtn, { backgroundColor: '#0ea5e9' }]}
                    onPress={() => setScreen('invoices')}
                  >
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={styles.quickActionIcon}>🧾</Text>
                      <Text style={styles.quickActionText}>חשבוניות</Text>
                    </View>
                  </Pressable>
                </>
              )}
              <Pressable
                style={[styles.quickActionBtn, { backgroundColor: '#ec4899' }]}
                onPress={() => setScreen('attendance')}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.quickActionIcon}>⏱️</Text>
                  <Text style={styles.quickActionText}>שעון נוכחות</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.quickActionBtn, { backgroundColor: '#10b981' }]}
                onPress={() => setScreen('cleaningSchedule')}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.quickActionIcon}>🧹</Text>
                  <Text style={styles.quickActionText}>סידורי ניקיון</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Chat button at bottom - full width */}
          <View style={styles.chatSection}>
            <Pressable
              style={[styles.chatButton, { backgroundColor: '#eab308' }]}
              onPress={() => setScreen('chat')}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Text style={styles.chatButtonIcon}>💬</Text>
                <Text style={styles.quickActionText}>צ׳אט פנימי</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'orderEdit') {
    const currentOrder = orders.find(o => o.id === selectedOrderId);
    if (!currentOrder) {
      setScreen('orders');
      return null;
    }
    // Check if this is a new order (totalAmount and paidAmount are both 0)
    const isNewOrder = currentOrder.totalAmount === 0 && currentOrder.paidAmount === 0;
    return (
      <OrderEditScreen
        order={currentOrder}
        isNewOrder={isNewOrder}
        onSave={async (id, changes) => {
          try {
            // Map frontend changes to backend format
            const backendChanges: any = {
              status: changes.status,
              paid_amount: changes.paidAmount,
              payment_method: changes.paymentMethod,
              total_amount: changes.totalAmount,
              guest_name: changes.guestName,
              unit_number: changes.unitNumber,
              arrival_date: changes.arrivalDate,
              departure_date: changes.departureDate,
              guests_count: changes.guestsCount,
              special_requests: changes.specialRequests,
              internal_notes: changes.internalNotes,
            };

            const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(backendChanges),
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({ detail: 'שגיאה לא ידועה' }));
              Alert.alert('שגיאה', errorData.detail || 'לא ניתן לעדכן את ההזמנה');
              return;
            }

            // Update local state
            setOrders(prev =>
              prev.map(o => (o.id === id ? { ...o, ...changes } : o)),
            );
            setScreen('orders');
          } catch (err: any) {
            console.error('Error updating order:', err);
            Alert.alert('שגיאה', err.message || 'אירעה שגיאה בעדכון ההזמנה');
          }
        }}
        onCancel={() => setScreen('orders')}
        onDelete={async (id) => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
              method: 'DELETE',
            });

            if (!res.ok) {
              const errorText = await res.text().catch(() => '');
              console.error('Failed to delete order:', res.status, errorText);
              Alert.alert('שגיאה', `לא ניתן למחוק את ההזמנה: ${res.status}`);
              return;
            }

            // Remove from local state
            setOrders(prev => prev.filter(o => o.id !== id));
            Alert.alert('הצלחה', 'ההזמנה נמחקה בהצלחה');
            setScreen('orders');
          } catch (err: any) {
            console.error('Error deleting order:', err);
            Alert.alert('שגיאה', 'לא ניתן למחוק את ההזמנה');
          }
        }}
      />
    );
  }

  if (screen === 'exitInspections') {
    const missionsAll = [...inspectionMissionsEffective].sort((a, b) =>
      (a.departureDate || '').localeCompare(b.departureDate || ''),
    );
    return (
      <ExitInspectionsScreen
        missions={missionsAll}
        defaultInspectionTasks={defaultInspectionTasks}
        loadInspections={loadInspections}
        onUpdateMission={async (id, updates) => {
          const mission = inspectionMissions.find(m => m.id === id);
          if (!mission) return;

          // Update local state immediately for responsive UI
          setInspectionMissions(prev =>
            prev.map(m => (m.id === id ? { ...m, ...updates } : m)),
          );

          // Save to backend
          try {
            const updatedMission = { ...mission, ...updates };
            await fetch(`${API_BASE_URL}/api/inspections`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: updatedMission.id,
                orderId: updatedMission.orderId,
                unitNumber: updatedMission.unitNumber,
                guestName: updatedMission.guestName,
                departureDate: updatedMission.departureDate,
                status: updatedMission.status,
                tasks: updatedMission.tasks,
              }),
            });
          } catch (err) {
            console.error('Error saving inspection to backend:', err);
          }
        }}
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'cleaningInspections') {
    const cleaningMissionsAll = [...cleaningInspectionMissions].sort((a, b) =>
      (a.departureDate || '').localeCompare(b.departureDate || ''),
    );
    return (
      <CleaningInspectionsScreen
        missions={cleaningMissionsAll}
        defaultInspectionTasks={defaultCleaningInspectionTasks}
        loadInspections={loadCleaningInspections}
        onUpdateMission={async (id, updates) => {
          const mission = cleaningInspectionMissions.find(m => m.id === id);
          if (!mission) return;

          // Update local state immediately for responsive UI
          setCleaningInspectionMissions(prev =>
            prev.map(m => (m.id === id ? { ...m, ...updates } : m)),
          );

          // Save to backend
          try {
            const updatedMission = { ...mission, ...updates };
            await fetch(`${API_BASE_URL}/api/cleaning-inspections`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: updatedMission.id,
                orderId: updatedMission.orderId,
                unitNumber: updatedMission.unitNumber,
                guestName: updatedMission.guestName,
                departureDate: updatedMission.departureDate,
                status: updatedMission.status,
                tasks: updatedMission.tasks,
              }),
            });
          } catch (err) {
            console.error('Error saving cleaning inspection to backend:', err);
          }
        }}
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'monthlyInspections') {
    const monthlyMissionsAll = [...monthlyInspectionMissions].sort((a, b) => {
      // Sort by month first, then by unit number
      const monthCompare = (a.departureDate || '').localeCompare(b.departureDate || '');
      if (monthCompare !== 0) return monthCompare;
      return (a.unitNumber || '').localeCompare(b.unitNumber || '');
    });
    return (
      <MonthlyInspectionsScreen
        missions={monthlyMissionsAll}
        defaultInspectionTasks={defaultMonthlyInspectionTasks}
        loadInspections={loadMonthlyInspections}
        onUpdateMission={async (id, updates) => {
          const mission = monthlyInspectionMissions.find(m => m.id === id);
          if (!mission) return;

          // Update local state immediately for responsive UI
          setMonthlyInspectionMissions(prev =>
            prev.map(m => (m.id === id ? { ...m, ...updates } : m)),
          );

          // Save to backend
          try {
            const updatedMission = { ...mission, ...updates };
            await fetch(`${API_BASE_URL}/api/monthly-inspections`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: updatedMission.id,
                unitNumber: updatedMission.unitNumber,
                inspectionMonth: updatedMission.departureDate, // Use departureDate as inspectionMonth
                status: updatedMission.status,
                tasks: updatedMission.tasks,
              }),
            });
          } catch (err) {
            console.error('Error saving monthly inspection to backend:', err);
          }
        }}
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'warehouse' || screen === 'warehouseMenu') {
    return (
      <WarehouseMenuScreen
        onSelectOrders={() => setScreen('warehouseOrders')}
        onSelectInventory={() => setScreen('warehouseInventory')}
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'warehouseOrders') {
    return (
      <WarehouseScreen
        items={inventoryItems}
        orders={inventoryOrders}
        selectedUnit={selectedUnit}
        onSelectUnit={setSelectedUnit}
        onAddOrder={(order) => {
          setInventoryOrders(prev => [...prev, order]);
        }}
        onUpdateOrder={async (id, updates) => {
          try {
            // Update via API
            const res = await fetch(`${API_BASE_URL}/api/inventory/orders/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: updates.status,
                delivery_date: updates.deliveryDate,
                // Map other fields if needed
              }),
            });
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({ detail: 'שגיאה לא ידועה' }));
              Alert.alert('שגיאה', errorData.detail || 'לא ניתן לעדכן את ההזמנה');
              return;
            }
            // Update local state immediately for better UX
            setInventoryOrders(prev =>
              prev.map(o => (o.id === id ? { ...o, ...updates } : o)),
            );
            // Reload orders to get updated data from backend
            loadInventoryOrders();
          } catch (err: any) {
            console.error('Error updating inventory order:', err);
            Alert.alert('שגיאה', err.message || 'אירעה שגיאה בעדכון ההזמנה');
          }
        }}
        onBack={() => setScreen('warehouseMenu')}
        onNewOrder={() => setScreen('newWarehouseOrder')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
        userName={userName || ''}
      />
    );
  }

  if (screen === 'warehouseInventory') {
    return (
      <WarehouseInventoryScreen
        warehouses={warehouses || []}
        onSelectWarehouse={(id) => {
          setSelectedWarehouseId(id);
          setScreen('warehouseInventoryDetail');
        }}
        onNewWarehouse={() => setScreen('newWarehouse')}
        onRefresh={loadWarehouses}
        onBack={() => setScreen('warehouseMenu')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'newWarehouse') {
    return (
      <NewWarehouseScreen
        onSave={async (name, location) => {
          await createWarehouse(name, location);
          setScreen('warehouseInventory');
        }}
        onCancel={() => setScreen('warehouseInventory')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'warehouseInventoryDetail') {
    const warehouse = warehouses.find(w => w.id === selectedWarehouseId);
    return (
      <WarehouseInventoryDetailScreen
        warehouse={warehouse}
        items={warehouseItems.filter(item => item.warehouse_id === selectedWarehouseId)}
        allInventoryItems={inventoryItems}
        onAddItem={() => setScreen('newWarehouseItem')}
        onUpdateItem={updateWarehouseItem}
        onRefresh={() => selectedWarehouseId && loadWarehouseItems(selectedWarehouseId)}
        onBack={() => setScreen('warehouseInventory')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'newWarehouseItem') {
    const warehouse = warehouses.find(w => w.id === selectedWarehouseId);
    return (
      <NewWarehouseItemScreen
        warehouse={warehouse}
        availableItems={inventoryItems}
        onSave={async (itemId, itemName, quantity, unit) => {
          if (!selectedWarehouseId) {
            Alert.alert('שגיאה', 'מחסן לא נבחר');
            return;
          }
          try {
            console.log('onSave called with:', { itemId, itemName, quantity, unit, selectedWarehouseId });
            await createWarehouseItem(selectedWarehouseId, itemId || '', itemName, quantity, unit);
            console.log('Item saved, navigating to detail screen');
            setScreen('warehouseInventoryDetail');
          } catch (err: any) {
            console.error('Failed to save warehouse item in onSave:', err);
            // Error already handled in createWarehouseItem, but don't navigate on error
            throw err; // Re-throw so handleSave can catch it
          }
        }}
        onCancel={() => setScreen('warehouseInventoryDetail')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'newWarehouseOrder') {
    return (
      <NewWarehouseOrderScreen
        items={inventoryItems}
        onSave={async (orders) => {
          // Create all items as part of one order
          // The backend stores each item as a separate row, but they represent one logical order
          for (let i = 0; i < orders.length; i++) {
            await createInventoryOrder(orders[i]);
            // Small delay between orders to ensure unique UUIDs
            if (i < orders.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
        }}
        onCancel={() => setScreen('warehouseOrders')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
        userName={userName || ''}
      />
    );
  }

  if (screen === 'maintenance') {
    return (
      <MaintenanceScreen
        units={maintenanceUnits}
        onSelectUnit={(unitId) => {
          setSelectedMaintenanceUnitId(unitId);
          setScreen('maintenanceTasks');
        }}
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'maintenanceTasks') {
    const unit = maintenanceUnits.find(u => u.id === selectedMaintenanceUnitId);
    if (!unit) {
      setScreen('maintenance');
      return null;
    }
    return (
      <MaintenanceTasksScreen
        unit={unit}
        resolveAssignee={resolveAssigneeLabel}
        onSelectTask={(taskId) => {
          setSelectedMaintenanceTaskId(taskId);
          setScreen('maintenanceTaskDetail');
        }}
        onNewTask={() => setScreen('newMaintenanceTask')}
        onBack={() => setScreen('maintenance')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'chat') {
    return (
      <ChatScreen
        messages={chatMessages}
        userName={userName || ''}
        onSendMessage={sendChatMessage}
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'reports') {
    return (
      <ReportsScreen
        orders={orders}
        missions={inspectionMissionsEffective}
        warehouses={warehouses}
        allWarehouseItems={allWarehouseItems}
        inventoryOrders={inventoryOrders}
        maintenanceUnits={maintenanceUnits}
        maintenanceTasksReport={maintenanceTasksReport}
        resolveAssignee={resolveAssigneeLabel}
        attendanceStatus={attendanceStatus}
        attendanceLogsReport={attendanceLogsReport}
        reportsSummary={reportsSummary}
        reportsSummaryError={reportsSummaryError}
        onRefresh={() => {
          loadOrders();
          loadInventoryOrders();
          loadReportsSummary();
          loadAllWarehouseItemsForReports();
          loadMaintenanceTasksReport();
          loadAttendanceLogsReport();
          if (userName) loadAttendanceStatus();
        }}
        onOpenOrders={() => setScreen('orders')}
        onOpenExitInspections={() => setScreen('exitInspections')}
        onOpenWarehouse={() => setScreen('warehouse')}
        onOpenMaintenance={() => setScreen('maintenance')}
        onOpenAttendance={() => setScreen('attendance')}
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'attendance') {
    return (
      <AttendanceScreen
        userName={userName || ''}
        attendanceStatus={attendanceStatus}
        attendanceLogs={attendanceLogsReport}
        onStart={startAttendance}
        onStop={stopAttendance}
        onRefresh={() => {
          loadAttendanceStatus();
          loadAttendanceLogsReport();
        }}
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'maintenanceTaskDetail') {
    const unit = maintenanceUnits.find(u => u.id === selectedMaintenanceUnitId);
    const task = unit?.tasks.find(t => t.id === selectedMaintenanceTaskId);
    if (!task || !unit) {
      setScreen('maintenanceTasks');
      return null;
    }
    return (
      <MaintenanceTaskDetailScreen
        unit={unit}
        task={task}
        resolveAssignee={resolveAssigneeLabel}
        onUpdateTask={async (taskId, updates) => {
          try {
            const payload: any = {};
            if (updates.status) payload.status = updates.status;
            if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo;
            if (updates.imageUri !== undefined) {
              // If imageUri is null or undefined, send null to remove it
              // Otherwise send the new URI
              payload.image_uri = updates.imageUri === null || updates.imageUri === undefined ? null : updates.imageUri;
            }
            if (updates.title) payload.title = updates.title;
            if (updates.description) payload.description = updates.description;

            const res = await fetch(`${API_BASE_URL}/api/maintenance/tasks/${encodeURIComponent(taskId)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const errText = await res.text().catch(() => '');
              let errorDetail = errText || `HTTP ${res.status}`;
              try {
                const errorData = JSON.parse(errText);
                errorDetail = errorData.detail || errorData.message || errText;
              } catch {
                // Keep original errorDetail
              }
              throw new Error(errorDetail);
            }
            await loadMaintenanceUnits();
          } catch (err: any) {
            console.error('Error updating task:', err);
            const errorMessage = err.message || 'לא ניתן לעדכן משימת תחזוקה';
            if (errorMessage.includes('Network') || errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed')) {
              Alert.alert('שגיאת רשת', 'לא ניתן להתחבר לשרת. בדוק את החיבור לאינטרנט ונסה שוב.');
            } else {
              Alert.alert('שגיאה', errorMessage);
            }
          }
        }}
        onBack={() => setScreen('maintenanceTasks')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'newMaintenanceTask') {
    const unit = maintenanceUnits.find(u => u.id === selectedMaintenanceUnitId);
    if (!unit) {
      setScreen('maintenanceTasks');
      return null;
    }
    return (
      <NewMaintenanceTaskScreen
        unit={unit}
        systemUsers={systemUsers}
        onRefreshUsers={() => loadSystemUsers(true)}
        onSave={async (task) => {
          try {
            // Always send as JSON with imageUri field (works for both images and videos)
            // For videos, the URI will be a file URI, for images it will be a data URI
            const jsonPayload: any = {
              id: task.id,
              unit_id: unit.id,
              title: task.title,
              description: task.description,
              status: task.status,
              created_date: task.createdDate,
            };
            if (task.assignedTo) jsonPayload.assigned_to = task.assignedTo;
            if (task.media?.uri) {
              jsonPayload.imageUri = task.media.uri;
            }
            
            const jsonRes = await fetch(`${API_BASE_URL}/api/maintenance/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(jsonPayload),
            });
            if (!jsonRes.ok) {
              const errText = await jsonRes.text().catch(() => '');
              let errorDetail = errText || `HTTP ${jsonRes.status}`;
              try {
                const errorData = JSON.parse(errText);
                errorDetail = errorData.detail || errorData.message || errText;
              } catch {
                // Keep original errorDetail
              }
              throw new Error(errorDetail);
            }
            await loadMaintenanceUnits();
            setScreen('maintenanceTasks');
          } catch (err: any) {
            console.error('Error creating task:', err);
            const errorMessage = err.message || 'לא ניתן ליצור משימת תחזוקה';
            if (errorMessage.includes('Network') || errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed')) {
              Alert.alert('שגיאת רשת', 'לא ניתן להתחבר לשרת. בדוק את החיבור לאינטרנט ונסה שוב.');
            } else {
              Alert.alert('שגיאה', errorMessage);
            }
          }
        }}
        onCancel={() => setScreen('maintenanceTasks')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
        userName={userName || ''}
      />
    );
  }

  if (screen === 'invoices') {
    return (
      <InvoicesScreen
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'cleaningSchedule') {
    return (
      <CleaningScheduleScreen
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  // Group orders by unit (hotel)
  const ordersByUnit = useMemo(() => {
    const unitMap = new Map<string, { unitName: string; orders: Order[] }>();
    
    // Initialize all units
    UNIT_NAMES.forEach(unitName => {
      unitMap.set(unitName, { unitName, orders: [] });
    });
    
    // Add orders to their respective units
    orders.forEach(order => {
      const unitName = order.unitNumber || 'לא צוין';
      const unit = unitMap.get(unitName) || { unitName, orders: [] };
      unit.orders.push(order);
      unitMap.set(unitName, unit);
    });
    
    // Convert to array and filter out units with no orders
    return Array.from(unitMap.values())
      .filter(unit => unit.orders.length > 0)
      .sort((a, b) => a.unitName.localeCompare(b.unitName));
  }, [orders]);

  const getUnitStats = (unitOrders: Order[]) => {
    const total = unitOrders.length;
    const paid = unitOrders.filter(o => 
      o.status === 'שולם' || (o.totalAmount > 0 && o.paidAmount >= o.totalAmount)
    ).length;
    const unpaid = total - paid;
    return { total, paid, unpaid };
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable
          onPress={() => setScreen('hub')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.ordersPageHeader}>
          <Text style={styles.ordersPageTitle}>הזמנות</Text>
          <Text style={styles.ordersPageSubtitle}>
            שלום {userName}, ניהול הזמנות, תשלומים וסטטוסים
          </Text>
          <Pressable
            onPress={createOrder}
            style={[styles.addOrderButton, { marginTop: 16, alignSelf: 'flex-start' }]}
          >
            <Text style={styles.addOrderButtonText}>+ יצירת הזמנה חדשה</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeader}>
            <Text style={styles.summaryTitleEnhanced}>סיכום מהיר</Text>
          </View>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{totals.count}</Text>
              <Text style={styles.summaryStatLabel}>הזמנות</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>₪{totals.totalPaid.toLocaleString('he-IL')}</Text>
              <Text style={styles.summaryStatLabel}>שולם עד כה</Text>
            </View>
          </View>
          <View style={styles.summaryNoteContainer}>
            <Text style={styles.summaryNoteEnhanced}>
              יצוא לאקסל ודו״ח הוצאות יתווספו בהמשך
            </Text>
          </View>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyOrdersState}>
            <Text style={styles.emptyOrdersText}>אין הזמנות כרגע</Text>
          </View>
        ) : (
          <View style={styles.ordersUnitsGrid}>
            {ordersByUnit.map(unit => {
              const stats = getUnitStats(unit.orders);
              return (
                <Pressable
                  key={unit.unitName}
                  style={styles.ordersUnitCard}
                  onPress={() => {
                    // Could navigate to unit-specific order view later
                  }}
                >
                  <View style={styles.ordersUnitCardHeader}>
                    <View style={styles.ordersUnitIcon}>
                      <Text style={styles.ordersUnitIconText}>🏠</Text>
                    </View>
                    <View style={styles.ordersUnitCardContent}>
                      <Text style={styles.ordersUnitCardName}>{unit.unitName}</Text>
                      <Text style={styles.ordersUnitCardType}>יחידת נופש</Text>
                    </View>
                  </View>
                  <View style={styles.ordersUnitStats}>
                    <View style={styles.ordersUnitStatItem}>
                      <Text style={styles.ordersUnitStatValue}>{stats.total}</Text>
                      <Text style={styles.ordersUnitStatLabel}>סה״כ הזמנות</Text>
                    </View>
                    <View style={styles.ordersUnitStatItem}>
                      <Text style={[styles.ordersUnitStatValue, { color: '#22c55e' }]}>
                        {stats.paid}
                      </Text>
                      <Text style={styles.ordersUnitStatLabel}>שולם</Text>
                    </View>
                    <View style={styles.ordersUnitStatItem}>
                      <Text style={[styles.ordersUnitStatValue, { color: '#f59e0b' }]}>
                        {stats.unpaid}
                      </Text>
                      <Text style={styles.ordersUnitStatLabel}>לא שולם</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type OrderCardProps = {
  order: Order;
  onUpdate: (
    id: string,
    changes: Partial<Pick<Order, 'status' | 'paidAmount' | 'paymentMethod'>>,
  ) => void;
  onEdit: (id: string) => void;
};

function OrderCard({ order, onEdit }: OrderCardProps) {
  const paidPercent = Math.min(
    100,
    order.totalAmount > 0
      ? Math.round((order.paidAmount / order.totalAmount) * 100)
      : 0,
  );

  const remainingAmount = order.totalAmount - order.paidAmount;

  return (
    <View style={[styles.card, styles.orderCardEnhanced]}>
      {/* Header with Unit */}
      <View style={styles.orderCardHeaderEnhanced}>
        <View style={styles.orderCardHeaderLeft}>
          <View style={styles.orderCardTitleContainer}>
            <Text style={styles.orderCardUnitTitle}>{order.unitNumber}</Text>
            <Text style={styles.orderCardId}>#{order.id}</Text>
          </View>
        </View>
      </View>

      {/* Guest Info Section */}
      <View style={styles.orderInfoSection}>
        <View style={styles.orderInfoRow}>
          <View style={styles.orderInfoContent}>
            <Text style={styles.orderInfoLabel}>אורח</Text>
            <Text style={styles.orderInfoValue}>{order.guestName}</Text>
          </View>
          <View style={styles.orderInfoContent}>
            <Text style={styles.orderInfoLabel}>מספר אורחים</Text>
            <Text style={styles.orderInfoValue}>{order.guestsCount} אנשים</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.orderInfoRow}>
          <View style={styles.orderInfoContent}>
            <Text style={styles.orderInfoLabel}>תאריך הגעה</Text>
            <Text style={styles.orderInfoValue}>{order.arrivalDate}</Text>
          </View>
          <View style={styles.orderInfoContent}>
            <Text style={styles.orderInfoLabel}>תאריך יציאה</Text>
            <Text style={styles.orderInfoValue}>{order.departureDate}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.orderPaymentSection}>
          <View style={styles.orderPaymentRow}>
            <View style={styles.orderPaymentItem}>
              <Text style={styles.orderPaymentLabel}>סכום כולל</Text>
              <Text style={styles.orderPaymentTotal}>₪{order.totalAmount.toLocaleString('he-IL')}</Text>
            </View>
            <View style={styles.orderPaymentItem}>
              <Text style={styles.orderPaymentLabel}>שולם</Text>
              <Text style={styles.orderPaymentPaid}>₪{order.paidAmount.toLocaleString('he-IL')}</Text>
            </View>
            {remainingAmount > 0 && (
              <View style={styles.orderPaymentItem}>
                <Text style={styles.orderPaymentLabel}>נותר</Text>
                <Text style={styles.orderPaymentRemaining}>₪{remainingAmount.toLocaleString('he-IL')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.orderInfoRow}>
          <View style={styles.orderInfoContent}>
            <Text style={styles.orderInfoLabel}>אופן תשלום</Text>
            <Text style={styles.orderInfoValue}>{order.paymentMethod || 'לא צוין'}</Text>
          </View>
        </View>

        {/* Special Requests */}
        {order.specialRequests ? (
          <View style={styles.orderSpecialSection}>
            <View style={styles.orderSpecialContent}>
              <Text style={styles.orderSpecialLabel}>בקשות מיוחדות</Text>
              <Text style={styles.orderSpecialText}>{order.specialRequests}</Text>
            </View>
          </View>
        ) : null}

        {/* Internal Notes */}
        {order.internalNotes ? (
          <View style={styles.orderNotesSection}>
            <View style={styles.orderNotesContent}>
              <Text style={styles.orderNotesLabel}>הערות פנימיות</Text>
              <Text style={styles.orderNotesText}>{order.internalNotes}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressWrapEnhanced}>
        <View style={styles.progressHeaderEnhanced}>
          <Text style={styles.progressLabelEnhanced}>התקדמות תשלום</Text>
          <Text style={styles.progressValueEnhanced}>{paidPercent}%</Text>
        </View>
        <View style={styles.progressBarEnhanced}>
          <View
            style={[
              styles.progressFillEnhanced,
              { width: `${paidPercent}%`, backgroundColor: paidPercent === 100 ? '#10b981' : paidPercent >= 50 ? '#3b82f6' : '#f59e0b' },
            ]}
          />
        </View>
        <View style={styles.progressFooter}>
          <Text style={styles.progressFooterText}>
            ₪{order.paidAmount.toLocaleString('he-IL')} מתוך ₪{order.totalAmount.toLocaleString('he-IL')}
          </Text>
        </View>
      </View>

      {/* Edit Button */}
      <View style={styles.editActionsEnhanced}>
        <Pressable
          style={styles.editButtonEnhanced}
          onPress={() => onEdit(order.id)}
        >
          <Text style={styles.editButtonText}>עריכת הזמנה</Text>
        </Pressable>
      </View>
    </View>
  );
}

type OrderEditProps = {
  order: Order;
  isNewOrder?: boolean; // Flag to indicate if this is a new order creation
  onSave: (
    id: string,
    changes: Partial<
      Pick<
        Order,
        | 'status'
        | 'paidAmount'
        | 'paymentMethod'
        | 'guestName'
        | 'unitNumber'
        | 'arrivalDate'
        | 'departureDate'
        | 'guestsCount'
        | 'specialRequests'
        | 'internalNotes'
        | 'totalAmount'
      >
    >,
  ) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
};

function OrderEditScreen({ order, isNewOrder = false, onSave, onCancel, onDelete }: OrderEditProps) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paid, setPaid] = useState(order.paidAmount.toString());
  const [method, setMethod] = useState(order.paymentMethod);
  const [total, setTotal] = useState(order.totalAmount.toString());
  const [guestName, setGuestName] = useState(order.guestName);
  const [unitNumber, setUnitNumber] = useState(order.unitNumber);
  const [arrivalDate, setArrivalDate] = useState(order.arrivalDate);
  const [departureDate, setDepartureDate] = useState(order.departureDate);
  const [guestsCount, setGuestsCount] = useState(order.guestsCount.toString());
  const [specialRequests, setSpecialRequests] = useState(
    order.specialRequests || '',
  );
  const [internalNotes, setInternalNotes] = useState(order.internalNotes || '');
  const [addPayment, setAddPayment] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);

  React.useEffect(() => {
    setStatus(order.status);
    setPaid(order.paidAmount.toString());
    setMethod(order.paymentMethod);
    setTotal(order.totalAmount.toString());
    setGuestName(order.guestName);
    setUnitNumber(order.unitNumber);
    setArrivalDate(order.arrivalDate);
    setDepartureDate(order.departureDate);
    setGuestsCount(order.guestsCount.toString());
    setSpecialRequests(order.specialRequests || '');
    setInternalNotes(order.internalNotes || '');
    setAddPayment('');
    setStatusOpen(false);
    setMethodOpen(false);
    setUnitOpen(false);
  }, [order]);

  const paidNumber = Number(paid.replace(/,/g, '')) || 0;
  const totalNumber = Number(total.replace(/,/g, '')) || 0;
  const paidPercent = Math.min(
    100,
    totalNumber > 0 ? Math.round((paidNumber / totalNumber) * 100) : 0,
  );

  const addPaymentAmount = () => {
    const trimmed = addPayment.trim();
    if (!trimmed) {
      return true;
    }
    const addVal = Number(trimmed.replace(/,/g, ''));
    if (Number.isNaN(addVal) || addVal <= 0) {
      Alert.alert('שגיאה', 'נא להזין סכום הוספה תקין וחיובי');
      return false;
    }
    const next = paidNumber + addVal;
    setPaid(next.toString());
    setAddPayment('');
    return true;
  };

  const confirmPaymentModal = () => {
    if (Number.isNaN(totalNumber) || totalNumber <= 0) {
      Alert.alert('שגיאה', 'סכום מלא חייב להיות חיובי');
      return;
    }
    if (paidNumber < 0) {
      Alert.alert('שגיאה', 'סכום ששולם חייב להיות חיובי');
      return;
    }
    if (!addPaymentAmount()) return;
    setShowAddPayment(false);
  };

  const saveEdit = () => {
    if (!guestName.trim() || !unitNumber.trim()) {
      Alert.alert('שגיאה', 'יש למלא שם אורח ולבחור יחידת נופש');
      return;
    }
    if (!UNIT_NAMES.includes(unitNumber.trim())) {
      Alert.alert('שגיאה', 'יש לבחור יחידת נופש מתוך הרשימה');
      return;
    }
    if (Number.isNaN(totalNumber) || totalNumber <= 0) {
      Alert.alert('שגיאה', 'סכום מלא חייב להיות חיובי');
      return;
    }
    // For new orders, set paidAmount to 0 (only total amount is set)
    // For existing orders, use the paid amount from the field
    const finalPaidAmount = isNewOrder ? 0 : paidNumber;
    if (finalPaidAmount < 0) {
      Alert.alert('שגיאה', 'סכום ששולם חייב להיות חיובי');
      return;
    }
    onSave(order.id, {
      status,
      paidAmount: finalPaidAmount,
      paymentMethod: method || 'לא צוין',
      totalAmount: totalNumber,
      guestName: guestName.trim(),
      unitNumber: unitNumber.trim(),
      arrivalDate: arrivalDate.trim(),
      departureDate: departureDate.trim(),
      guestsCount: Number(guestsCount) || order.guestsCount,
      specialRequests: specialRequests.trim(),
      internalNotes: internalNotes.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>עריכת הזמנה</Text>
        <Text style={styles.subtitle}>
          שינוי מלא של פרטי הזמנה והוספת תשלום נוסף
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>שם אורח</Text>
          <TextInput
            style={styles.input}
            value={guestName}
            onChangeText={setGuestName}
            placeholder="שם אורח"
            textAlign="right"
          />

          <Text style={styles.label}>יחידת נופש</Text>
          <Pressable onPress={() => setUnitOpen(o => !o)} style={styles.select}>
            <Text style={styles.selectValue}>{unitNumber || 'בחרו יחידה'}</Text>
            <Text style={styles.selectCaret}>▾</Text>
          </Pressable>
          {unitOpen ? (
            <View style={styles.selectList}>
              {UNIT_CATEGORIES.map(category => (
                <View key={category.name}>
                  <View style={styles.selectCategory}>
                    <Text style={styles.selectCategoryText}>{category.name}</Text>
                  </View>
                  {category.units.map(option => (
                <Pressable
                  key={option}
                  style={[
                    styles.selectItem,
                    option === unitNumber && styles.selectItemActive,
                  ]}
                  onPress={() => {
                    setUnitNumber(option);
                    setUnitOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.selectItemText,
                      option === unitNumber && styles.selectItemTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>תאריך הגעה</Text>
              <TextInput
                style={styles.input}
                value={arrivalDate}
                onChangeText={setArrivalDate}
                placeholder="2025-12-20"
                textAlign="right"
              />
            </View>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>תאריך עזיבה</Text>
              <TextInput
                style={styles.input}
                value={departureDate}
                onChangeText={setDepartureDate}
                placeholder="2025-12-23"
                textAlign="right"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>מספר אורחים</Text>
              <TextInput
                style={styles.input}
                value={guestsCount}
                onChangeText={setGuestsCount}
                keyboardType="numeric"
                placeholder="0"
                textAlign="right"
              />
            </View>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>סטטוס הזמנה</Text>
              <Pressable
                onPress={() => setStatusOpen(o => !o)}
                style={styles.select}
              >
                <Text style={styles.selectValue}>{status}</Text>
                <Text style={styles.selectCaret}>▾</Text>
              </Pressable>
              {statusOpen ? (
                <View style={styles.selectList}>
                  {statusOptions.map(option => (
                    <Pressable
                      key={option}
                      style={[
                        styles.selectItem,
                        option === status && styles.selectItemActive,
                      ]}
                      onPress={() => {
                        setStatus(option);
                        setStatusOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.selectItemText,
                          option === status && styles.selectItemTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {/* For new orders: only show total amount */}
          {isNewOrder ? (
            <View style={styles.fieldRow}>
              <View style={[styles.field, styles.fieldHalf]}>
                <Text style={styles.label}>סכום מלא (₪)</Text>
                <TextInput
                  style={styles.input}
                  value={total}
                  onChangeText={setTotal}
                  keyboardType="numeric"
                  placeholder="0"
                  textAlign="right"
                />
              </View>
              <View style={[styles.field, styles.fieldHalf]}>
                <Text style={styles.label}>אופן תשלום</Text>
                <Pressable
                  onPress={() => setMethodOpen(o => !o)}
                  style={styles.select}
                >
                  <Text style={styles.selectValue}>{method || 'בחרו אופן תשלום'}</Text>
                  <Text style={styles.selectCaret}>▾</Text>
                </Pressable>
                {methodOpen ? (
                  <View style={styles.selectList}>
                    {paymentOptions.map(option => (
                      <Pressable
                        key={option}
                        style={[
                          styles.selectItem,
                          option === method && styles.selectItemActive,
                        ]}
                        onPress={() => {
                          setMethod(option);
                          setMethodOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.selectItemText,
                            option === method && styles.selectItemTextActive,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <>
              {/* For existing orders: show both total and paid amounts */}
              <View style={styles.fieldRow}>
                <View style={[styles.field, styles.fieldHalf]}>
                  <Text style={styles.label}>סכום מלא (₪)</Text>
                  <TextInput
                    style={styles.input}
                    value={total}
                    onChangeText={setTotal}
                    keyboardType="numeric"
                    placeholder="0"
                    textAlign="right"
                  />
                </View>
                <View style={[styles.field, styles.fieldHalf]}>
                  <Text style={styles.label}>סכום ששולם (₪)</Text>
                  <TextInput
                    style={styles.input}
                    value={paid}
                    onChangeText={setPaid}
                    keyboardType="numeric"
                    placeholder="0"
                    textAlign="right"
                  />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.field, styles.fieldHalf]}>
                  <Text style={styles.label}>אופן תשלום</Text>
                  <Pressable
                    onPress={() => setMethodOpen(o => !o)}
                    style={styles.select}
                  >
                    <Text style={styles.selectValue}>{method || 'בחרו אופן תשלום'}</Text>
                    <Text style={styles.selectCaret}>▾</Text>
                  </Pressable>
                  {methodOpen ? (
                    <View style={styles.selectList}>
                      {paymentOptions.map(option => (
                        <Pressable
                          key={option}
                          style={[
                            styles.selectItem,
                            option === method && styles.selectItemActive,
                          ]}
                          onPress={() => {
                            setMethod(option);
                            setMethodOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.selectItemText,
                              option === method && styles.selectItemTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Show payment addition button for existing orders */}
              <View style={styles.fieldRow}>
                <View style={[styles.field, styles.fieldHalf, { justifyContent: 'flex-end' }]}>
                  <Pressable
                    onPress={() => setShowAddPayment(true)}
                    style={({ pressed }) => [
                      styles.addPaymentTrigger,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={styles.addPaymentText}>הוסף / עדכון תשלום</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}

          <Text style={styles.label}>בקשות מיוחדות</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={specialRequests}
            onChangeText={setSpecialRequests}
            multiline
            placeholder="לדוגמה: בקשה ללול תינוק"
            textAlign="right"
          />

          <Text style={styles.label}>הערות פנימיות</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={internalNotes}
            onChangeText={setInternalNotes}
            multiline
            placeholder="הערות לצוות"
            textAlign="right"
          />

          <View style={styles.editActions}>
            <PrimaryButton label="שמירה" onPress={saveEdit} />
            <OutlineButton label="ביטול" onPress={onCancel} />
            {!isNewOrder && onDelete && (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'מחיקת הזמנה',
                    'האם אתה בטוח שברצונך למחוק את ההזמנה? פעולה זו לא ניתנת לביטול.',
                    [
                      { text: 'ביטול', style: 'cancel' },
                      {
                        text: 'מחק',
                        style: 'destructive',
                        onPress: () => onDelete(order.id),
                      },
                    ],
                  );
                }}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.deleteButtonText}>מחק הזמנה</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={showAddPayment} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>הוסף תשלום</Text>
            <Text style={styles.label}>סכום מלא (₪)</Text>
            <TextInput
              style={styles.input}
              value={total}
              onChangeText={setTotal}
              keyboardType="numeric"
              placeholder="0"
              textAlign="right"
            />
            <Text style={styles.label}>סכום ששולם (₪)</Text>
            <TextInput
              style={styles.input}
              value={paid}
              onChangeText={setPaid}
              keyboardType="numeric"
              placeholder="0"
              textAlign="right"
            />
            <Text style={styles.label}>אופן תשלום</Text>
            <Pressable
              onPress={() => setMethodOpen(o => !o)}
              style={styles.select}
            >
              <Text style={styles.selectValue}>{method || 'בחרו אופן תשלום'}</Text>
              <Text style={styles.selectCaret}>▾</Text>
            </Pressable>
            {methodOpen ? (
              <View style={styles.selectList}>
                {paymentOptions.map(option => (
                  <Pressable
                    key={option}
                    style={[
                      styles.selectItem,
                      option === method && styles.selectItemActive,
                    ]}
                    onPress={() => {
                      setMethod(option);
                      setMethodOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.selectItemText,
                        option === method && styles.selectItemTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Only show "add additional payment" if order already has a total amount */}
            {totalNumber > 0 && (
              <>
                <Text style={styles.label}>הוסף תשלום נוסף (₪)</Text>
                <View style={styles.addPaymentRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={addPayment}
                    onChangeText={setAddPayment}
                    keyboardType="numeric"
                    placeholder="0"
                    textAlign="right"
                  />
                  <Pressable
                    onPress={addPaymentAmount}
                    style={({ pressed }) => [
                      styles.addPaymentTrigger,
                      { minWidth: 90, paddingVertical: 10 },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={styles.addPaymentText}>הוסף</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.progressWrap}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  סכום מלא: ₪{totalNumber.toLocaleString('he-IL')}
                </Text>
                <Text style={styles.progressValue}>שולם {paidPercent}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${paidPercent}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={confirmPaymentModal}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: '#2563eb' },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.modalButtonText}>אישור</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowAddPayment(false);
                  setAddPayment('');
                }}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonGhost,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.modalButtonGhostText}>ביטול</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  style?: object;
};

type OptionCardProps = {
  title: string;
  icon: string;
  accent: string;
  details: string[];
  cta?: string;
  onPress?: () => void;
};

type ExitInspectionsProps = {
  missions: InspectionMission[];
  defaultInspectionTasks: InspectionTask[];
  onUpdateMission: (id: string, updates: Partial<InspectionMission>) => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
  loadInspections: () => Promise<void>;
};

function ExitInspectionsScreen({
  missions,
  defaultInspectionTasks,
  onUpdateMission,
  onBack,
  safeAreaInsets,
  statusBar,
  loadInspections,
}: ExitInspectionsProps) {

  const toggleTask = async (missionId: string, taskId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    const task = mission.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedTasks = mission.tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );

    const updatedStatus = computeInspectionStatus({ departureDate: mission.departureDate, tasks: updatedTasks });

    // Update local state immediately (don't save to backend yet)
    onUpdateMission(missionId, {
      tasks: updatedTasks,
      status: updatedStatus,
    });
  };

  const handleSave = async (missionId: string) => {
    // Get the latest mission from current state
    const mission = missions.find(m => m.id === missionId);
    if (!mission) {
      console.error('Mission not found:', missionId);
      Alert.alert('שגיאה', 'לא נמצאה משימת ביקורת');
      return;
    }

    const completedCount = mission.tasks.filter(t => t.completed).length;
    console.log('Saving mission:', missionId, 'with tasks:', mission.tasks.length, 'completed:', completedCount);
    
    // Ensure all tasks have the correct format with boolean completed status
    // IMPORTANT: Match tasks to default tasks to ensure we use the correct IDs
    // This ensures IDs match between saves and loads
    const defaultTasksMap = new Map(defaultInspectionTasks.map(dt => [dt.name.trim().toLowerCase(), dt]));
    
    const tasksToSave = mission.tasks.map(t => {
      // Find matching default task by name to get the correct ID
      const taskName = String(t.name).trim().toLowerCase();
      const defaultTask = defaultTasksMap.get(taskName);
      const correctId = defaultTask ? String(defaultTask.id) : String(t.id);
      
      return {
        id: correctId, // Use default task ID to ensure consistency
        name: String(t.name),
        completed: Boolean(t.completed), // Ensure it's a boolean
      };
    });
    
    console.log('Tasks to save:', tasksToSave.map(t => ({ id: t.id, name: t.name, completed: t.completed })));
    console.log('Completed tasks count:', tasksToSave.filter(t => t.completed).length, 'out of', tasksToSave.length);
    
    // Save the entire mission with all tasks to backend
    try {
      const payload = {
        id: mission.id,
        orderId: mission.orderId,
        unitNumber: mission.unitNumber,
        guestName: mission.guestName,
        departureDate: mission.departureDate,
        status: mission.status,
        tasks: tasksToSave, // Use the properly formatted tasks
      };
      
      const response = await fetch(`${API_BASE_URL}/api/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Error saving inspection:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          Alert.alert('שגיאה', `שגיאה בשמירה: ${errorData.detail || errorText}`);
        } catch {
          Alert.alert('שגיאה', `שגיאה בשמירה: ${response.status} ${errorText}`);
        }
        return;
      }
      
      const result = await response.json().catch(() => null);
      console.log('Inspection saved successfully:', missionId);
      console.log('Response from backend:', JSON.stringify(result, null, 2));
      
      // Verify the response contains the tasks and check save status
      if (result && result.tasks) {
        const savedCompleted = result.completedTasksCount || result.tasks.filter((t: any) => t.completed).length;
        const savedCount = result.savedTasksCount || result.tasks.length;
        const totalCount = result.totalTasksCount || mission.tasks.length;
        
        console.log('Save summary:', {
          saved: savedCount,
          total: totalCount,
          completed: savedCompleted,
          expectedCompleted: completedCount,
          tasksFromBackend: result.tasks.length
        });
        
        // Always update local state with what backend returned (even if counts don't match)
        // This ensures we show what was actually saved
        const savedTasks = result.tasks.map((t: any) => ({
          id: String(t.id),
          name: String(t.name),
          completed: Boolean(t.completed),
        }));
        
        console.log('Updating local state with saved tasks:', savedTasks.map(t => ({ id: t.id, completed: t.completed })));
        
        // CRITICAL: Reload inspections from backend to ensure we have the latest data for ALL inspections
        // This fixes the issue where the second inspection doesn't persist after refresh
        console.log('Reloading ALL inspections from backend after save...');
        await loadInspections();
        
        if (savedCount === totalCount && savedCompleted === completedCount) {
          Alert.alert('הצלחה', `נשמר בהצלחה! ${completedCount}/${totalCount} משימות הושלמו`);
        } else if (savedCount < totalCount) {
          console.warn('Warning: Not all tasks were saved:', savedCount, 'of', totalCount);
          Alert.alert('אזהרה', `נשמר חלקית: ${savedCount}/${totalCount} משימות נשמרו. ${savedCompleted} הושלמו.`);
        } else {
          console.warn('Warning: Saved completion count does not match:', savedCompleted, 'vs', completedCount);
          Alert.alert('אזהרה', `נשמר, אך יש לבדוק: ${savedCompleted}/${totalCount} משימות הושלמו (צפוי: ${completedCount})`);
        }
      } else {
        console.error('Backend response missing tasks:', result);
        Alert.alert('אזהרה', 'נשמר, אך לא ניתן לאמת את השמירה - תגובת השרת לא כוללת משימות');
      }
    } catch (err: any) {
      console.error('Error saving inspection to backend:', err);
      Alert.alert('שגיאה', `שגיאה בשמירה: ${err.message || 'נסה שוב'}`);
    }
  };


  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hotel name - show from first mission */}
        {missions.length > 0 && missions[0].unitNumber && (
          <View style={styles.hotelNameContainer}>
            <Text style={styles.hotelNameText}>
              {missions[0].unitNumber}
            </Text>
          </View>
        )}
        
        <View style={styles.inspectionsHeader}>
          <View>
            <Text style={styles.title}>ביקורת יציאת אורח</Text>
            <Text style={styles.subtitle}>
              ניהול משימות ניקיון וביקורת לאחר עזיבת אורחים
            </Text>
          </View>
          <View style={styles.statsBadge}>
            <Text style={styles.statsBadgeText}>
              {missions.length} משימות
            </Text>
          </View>
        </View>

        {missions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין משימות ביקורת כרגע</Text>
          </View>
        ) : (
          <View style={styles.missionsList}>
            {missions.map(mission => (
                <InspectionMissionCard
                  key={mission.id}
                  mission={mission}
                  onToggleTask={toggleTask}
                  onSave={handleSave}
                />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type CleaningInspectionsProps = {
  missions: InspectionMission[];
  defaultInspectionTasks: InspectionTask[];
  onUpdateMission: (id: string, updates: Partial<InspectionMission>) => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
  loadInspections: () => Promise<void>;
};

function CleaningInspectionsScreen({
  missions,
  defaultInspectionTasks,
  onUpdateMission,
  onBack,
  safeAreaInsets,
  statusBar,
  loadInspections,
}: CleaningInspectionsProps) {

  const toggleTask = async (missionId: string, taskId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    const task = mission.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedTasks = mission.tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );

    const updatedStatus = computeInspectionStatus({ departureDate: mission.departureDate, tasks: updatedTasks });

    // Update local state immediately (don't save to backend yet)
    onUpdateMission(missionId, {
      tasks: updatedTasks,
      status: updatedStatus,
    });
  };

  const handleSave = async (missionId: string) => {
    // Get the latest mission from current state
    const mission = missions.find(m => m.id === missionId);
    if (!mission) {
      console.error('Mission not found:', missionId);
      Alert.alert('שגיאה', 'לא נמצאה משימת ביקורת');
      return;
    }

    const completedCount = mission.tasks.filter(t => t.completed).length;
    console.log('Saving cleaning inspection mission:', missionId, 'with tasks:', mission.tasks.length, 'completed:', completedCount);
    
    // Ensure all tasks have the correct format with boolean completed status
    const defaultTasksMap = new Map(defaultInspectionTasks.map(dt => [dt.name.trim().toLowerCase(), dt]));
    
    const tasksToSave = mission.tasks.map(t => {
      const taskName = String(t.name).trim().toLowerCase();
      const defaultTask = defaultTasksMap.get(taskName);
      const correctId = defaultTask ? String(defaultTask.id) : String(t.id);
      
      return {
        id: correctId,
        name: String(t.name),
        completed: Boolean(t.completed),
      };
    });
    
    // Save the entire mission with all tasks to backend
    try {
      const payload = {
        id: mission.id,
        orderId: mission.orderId,
        unitNumber: mission.unitNumber,
        guestName: mission.guestName,
        departureDate: mission.departureDate,
        status: mission.status,
        tasks: tasksToSave,
      };
      
      const response = await fetch(`${API_BASE_URL}/api/cleaning-inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Error saving cleaning inspection:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          Alert.alert('שגיאה', `שגיאה בשמירה: ${errorData.detail || errorText}`);
        } catch {
          Alert.alert('שגיאה', `שגיאה בשמירה: ${response.status} ${errorText}`);
        }
        return;
      }
      
      const result = await response.json().catch(() => null);
      console.log('Cleaning inspection saved successfully:', missionId);
      
      if (result && result.tasks) {
        const savedCompleted = result.completedTasksCount || result.tasks.filter((t: any) => t.completed).length;
        const savedCount = result.savedTasksCount || result.tasks.length;
        const totalCount = result.totalTasksCount || mission.tasks.length;
        
        // Reload cleaning inspections from backend
        await loadInspections();
        
        if (savedCount === totalCount && savedCompleted === completedCount) {
          Alert.alert('הצלחה', `נשמר בהצלחה! ${completedCount}/${totalCount} משימות הושלמו`);
        } else if (savedCount < totalCount) {
          Alert.alert('אזהרה', `נשמר חלקית: ${savedCount}/${totalCount} משימות נשמרו. ${savedCompleted} הושלמו.`);
        } else {
          Alert.alert('אזהרה', `נשמר, אך יש לבדוק: ${savedCompleted}/${totalCount} משימות הושלמו (צפוי: ${completedCount})`);
        }
      } else {
        Alert.alert('אזהרה', 'נשמר, אך לא ניתן לאמת את השמירה - תגובת השרת לא כוללת משימות');
      }
    } catch (err: any) {
      console.error('Error saving cleaning inspection to backend:', err);
      Alert.alert('שגיאה', `שגיאה בשמירה: ${err.message || 'נסה שוב'}`);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hotel name - show from first mission */}
        {missions.length > 0 && missions[0].unitNumber && (
          <View style={styles.hotelNameContainer}>
            <Text style={styles.hotelNameText}>
              {missions[0].unitNumber}
            </Text>
          </View>
        )}
        
        <View style={styles.inspectionsHeader}>
          <View>
            <Text style={styles.title}>ביקורת ניקיון</Text>
            <Text style={styles.subtitle}>
              ניהול משימות ניקיון מפורטות: מטבח, סלון, מסדרון, חצר
            </Text>
          </View>
          <View style={styles.statsBadge}>
            <Text style={styles.statsBadgeText}>
              {missions.length} משימות
            </Text>
          </View>
        </View>

        {missions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין משימות ביקורת ניקיון כרגע</Text>
          </View>
        ) : (
          <View style={styles.missionsList}>
            {missions.map(mission => (
                <InspectionMissionCard
                  key={mission.id}
                  mission={mission}
                  onToggleTask={toggleTask}
                  onSave={handleSave}
                  isCleaningInspection={true}
                />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type MonthlyInspectionsProps = {
  missions: InspectionMission[];
  defaultInspectionTasks: InspectionTask[];
  onUpdateMission: (id: string, updates: Partial<InspectionMission>) => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
  loadInspections: () => Promise<void>;
};

function MonthlyInspectionsScreen({
  missions,
  defaultInspectionTasks,
  onUpdateMission,
  onBack,
  safeAreaInsets,
  statusBar,
  loadInspections,
}: MonthlyInspectionsProps) {

  const toggleTask = async (missionId: string, taskId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    const task = mission.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedTasks = mission.tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );

    const updatedStatus = computeInspectionStatus({ departureDate: mission.departureDate, tasks: updatedTasks });

    // Update local state immediately (don't save to backend yet)
    onUpdateMission(missionId, {
      tasks: updatedTasks,
      status: updatedStatus,
    });
  };

  const handleSave = async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) {
      console.error('Mission not found:', missionId);
      Alert.alert('שגיאה', 'לא נמצאה משימת ביקורת');
      return;
    }

    const completedCount = mission.tasks.filter(t => t.completed).length;
    console.log('Saving monthly inspection mission:', missionId, 'with tasks:', mission.tasks.length, 'completed:', completedCount);
    
    const defaultTasksMap = new Map(defaultInspectionTasks.map(dt => [dt.name.trim().toLowerCase(), dt]));
    
    const tasksToSave = mission.tasks.map(t => {
      const taskName = String(t.name).trim().toLowerCase();
      const defaultTask = defaultTasksMap.get(taskName);
      const correctId = defaultTask ? String(defaultTask.id) : String(t.id);
      
      return {
        id: correctId,
        name: String(t.name),
        completed: Boolean(t.completed),
      };
    });
    
    try {
      const payload = {
        id: mission.id,
        unitNumber: mission.unitNumber,
        inspectionMonth: mission.departureDate, // Use departureDate as inspectionMonth
        status: mission.status,
        tasks: tasksToSave,
      };
      
      const response = await fetch(`${API_BASE_URL}/api/monthly-inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Error saving monthly inspection:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          Alert.alert('שגיאה', `שגיאה בשמירה: ${errorData.detail || errorText}`);
        } catch {
          Alert.alert('שגיאה', `שגיאה בשמירה: ${response.status} ${errorText}`);
        }
        return;
      }
      
      const result = await response.json().catch(() => null);
      console.log('Monthly inspection saved successfully:', missionId);
      
      if (result && result.tasks) {
        const savedCompleted = result.completedTasksCount || result.tasks.filter((t: any) => t.completed).length;
        const savedCount = result.savedTasksCount || result.tasks.length;
        const totalCount = result.totalTasksCount || mission.tasks.length;
        
        await loadInspections();
        
        if (savedCount === totalCount && savedCompleted === completedCount) {
          Alert.alert('הצלחה', `נשמר בהצלחה! ${completedCount}/${totalCount} משימות הושלמו`);
        } else if (savedCount < totalCount) {
          Alert.alert('אזהרה', `נשמר חלקית: ${savedCount}/${totalCount} משימות נשמרו. ${savedCompleted} הושלמו.`);
        } else {
          Alert.alert('אזהרה', `נשמר, אך יש לבדוק: ${savedCompleted}/${totalCount} משימות הושלמו (צפוי: ${completedCount})`);
        }
      } else {
        Alert.alert('אזהרה', 'נשמר, אך לא ניתן לאמת את השמירה - תגובת השרת לא כוללת משימות');
      }
    } catch (err: any) {
      console.error('Error saving monthly inspection to backend:', err);
      Alert.alert('שגיאה', `שגיאה בשמירה: ${err.message || 'נסה שוב'}`);
    }
  };

  // Format month for display (YYYY-MM-DD -> "חודש עברי YYYY")
  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '';
    try {
      // monthStr is in format "YYYY-MM-01", parse components directly
      const parts = monthStr.split('-');
      if (parts.length >= 2) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Convert to 0-11
        
        if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
          console.warn('Invalid date format:', monthStr);
          return monthStr;
        }
        
        const hebrewMonths = [
          'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
          'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
        ];
        
        return `${hebrewMonths[month]} ${year}`;
      } else {
        // Fallback: try Date parsing
        const date = new Date(monthStr + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = date.getMonth();
          const hebrewMonths = [
            'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
            'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
          ];
          return `${hebrewMonths[month]} ${year}`;
        }
        return monthStr;
      }
    } catch (err) {
      console.error('Error formatting month:', monthStr, err);
      return monthStr;
    }
  };

  // Get current month and next month
  const getCurrentAndNextMonth = () => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    const formatMonthKey = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    };
    
    return {
      currentMonthKey: formatMonthKey(currentMonth),
      nextMonthKey: formatMonthKey(nextMonth),
      currentMonthLabel: formatMonth(formatMonthKey(currentMonth)),
      nextMonthLabel: formatMonth(formatMonthKey(nextMonth)),
    };
  };

  const { currentMonthKey, nextMonthKey, currentMonthLabel, nextMonthLabel } = getCurrentAndNextMonth();

  // Group missions by month
  const currentMonthMissions = missions
    .filter(m => m.departureDate === currentMonthKey)
    .sort((a, b) => (a.unitNumber || '').localeCompare(b.unitNumber || ''));
  
  const nextMonthMissions = missions
    .filter(m => m.departureDate === nextMonthKey)
    .sort((a, b) => (a.unitNumber || '').localeCompare(b.unitNumber || ''));

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inspectionsHeader}>
          <View>
            <Text style={styles.title}>ביקורות חודשיות</Text>
            <Text style={styles.subtitle}>
              ביקורת תקינות חודשית לכל מלון - חודש נוכחי וחודש הבא
            </Text>
          </View>
          <View style={styles.statsBadge}>
            <Text style={styles.statsBadgeText}>
              {missions.length} משימות
            </Text>
          </View>
        </View>

        {missions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין משימות ביקורת חודשית כרגע</Text>
          </View>
        ) : (
          <>
            {/* Current Month Section */}
            <View style={styles.monthSection}>
              <Text style={styles.monthSectionTitle}>
                חודש נוכחי - {currentMonthLabel}
              </Text>
              {currentMonthMissions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>אין ביקורות לחודש זה</Text>
                </View>
              ) : (
                <View style={styles.missionsList}>
                  {currentMonthMissions.map(mission => (
                    <InspectionMissionCard
                      key={mission.id}
                      mission={{
                        ...mission,
                        guestName: mission.unitNumber || '', // Show only unit name
                      }}
                      onToggleTask={toggleTask}
                      onSave={handleSave}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Next Month Section */}
            <View style={styles.monthSection}>
              <Text style={styles.monthSectionTitle}>
                חודש הבא - {nextMonthLabel}
              </Text>
              {nextMonthMissions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>אין ביקורות לחודש זה</Text>
                </View>
              ) : (
                <View style={styles.missionsList}>
                  {nextMonthMissions.map(mission => (
                    <InspectionMissionCard
                      key={mission.id}
                      mission={{
                        ...mission,
                        guestName: mission.unitNumber || '', // Show only unit name
                      }}
                      onToggleTask={toggleTask}
                      onSave={handleSave}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type TaskCategory = {
  name: string;
  tasks: InspectionTask[];
};

function categorizeTasks(tasks: InspectionTask[]): TaskCategory[] {
  const categories: { [key: string]: InspectionTask[] } = {
    'טיפול ברכיה': [],
    'טיפול גקוזי': [],
    'ניקיון': [],
    'בדיקות': [],
    'כיבוי ונעילה': [],
    'אחר': [],
  };

  tasks.forEach(task => {
    const taskName = task.name.toLowerCase();
    
    // טיפול ברכיה
    if (taskName.includes('רכיה') || taskName.includes('בריכה') || 
        taskName.includes('כלור') || taskName.includes('רובוט') || 
        taskName.includes('רשת') || taskName.includes('מנוע') || 
        taskName.includes('פילטר') || taskName.includes('בקווש') ||
        taskName.includes('מדרגות') || taskName.includes('רביצה')) {
      categories['טיפול ברכיה'].push(task);
    }
    // טיפול גקוזי
    else if (taskName.includes('גקוזי') || taskName.includes('ג\'קוזי')) {
      categories['טיפול גקוזי'].push(task);
    }
    // ניקיון
    else if (taskName.includes('ניקיון') || taskName.includes('פינוי') || 
             taskName.includes('זבל') || taskName.includes('אשפה')) {
      categories['ניקיון'].push(task);
    }
    // בדיקות
    else if (taskName.includes('בדיק') || taskName.includes('תקינות') || 
             taskName.includes('מכשיר') || taskName.includes('ריהוט') ||
             taskName.includes('מצעים') || taskName.includes('מגבות') ||
             taskName.includes('מלאי')) {
      categories['בדיקות'].push(task);
    }
    // כיבוי ונעילה
    else if (taskName.includes('כיבוי') || taskName.includes('אורות') || 
             taskName.includes('נעיל') || taskName.includes('דלת')) {
      categories['כיבוי ונעילה'].push(task);
    }
    // אחר
    else {
      categories['אחר'].push(task);
    }
  });

  // Return only categories that have tasks, in a specific order
  const orderedCategories: TaskCategory[] = [];
  const categoryOrder = ['טיפול ברכיה', 'טיפול גקוזי', 'ניקיון', 'בדיקות', 'כיבוי ונעילה', 'אחר'];
  
  categoryOrder.forEach(categoryName => {
    if (categories[categoryName].length > 0) {
      orderedCategories.push({
        name: categoryName,
        tasks: categories[categoryName],
      });
    }
  });

  return orderedCategories;
}

// Categorize cleaning inspection tasks by category (מטבח, סלון, מסדרון, חצר)
function categorizeCleaningTasks(tasks: InspectionTask[]): TaskCategory[] {
  const categories: { [key: string]: InspectionTask[] } = {
    'מטבח': [],
    'סלון': [],
    'מסדרון': [],
    'חצר': [],
  };

  tasks.forEach(task => {
    const taskId = parseInt(task.id) || 0;
    
    // מטבח (Kitchen) - tasks 1-17
    if (taskId >= 1 && taskId <= 17) {
      categories['מטבח'].push(task);
    }
    // סלון (Living Room) - tasks 18-22
    else if (taskId >= 18 && taskId <= 22) {
      categories['סלון'].push(task);
    }
    // מסדרון (Hallway) - task 23
    else if (taskId === 23) {
      categories['מסדרון'].push(task);
    }
    // חצר (Yard) - tasks 24-31
    else if (taskId >= 24 && taskId <= 31) {
      categories['חצר'].push(task);
    }
    // Fallback: try to categorize by name
    else {
      const taskName = task.name.toLowerCase();
      if (taskName.includes('מטבח') || taskName.includes('קפה') || taskName.includes('כלים') || 
          taskName.includes('מקרר') || taskName.includes('תנור') || taskName.includes('כיריים') ||
          taskName.includes('מיקרו') || taskName.includes('כיור') || taskName.includes('סבון') ||
          taskName.includes('סכו') || taskName.includes('פילטר') || taskName.includes('פח')) {
        categories['מטבח'].push(task);
      } else if (taskName.includes('סלון') || taskName.includes('שולחן אוכל') || 
                 taskName.includes('ספה') || taskName.includes('כורסאות') || 
                 taskName.includes('חלונות') || taskName.includes('תריסים')) {
        categories['סלון'].push(task);
      } else if (taskName.includes('מסדרון') || taskName.includes('שטיחים')) {
        categories['מסדרון'].push(task);
      } else if (taskName.includes('חצר') || taskName.includes('מנגל') || 
                 taskName.includes('דשא') || taskName.includes('פחים') || 
                 taskName.includes('ברזים') || taskName.includes('עציצים') ||
                 taskName.includes('רצפה בחוץ')) {
        categories['חצר'].push(task);
      } else {
        // Default to מטבח if can't determine
        categories['מטבח'].push(task);
      }
    }
  });

  // Return only categories that have tasks, in a specific order
  const orderedCategories: TaskCategory[] = [];
  const categoryOrder = ['מטבח', 'סלון', 'מסדרון', 'חצר'];
  
  categoryOrder.forEach(categoryName => {
    if (categories[categoryName].length > 0) {
      orderedCategories.push({
        name: categoryName,
        tasks: categories[categoryName],
      });
    }
  });

  return orderedCategories;
}

type InspectionMissionCardProps = {
  mission: InspectionMission;
  onToggleTask: (missionId: string, taskId: string) => void;
  onSave: (missionId: string) => void;
  isCleaningInspection?: boolean;
};

function InspectionMissionCard({
  mission,
  onToggleTask,
  onSave,
  isCleaningInspection = false,
}: InspectionMissionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const completedTasks = mission.tasks.filter(t => t.completed).length;
  const totalTasks = mission.tasks.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getDisplayStatus = () => {
    return computeInspectionStatus(mission);
  };

  const getStatusColor = (statusText: string) => {
    if (statusText === 'הביקורת הושלמה') {
      return '#22c55e';
    }
    if (statusText === 'דורש ביקורת היום') {
      return '#f59e0b';
    }
    if (statusText === 'זמן הביקורת עבר') {
      return '#ef4444';
    }
    if (statusText === 'זמן הביקורות טרם הגיע') {
      return '#64748b';
    }
    // fallback
    if (statusText) {
      return '#f59e0b';
    }
    return '#64748b';
  };

  const displayStatus = getDisplayStatus();
  const statusColor = getStatusColor(displayStatus);

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={({ pressed }) => [
        styles.card,
        styles.inspectionCard,
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.inspectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{mission.unitNumber}</Text>
          <Text style={styles.cardLine}>אורח: {mission.guestName}</Text>
          <Text style={styles.cardLine}>תאריך ביקורת: {mission.departureDate}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>סטטוס:</Text>
            <View
              style={[
                styles.statusDisplayBadge,
                { backgroundColor: statusColor + '22', borderColor: statusColor + '55' },
              ]}
            >
              <Text style={[styles.statusDisplayText, { color: statusColor }]}>
                {displayStatus}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {expanded && (
        <>
          <View style={styles.inspectionDivider} />

          <View style={styles.progressWrap}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                משימות: {completedTasks} / {totalTasks}
              </Text>
              <Text style={styles.progressValue}>
                {Math.round(progressPercent)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.tasksList}>
            {(isCleaningInspection ? categorizeCleaningTasks(mission.tasks) : categorizeTasks(mission.tasks)).map(category => (
              <View key={category.name} style={styles.taskCategory}>
                <Text style={styles.taskCategoryTitle}>{category.name}</Text>
                {category.tasks.map(task => (
              <Pressable
                key={task.id}
                onPress={(e) => {
                  e.stopPropagation();
                  onToggleTask(mission.id, task.id);
                }}
                style={styles.taskItem}
              >
                <View
                  style={[
                    styles.taskCheckbox,
                    task.completed && styles.taskCheckboxCompleted,
                  ]}
                >
                  {task.completed && <Text style={styles.taskCheckmark}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.taskText,
                    task.completed && styles.taskTextCompleted,
                  ]}
                >
                  {task.name}
                </Text>
              </Pressable>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.saveSection}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onSave(mission.id);
              }}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.saveButtonText}>שמור</Text>
            </Pressable>
          </View>
        </>
      )}
    </Pressable>
  );
}

function PrimaryButton({ label, onPress, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && { opacity: 0.9, transform: [{ translateY: 1 }] },
        style,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function OutlineButton({ label, onPress, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineButton,
        pressed && { opacity: 0.9, transform: [{ translateY: 1 }] },
        style,
      ]}
    >
      <Text style={styles.outlineButtonText}>{label}</Text>
    </Pressable>
  );
}

type WarehouseMenuScreenProps = {
  onSelectOrders: () => void;
  onSelectInventory: () => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type WarehouseInventoryScreenProps = {
  warehouses: Array<{id: string; name: string; location?: string}>;
  onSelectWarehouse: (id: string) => void;
  onNewWarehouse: () => void;
  onRefresh: () => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type WarehouseInventoryDetailScreenProps = {
  warehouse: {id: string; name: string; location?: string} | undefined;
  items: Array<{id: string; warehouse_id: string; item_id: string; item_name: string; quantity: number; unit: string}>;
  allInventoryItems: InventoryItem[];
  onAddItem: () => void;
  onUpdateItem: (warehouseId: string, itemId: string, quantity: number) => Promise<void>;
  onRefresh: () => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type NewWarehouseScreenProps = {
  onSave: (name: string, location?: string) => Promise<void>;
  onCancel: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type NewWarehouseItemScreenProps = {
  warehouse: {id: string; name: string; location?: string} | undefined;
  availableItems: InventoryItem[];
  onSave: (itemId: string, itemName: string, quantity: number, unit: string) => Promise<void>;
  onCancel: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type WarehouseScreenProps = {
  items: InventoryItem[];
  orders: InventoryOrder[];
  selectedUnit: string;
  onSelectUnit: (unit: string) => void;
  onAddOrder: (order: InventoryOrder) => void;
  onUpdateOrder: (id: string, updates: Partial<InventoryOrder>) => void;
  onBack: () => void;
  onNewOrder: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
  userName: string;
};

type NewWarehouseOrderScreenProps = {
  items: InventoryItem[];
  onSave: (orders: InventoryOrder[]) => void;
  onCancel: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
  userName: string;
};

function WarehouseMenuScreen({
  onSelectOrders,
  onSelectInventory,
  onBack,
  safeAreaInsets,
  statusBar,
}: WarehouseMenuScreenProps) {
  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>מחסן</Text>
            <Text style={styles.subtitle}>
              בחרו פעולה
            </Text>
          </View>
        </View>

        <View style={styles.warehouseMenuOptions}>
          <Pressable
            style={styles.warehouseMenuOption}
            onPress={onSelectOrders}
          >
            <View style={styles.warehouseMenuOptionIcon}>
              <Text style={styles.warehouseMenuOptionIconText}>📑</Text>
            </View>
            <View style={styles.warehouseMenuOptionContent}>
              <Text style={styles.warehouseMenuOptionTitle}>הזמנות</Text>
              <Text style={styles.warehouseMenuOptionSubtitle}>
                הזמנות פנימיות למלאי וצפייה בסטטוס
              </Text>
            </View>
            <Text style={styles.warehouseMenuOptionArrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.warehouseMenuOption}
            onPress={onSelectInventory}
          >
            <View style={styles.warehouseMenuOptionIcon}>
              <Text style={styles.warehouseMenuOptionIconText}>📦</Text>
            </View>
            <View style={styles.warehouseMenuOptionContent}>
              <Text style={styles.warehouseMenuOptionTitle}>מלאים</Text>
              <Text style={styles.warehouseMenuOptionSubtitle}>
                צפייה במלאי המחסנים
              </Text>
            </View>
            <Text style={styles.warehouseMenuOptionArrow}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WarehouseInventoryScreen({
  warehouses,
  onSelectWarehouse,
  onNewWarehouse,
  onRefresh,
  onBack,
  safeAreaInsets,
  statusBar,
}: WarehouseInventoryScreenProps) {
  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>מלאים</Text>
            <Text style={styles.subtitle}>
              ניהול מלאי המחסנים
            </Text>
          </View>
        </View>

        <View style={styles.ordersHeaderRow}>
          <Text style={styles.sectionTitle}>מחסנים</Text>
          <Pressable
            onPress={onNewWarehouse}
            style={styles.addOrderButton}
          >
            <Text style={styles.addOrderButtonText}>+ מחסן חדש</Text>
          </Pressable>
        </View>

        {(warehouses || []).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין מחסנים כרגע</Text>
            <Text style={styles.emptyStateSubtext}>
              לחצו על "מחסן חדש" כדי להתחיל
            </Text>
          </View>
        ) : (
          <View style={styles.warehouseList}>
            {(warehouses || []).map(warehouse => (
              <Pressable
                key={warehouse.id}
                style={styles.warehouseCard}
                onPress={() => onSelectWarehouse(warehouse.id)}
              >
                <View style={styles.warehouseCardIcon}>
                  <Text style={styles.warehouseCardIconText}>📦</Text>
                </View>
                <View style={styles.warehouseCardContent}>
                  <Text style={styles.warehouseCardName}>{warehouse.name}</Text>
                  {warehouse.location && (
                    <Text style={styles.warehouseCardLocation}>{warehouse.location}</Text>
                  )}
                </View>
                <Text style={styles.warehouseCardArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WarehouseInventoryDetailScreen({
  warehouse,
  items,
  allInventoryItems,
  onAddItem,
  onUpdateItem,
  onRefresh,
  onBack,
  safeAreaInsets,
  statusBar,
}: WarehouseInventoryDetailScreenProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');

  const handleEditQuantity = (item: typeof items[0]) => {
    setEditingItemId(item.id);
    setEditQuantity(item.quantity.toString());
  };

  const handleSaveQuantity = async (item: typeof items[0]) => {
    const quantity = parseInt(editQuantity);
    if (isNaN(quantity) || quantity < 0) {
      Alert.alert('שגיאה', 'אנא הזינו כמות תקינה');
      return;
    }
    try {
      await onUpdateItem(item.warehouse_id, item.id, quantity);
      setEditingItemId(null);
      setEditQuantity('');
    } catch (err) {
      // Error already handled in onUpdateItem
    }
  };

  if (!warehouse) {
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>{warehouse.name}</Text>
            <Text style={styles.subtitle}>
              {warehouse.location || 'מחסן'}
            </Text>
          </View>
        </View>

        <View style={styles.ordersHeaderRow}>
          <Text style={styles.sectionTitle}>מוצרים במחסן</Text>
          <Pressable
            onPress={onAddItem}
            style={styles.addOrderButton}
          >
            <Text style={styles.addOrderButtonText}>+ מוצר חדש</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין מוצרים במחסן זה</Text>
            <Text style={styles.emptyStateSubtext}>
              לחצו על "מוצר חדש" כדי להוסיף
            </Text>
          </View>
        ) : (
          <View style={styles.warehouseItemsList}>
            {items.map(item => (
              <View key={item.id} style={styles.warehouseItemCard}>
                <View style={styles.warehouseItemInfo}>
                  <Text style={styles.warehouseItemName}>{item.item_name}</Text>
                  <Text style={styles.warehouseItemUnit}>{item.unit}</Text>
                </View>
                {editingItemId === item.id ? (
                  <View style={styles.warehouseItemEdit}>
                    <TextInput
                      style={styles.warehouseItemQuantityInput}
                      value={editQuantity}
                      onChangeText={setEditQuantity}
                      keyboardType="numeric"
                      placeholder="כמות"
                    />
                    <Pressable
                      style={styles.warehouseItemSaveButton}
                      onPress={() => handleSaveQuantity(item)}
                    >
                      <Text style={styles.warehouseItemSaveButtonText}>שמור</Text>
                    </Pressable>
                    <Pressable
                      style={styles.warehouseItemCancelButton}
                      onPress={() => {
                        setEditingItemId(null);
                        setEditQuantity('');
                      }}
                    >
                      <Text style={styles.warehouseItemCancelButtonText}>ביטול</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.warehouseItemActions}>
                    <Text style={styles.warehouseItemQuantity}>
                      כמות: {item.quantity}
                    </Text>
                    <Pressable
                      style={styles.warehouseItemEditButton}
                      onPress={() => handleEditQuantity(item)}
                    >
                      <Text style={styles.warehouseItemEditButtonText}>ערוך</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NewWarehouseScreen({
  onSave,
  onCancel,
  safeAreaInsets,
  statusBar,
}: NewWarehouseScreenProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('שגיאה', 'אנא הזינו שם מחסן');
      return;
    }
    try {
      await onSave(name.trim(), location.trim() || undefined);
    } catch (err) {
      // Error already handled
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>מחסן חדש</Text>
            <Text style={styles.subtitle}>
              הוספת מחסן חדש למערכת
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>שם מחסן *</Text>
          <TextInput
            style={styles.formInput}
            value={name}
            onChangeText={setName}
            placeholder="לדוגמה: מחסן ראשי"
          />

          <Text style={styles.formLabel}>מיקום</Text>
          <TextInput
            style={styles.formInput}
            value={location}
            onChangeText={setLocation}
            placeholder="לדוגמה: קומה 1, חדר 101"
          />
        </View>

        <View style={styles.formActions}>
          <Pressable
            style={[styles.formButton, styles.formButtonPrimary]}
            onPress={handleSave}
          >
            <Text style={styles.formButtonPrimaryText}>שמור</Text>
          </Pressable>
          <Pressable
            style={[styles.formButton, styles.formButtonSecondary]}
            onPress={onCancel}
          >
            <Text style={styles.formButtonSecondaryText}>ביטול</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NewWarehouseItemScreen({
  warehouse,
  availableItems,
  onSave,
  onCancel,
  safeAreaInsets,
  statusBar,
}: NewWarehouseItemScreenProps) {
  const [itemName, setItemName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('0');
  const [unit, setUnit] = useState<string>('יחידה');

  const handleSave = async () => {
    if (!itemName.trim()) {
      Alert.alert('שגיאה', 'אנא הזינו שם מוצר');
      return;
    }
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('שגיאה', 'אנא הזינו כמות תקינה');
      return;
    }
    if (!unit.trim()) {
      Alert.alert('שגיאה', 'אנא הזינו יחידה');
      return;
    }
    try {
      console.log('Saving warehouse item:', { itemName: itemName.trim(), quantity: qty, unit: unit.trim() });
      await onSave(null, itemName.trim(), qty, unit.trim());
      console.log('Warehouse item saved successfully');
    } catch (err: any) {
      console.error('Error saving warehouse item:', err);
      Alert.alert('שגיאה', err.message || 'אירעה שגיאה בשמירת המוצר');
    }
  };

  if (!warehouse) {
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>מוצר חדש</Text>
            <Text style={styles.subtitle}>
              הוספת מוצר ל{warehouse.name}
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>שם מוצר *</Text>
          <TextInput
            style={styles.formInput}
            value={itemName}
            onChangeText={setItemName}
            placeholder="לדוגמה: חומר ניקוי"
          />

          <Text style={styles.formLabel}>כמות *</Text>
          <TextInput
            style={styles.formInput}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="0"
          />

          <Text style={styles.formLabel}>יחידה *</Text>
          <TextInput
            style={styles.formInput}
            value={unit}
            onChangeText={setUnit}
            placeholder="לדוגמה: ליטר, יחידה, קילוגרם"
          />
          <Text style={styles.formHint}>
            דוגמאות: ליטר, יחידה, קילוגרם, רול, חבילה
          </Text>
        </View>

        <View style={styles.formActions}>
          <Pressable
            style={[styles.formButton, styles.formButtonPrimary]}
            onPress={handleSave}
          >
            <Text style={styles.formButtonPrimaryText}>שמור</Text>
          </Pressable>
          <Pressable
            style={[styles.formButton, styles.formButtonSecondary]}
            onPress={onCancel}
          >
            <Text style={styles.formButtonSecondaryText}>ביטול</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WarehouseScreen({
  items,
  orders,
  selectedUnit,
  onSelectUnit,
  onAddOrder,
  onUpdateOrder,
  onBack,
  onNewOrder,
  safeAreaInsets,
  statusBar,
  userName,
}: WarehouseScreenProps) {
  const [expandedOrderGroupId, setExpandedOrderGroupId] = useState<string | null>(null);

  // Group orders by hotel (unitNumber)
  const groupedOrders = useMemo(() => {
    const groups: Record<string, InventoryOrder[]> = {};
    orders.forEach(order => {
      // Group by hotel (unitNumber) or 'ללא מלון' if no hotel
      const hotelKey = order.unitNumber || 'ללא מלון';
      if (!groups[hotelKey]) {
        groups[hotelKey] = [];
      }
      groups[hotelKey].push(order);
    });
    // Sort orders within each group by date (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''));
    });
    return groups;
  }, [orders]);

  const handleToggleOrder = (groupId: string) => {
    if (expandedOrderGroupId === groupId) {
      setExpandedOrderGroupId(null);
    } else {
      setExpandedOrderGroupId(groupId);
    }
  };


  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>מחסן</Text>
            <Text style={styles.subtitle}>
              הזמנות פנימיות למלאי וצפייה בסטטוס
            </Text>
          </View>
        </View>

        <View style={styles.ordersList}>
          <View style={styles.ordersHeaderRow}>
            <Text style={styles.sectionTitle}>הזמנות פנימיות</Text>
            <Pressable
              onPress={onNewOrder}
              style={styles.addOrderButton}
            >
              <Text style={styles.addOrderButtonText}>+ הזמנה חדשה</Text>
            </Pressable>
          </View>

          {Object.keys(groupedOrders).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>אין הזמנות כרגע</Text>
            </View>
          ) : (
            Object.entries(groupedOrders).map(([hotelName, groupOrders]) => (
              <View key={hotelName}>
                <View style={styles.hotelGroupTitle}>
                  <Text style={styles.hotelGroupTitleText}>
                    {hotelName} ({groupOrders.length} {groupOrders.length === 1 ? 'הזמנה' : 'הזמנות'})
                  </Text>
                </View>
                {groupOrders.map((order) => {
                  const groupId = order.id;
                  const isExpanded = expandedOrderGroupId === groupId;
                  const itemCount = order.items?.length || 0;
                  
                  return (
                    <View key={groupId} style={styles.orderCard}>
                  <Pressable
                    onPress={() => handleToggleOrder(groupId)}
                    style={styles.orderCardHeader}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.orderItemName}>
                          הזמנה #{order.id.slice(-8)}
                        </Text>
                        <Text style={styles.orderItemCount}>
                          ({itemCount} {itemCount === 1 ? 'פריט' : 'פריטים'})
                        </Text>
                      </View>
                      <Text style={styles.orderDetails}>
                        תאריך הזמנה: {order.orderDate}
                      </Text>
                      {order.orderedBy && (
                        <Text style={styles.orderDetails}>
                          הוזמן על ידי: {order.orderedBy}
                        </Text>
                      )}
                      {order.deliveryDate && (
                        <Text style={styles.orderDetails}>
                          תאריך אספקה: {order.deliveryDate}
                        </Text>
                      )}
                      {isExpanded && order.items && order.items.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                          {order.items.map((item, idx) => (
                            <View key={item.id || idx} style={styles.orderItemRow}>
                              <Text style={styles.orderItemName}>{item.itemName}</Text>
                              <Text style={styles.orderDetails}>
                                כמות: {item.quantity} {item.unit || ''}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </Pressable>
                  
                  <View style={styles.orderCardActions}>
                    <View style={styles.orderTypeBadge}>
                      <Text style={styles.orderTypeText}>{order.orderType}</Text>
                    </View>
                  </View>
                </View>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ItemTableRowProps = {
  item: InventoryItem;
  currentQuantity?: number;
  onAdd: (itemId: string, quantity: number) => void;
};

type ProductEntry = {
  id: string;
  name: string;
  quantity: string;
};

function NewWarehouseOrderScreen({
  items,
  onSave,
  onCancel,
  safeAreaInsets,
  statusBar,
  userName,
}: NewWarehouseOrderScreenProps) {
  const [products, setProducts] = useState<ProductEntry[]>([
    { id: Date.now().toString(), name: '', quantity: '' }
  ]);
  const [selectedHotel, setSelectedHotel] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleAddProduct = () => {
    setProducts([...products, { id: Date.now().toString(), name: '', quantity: '' }]);
  };

  const handleRemoveProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleProductChange = (id: string, field: 'name' | 'quantity', value: string) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleSave = async () => {
    // Filter out empty products
    const validProducts = products.filter(p => p.name.trim() && p.quantity.trim());
    
    if (validProducts.length === 0) {
      Alert.alert('שגיאה', 'יש להוסיף לפחות פריט אחד עם שם וכמות');
      return;
    }

    // Validate quantities
    for (const product of validProducts) {
      const quantity = parseFloat(product.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        Alert.alert('שגיאה', `הכמות של "${product.name}" אינה תקינה`);
        return;
      }
    }

    setSaving(true);
    try {
      // Create one order with multiple items
      const orderDate = new Date().toISOString().split('T')[0];
      
      const orderItems: InventoryOrderItem[] = validProducts.map(product => {
        const quantity = parseFloat(product.quantity);
        return {
          id: '', // Backend will generate
          itemId: '', // No item ID for free text products
          itemName: product.name.trim(),
          quantity: quantity,
          unit: '', // No unit for free text products
        };
      });

      const newOrder: InventoryOrder = {
        id: '', // Backend will generate
        orderDate: orderDate,
        status: 'מחכה להשלמת תשלום',
        orderType: 'הזמנה כללית',
        unitNumber: selectedHotel || undefined,
        items: orderItems,
      };

      await onSave([newOrder]);

      setSaving(false);
      Alert.alert('הצלחה', `ההזמנה נוצרה בהצלחה עם ${validProducts.length} פריטים`, [
        { text: 'אישור', onPress: () => onCancel() }
      ]);
    } catch (err: any) {
      setSaving(false);
      Alert.alert('שגיאה', err.message || 'אירעה שגיאה ביצירת ההזמנה');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
        <Text style={styles.ordersPageTitle}>הזמנה חדשה</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hotelSelectorContainer}>
          <Text style={styles.hotelSelectorLabel}>בחר מלון/יחידה:</Text>
          <Pressable
            style={styles.hotelSelectorButton}
            onPress={() => {
              Alert.alert(
                'בחר מלון/יחידה',
                '',
                [
                  { text: 'ביטול', style: 'cancel' },
                  ...UNIT_CATEGORIES.flatMap(category => 
                    category.units.map(unit => ({
                      text: unit,
                      onPress: () => setSelectedHotel(unit),
                    }))
                  ),
                  { text: 'ללא מלון', onPress: () => setSelectedHotel('') },
                ],
                { cancelable: true }
              );
            }}
          >
            <Text style={styles.hotelSelectorButtonText}>
              {selectedHotel || '-- בחר מלון/יחידה --'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.simpleOrderList}>
          {products.map((product, index) => (
            <View key={product.id} style={styles.simpleOrderItem}>
              <View style={styles.simpleOrderItemInfo}>
                <TextInput
                  style={styles.productNameInput}
                  value={product.name}
                  onChangeText={(text) => handleProductChange(product.id, 'name', text)}
                  placeholder="שם המוצר"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.simpleOrderItemControls}>
                <TextInput
                  style={styles.simpleQuantityInput}
                  value={product.quantity}
                  onChangeText={(text) => handleProductChange(product.id, 'quantity', text)}
                  placeholder="כמות"
                  keyboardType="numeric"
                  textAlign="center"
                  placeholderTextColor="#999"
                />
                {products.length > 1 && (
                  <Pressable
                    onPress={() => handleRemoveProduct(product.id)}
                    style={styles.removeProductButton}
                  >
                    <Text style={styles.removeProductButtonText}>×</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleAddProduct}
          style={styles.addProductButton}
        >
          <Text style={styles.addProductButtonText}>+ הוסף פריט</Text>
        </Pressable>

        <View style={styles.orderActions}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[
              styles.saveOrderButton,
              saving && styles.saveOrderButtonDisabled,
            ]}
          >
            <Text style={styles.saveOrderButtonText}>
              {saving ? 'שומר...' : 'צור הזמנה'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            style={styles.cancelOrderButton}
            disabled={saving}
          >
            <Text style={styles.cancelOrderButtonText}>ביטול</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


type MaintenanceScreenProps = {
  units: MaintenanceUnit[];
  onSelectUnit: (unitId: string) => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type MaintenanceTasksScreenProps = {
  unit: MaintenanceUnit;
  resolveAssignee: (assignedTo?: string | null) => string;
  onSelectTask: (taskId: string) => void;
  onNewTask: () => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type MaintenanceTaskDetailScreenProps = {
  unit: MaintenanceUnit;
  task: MaintenanceTask;
  resolveAssignee: (assignedTo?: string | null) => string;
  onUpdateTask: (taskId: string, updates: Partial<MaintenanceTask>) => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

// Reports Screen
type ReportsScreenProps = {
  orders: Order[];
  missions: InspectionMission[];
  warehouses: Array<{id: string; name: string; location?: string}>;
  allWarehouseItems: Array<{id: string; warehouse_id: string; item_id: string; item_name: string; quantity: number; unit: string}>;
  inventoryOrders: InventoryOrder[];
  maintenanceUnits: MaintenanceUnit[];
  maintenanceTasksReport: Array<any>;
  resolveAssignee: (assignedTo?: string | null) => string;
  attendanceStatus: {is_clocked_in: boolean; session: any} | null;
  attendanceLogsReport: Array<any>;
  reportsSummary: {totalRevenue: number; totalPaid: number; totalExpenses: number} | null;
  reportsSummaryError: string | null;
  onRefresh: () => void;
  onOpenOrders: () => void;
  onOpenExitInspections: () => void;
  onOpenWarehouse: () => void;
  onOpenMaintenance: () => void;
  onOpenAttendance: () => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

function ReportsScreen({
  orders,
  missions,
  warehouses,
  allWarehouseItems,
  inventoryOrders,
  maintenanceUnits,
  maintenanceTasksReport,
  resolveAssignee,
  attendanceStatus,
  attendanceLogsReport,
  reportsSummary,
  reportsSummaryError,
  onRefresh,
  onOpenOrders,
  onOpenExitInspections,
  onOpenWarehouse,
  onOpenMaintenance,
  onOpenAttendance,
  onBack,
  safeAreaInsets,
  statusBar,
}: ReportsScreenProps) {
  const [activeReport, setActiveReport] = useState<
    'orders' | 'inspections' | 'warehouse' | 'maintenance' | 'attendance' | 'income-expenses'
  >('orders');
  const [monthlyIncomeExpenses, setMonthlyIncomeExpenses] = useState<{
    monthly_data: Array<{month: string; income: number; expenses: number; net: number}>;
    total_income: number;
    total_expenses: number;
    total_net: number;
  } | null>(null);
  const [loadingMonthlyReport, setLoadingMonthlyReport] = useState(false);
  const [reportView, setReportView] = useState<'list' | 'detail'>('list');
  const [showAllWarehouseStock, setShowAllWarehouseStock] = useState(false);
  const [showAllWarehouseOrders, setShowAllWarehouseOrders] = useState(false);

  const localTotalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const localTotalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);

  const totalRevenue = reportsSummary?.totalRevenue ?? localTotalRevenue;
  const totalPaid = reportsSummary?.totalPaid ?? localTotalPaid;
  const totalExpenses = reportsSummary?.totalExpenses ?? 0;
  const pendingAmount = Math.max(0, totalRevenue - totalPaid);

  const formatMoney = (v: number) => `₪${(v || 0).toLocaleString('he-IL')}`;
  const formatPct = (v: number) => `${Math.round(v || 0)}%`;
  const orderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'חדש':
        return { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' };
      case 'באישור':
        return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' };
      case 'שולם חלקית':
        return { bg: '#fce7f3', border: '#ec4899', text: '#9f1239' };
      case 'שולם':
        return { bg: '#d1fae5', border: '#10b981', text: '#065f46' };
      case 'בוטל':
        return { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' };
    }
  };
  const msDay = 24 * 60 * 60 * 1000;
  const safeDate = (s: string) => {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  };
  const diffDays = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / msDay));
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const activeOrdersList = useMemo(() => orders.filter(o => o.status !== 'בוטל'), [orders]);
  const paidOrdersCount = useMemo(() => orders.filter(o => o.status === 'שולם').length, [orders]);
  const partiallyPaidOrdersCount = useMemo(() => orders.filter(o => o.status === 'שולם חלקית').length, [orders]);
  const unpaidOrdersCount = useMemo(() => orders.filter(o => (o.totalAmount || 0) > (o.paidAmount || 0)).length, [orders]);

  const avgOrderValue = useMemo(() => {
    const n = activeOrdersList.length || 1;
    return totalRevenue / n;
  }, [activeOrdersList.length, totalRevenue]);

  const paidRate = useMemo(() => {
    if (!totalRevenue) return 0;
    return (totalPaid / totalRevenue) * 100;
  }, [totalPaid, totalRevenue]);

  const avgStayNights = useMemo(() => {
    const nights = activeOrdersList
      .map(o => {
        const a = safeDate(o.arrivalDate);
        const b = safeDate(o.departureDate);
        if (!a || !b) return 0;
        return diffDays(a, b);
      })
      .filter(n => n > 0);
    if (nights.length === 0) return 0;
    return nights.reduce((s, n) => s + n, 0) / nights.length;
  }, [activeOrdersList]);

  const revenueByUnit = useMemo(() => {
    const map = new Map<string, { unit: string; revenue: number; paid: number; outstanding: number; count: number }>();
    activeOrdersList.forEach(o => {
      const unit = (o.unitNumber || 'לא צוין').trim() || 'לא צוין';
      const rev = Number(o.totalAmount || 0);
      const paid = Number(o.paidAmount || 0);
      const out = Math.max(0, rev - paid);
      const prev = map.get(unit) || { unit, revenue: 0, paid: 0, outstanding: 0, count: 0 };
      map.set(unit, {
        unit,
        revenue: prev.revenue + rev,
        paid: prev.paid + paid,
        outstanding: prev.outstanding + out,
        count: prev.count + 1,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [activeOrdersList]);

  const topUnitsByRevenue = useMemo(() => revenueByUnit.slice(0, 8), [revenueByUnit]);
  const topUnitsByOutstanding = useMemo(() => [...revenueByUnit].sort((a, b) => b.outstanding - a.outstanding).slice(0, 8), [revenueByUnit]);

  const revenueByGuest = useMemo(() => {
    const map = new Map<string, number>();
    activeOrdersList.forEach(o => {
      const guest = (o.guestName || 'לא צוין').trim() || 'לא צוין';
      map.set(guest, (map.get(guest) || 0) + Number(o.totalAmount || 0));
    });
    return Array.from(map.entries())
      .map(([guest, revenue]) => ({ guest, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [activeOrdersList]);

  const occupancyNext30 = useMemo(() => {
    const start = new Date();
    const end = new Date(Date.now() + 30 * msDay);
    const units = Array.from(
      new Set(activeOrdersList.map(o => (o.unitNumber || '').trim()).filter(Boolean)),
    );
    const unitCount = Math.max(1, units.length);
    const windowDays = 30;

    const overlapNights = (arrival: Date, departure: Date) => {
      const s = Math.max(arrival.getTime(), start.getTime());
      const e = Math.min(departure.getTime(), end.getTime());
      const nights = Math.floor((e - s) / msDay);
      return Math.max(0, nights);
    };

    let booked = 0;
    const perUnit: Array<{ unit: string; nights: number; pct: number }> = [];
    units.forEach(unit => {
      let nights = 0;
      activeOrdersList
        .filter(o => (o.unitNumber || '').trim() === unit)
        .forEach(o => {
          const a = safeDate(o.arrivalDate);
          const b = safeDate(o.departureDate);
          if (!a || !b) return;
          nights += overlapNights(a, b);
        });
      booked += nights;
      perUnit.push({ unit, nights, pct: (nights / windowDays) * 100 });
    });
    const overallPct = (booked / (unitCount * windowDays)) * 100;
    return {
      unitCount,
      bookedNights: booked,
      windowDays,
      overallPct: clamp(overallPct, 0, 100),
      perUnit: perUnit.sort((a, b) => b.pct - a.pct).slice(0, 10),
    };
  }, [activeOrdersList]);

  const ordersByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const ordersByUnitReport = useMemo(() => {
    const map = new Map<
      string,
      {
        unit: string;
        totalRevenue: number;
        totalPaid: number;
        totalOutstanding: number;
        statusCounts: Record<string, number>;
        orders: Array<
          Order & {
            remaining: number;
          }
        >;
      }
    >();

    (orders || []).forEach(o => {
      const unit = (o.unitNumber || 'לא צוין').trim() || 'לא צוין';
      const total = Number(o.totalAmount || 0);
      const paid = Number(o.paidAmount || 0);
      const remaining = Math.max(0, total - paid);

      const prev =
        map.get(unit) || {
          unit,
          totalRevenue: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          statusCounts: {},
          orders: [],
        };

      prev.totalRevenue += total;
      prev.totalPaid += paid;
      prev.totalOutstanding += remaining;
      prev.statusCounts[o.status] = (prev.statusCounts[o.status] || 0) + 1;
      prev.orders = [...prev.orders, { ...o, remaining }];
      map.set(unit, prev);
    });

    const rows = Array.from(map.values()).map(r => ({
      ...r,
      orders: r.orders.sort((a, b) => (a.arrivalDate || '').localeCompare(b.arrivalDate || '')),
    }));

    // Units with more open/outstanding first
    rows.sort((a, b) => {
      if (a.totalOutstanding !== b.totalOutstanding) return b.totalOutstanding - a.totalOutstanding;
      if (a.totalRevenue !== b.totalRevenue) return b.totalRevenue - a.totalRevenue;
      return a.unit.localeCompare(b.unit, 'he');
    });

    return rows;
  }, [orders]);

  const unpaidOrders = useMemo(() => {
    return orders
      .map(o => ({
        ...o,
        remaining: Math.max(0, (o.totalAmount || 0) - (o.paidAmount || 0)),
      }))
      .filter(o => o.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 10);
  }, [orders]);

  const upcomingArrivals = useMemo(() => {
    const now = new Date();
    const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return orders
      .filter(o => {
        const d = new Date(o.arrivalDate);
        return d >= now && d <= in7;
      })
      .sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate))
      .slice(0, 10);
  }, [orders]);

  const upcomingDepartures = useMemo(() => {
    const now = new Date();
    const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return orders
      .filter(o => {
        const d = new Date(o.departureDate);
        return d >= now && d <= in7;
      })
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
      .slice(0, 10);
  }, [orders]);

  const inspectionsTotal = missions.length;
  const inspectionsNotYet = missions.filter(m => m.status === 'זמן הביקורות טרם הגיע').length;
  const inspectionsToday = missions.filter(m => m.status === 'דורש ביקורת היום').length;
  const inspectionsOverdue = missions.filter(m => m.status === 'זמן הביקורת עבר').length;
  const inspectionsDone = missions.filter(m => m.status === 'הביקורת הושלמה').length;

  const inspectionsNeedingAction = useMemo(() => {
    return missions
      .filter(m => m.status !== 'הביקורת הושלמה')
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
      .slice(0, 10);
  }, [missions]);

  const inspectionsByUnit = useMemo(() => {
    const map = new Map<
      string,
      {
        unit: string;
        total: number;
        notYet: number;
        today: number;
        overdue: number;
        done: number;
        missions: Array<
          InspectionMission & {
            doneTasks: number;
            totalTasks: number;
            completionPct: number;
          }
        >;
      }
    >();

    missions.forEach(m => {
      const unit = (m.unitNumber || 'לא צוין').trim() || 'לא צוין';
      const prev = map.get(unit) || {
        unit,
        total: 0,
        notYet: 0,
        today: 0,
        overdue: 0,
        done: 0,
        missions: [],
      };

      const totalTasks = m.tasks?.length || 0;
      const doneTasks = (m.tasks || []).filter(t => t.completed).length;
      const completionPct =
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      const next = { ...prev };
      next.total += 1;
      if (m.status === 'זמן הביקורות טרם הגיע') next.notYet += 1;
      else if (m.status === 'דורש ביקורת היום') next.today += 1;
      else if (m.status === 'זמן הביקורת עבר') next.overdue += 1;
      else if (m.status === 'הביקורת הושלמה') next.done += 1;

      next.missions = [
        ...next.missions,
        { ...m, totalTasks, doneTasks, completionPct },
      ];

      map.set(unit, next);
    });

    const rows = Array.from(map.values()).map(r => ({
      ...r,
      missions: r.missions.sort((a, b) => b.departureDate.localeCompare(a.departureDate)),
    }));

    // sort units by most open work (pending + inProgress), then name
    rows.sort((a, b) => {
      const openA = a.pending + a.inProgress;
      const openB = b.pending + b.inProgress;
      if (openA !== openB) return openB - openA;
      return a.unit.localeCompare(b.unit, 'he');
    });

    return rows;
  }, [missions]);

  const inspectionsCompletion = useMemo(() => {
    if (missions.length === 0) return 0;
    const percents = missions.map(m => {
      const total = m.tasks.length || 0;
      if (!total) return 0;
      const done = m.tasks.filter(t => t.completed).length;
      return Math.round((done / total) * 100);
    });
    const avg = Math.round(percents.reduce((s, p) => s + p, 0) / percents.length);
    return avg;
  }, [missions]);

  const overdueInspections = useMemo(() => {
    const today = new Date();
    return missions
      .filter(m => m.status !== 'הושלם')
      .filter(m => {
        const d = safeDate(m.departureDate);
        return d ? d.getTime() < today.getTime() : false;
      })
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
      .slice(0, 15);
  }, [missions]);

  const inspectionTaskIssues = useMemo(() => {
    const map = new Map<string, { name: string; incomplete: number; total: number }>();
    missions.forEach(m => {
      m.tasks.forEach(t => {
        const prev = map.get(t.name) || { name: t.name, incomplete: 0, total: 0 };
        map.set(t.name, {
          name: t.name,
          incomplete: prev.incomplete + (t.completed ? 0 : 1),
          total: prev.total + 1,
        });
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.incomplete - a.incomplete)
      .slice(0, 10);
  }, [missions]);

  const warehouseItemsCount = allWarehouseItems.length;
  const warehouseTotalQty = allWarehouseItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const warehouseLowStock = useMemo(() => {
    return allWarehouseItems
      .filter(i => (i.quantity || 0) <= 2)
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
      .slice(0, 20);
  }, [allWarehouseItems]);

  const warehouseById = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    warehouses.forEach(w => map.set(w.id, { id: w.id, name: w.name }));
    return map;
  }, [warehouses]);

  const warehouseStatsByWarehouse = useMemo(() => {
    const map = new Map<string, { warehouseId: string; warehouseName: string; items: number; totalQty: number; lowStock: number }>();
    allWarehouseItems.forEach(i => {
      const wid = i.warehouse_id;
      const wname = warehouseById.get(wid)?.name || 'מחסן';
      const prev = map.get(wid) || { warehouseId: wid, warehouseName: wname, items: 0, totalQty: 0, lowStock: 0 };
      const qty = Number(i.quantity || 0);
      map.set(wid, {
        warehouseId: wid,
        warehouseName: wname,
        items: prev.items + 1,
        totalQty: prev.totalQty + qty,
        lowStock: prev.lowStock + (qty <= 2 ? 1 : 0),
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [allWarehouseItems, warehouseById]);

  const warehouseInventoryByWarehouse = useMemo(() => {
    const map = new Map<
      string,
      {
        warehouseId: string;
        warehouseName: string;
        totalQty: number;
        items: Array<{ name: string; qty: number; unit: string }>;
      }
    >();

    // Aggregate by warehouse + item name
    const nested = new Map<string, Map<string, { name: string; qty: number; unit: string }>>();
    allWarehouseItems.forEach(i => {
      const wid = i.warehouse_id;
      const wname = warehouseById.get(wid)?.name || 'מחסן';
      if (!nested.has(wid)) nested.set(wid, new Map());
      const key = `${(i.item_name || '').trim()}__${(i.unit || '').trim()}`;
      const prev = nested.get(wid)!.get(key) || {
        name: (i.item_name || 'מוצר').trim(),
        qty: 0,
        unit: (i.unit || 'יחידה').trim(),
      };
      nested.get(wid)!.set(key, { ...prev, qty: prev.qty + Number(i.quantity || 0) });

      if (!map.has(wid)) {
        map.set(wid, { warehouseId: wid, warehouseName: wname, totalQty: 0, items: [] });
      }
    });

    nested.forEach((itemsMap, wid) => {
      const wname = warehouseById.get(wid)?.name || 'מחסן';
      const items = Array.from(itemsMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'he'));
      const totalQty = items.reduce((s, it) => s + (it.qty || 0), 0);
      map.set(wid, { warehouseId: wid, warehouseName: wname, totalQty, items });
    });

    // Include warehouses with no items
    warehouses.forEach(w => {
      if (!map.has(w.id)) map.set(w.id, { warehouseId: w.id, warehouseName: w.name, totalQty: 0, items: [] });
    });

    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [allWarehouseItems, warehouseById, warehouses]);

  const topWarehouseItemsByQty = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; totalQty: number; warehouses: number }>();
    const seenByWarehouse = new Map<string, Set<string>>(); // name -> set(warehouse_id)
    allWarehouseItems.forEach(i => {
      const name = (i.item_name || 'מוצר').trim();
      const unit = (i.unit || '').trim();
      const qty = Number(i.quantity || 0);
      const prev = map.get(name) || { name, unit: unit || 'יחידה', totalQty: 0, warehouses: 0 };
      map.set(name, { ...prev, unit: prev.unit || unit || 'יחידה', totalQty: prev.totalQty + qty });
      if (!seenByWarehouse.has(name)) seenByWarehouse.set(name, new Set());
      seenByWarehouse.get(name)!.add(i.warehouse_id);
    });
    // finalize warehouse count
    const rows = Array.from(map.values()).map(r => ({
      ...r,
      warehouses: seenByWarehouse.get(r.name)?.size || 1,
    }));
    return rows.sort((a, b) => b.totalQty - a.totalQty).slice(0, 12);
  }, [allWarehouseItems]);

  const inventoryOrdersSorted = useMemo(() => {
    return [...(inventoryOrders || [])].sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''));
  }, [inventoryOrders]);

  const inventoryOrdersByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    (inventoryOrders || []).forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [inventoryOrders]);

  const maintenanceTasksEffective = useMemo(() => {
    if (maintenanceTasksReport && maintenanceTasksReport.length > 0) return maintenanceTasksReport;
    return maintenanceUnits.flatMap(u => u.tasks);
  }, [maintenanceTasksReport, maintenanceUnits]);

  const normalizeMaintenanceStatus = (s: string) => {
    if (s === 'open' || s === 'פתוח') return 'פתוח';
    if (s === 'in_progress' || s === 'בטיפול') return 'בטיפול';
    if (s === 'closed' || s === 'סגור') return 'סגור';
    return s || 'פתוח';
  };

  const maintenanceTotal = maintenanceTasksEffective.length;
  const maintenanceOpen = maintenanceTasksEffective.filter((t: any) => normalizeMaintenanceStatus(t.status) === 'פתוח').length;
  const maintenanceInProgress = maintenanceTasksEffective.filter((t: any) => normalizeMaintenanceStatus(t.status) === 'בטיפול').length;
  const maintenanceClosed = maintenanceTasksEffective.filter((t: any) => normalizeMaintenanceStatus(t.status) === 'סגור').length;

  const maintenanceTopOpen = useMemo(() => {
    return maintenanceTasksEffective
      .filter((t: any) => normalizeMaintenanceStatus(t.status) !== 'סגור')
      .slice(0, 10);
  }, [maintenanceTasksEffective]);

  const maintenanceByAssignee = useMemo(() => {
    const map = new Map<string, number>();
    maintenanceTasksEffective.forEach((t: any) => {
      const raw = (t.assigned_to || t.assignedTo || '').toString().trim();
      const label = raw ? resolveAssignee(raw) : 'לא משויך';
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([assignee, count]) => ({ assignee, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [maintenanceTasksEffective, resolveAssignee]);

  const maintenanceByUnit = useMemo(() => {
    const map = new Map<string, { unit: string; total: number; open: number }>();
    maintenanceTasksEffective.forEach((t: any) => {
      const unit = (t.unit_id || t.unitId || t.unit || 'לא צוין').toString();
      const st = normalizeMaintenanceStatus(t.status);
      const prev = map.get(unit) || { unit, total: 0, open: 0 };
      map.set(unit, { unit, total: prev.total + 1, open: prev.open + (st === 'סגור' ? 0 : 1) });
    });
    return Array.from(map.values()).sort((a, b) => b.open - a.open).slice(0, 10);
  }, [maintenanceTasksEffective]);

  const maintenanceOldOpen = useMemo(() => {
    const today = new Date();
    const items = maintenanceTasksEffective
      .filter((t: any) => normalizeMaintenanceStatus(t.status) !== 'סגור')
      .map((t: any) => {
        const d = safeDate(t.created_date || t.createdDate || '');
        const age = d ? diffDays(d, today) : 0;
        return { ...t, _ageDays: age };
      })
      .sort((a: any, b: any) => (b._ageDays || 0) - (a._ageDays || 0))
      .slice(0, 10);
    return items;
  }, [maintenanceTasksEffective]);

  const maintenanceUnitsMap = useMemo(() => {
    const map = new Map<string, string>();
    maintenanceUnits.forEach(u => map.set(u.id, u.name));
    return map;
  }, [maintenanceUnits]);

  const maintenanceTasksByUnit = useMemo(() => {
    const map = new Map<
      string,
      {
        unitId: string;
        unitName: string;
        total: number;
        open: number;
        inProgress: number;
        closed: number;
        tasks: any[];
      }
    >();

    maintenanceTasksEffective.forEach((t: any) => {
      const unitId = (t.unit_id || t.unitId || t.unit || 'לא צוין').toString();
      const unitName = maintenanceUnitsMap.get(unitId) || unitId;
      const st = normalizeMaintenanceStatus(t.status);
      const prev =
        map.get(unitId) || {
          unitId,
          unitName,
          total: 0,
          open: 0,
          inProgress: 0,
          closed: 0,
          tasks: [],
        };
      const next = { ...prev };
      next.total += 1;
      if (st === 'פתוח') next.open += 1;
      else if (st === 'בטיפול') next.inProgress += 1;
      else if (st === 'סגור') next.closed += 1;
      next.tasks = [...next.tasks, t];
      map.set(unitId, next);
    });

    const rows = Array.from(map.values())
      .map(r => ({
        ...r,
        tasks: r.tasks.sort((a: any, b: any) => {
          const sa = normalizeMaintenanceStatus(a.status);
          const sb = normalizeMaintenanceStatus(b.status);
          const order = (s: string) => (s === 'פתוח' ? 0 : s === 'בטיפול' ? 1 : 2);
          const cmp = order(sa) - order(sb);
          if (cmp !== 0) return cmp;
          const da = safeDate(a.created_date || a.createdDate || '')?.getTime() || 0;
          const db = safeDate(b.created_date || b.createdDate || '')?.getTime() || 0;
          return db - da;
        }),
      }))
      .sort((a, b) => b.open + b.inProgress - (a.open + a.inProgress));

    return rows;
  }, [maintenanceTasksEffective, maintenanceUnitsMap]);

  const normalizeClock = (v: any) => (typeof v === 'string' ? v : '');
  const attendanceLogs = attendanceLogsReport || [];
  const currentlyClockedInEmployees = useMemo(() => {
    const active = new Set<string>();
    (attendanceLogs as any[]).forEach(l => {
      const emp = l.employee || l.emp || l.user || '';
      const clockOut = l.clock_out;
      if (emp && (clockOut === null || clockOut === undefined || clockOut === '')) {
        active.add(emp);
      }
    });
    return Array.from(active).sort();
  }, [attendanceLogs]);

  const hoursLast7DaysByEmployee = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const map = new Map<string, number>();
    (attendanceLogs as any[]).forEach(l => {
      const emp = l.employee || '';
      const ci = new Date(normalizeClock(l.clock_in)).getTime();
      if (!emp || !ci || ci < since) return;
      const coRaw = normalizeClock(l.clock_out);
      const co = coRaw ? new Date(coRaw).getTime() : Date.now();
      const hours = Math.max(0, (co - ci) / (1000 * 60 * 60));
      map.set(emp, (map.get(emp) || 0) + hours);
    });
    return Array.from(map.entries())
      .map(([employee, hours]) => ({ employee, hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [attendanceLogs]);

  const hoursLast30DaysByEmployee = useMemo(() => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const map = new Map<string, number>();
    (attendanceLogs as any[]).forEach(l => {
      const emp = l.employee || '';
      const ci = new Date(normalizeClock(l.clock_in)).getTime();
      if (!emp || !ci || ci < since) return;
      const coRaw = normalizeClock(l.clock_out);
      const co = coRaw ? new Date(coRaw).getTime() : Date.now();
      const hours = Math.max(0, (co - ci) / (1000 * 60 * 60));
      map.set(emp, (map.get(emp) || 0) + hours);
    });
    return Array.from(map.entries())
      .map(([employee, hours]) => ({ employee, hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [attendanceLogs]);

  const attendanceRecentSessions = useMemo(() => {
    const rows = (attendanceLogs as any[])
      .slice(0, 20)
      .map(l => {
        const emp = l.employee || '';
        const ci = safeDate(normalizeClock(l.clock_in));
        const co = safeDate(normalizeClock(l.clock_out));
        const end = co || new Date();
        const durHrs = ci ? Math.max(0, (end.getTime() - ci.getTime()) / (1000 * 60 * 60)) : 0;
        const day = ci ? `${ci.getDate()}/${ci.getMonth() + 1}` : '';
        const timeIn = ci ? `${ci.getHours().toString().padStart(2, '0')}:${ci.getMinutes().toString().padStart(2, '0')}` : '';
        const timeOut = co ? `${co.getHours().toString().padStart(2, '0')}:${co.getMinutes().toString().padStart(2, '0')}` : (normalizeClock(l.clock_out) ? '' : '—');
        return { id: l.id || `${emp}-${day}-${timeIn}`, emp, day, timeIn, timeOut, durHrs, isOpen: !co };
      });
    return rows;
  }, [attendanceLogs]);

  const attendancePeriodsByEmployee = useMemo(() => {
    const map = new Map<
      string,
      {
        employee: string;
        isActive: boolean;
        sessions: Array<{ id: string; day: string; timeIn: string; timeOut: string; durHrs: number; isOpen: boolean }>;
        totalHours: number;
      }
    >();

    attendanceRecentSessions.forEach(s => {
      const emp = s.emp || 'לא צוין';
      const prev = map.get(emp) || { employee: emp, isActive: false, sessions: [], totalHours: 0 };
      map.set(emp, {
        employee: emp,
        isActive: prev.isActive || s.isOpen,
        sessions: [...prev.sessions, s],
        totalHours: prev.totalHours + (s.durHrs || 0),
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return b.totalHours - a.totalHours;
    });
  }, [attendanceRecentSessions]);

  const isClockedIn = attendanceStatus?.is_clocked_in || false;

  const reportTitle =
    activeReport === 'orders'
      ? 'דוח הזמנות'
      : activeReport === 'inspections'
        ? 'דוח ביקורות יציאה'
        : activeReport === 'warehouse'
          ? 'דוח מחסן'
          : activeReport === 'maintenance'
            ? 'דוח תחזוקה'
            : activeReport === 'income-expenses'
              ? 'דוח הוצאות והכנסות'
              : 'דוח נוכחות';

  const loadMonthlyIncomeExpenses = async () => {
    try {
      setLoadingMonthlyReport(true);
      const response = await fetch(`${API_BASE_URL}/api/reports/monthly-income-expenses`);
      if (response.ok) {
        const data = await response.json();
        setMonthlyIncomeExpenses(data);
      } else {
        console.error('Failed to load monthly income/expenses:', response.status);
        setMonthlyIncomeExpenses(null);
      }
    } catch (err) {
      console.error('Error loading monthly income/expenses:', err);
      setMonthlyIncomeExpenses(null);
    } finally {
      setLoadingMonthlyReport(false);
    }
  };

  const openReport = (r: typeof activeReport) => {
    setActiveReport(r);
    setReportView('detail');
    if (r === 'income-expenses') {
      loadMonthlyIncomeExpenses();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable
          onPress={() => {
            if (reportView === 'detail') {
              setReportView('list');
              return;
            }
            onBack();
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            ← {reportView === 'detail' ? 'לכל הדוחות' : 'חזרה'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onRefresh}
          style={[styles.backButton, { marginRight: 10, backgroundColor: '#ffffff' }]}
        >
          <Text style={styles.backButtonText}>רענון</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.ordersPageHeader}>
          <Text style={styles.ordersPageTitle}>
            {reportView === 'detail' ? `${reportTitle} – פירוט` : 'דוחות'}
          </Text>
          <Text style={styles.ordersPageSubtitle}>
            {reportView === 'detail'
              ? 'נתונים מורחבים ותובנות – מתוך המערכת'
              : 'סיכום מצב המערכת לפי מודולים (ללא צ׳אט)'}
          </Text>
        </View>

        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeader}>
            <Text style={styles.summaryTitleEnhanced}>סיכום פיננסי</Text>
          </View>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>₪{totalRevenue.toLocaleString('he-IL')}</Text>
              <Text style={styles.summaryStatLabel}>הכנסות</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>₪{totalPaid.toLocaleString('he-IL')}</Text>
              <Text style={styles.summaryStatLabel}>שולם</Text>
            </View>
          </View>
          <View style={[styles.summaryStatsRow, { marginTop: 14 }]}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>₪{pendingAmount.toLocaleString('he-IL')}</Text>
              <Text style={styles.summaryStatLabel}>יתרה פתוחה</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>₪{totalExpenses.toLocaleString('he-IL')}</Text>
              <Text style={styles.summaryStatLabel}>הוצאות</Text>
            </View>
          </View>
          {reportsSummaryError ? (
            <View style={styles.summaryNoteContainer}>
              <Text style={styles.summaryNoteEnhanced}>
                {reportsSummaryError}
              </Text>
            </View>
          ) : null}
        </View>

        {reportView === 'list' ? (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionTitle}>דוחות לפי מסך</Text>
            <View style={styles.optionGrid}>
              <OptionCard
                title="דוח הזמנות"
                icon="הז"
                accent="#38bdf8"
                details={[
                  `מספר הזמנות: ${orders.length}`,
                  `סה״כ הכנסות: ₪${localTotalRevenue.toLocaleString('he-IL')}`,
                  `שולם: ₪${localTotalPaid.toLocaleString('he-IL')}`,
                ]}
                cta="פתח דוח מלא"
                onPress={() => openReport('orders')}
              />
              <OptionCard
                title="דוח ביקורות יציאה"
                icon="בי"
                accent="#f97316"
                details={[
                  `סה״כ ביקורות: ${inspectionsTotal}`,
                  `דורש היום: ${inspectionsToday} | עבר: ${inspectionsOverdue}`,
                  `טרם הגיע: ${inspectionsNotYet} | הושלמה: ${inspectionsDone}`,
                ]}
                cta="פתח דוח מלא"
                onPress={() => openReport('inspections')}
              />
              <OptionCard
                title="דוח מחסן"
                icon="מח"
                accent="#a78bfa"
                details={[
                  `מספר מחסנים: ${warehouses.length}`,
                  `מספר פריטים: ${warehouseItemsCount}`,
                  `כמות כוללת: ${warehouseTotalQty}`,
                ]}
                cta="פתח דוח מלא"
                onPress={() => openReport('warehouse')}
              />
              <OptionCard
                title="דוח תחזוקה"
                icon="תח"
                accent="#22c55e"
                details={[
                  `סה״כ משימות: ${maintenanceTotal}`,
                  `פתוח: ${maintenanceOpen} | בטיפול: ${maintenanceInProgress}`,
                  `סגור: ${maintenanceClosed}`,
                ]}
                cta="פתח דוח מלא"
                onPress={() => openReport('maintenance')}
              />
              <OptionCard
                title="דוח נוכחות"
                icon="נכ"
                accent="#ec4899"
                details={[
                  `סטטוס: ${isClockedIn ? 'בעבודה' : 'לא בעבודה'}`,
                  `לוגים אחרונים: ${(attendanceLogsReport || []).length}`,
                ]}
                cta="פתח דוח מלא"
                onPress={() => openReport('attendance')}
              />
              <OptionCard
                title="דוח הוצאות והכנסות"
                icon="הו"
                accent="#10b981"
                details={[
                  `סה״כ הכנסות: ${formatMoney(totalRevenue)}`,
                  `סה״כ הוצאות: ${formatMoney(totalExpenses)}`,
                  `יתרה: ${formatMoney(totalRevenue - totalExpenses)}`,
                ]}
                cta="פתח דוח מלא"
                onPress={() => openReport('income-expenses')}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.card, { marginTop: 18 }]}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.title, { fontSize: 20 }]}>{reportTitle}</Text>
              <Pressable
                onPress={
                  activeReport === 'orders'
                    ? onOpenOrders
                    : activeReport === 'inspections'
                      ? onOpenExitInspections
                      : activeReport === 'warehouse'
                        ? onOpenWarehouse
                        : activeReport === 'maintenance'
                          ? onOpenMaintenance
                          : activeReport === 'income-expenses'
                            ? () => {}
                            : onOpenAttendance
                }
                style={[styles.addOrderButton, { backgroundColor: '#0ea5e9' }]}
              >
                <Text style={styles.addOrderButtonText}>פתח מסך</Text>
              </Pressable>
            </View>

            {activeReport === 'orders' ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>כל ההזמנות לפי יחידת נופש</Text>
              <View style={styles.reportUnitKpiGrid}>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>סה״כ הזמנות</Text>
                  <Text style={styles.reportUnitKpiValue}>{orders.length}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>חדש</Text>
                  <Text style={styles.reportUnitKpiValue}>{ordersByStatus['חדש'] || 0}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>באישור</Text>
                  <Text style={styles.reportUnitKpiValue}>{ordersByStatus['באישור'] || 0}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>שולם חלקית</Text>
                  <Text style={styles.reportUnitKpiValue}>{ordersByStatus['שולם חלקית'] || 0}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>שולם</Text>
                  <Text style={styles.reportUnitKpiValue}>{ordersByStatus['שולם'] || 0}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>בוטל</Text>
                  <Text style={styles.reportUnitKpiValue}>{ordersByStatus['בוטל'] || 0}</Text>
                </View>
              </View>

              {ordersByUnitReport.length === 0 ? (
                <Text style={styles.progressNote}>אין הזמנות</Text>
              ) : (
                ordersByUnitReport.map(u => (
                  <View key={u.unit} style={[styles.card, { marginTop: 12, borderColor: '#bae6fd' }]}>
                    <Text style={[styles.title, { fontSize: 18 }]}>{u.unit}</Text>
                    <View style={styles.reportUnitKpiGrid}>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>הזמנות</Text>
                        <Text style={styles.reportUnitKpiValue}>{u.orders.length}</Text>
                      </View>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>הכנסות</Text>
                        <Text style={styles.reportUnitKpiValue}>{formatMoney(u.totalRevenue)}</Text>
                      </View>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>שולם</Text>
                        <Text style={styles.reportUnitKpiValue}>{formatMoney(u.totalPaid)}</Text>
                      </View>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>יתרה</Text>
                        <Text style={styles.reportUnitKpiValue}>{formatMoney(u.totalOutstanding)}</Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 10 }}>
                      {u.orders.map(o => {
                        return (
                          <View key={o.id} style={styles.reportOrderMiniCard}>
                            <View style={styles.reportOrderMiniHeader}>
                              <Text style={styles.reportOrderId}>#{o.id}</Text>
                            </View>

                            <Text style={styles.reportOrderLine}>סטטוס: {o.status}</Text>
                            <Text style={styles.reportOrderLine}>
                              תאריכים: {o.arrivalDate}–{o.departureDate}
                            </Text>
                            <Text style={styles.reportOrderLine}>
                              אורח: {o.guestName || 'ללא שם'} • אורחים: {o.guestsCount}
                            </Text>
                            <Text style={styles.reportOrderLine}>
                              תשלום: {formatMoney(o.paidAmount)}/{formatMoney(o.totalAmount)} • יתרה:{' '}
                              {formatMoney(o.remaining)}
                            </Text>
                            <Text style={styles.reportOrderLine}>
                              אופן תשלום: {o.paymentMethod || 'לא צוין'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : null}

            {activeReport === 'inspections' ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>כל הביקורות לפי יחידת נופש</Text>
              <View style={styles.reportUnitKpiGrid}>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>סה״כ</Text>
                  <Text style={styles.reportUnitKpiValue}>{inspectionsTotal}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>טרם הגיע</Text>
                  <Text style={styles.reportUnitKpiValue}>{inspectionsNotYet}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>דורש היום</Text>
                  <Text style={styles.reportUnitKpiValue}>{inspectionsToday}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>עבר</Text>
                  <Text style={styles.reportUnitKpiValue}>{inspectionsOverdue}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>הושלמה</Text>
                  <Text style={styles.reportUnitKpiValue}>{inspectionsDone}</Text>
                </View>
              </View>

              {inspectionsByUnit.length === 0 ? (
                <Text style={styles.progressNote}>אין ביקורות</Text>
              ) : (
                inspectionsByUnit.map(u => (
                  <View key={u.unit} style={[styles.card, { marginTop: 12, borderColor: '#fed7aa' }]}>
                    <Text style={[styles.title, { fontSize: 18 }]}>{u.unit}</Text>
                    <Text style={styles.progressNote}>
                      טרם הגיע: {u.notYet} | דורש היום: {u.today} | עבר: {u.overdue} | הושלמה: {u.done} | סה״כ: {u.total}
                    </Text>
                    <View style={{ marginTop: 8 }}>
                      {u.missions.map(m => (
                        <View key={m.id} style={styles.reportOrderMiniCard}>
                          <View style={styles.reportOrderMiniHeader}>
                            <Text style={styles.reportOrderId}>{m.departureDate}</Text>
                          </View>
                          <Text style={styles.reportOrderLine}>סטטוס: {m.status}</Text>
                          <Text style={styles.reportOrderLine}>
                            משימות: {m.doneTasks}/{m.totalTasks} ({m.completionPct}%)
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : null}

            {activeReport === 'warehouse' ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>חלק 1: מלאי – כמה יש מכל מוצר בכל מחסן</Text>
              <View style={styles.reportUnitKpiGrid}>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>מחסנים</Text>
                  <Text style={styles.reportUnitKpiValue}>{warehouses.length}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>פריטים (שורות)</Text>
                  <Text style={styles.reportUnitKpiValue}>{warehouseItemsCount}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>כמות כוללת</Text>
                  <Text style={styles.reportUnitKpiValue}>{warehouseTotalQty}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => setShowAllWarehouseStock(v => !v)}
                style={[styles.addOrderButton, { backgroundColor: '#a78bfa', marginTop: 10, alignSelf: 'flex-start' }]}
              >
                <Text style={styles.addOrderButtonText}>{showAllWarehouseStock ? 'הצג פחות' : 'הצג הכל'}</Text>
              </Pressable>

              {warehouseInventoryByWarehouse.length === 0 ? (
                <Text style={[styles.progressNote, { marginTop: 10 }]}>אין נתוני מלאי</Text>
              ) : (
                warehouseInventoryByWarehouse.map(w => (
                  <View key={w.warehouseId} style={[styles.card, { marginTop: 12, borderColor: '#ddd6fe' }]}>
                    <Text style={[styles.title, { fontSize: 18 }]}>{w.warehouseName}</Text>
                    <View style={styles.reportUnitKpiGrid}>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>כמות כוללת</Text>
                        <Text style={styles.reportUnitKpiValue}>{w.totalQty}</Text>
                      </View>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>מספר מוצרים</Text>
                        <Text style={styles.reportUnitKpiValue}>{w.items.length}</Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 8 }}>
                      {(showAllWarehouseStock ? w.items : w.items.slice(0, 25)).map(it => (
                        <Text key={`${w.warehouseId}-${it.name}-${it.unit}`} style={styles.progressNote}>
                          {it.name}: {it.qty} {it.unit}
                        </Text>
                      ))}
                      {!showAllWarehouseStock && w.items.length > 25 ? (
                        <Text style={[styles.progressNote, { marginTop: 6 }]}>
                          ועוד {w.items.length - 25} מוצרים…
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}

              <Text style={[styles.label, { marginTop: 16 }]}>חלק 2: הזמנות – סטטוס ותוכן</Text>
              <View style={styles.reportUnitKpiGrid}>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>סה״כ הזמנות</Text>
                  <Text style={styles.reportUnitKpiValue}>{inventoryOrders.length}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>שולם מלא</Text>
                  <Text style={styles.reportUnitKpiValue}>{inventoryOrdersByStatus['שולם מלא'] || 0}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>מחכה להשלמת תשלום</Text>
                  <Text style={styles.reportUnitKpiValue}>{inventoryOrdersByStatus['מחכה להשלמת תשלום'] || 0}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => setShowAllWarehouseOrders(v => !v)}
                style={[styles.addOrderButton, { backgroundColor: '#f59e0b', marginTop: 10, alignSelf: 'flex-start' }]}
              >
                <Text style={styles.addOrderButtonText}>{showAllWarehouseOrders ? 'הצג פחות' : 'הצג הכל'}</Text>
              </Pressable>

              {inventoryOrdersSorted.length === 0 ? (
                <Text style={[styles.progressNote, { marginTop: 10 }]}>אין הזמנות מחסן</Text>
              ) : (
                (showAllWarehouseOrders ? inventoryOrdersSorted : inventoryOrdersSorted.slice(0, 30)).map(o => (
                  <View key={o.id} style={[styles.card, { marginTop: 12, borderColor: '#fde68a' }]}>
                    <Text style={[styles.title, { fontSize: 16 }]}>{o.id}</Text>
                    <Text style={styles.progressNote}>סטטוס: {o.status}</Text>
                    <Text style={styles.progressNote}>
                      תוכן: {o.itemName} — {o.quantity} {o.unit}
                    </Text>
                    <Text style={styles.progressNote}>סוג: {o.orderType}</Text>
                    {o.orderedBy ? (
                      <Text style={styles.progressNote}>הוזמן ע״י: {o.orderedBy}</Text>
                    ) : null}
                    {o.unitNumber ? (
                      <Text style={styles.progressNote}>יחידה: {o.unitNumber}</Text>
                    ) : null}
                    <Text style={styles.progressNote}>תאריך הזמנה: {o.orderDate || '-'}</Text>
                    {o.deliveryDate ? (
                      <Text style={styles.progressNote}>תאריך אספקה: {o.deliveryDate}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          ) : null}

            {activeReport === 'maintenance' ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>סיכום</Text>
              <View style={styles.reportUnitKpiGrid}>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>פתוח</Text>
                  <Text style={styles.reportUnitKpiValue}>{maintenanceOpen}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>בטיפול</Text>
                  <Text style={styles.reportUnitKpiValue}>{maintenanceInProgress}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>סגור</Text>
                  <Text style={styles.reportUnitKpiValue}>{maintenanceClosed}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>סה״כ</Text>
                  <Text style={styles.reportUnitKpiValue}>{maintenanceTotal}</Text>
                </View>
              </View>

              <Text style={[styles.label, { marginTop: 12 }]}>התפלגות לפי עובד (Top 8)</Text>
              {maintenanceByAssignee.length === 0 ? (
                <Text style={styles.progressNote}>אין נתונים</Text>
              ) : (
                maintenanceByAssignee.map(p => (
                  <Text key={p.assignee} style={styles.progressNote}>
                    {p.assignee}: {p.count}
                  </Text>
                ))
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>יחידות עם הכי הרבה משימות פתוחות (Top 10)</Text>
              {maintenanceByUnit.length === 0 ? (
                <Text style={styles.progressNote}>אין נתונים</Text>
              ) : (
                maintenanceByUnit.map(u => (
                  <Text key={u.unit} style={styles.progressNote}>
                    {u.unit}: פתוחות {u.open}, סה״כ {u.total}
                  </Text>
                ))
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>משימות פתוחות (Top 10)</Text>
              {maintenanceTopOpen.length === 0 ? (
                <Text style={styles.progressNote}>אין משימות פתוחות</Text>
              ) : (
                maintenanceTopOpen.map((t: any) => {
                  const assigned = (t.assigned_to || t.assignedTo || '').toString();
                  return (
                    <View key={t.id} style={styles.reportOrderMiniCard}>
                      <View style={styles.reportOrderMiniHeader}>
                        <Text style={styles.reportOrderId}>{t.title || 'משימה'}</Text>
                      </View>
                      <Text style={styles.reportOrderLine}>סטטוס: {normalizeMaintenanceStatus(t.status)}</Text>
                      {assigned ? (
                        <Text style={styles.reportOrderLine}>מוקצה ל: {resolveAssignee(assigned)}</Text>
                      ) : (
                        <Text style={styles.reportOrderLine}>מוקצה ל: לא משויך</Text>
                      )}
                    </View>
                  );
                })
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>משימות פתוחות הכי ישנות (Top 10)</Text>
              {maintenanceOldOpen.length === 0 ? (
                <Text style={styles.progressNote}>אין נתונים</Text>
              ) : (
                maintenanceOldOpen.map((t: any) => (
                  <View key={t.id} style={styles.reportOrderMiniCard}>
                    <View style={styles.reportOrderMiniHeader}>
                      <Text style={styles.reportOrderId}>{t.title || 'משימה'}</Text>
                    </View>
                    <Text style={styles.reportOrderLine}>סטטוס: {normalizeMaintenanceStatus(t.status)}</Text>
                    <Text style={styles.reportOrderLine}>גיל: {t._ageDays || 0} ימים</Text>
                  </View>
                ))
              )}

              <Text style={[styles.label, { marginTop: 16 }]}>כל המשימות לפי יחידה</Text>
              {maintenanceTasksByUnit.length === 0 ? (
                <Text style={styles.progressNote}>אין משימות תחזוקה</Text>
              ) : (
                maintenanceTasksByUnit.map(u => (
                  <View key={u.unitId} style={[styles.card, { marginTop: 12, borderColor: '#bbf7d0' }]}>
                    <Text style={[styles.title, { fontSize: 18 }]}>{u.unitName}</Text>
                    <View style={styles.reportUnitKpiGrid}>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>פתוח</Text>
                        <Text style={styles.reportUnitKpiValue}>{u.open}</Text>
                      </View>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>בטיפול</Text>
                        <Text style={styles.reportUnitKpiValue}>{u.inProgress}</Text>
                      </View>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>סגור</Text>
                        <Text style={styles.reportUnitKpiValue}>{u.closed}</Text>
                      </View>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>סה״כ</Text>
                        <Text style={styles.reportUnitKpiValue}>{u.total}</Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 8 }}>
                      {u.tasks.map((t: any) => (
                        <View key={t.id} style={styles.reportOrderMiniCard}>
                          <View style={styles.reportOrderMiniHeader}>
                            <Text style={styles.reportOrderId}>{t.title || 'משימה'}</Text>
                          </View>
                          <Text style={styles.reportOrderLine}>סטטוס: {normalizeMaintenanceStatus(t.status)}</Text>
                          {(t.assigned_to || t.assignedTo) ? (
                            <Text style={styles.reportOrderLine}>
                              מוקצה ל: {resolveAssignee((t.assigned_to || t.assignedTo).toString())}
                            </Text>
                          ) : (
                            <Text style={styles.reportOrderLine}>מוקצה ל: לא משויך</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : null}

            {activeReport === 'attendance' ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>סטטוס עכשיו</Text>
              <View style={styles.reportUnitKpiGrid}>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>סטטוס</Text>
                  <Text style={styles.reportUnitKpiValue}>{isClockedIn ? 'בעבודה' : 'לא בעבודה'}</Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>עובדים מחוברים</Text>
                  <Text style={styles.reportUnitKpiValue}>{currentlyClockedInEmployees.length}</Text>
                </View>
              </View>
              {currentlyClockedInEmployees.length > 0 ? (
                <Text style={styles.progressNote}>
                  עובדים פעילים: {currentlyClockedInEmployees.join(', ')}
                </Text>
              ) : null}

              <Text style={[styles.label, { marginTop: 12 }]}>שעות ב-7 ימים אחרונים (Top 10)</Text>
              {hoursLast7DaysByEmployee.length === 0 ? (
                <Text style={styles.progressNote}>אין נתוני נוכחות</Text>
              ) : (
                hoursLast7DaysByEmployee.map(r => (
                  <Text key={r.employee} style={styles.progressNote}>
                    {r.employee}: {r.hours.toFixed(1)} שעות
                  </Text>
                ))
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>שעות ב-30 ימים אחרונים (Top 10)</Text>
              {hoursLast30DaysByEmployee.length === 0 ? (
                <Text style={styles.progressNote}>אין נתונים</Text>
              ) : (
                hoursLast30DaysByEmployee.map(r => (
                  <Text key={r.employee} style={styles.progressNote}>
                    {r.employee}: {r.hours.toFixed(1)} שעות
                  </Text>
                ))
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>סשנים אחרונים (Top 20)</Text>
              {attendanceRecentSessions.length === 0 ? (
                <Text style={styles.progressNote}>אין סשנים</Text>
              ) : (
                attendanceRecentSessions.map(s => (
                  <View key={s.id} style={styles.reportOrderMiniCard}>
                    <View style={styles.reportOrderMiniHeader}>
                      <Text style={styles.reportOrderId}>{s.emp}</Text>
                    </View>
                    <Text style={styles.reportOrderLine}>תאריך: {s.day}</Text>
                    <Text style={styles.reportOrderLine}>שעות: {s.timeIn} - {s.timeOut}</Text>
                    <Text style={styles.reportOrderLine}>
                      משך: {s.durHrs.toFixed(1)} שעות{s.isOpen ? ' (פתוח)' : ''}
                    </Text>
                  </View>
                ))
              )}

              <Text style={[styles.label, { marginTop: 16 }]}>תקופות עבודה לפי עובד</Text>
              {attendancePeriodsByEmployee.length === 0 ? (
                <Text style={styles.progressNote}>אין נתונים</Text>
              ) : (
                attendancePeriodsByEmployee.map(emp => (
                  <View key={emp.employee} style={[styles.card, { marginTop: 12, borderColor: '#fbcfe8' }]}>
                    <Text style={[styles.title, { fontSize: 18 }]}>{emp.employee}</Text>
                    <View style={styles.reportUnitKpiGrid}>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>סטטוס</Text>
                        <Text style={styles.reportUnitKpiValue}>{emp.isActive ? 'בעבודה עכשיו' : 'לא בעבודה'}</Text>
                      </View>
                      <View style={styles.reportUnitKpiItem}>
                        <Text style={styles.reportUnitKpiLabel}>סך שעות (לוגים אחרונים)</Text>
                        <Text style={styles.reportUnitKpiValue}>{emp.totalHours.toFixed(1)}</Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 8 }}>
                      {emp.sessions.map(s => (
                        <View key={s.id} style={styles.reportOrderMiniCard}>
                          <View style={styles.reportOrderMiniHeader}>
                            <Text style={styles.reportOrderId}>{s.day}</Text>
                          </View>
                          <Text style={styles.reportOrderLine}>שעות: {s.timeIn} - {s.timeOut}</Text>
                          <Text style={styles.reportOrderLine}>
                            משך: {s.durHrs.toFixed(1)} שעות{s.isOpen ? ' (פתוח)' : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : null}

            {activeReport === 'income-expenses' ? (
            <View style={{ marginTop: 10 }}>
              {/* Always show totals - use monthlyIncomeExpenses if available, otherwise use reportsSummary */}
              <Text style={styles.label}>סיכום כללי</Text>
              <View style={styles.reportUnitKpiGrid}>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>הכנסות</Text>
                  <Text style={[styles.reportUnitKpiValue, { color: '#10b981' }]}>
                    {formatMoney(
                      monthlyIncomeExpenses?.total_income ?? 
                      reportsSummary?.totalRevenue ?? 
                      totalRevenue
                    )}
                  </Text>
                </View>
                <View style={styles.reportUnitKpiItem}>
                  <Text style={styles.reportUnitKpiLabel}>הוצאות</Text>
                  <Text style={[styles.reportUnitKpiValue, { color: '#ef4444' }]}>
                    {formatMoney(
                      monthlyIncomeExpenses?.total_expenses ?? 
                      reportsSummary?.totalExpenses ?? 
                      totalExpenses
                    )}
                  </Text>
                </View>
              </View>

              {loadingMonthlyReport ? (
                <Text style={[styles.progressNote, { marginTop: 16 }]}>טוען פירוט חודשי...</Text>
              ) : monthlyIncomeExpenses ? (
                <>

                  <Text style={[styles.label, { marginTop: 16 }]}>פירוט חודשי</Text>
                  {monthlyIncomeExpenses.monthly_data.length === 0 ? (
                    <Text style={styles.progressNote}>אין נתונים</Text>
                  ) : (
                    monthlyIncomeExpenses.monthly_data.map((monthData) => {
                      const monthDate = new Date(monthData.month + '-01');
                      const monthName = monthDate.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
                      return (
                        <View key={monthData.month} style={[styles.card, { marginTop: 12, borderColor: '#10b981' }]}>
                          <Text style={[styles.title, { fontSize: 18 }]}>{monthName}</Text>
                          <View style={styles.reportUnitKpiGrid}>
                            <View style={styles.reportUnitKpiItem}>
                              <Text style={styles.reportUnitKpiLabel}>הכנסות</Text>
                              <Text style={[styles.reportUnitKpiValue, { color: '#10b981' }]}>
                                {formatMoney(monthData.income)}
                              </Text>
                            </View>
                            <View style={styles.reportUnitKpiItem}>
                              <Text style={styles.reportUnitKpiLabel}>הוצאות</Text>
                              <Text style={[styles.reportUnitKpiValue, { color: '#ef4444' }]}>
                                {formatMoney(monthData.expenses)}
                              </Text>
                            </View>
                            <View style={styles.reportUnitKpiItem}>
                              <Text style={styles.reportUnitKpiLabel}>יתרה נטו</Text>
                              <Text style={[styles.reportUnitKpiValue, { 
                                color: monthData.net >= 0 ? '#10b981' : '#ef4444' 
                              }]}>
                                {formatMoney(monthData.net)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </>
              ) : (
                <Text style={[styles.progressNote, { marginTop: 16 }]}>שגיאה בטעינת פירוט חודשי</Text>
              )}
            </View>
          ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Chat Screen
type ChatScreenProps = {
  messages: Array<{id: number; sender: string; content: string; created_at: string}>;
  userName: string;
  onSendMessage: (content: string) => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

function ChatScreen({
  messages,
  userName,
  onSendMessage,
  onBack,
  safeAreaInsets,
  statusBar,
}: ChatScreenProps) {
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = React.useRef<ScrollView>(null);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'עכשיו';
      if (diffMins < 60) return `לפני ${diffMins} דקות`;
      if (diffMins < 1440) return `לפני ${Math.floor(diffMins / 60)} שעות`;
      
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${day}/${month} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  React.useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, [messages]);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
        <Text style={styles.ordersPageTitle}>צ'אט פנימי</Text>
      </View>

      <View style={styles.chatContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatMessagesList}
          contentContainerStyle={styles.chatMessagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.chatEmptyState}>
              <Text style={styles.chatEmptyText}>אין הודעות עדיין</Text>
              <Text style={styles.chatEmptySubtext}>היה הראשון לכתוב!</Text>
            </View>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender === userName;
              return (
                <View
                  key={message.id}
                  style={[
                    styles.chatMessageContainer,
                    isOwnMessage && styles.chatMessageOwn,
                  ]}
                >
                  {!isOwnMessage && (
                    <Text style={styles.chatMessageSender}>{message.sender}</Text>
                  )}
                  <View
                    style={[
                      styles.chatMessageBubble,
                      isOwnMessage ? styles.chatMessageBubbleOwn : styles.chatMessageBubbleOther,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chatMessageText,
                        isOwnMessage ? styles.chatMessageTextOwn : styles.chatMessageTextOther,
                      ]}
                    >
                      {message.content}
                    </Text>
                    <Text
                      style={[
                        styles.chatMessageTime,
                        isOwnMessage ? styles.chatMessageTimeOwn : styles.chatMessageTimeOther,
                      ]}
                    >
                      {formatTime(message.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="כתוב הודעה..."
            placeholderTextColor="#94a3b8"
            multiline
            textAlign="right"
            textAlignVertical="top"
            onSubmitEditing={handleSend}
            keyboardType="default"
            returnKeyType="send"
            enablesReturnKeyAutomatically={true}
          />
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.chatSendButton,
              (!newMessage.trim() || pressed) && styles.chatSendButtonDisabled,
            ]}
            disabled={!newMessage.trim()}
          >
            <Text style={styles.chatSendButtonText}>שלח</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Attendance Screen
type AttendanceScreenProps = {
  userName: string;
  attendanceStatus: {is_clocked_in: boolean; session: any} | null;
  attendanceLogs: any[];
  onStart: () => void;
  onStop: () => void;
  onRefresh: () => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

function AttendanceScreen({
  userName,
  attendanceStatus,
  attendanceLogs,
  onStart,
  onStop,
  onRefresh,
  onBack,
  safeAreaInsets,
  statusBar,
}: AttendanceScreenProps) {
  const isClockedIn = attendanceStatus?.is_clocked_in || false;
  const session = attendanceStatus?.session;

  // Filter logs to show only current user's work periods
  const userWorkPeriods = useMemo(() => {
    if (!userName || !attendanceLogs) return [];
    
    return (attendanceLogs || [])
      .filter((log: any) => {
        const emp = log.employee || log.emp || log.user || '';
        return emp.toString().toLowerCase() === userName.toLowerCase();
      })
      .map((log: any) => {
        const clockIn = log.clock_in ? new Date(log.clock_in) : null;
        const clockOut = log.clock_out ? new Date(log.clock_out) : null;
        
        let duration = '00:00';
        if (clockIn) {
          const end = clockOut || new Date();
          const diffMs = end.getTime() - clockIn.getTime();
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        
        return {
          id: log.id,
          clockIn: clockIn,
          clockOut: clockOut,
          duration: duration,
          isActive: !clockOut,
        };
      })
      .sort((a, b) => {
        // Sort by clock in time, newest first
        if (!a.clockIn || !b.clockIn) return 0;
        return b.clockIn.getTime() - a.clockIn.getTime();
      });
  }, [attendanceLogs, userName]);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const calculateDuration = () => {
    if (!session?.clock_in) return '00:00';
    try {
      const start = new Date(session.clock_in);
      const end = session.clock_out ? new Date(session.clock_out) : new Date();
      const diffMs = end.getTime() - start.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return '00:00';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
        <Text style={styles.ordersPageTitle}>שעון נוכחות</Text>
      </View>

      <ScrollView contentContainerStyle={styles.attendanceScroll}>
        <View style={styles.attendanceHeader}>
          <Text style={styles.attendanceUserName}>שלום {userName}</Text>
          <Text style={styles.attendanceSubtitle}>ניהול שעות עבודה</Text>
        </View>

        <View style={styles.attendanceStatusCard}>
          <View style={styles.attendanceStatusHeader}>
            <View style={[
              styles.attendanceStatusIndicator,
              { backgroundColor: isClockedIn ? '#22c55e' : '#94a3b8' }
            ]}>
              <Text style={styles.attendanceStatusIndicatorText}>
                {isClockedIn ? '●' : '○'}
              </Text>
            </View>
            <Text style={styles.attendanceStatusText}>
              {isClockedIn ? 'פעיל - בעבודה' : 'לא פעיל'}
            </Text>
          </View>

          {isClockedIn && session && (
            <View style={styles.attendanceSessionInfo}>
              <View style={styles.attendanceInfoRow}>
                <Text style={styles.attendanceInfoLabel}>התחלה:</Text>
                <Text style={styles.attendanceInfoValue}>
                  {formatDate(session.clock_in)} {formatTime(session.clock_in)}
                </Text>
              </View>
              <View style={styles.attendanceInfoRow}>
                <Text style={styles.attendanceInfoLabel}>משך זמן:</Text>
                <Text style={styles.attendanceInfoValue}>{calculateDuration()}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.attendanceActions}>
          {!isClockedIn ? (
            <Pressable
              style={[styles.attendanceButton, styles.attendanceButtonStart]}
              onPress={onStart}
            >
              <Text style={styles.attendanceButtonIcon}>▶</Text>
              <Text style={styles.attendanceButtonText}>התחל עבודה</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.attendanceButton, styles.attendanceButtonStop]}
              onPress={onStop}
            >
              <Text style={styles.attendanceButtonIcon}>⏹</Text>
              <Text style={styles.attendanceButtonText}>סיים עבודה</Text>
            </Pressable>
          )}
          
          <Pressable
            style={[styles.attendanceButton, styles.attendanceButtonRefresh]}
            onPress={onRefresh}
          >
            <Text style={styles.attendanceButtonText}>רענן</Text>
          </Pressable>
        </View>

        {/* Previous Work Periods - Only Current User */}
        <View style={styles.attendanceHistorySection}>
          <Text style={styles.attendanceHistoryTitle}>תקופות עבודה קודמות</Text>
          {userWorkPeriods.length === 0 ? (
            <View style={styles.attendanceEmptyState}>
              <Text style={styles.attendanceEmptyStateText}>אין תקופות עבודה קודמות</Text>
            </View>
          ) : (
            <View style={styles.attendanceHistoryList}>
              {userWorkPeriods.map((period, index) => (
                <View key={period.id || index} style={styles.attendanceHistoryItem}>
                  <View style={styles.attendanceHistoryItemHeader}>
                    <Text style={styles.attendanceHistoryItemDate}>
                      {period.clockIn ? formatDate(period.clockIn.toISOString()) : 'תאריך לא ידוע'}
                    </Text>
                    {period.isActive && (
                      <View style={styles.attendanceActiveBadge}>
                        <Text style={styles.attendanceActiveBadgeText}>פעיל</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.attendanceHistoryItemDetails}>
                    <View style={styles.attendanceHistoryDetailRow}>
                      <Text style={styles.attendanceHistoryDetailLabel}>כניסה:</Text>
                      <Text style={styles.attendanceHistoryDetailValue}>
                        {period.clockIn ? formatTime(period.clockIn.toISOString()) : '—'}
                      </Text>
                    </View>
                    <View style={styles.attendanceHistoryDetailRow}>
                      <Text style={styles.attendanceHistoryDetailLabel}>יציאה:</Text>
                      <Text style={styles.attendanceHistoryDetailValue}>
                        {period.clockOut ? formatTime(period.clockOut.toISOString()) : '—'}
                      </Text>
                    </View>
                    <View style={styles.attendanceHistoryDetailRow}>
                      <Text style={styles.attendanceHistoryDetailLabel}>משך זמן:</Text>
                      <Text style={[styles.attendanceHistoryDetailValue, styles.attendanceHistoryDuration]}>
                        {period.duration}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type NewMaintenanceTaskScreenProps = {
  unit: MaintenanceUnit;
  onSave: (task: MaintenanceTask) => void;
  systemUsers: SystemUser[];
  onRefreshUsers: () => void;
  onCancel: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
  userName: string;
};

function MaintenanceScreen({
  units,
  onSelectUnit,
  onBack,
  safeAreaInsets,
  statusBar,
}: MaintenanceScreenProps) {
  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case 'פתוח':
        return '#f59e0b';
      case 'בטיפול':
        return '#3b82f6';
      case 'סגור':
        return '#22c55e';
      default:
        return '#64748b';
    }
  };

  const getUnitStats = (unit: MaintenanceUnit) => {
    const open = unit.tasks.filter(t => t.status === 'פתוח').length;
    const inProgress = unit.tasks.filter(t => t.status === 'בטיפול').length;
    const closed = unit.tasks.filter(t => t.status === 'סגור').length;
    return { open, inProgress, closed, total: unit.tasks.length };
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>תחזוקה</Text>
            <Text style={styles.subtitle}>
              ניהול משימות תחזוקה ליחידות נופש
            </Text>
          </View>
        </View>

        <View style={styles.unitsGrid}>
          {units.map(unit => {
            const stats = getUnitStats(unit);
            return (
              <Pressable
                key={unit.id}
                onPress={() => onSelectUnit(unit.id)}
                style={styles.unitCard}
              >
                <View style={styles.unitCardHeader}>
                  <View style={styles.unitIcon}>
                    <Text style={styles.unitIconText}>
                      {unit.type === 'יחידה' ? '🏠' : '🏡'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.unitCardName}>{unit.name}</Text>
                    <Text style={styles.unitCardType}>{unit.type}</Text>
                  </View>
                </View>
                <View style={styles.unitStats}>
                  <View style={styles.unitStatItem}>
                    <Text style={styles.unitStatValue}>{stats.total}</Text>
                    <Text style={styles.unitStatLabel}>סה״כ משימות</Text>
                  </View>
                  <View style={styles.unitStatItem}>
                    <Text style={[styles.unitStatValue, { color: '#f59e0b' }]}>
                      {stats.open}
                    </Text>
                    <Text style={styles.unitStatLabel}>פתוחות</Text>
                  </View>
                  <View style={styles.unitStatItem}>
                    <Text style={[styles.unitStatValue, { color: '#3b82f6' }]}>
                      {stats.inProgress}
                    </Text>
                    <Text style={styles.unitStatLabel}>בטיפול</Text>
                  </View>
                  <View style={styles.unitStatItem}>
                    <Text style={[styles.unitStatValue, { color: '#22c55e' }]}>
                      {stats.closed}
                    </Text>
                    <Text style={styles.unitStatLabel}>סגורות</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MaintenanceTasksScreen({
  unit,
  resolveAssignee,
  onSelectTask,
  onNewTask,
  onBack,
  safeAreaInsets,
  statusBar,
}: MaintenanceTasksScreenProps) {
  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case 'פתוח':
        return '#f59e0b';
      case 'בטיפול':
        return '#3b82f6';
      case 'סגור':
        return '#22c55e';
      default:
        return '#64748b';
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>{unit.name}</Text>
            <Text style={styles.subtitle}>
              משימות תחזוקה - {unit.tasks.length} משימות
            </Text>
          </View>
        </View>

        <View style={styles.ordersHeaderRow}>
          <Text style={styles.sectionTitle}>משימות תחזוקה</Text>
          <Pressable onPress={onNewTask} style={styles.addOrderButton}>
            <Text style={styles.addOrderButtonText}>+ משימה חדשה</Text>
          </Pressable>
        </View>

        {unit.tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין משימות תחזוקה ליחידה זו</Text>
          </View>
        ) : (
          unit.tasks.map(task => (
            <Pressable
              key={task.id}
              onPress={() => onSelectTask(task.id)}
              style={styles.taskCard}
            >
              <View style={styles.taskCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskCardTitle}>{task.title}</Text>
                  <Text style={styles.taskCardDescription}>{task.description}</Text>
                  <View style={styles.taskCardMeta}>
                    <Text style={styles.taskCardMetaText}>
                      תאריך: {task.createdDate}
                    </Text>
                  </View>
                  {task.assignedTo && (
                    <Text style={styles.taskCardAssigned}>
                      מוקצה ל: {resolveAssignee(task.assignedTo)}
                    </Text>
                  )}
                </View>
                <View style={styles.taskCardBadges}>
                  <View
                    style={[
                      styles.taskStatusBadge,
                      { backgroundColor: getStatusColor(task.status) + '22' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.taskStatusText,
                        { color: getStatusColor(task.status) },
                      ]}
                    >
                      {task.status}
                    </Text>
                  </View>
                </View>
              </View>
              {task.imageUri && (
                <View style={styles.taskImageIndicator}>
                  <Text style={styles.taskImageIndicatorText}>📎 מדיה מצורפת</Text>
                </View>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MaintenanceTaskDetailScreen({
  unit,
  task,
  resolveAssignee,
  onUpdateTask,
  onBack,
  safeAreaInsets,
  statusBar,
}: MaintenanceTaskDetailScreenProps) {
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeModalImageUri, setCloseModalImageUri] = useState<string | undefined>(undefined);
  const [showEditMediaModal, setShowEditMediaModal] = useState(false);
  const [editMediaUri, setEditMediaUri] = useState<string | undefined>(undefined);
  const [hasNewMedia, setHasNewMedia] = useState(false);

  const handleOpenCloseModal = () => {
    setCloseModalImageUri(undefined);
    setShowCloseModal(true);
  };

  const handleCloseModalImageSelect = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed', // Allow both photos and videos
        selectionLimit: 1,
        includeBase64: true,
      });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('שגיאה', 'לא נבחר קובץ');
        return;
      }
      const mime = asset.type || 'image/jpeg';
      // For videos, use file URI directly (base64 is too large)
      // For images, use base64 if available
      const uri = (asset.type?.startsWith('video/') || !asset.base64) 
        ? asset.uri 
        : `data:${mime};base64,${asset.base64}`;
      setCloseModalImageUri(uri);
    } catch (err: any) {
      console.error('Error selecting media:', err);
      Alert.alert('שגיאה', err?.message || 'לא ניתן לבחור מדיה. בדוק את החיבור לאינטרנט.');
    }
  };

  const handleEditMediaSelect = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed', // Allow both photos and videos
        selectionLimit: 1,
        includeBase64: true,
      });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('שגיאה', 'לא נבחר קובץ');
        return;
      }
      const mime = asset.type || 'image/jpeg';
      // For videos, use file URI directly (base64 is too large)
      // For images, use base64 if available
      const uri = (asset.type?.startsWith('video/') || !asset.base64) 
        ? asset.uri 
        : `data:${mime};base64,${asset.base64}`;
      setEditMediaUri(uri);
      setHasNewMedia(true); // Mark that new media was selected
    } catch (err: any) {
      console.error('Error selecting media:', err);
      Alert.alert('שגיאה', err?.message || 'לא ניתן לבחור מדיה. בדוק את החיבור לאינטרנט.');
    }
  };

  const handleSaveEditMedia = async () => {
    try {
      // If editMediaUri is null/undefined, remove the media by sending null
      // Otherwise, update with new media
      const imageUriToSave = editMediaUri === null || editMediaUri === undefined ? null : editMediaUri;
      await onUpdateTask(task.id, { imageUri: imageUriToSave });
      Alert.alert('הצלחה', imageUriToSave ? 'המדיה עודכנה בהצלחה' : 'המדיה הוסרה בהצלחה');
      setShowEditMediaModal(false);
      setHasNewMedia(false); // Reset flag after saving
    } catch (err: any) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לעדכן את המדיה');
    }
  };

  const handleConfirmClose = () => {
    if (!closeModalImageUri) {
      Alert.alert('שגיאה', 'יש להעלות תמונה או וידאו לפני סגירת המשימה');
      return;
    }
    onUpdateTask(task.id, { status: 'סגור', imageUri: closeModalImageUri });
    Alert.alert('הצלחה', 'המשימה נסגרה בהצלחה');
    setShowCloseModal(false);
    onBack();
  };

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case 'פתוח':
        return '#f59e0b';
      case 'בטיפול':
        return '#3b82f6';
      case 'סגור':
        return '#22c55e';
      default:
        return '#64748b';
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.taskDetailCard}>
          <View style={styles.taskDetailHeader}>
            <Text style={styles.taskDetailTitle}>{task.title}</Text>
            <View style={styles.taskDetailBadges}>
              <View
                style={[
                  styles.taskStatusBadge,
                  { backgroundColor: getStatusColor(task.status) + '22' },
                ]}
              >
                <Text
                  style={[
                    styles.taskStatusText,
                    { color: getStatusColor(task.status) },
                  ]}
                >
                  {task.status}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.taskDetailSection}>
            <Text style={styles.taskDetailLabel}>יחידה:</Text>
            <Text style={styles.taskDetailValue}>{unit.name}</Text>
          </View>

          <View style={styles.taskDetailSection}>
            <Text style={styles.taskDetailLabel}>תאריך יצירה:</Text>
            <Text style={styles.taskDetailValue}>{task.createdDate}</Text>
          </View>

          {task.assignedTo && (
            <View style={styles.taskDetailSection}>
              <Text style={styles.taskDetailLabel}>מוקצה ל:</Text>
              <Text style={styles.taskDetailValue}>{resolveAssignee(task.assignedTo)}</Text>
            </View>
          )}

          <View style={styles.taskDetailSection}>
            <Text style={styles.taskDetailLabel}>תיאור:</Text>
            <Text style={styles.taskDetailDescription}>{task.description}</Text>
          </View>

          {/* Display image/video if exists (for both open and closed tasks) */}
          {task.imageUri && (
            <View style={styles.taskDetailSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.taskDetailLabel}>
                  {task.imageUri.startsWith('data:video/') || task.imageUri.includes('.mp4') || task.imageUri.includes('.mov') 
                    ? 'וידאו:' 
                    : 'תמונה:'}
                </Text>
                <Pressable 
                  onPress={() => {
                    setEditMediaUri(task.imageUri);
                    setHasNewMedia(false); // Reset flag when opening with existing media
                    setShowEditMediaModal(true);
                  }}
                  style={styles.editMediaButton}
                >
                  <Text style={styles.editMediaButtonText}>ערוך/העלה</Text>
                </Pressable>
              </View>
              <View style={styles.taskImageContainer}>
                {task.imageUri.startsWith('data:video/') || task.imageUri.includes('.mp4') || task.imageUri.includes('.mov') ? (
                  <Video
                    source={{ uri: task.imageUri }}
                    style={styles.taskDetailImage}
                    controls
                    resizeMode="contain"
                    paused={true}
                    onError={(error) => {
                      console.error('Video playback error:', error);
                      Alert.alert('שגיאה', 'לא ניתן לנגן את הוידאו. נסה שוב או החלף את הקובץ.');
                    }}
                  />
                ) : (
                  <Image
                    source={{ uri: task.imageUri }}
                    style={styles.taskDetailImage}
                    resizeMode="contain"
                    onError={() => {
                      Alert.alert('שגיאה', 'לא ניתן לטעון את התמונה. נסה שוב או החלף את הקובץ.');
                    }}
                  />
                )}
              </View>
              {task.status === 'סגור' && (
                <View style={styles.taskClosedIndicator}>
                  <Text style={styles.taskClosedIndicatorText}>✓ משימה סגורה</Text>
                </View>
              )}
            </View>
          )}
          
          {/* Upload media button - always available */}
          <View style={styles.taskDetailSection}>
            <Pressable 
              onPress={() => {
                setEditMediaUri(task.imageUri || undefined);
                setHasNewMedia(false); // Reset flag when opening modal
                setShowEditMediaModal(true);
              }}
              style={styles.addMediaButton}
            >
              <Text style={styles.addMediaButtonText}>
                {task.imageUri ? 'ערוך/החלף תמונה/וידאו' : '+ הוסף תמונה/וידאו'}
              </Text>
            </Pressable>
          </View>

          {task.status !== 'סגור' && (
            <View style={styles.taskActions}>
              <Pressable onPress={handleOpenCloseModal} style={styles.closeTaskButton}>
                <Text style={styles.closeTaskButtonText}>סגור משימה</Text>
              </Pressable>
            </View>
          )}

          {task.status === 'סגור' && !task.imageUri && (
            <View style={styles.taskActions}>
              <View style={styles.taskClosedButton}>
                <Text style={styles.taskClosedButtonText}>✓ משימה סגורה</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCloseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCloseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>סגירת משימה</Text>
            <Text style={styles.modalSubtitle}>
              על מנת לסגור את המשימה, יש להעלות תמונה או וידאו
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>תמונה/וידאו *</Text>
              {closeModalImageUri ? (
                <View style={styles.closeModalImageContainer}>
                  <View style={styles.taskImagePreviewContainer}>
                    {closeModalImageUri.startsWith('data:video/') || closeModalImageUri.includes('.mp4') || closeModalImageUri.includes('.mov') ? (
                      <Video
                        source={{ uri: closeModalImageUri }}
                        style={styles.taskImagePreview}
                        controls
                        resizeMode="contain"
                        paused={false}
                      />
                    ) : (
                      <Image
                        source={{ uri: closeModalImageUri }}
                        style={styles.taskImagePreview}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <View style={styles.closeModalButtonsGrid}>
                    <Pressable
                      onPress={handleCloseModalImageSelect}
                      style={[styles.closeModalGridButton, styles.changeImageButton]}
                    >
                      <Text style={styles.changeImageButtonText}>החלף</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleCloseModalImageSelect}
                      style={[styles.closeModalGridButton, styles.uploadImageButton]}
                    >
                      <Text style={styles.uploadImageButtonText}>העלה אחר</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleConfirmClose}
                      style={[styles.closeModalGridButton, styles.closeTaskButton]}
                    >
                      <Text style={styles.closeTaskButtonText}>סגור משימה</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowCloseModal(false)}
                      style={[styles.closeModalGridButton, styles.modalButtonGhost]}
                    >
                      <Text style={styles.modalButtonGhostText}>ביטול</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View>
                  <Pressable
                    onPress={handleCloseModalImageSelect}
                    style={styles.uploadImageButton}
                  >
                    <Text style={styles.uploadImageButtonText}>+ העלה תמונה/וידאו</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Media Modal */}
      <Modal
        visible={showEditMediaModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditMediaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>עריכת מדיה</Text>
            <Text style={styles.modalSubtitle}>
              בחר תמונה או וידאו חדש
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>תמונה/וידאו</Text>
              {editMediaUri ? (
                <View style={styles.closeModalImageContainer}>
                  <View style={styles.taskImagePreviewContainer}>
                    {editMediaUri.startsWith('data:video/') || editMediaUri.includes('.mp4') || editMediaUri.includes('.mov') ? (
                      <Video
                        source={{ uri: editMediaUri }}
                        style={styles.taskImagePreview}
                        controls
                        resizeMode="contain"
                        paused={true}
                      />
                    ) : (
                      <Image
                        source={{ uri: editMediaUri }}
                        style={styles.taskImagePreview}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Pressable
                      onPress={handleEditMediaSelect}
                      style={styles.changeImageButton}
                    >
                      <Text style={styles.changeImageButtonText}>החלף</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={handleEditMediaSelect}
                  style={styles.uploadImageButton}
                >
                  <Text style={styles.uploadImageButtonText}>+ העלה תמונה/וידאו</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.modalButtons}>
              {editMediaUri ? (
                <>
                  <Pressable
                    onPress={handleSaveEditMedia}
                    style={[styles.modalButton, styles.modalButtonPrimary, { flex: 1 }]}
                  >
                    <Text style={styles.modalButtonText}>אישור</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setShowEditMediaModal(false);
                      setHasNewMedia(false); // Reset flag when closing
                    }}
                    style={[styles.modalButton, styles.modalButtonGhost]}
                  >
                    <Text style={styles.modalButtonGhostText}>ביטול</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => {
                    setShowEditMediaModal(false);
                    setHasNewMedia(false); // Reset flag when closing
                  }}
                  style={[styles.modalButton, styles.modalButtonGhost, { flex: 1 }]}
                >
                  <Text style={styles.modalButtonGhostText}>ביטול</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NewMaintenanceTaskScreen({
  unit,
  onSave,
  systemUsers,
  onRefreshUsers,
  onCancel,
  safeAreaInsets,
  statusBar,
  userName,
}: NewMaintenanceTaskScreenProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [media, setMedia] = useState<SelectedMedia | null>(null);

  useEffect(() => {
    // Default assignee: current user (if we can resolve them from system users list)
    if (!assignedTo && userName && systemUsers?.length) {
      const found = systemUsers.find(u => (u.username || '').toString() === userName);
      if (found?.id) setAssignedTo(found.id.toString());
    }
  }, [assignedTo, userName, systemUsers]);

  const handlePickMedia = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed', // Allow both photos and videos
        selectionLimit: 1,
        includeBase64: true,
      });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('שגיאה', 'לא נבחר קובץ');
        return;
      }
      const mime = asset.type || 'image/jpeg';
      const name = asset.fileName || `media-${Date.now()}`;
      // For videos, use file URI directly (base64 is too large)
      // For images, use base64 if available
      const uri = (asset.type?.startsWith('video/') || !asset.base64) 
        ? asset.uri 
        : `data:${mime};base64,${asset.base64}`;
      setMedia({ uri, type: mime, name });
    } catch (err: any) {
      Alert.alert('שגיאה', err?.message || 'לא ניתן לבחור מדיה');
    }
  };

  const handleSave = () => {
    if (!title || !description) {
      Alert.alert('שגיאה', 'אנא מלאו את כל השדות הנדרשים');
      return;
    }
    if (!assignedTo) {
      Alert.alert('שגיאה', 'אנא בחרו עובד לשיוך המשימה');
      return;
    }

    const newTask: MaintenanceTask = {
      id: `task-${Date.now()}`,
      unitId: unit.id,
      title,
      description,
      status: 'פתוח',
      createdDate: new Date().toISOString().split('T')[0],
      assignedTo,
      media,
    };

    onSave(newTask);
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>משימה חדשה</Text>
            <Text style={styles.subtitle}>
              הוספת משימת תחזוקה ל{unit.name}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>כותרת המשימה *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="הזינו כותרת"
              textAlign="right"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>תיאור *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="הזינו תיאור מפורט"
              textAlign="right"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>שיוך עובד *</Text>
            <Pressable
              onPress={() => {
                if (!systemUsers?.length) onRefreshUsers();
                setShowAssigneeModal(true);
              }}
              style={styles.select}
            >
              <Text style={styles.selectValue}>
                {assignedTo
                  ? (systemUsers.find(u => u.id.toString() === assignedTo)?.username || assignedTo)
                  : 'בחרו עובד'}
              </Text>
              <Text style={styles.selectCaret}>▾</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>תמונה/וידאו</Text>
            {media ? (
              <View style={styles.closeModalImageContainer}>
                <View style={styles.taskImagePreviewContainer}>
                  {media.type?.startsWith('video/') || media.uri.includes('.mp4') || media.uri.includes('.mov') ? (
                    <Video
                      source={{ uri: media.uri }}
                      style={styles.taskImagePreview}
                      controls
                      resizeMode="contain"
                      paused={true}
                      onError={(error) => {
                        console.error('Video playback error:', error);
                        Alert.alert('שגיאה', 'לא ניתן לנגן את הוידאו. נסה שוב או החלף את הקובץ.');
                      }}
                    />
                  ) : (
                    <Image
                      source={{ uri: media.uri }}
                      style={styles.taskImagePreview}
                      resizeMode="contain"
                      onError={() => {
                        Alert.alert('שגיאה', 'לא ניתן לטעון את התמונה. נסה שוב או החלף את הקובץ.');
                      }}
                    />
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <Pressable onPress={handlePickMedia} style={styles.changeImageButton}>
                    <Text style={styles.changeImageButtonText}>החלף</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={handlePickMedia} style={styles.uploadImageButton}>
                <Text style={styles.uploadImageButtonText}>+ העלה תמונה/וידאו</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.editActions}>
            <Pressable onPress={handleSave} style={styles.saveOrderButton}>
              <Text style={styles.saveOrderButtonText}>צור משימה</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.cancelOrderButton}>
              <Text style={styles.cancelOrderButtonText}>ביטול</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showAssigneeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssigneeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>בחרו עובד</Text>
            <Text style={styles.modalSubtitle}>בחרו משתמש מהרשימה כדי לשייך אליו את המשימה</Text>

            <ScrollView style={{ marginTop: 10 }}>
              {(systemUsers || []).length === 0 ? (
                <Text style={styles.progressNote}>אין משתמשים (נסו לרענן)</Text>
              ) : (
                (systemUsers || []).map(u => (
                  <Pressable
                    key={u.id}
                    onPress={() => {
                      setAssignedTo(u.id.toString());
                      setShowAssigneeModal(false);
                    }}
                    style={[styles.tableRow, { paddingVertical: 12 }]}
                  >
                    <Text style={styles.progressNote}>{u.username}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => {
                  onRefreshUsers();
                }}
                style={[styles.modalButton, styles.modalButtonPrimary]}
              >
                <Text style={styles.modalButtonText}>רענן רשימה</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowAssigneeModal(false)}
                style={[styles.modalButton, styles.modalButtonGhost]}
              >
                <Text style={styles.modalButtonGhostText}>סגור</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type CleaningScheduleEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  cleaner_name: string;
  created_at?: string;
};

type CleaningScheduleScreenProps = {
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

function CleaningScheduleScreen({
  onBack,
  safeAreaInsets,
  statusBar,
}: CleaningScheduleScreenProps) {
  const [entries, setEntries] = useState<CleaningScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [cleanerName, setCleanerName] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<CleaningScheduleEntry | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  useEffect(() => {
    loadScheduleEntries();
  }, []);

  const loadScheduleEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/cleaning-schedule`);
      if (!response.ok) {
        // If 404 or 500, the table might not exist yet - just use empty array
        if (response.status === 404 || response.status === 500) {
          console.log('Cleaning schedule table may not exist yet, using empty array');
          setEntries([]);
          return;
        }
        throw new Error(`Failed to load schedule: ${response.status}`);
      }
      const data = await response.json();
      setEntries(data || []);
    } catch (err: any) {
      console.error('Error loading schedule:', err);
      // Don't show alert for network errors or 404 - just use empty array
      if (err.message && (err.message.includes('Network') || err.message.includes('fetch'))) {
        console.log('Network error loading schedule, using empty array');
        setEntries([]);
      } else if (err.message && (err.message.includes('404') || err.message.includes('Not Found'))) {
        console.log('Cleaning schedule table does not exist yet, using empty array');
        setEntries([]);
      } else {
        // Only show alert for unexpected errors, and parse JSON error if present
        let errorMessage = 'לא ניתן לטעון את לוח הזמנים';
        try {
          if (err.message) {
            const errorMatch = err.message.match(/\{.*\}/);
            if (errorMatch) {
              const errorJson = JSON.parse(errorMatch[0]);
              if (errorJson.detail && errorJson.detail.includes('404')) {
                // Table doesn't exist - don't show error, just use empty array
                setEntries([]);
                return;
              }
            }
          }
        } catch {
          // Keep default error message
        }
        Alert.alert('שגיאה', errorMessage);
        setEntries([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEntry = async () => {
    // When adding, selectedDate is already set from the day selection
    // When editing, selectedDate should be set from the entry
    if (!selectedDate || !startTime || !endTime || !cleanerName.trim()) {
      Alert.alert('שגיאה', 'יש למלא את כל השדות');
      return;
    }

    try {
      const entryData = {
        date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        cleaner_name: cleanerName.trim(),
      };

      let response;
      if (editingEntry) {
        // Update existing entry
        response = await fetch(`${API_BASE_URL}/api/cleaning-schedule/${editingEntry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData),
        });
      } else {
        // Create new entry
        response = await fetch(`${API_BASE_URL}/api/cleaning-schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData),
        });
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = errorText || 'Failed to save entry';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage = errorJson.detail;
          }
        } catch {
          // Keep original errorMessage
        }
        // Don't show alert for 404 (table doesn't exist) - just log it
        if (response.status === 404) {
          console.log('Cleaning schedule table does not exist yet');
          Alert.alert('שגיאה', 'טבלת סידורי הניקיון לא קיימת. יש ליצור את הטבלה ב-Supabase תחילה.');
        } else {
          throw new Error(errorMessage);
        }
        return;
      }

      await loadScheduleEntries();
      setShowAddModal(false);
      setSelectedDate('');
      setStartTime('');
      setEndTime('');
      setCleanerName('');
      setEditingEntry(null);
    } catch (err: any) {
      let errorMessage = err.message || 'לא ניתן לשמור את הרשומה';
      // Parse JSON error if present
      try {
        if (err.message) {
          const errorMatch = err.message.match(/\{.*\}/);
          if (errorMatch) {
            const errorJson = JSON.parse(errorMatch[0]);
            if (errorJson.detail) {
              if (errorJson.detail.includes('404') || errorJson.detail.includes('Not Found')) {
                errorMessage = 'טבלת סידורי הניקיון לא קיימת. יש ליצור את הטבלה ב-Supabase תחילה.';
              } else {
                errorMessage = errorJson.detail;
              }
            }
          }
        }
      } catch {
        // Keep original error message
      }
      Alert.alert('שגיאה', errorMessage);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    Alert.alert(
      'מחיקת רשומה',
      'האם אתה בטוח שברצונך למחוק את הרשומה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/cleaning-schedule/${id}`, {
                method: 'DELETE',
              });
              if (!response.ok) throw new Error('Failed to delete');
              await loadScheduleEntries();
            } catch (err: any) {
              Alert.alert('שגיאה', 'לא ניתן למחוק את הרשומה');
            }
          },
        },
      ]
    );
  };

  const handleEditEntry = (entry: CleaningScheduleEntry) => {
    setEditingEntry(entry);
    setSelectedDate(entry.date);
    setStartTime(entry.start_time);
    setEndTime(entry.end_time);
    setCleanerName(entry.cleaner_name);
    setShowAddModal(true);
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getEntriesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return entries.filter(e => e.date === dateStr).sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    );
  };

  const formatDate = (date: Date) => {
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return dayNames[date.getDay()];
  };

  const formatDateShort = (date: Date) => {
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const weekDays = getWeekDays();

  return (
    <SafeAreaView style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
        <Text style={styles.ordersPageTitle}>סידורי ניקיון</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.scheduleContainer}>
          {/* Week Navigation */}
          <View style={styles.weekNavigation}>
            <Pressable onPress={() => navigateWeek('prev')} style={styles.weekNavButton}>
              <Text style={styles.weekNavButtonText}>← שבוע קודם</Text>
            </Pressable>
            <Text style={styles.weekTitle}>
              {formatDateShort(weekDays[0])} - {formatDateShort(weekDays[6])}
            </Text>
            <Pressable onPress={() => navigateWeek('next')} style={styles.weekNavButton}>
              <Text style={styles.weekNavButtonText}>שבוע הבא →</Text>
            </Pressable>
          </View>

          {/* Schedule Grid */}
          <View style={styles.scheduleGrid}>
            {weekDays.map((day, index) => {
              const dayEntries = getEntriesForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <View key={index} style={styles.scheduleDay}>
                  <View style={[styles.scheduleDayHeader, isToday && styles.scheduleDayHeaderToday]}>
                    <Text style={[styles.scheduleDayName, isToday && styles.scheduleDayNameToday]}>
                      {formatDate(day)}
                    </Text>
                    <Text style={[styles.scheduleDayDate, isToday && styles.scheduleDayDateToday]}>
                      {formatDateShort(day)}
                    </Text>
                  </View>
                  <ScrollView style={styles.scheduleDayContent}>
                    {dayEntries.length === 0 ? (
                      <Text style={styles.scheduleEmptyText}>אין תורים</Text>
                    ) : (
                      dayEntries.map((entry) => (
                        <Pressable
                          key={entry.id}
                          style={styles.scheduleEntry}
                          onPress={() => handleEditEntry(entry)}
                          onLongPress={() => handleDeleteEntry(entry.id)}
                        >
                          <Text style={styles.scheduleEntryTime}>
                            {entry.start_time} - {entry.end_time}
                          </Text>
                          <Text style={styles.scheduleEntryCleaner}>{entry.cleaner_name}</Text>
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                  <Pressable
                    style={styles.addEntryButton}
                    onPress={() => {
                      setSelectedDate(day.toISOString().split('T')[0]);
                      setEditingEntry(null);
                      setStartTime('');
                      setEndTime('');
                      setCleanerName('');
                      setShowAddModal(true);
                    }}
                  >
                    <Text style={styles.addEntryButtonText}>+ הוסף</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setEditingEntry(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingEntry ? 'ערוך רשומה' : 'הוסף רשומה חדשה'}
            </Text>

            {/* Only show date field when editing, not when adding (date is already selected) */}
            {editingEntry && (
              <View style={styles.field}>
                <Text style={styles.label}>תאריך *</Text>
                <TextInput
                  style={styles.input}
                  value={selectedDate}
                  onChangeText={setSelectedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}

            {!editingEntry && selectedDate && (
              <View style={styles.field}>
                <Text style={styles.label}>תאריך נבחר</Text>
                <Text style={[styles.input, { color: '#3b82f6', fontWeight: '600', paddingVertical: 12 }]}>
                  {selectedDate}
                </Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>שעת התחלה *</Text>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="HH:MM (לדוגמה: 09:00)"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>שעת סיום *</Text>
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="HH:MM (לדוגמה: 12:00)"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>שם מנקה *</Text>
              <TextInput
                style={styles.input}
                value={cleanerName}
                onChangeText={setCleanerName}
                placeholder="הזן שם מנקה"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleSaveEntry}
                style={[styles.modalButton, styles.formButtonPrimary]}
              >
                <Text style={styles.formButtonPrimaryText}>שמור</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowAddModal(false);
                  setEditingEntry(null);
                  setSelectedDate('');
                  setStartTime('');
                  setEndTime('');
                  setCleanerName('');
                }}
                style={[styles.modalButton, styles.formButtonSecondary]}
              >
                <Text style={styles.formButtonSecondaryText}>ביטול</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type InvoicesScreenProps = {
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type InvoiceItem = {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type ExtractedInvoiceData = {
  total_price: number | null;
  currency: string;
  items: InvoiceItem[];
  vendor?: string | null;
  date?: string | null;
  invoice_number?: string | null;
};

type SavedInvoice = {
  id: string;
  image_data: string;
  total_price: number | null;
  currency: string;
  vendor: string | null;
  date: string | null;
  invoice_number: string | null;
  extracted_data: ExtractedInvoiceData | null;
  created_at: string;
  updated_at: string;
};

type EditInvoiceModalProps = {
  invoice: SavedInvoice;
  onSave: (invoice: SavedInvoice) => void;
  onCancel: () => void;
  formatMoney: (amount: number | null | undefined, currency?: string) => string;
};

function EditInvoiceModal({
  invoice,
  onSave,
  onCancel,
  formatMoney,
}: EditInvoiceModalProps) {
  const [editedInvoice, setEditedInvoice] = useState<SavedInvoice>({ ...invoice });

  // Simple 2 field structure
  const extractedData = editedInvoice.extracted_data || {};
  const data = {
    total_price: editedInvoice.total_price || extractedData.total_price || null,
    product_description: extractedData.product_description || null
  };

  const updateData = (updates: any) => {
    const newData = { ...data, ...updates };
    
    setEditedInvoice({
      ...editedInvoice,
      extracted_data: newData,
      total_price: newData.total_price,
    });
  };



  const handleSave = () => {
    onSave(editedInvoice);
  };

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>עריכת חשבונית</Text>
          
          <ScrollView style={styles.editInvoiceScroll}>
            <View style={styles.field}>
              <Text style={styles.label}>מהות המוצר</Text>
              <TextInput
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                value={data.product_description || ''}
                onChangeText={(text) => updateData({ product_description: text || null })}
                placeholder="הזן תיאור המוצר או השירות"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>מחיר מלא</Text>
              <TextInput
                style={styles.input}
                value={data.total_price?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseFloat(text) || null;
                  updateData({ total_price: num });
                }}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <Pressable onPress={handleSave} style={[styles.modalButton, styles.modalButtonPrimary]}>
              <Text style={styles.modalButtonText}>שמור</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={[styles.modalButton, styles.modalButtonGhost]}>
              <Text style={styles.modalButtonGhostText}>ביטול</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InvoicesScreen({
  onBack,
  safeAreaInsets,
  statusBar,
}: InvoicesScreenProps) {
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SavedInvoice | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/invoices`);
      if (response.ok) {
        const data = await response.json();
        // Parse extracted_data if it's a string
        const parsedInvoices = (data || []).map((inv: any) => {
          let extractedData = inv.extracted_data;
          if (typeof extractedData === 'string') {
            try {
              extractedData = JSON.parse(extractedData);
            } catch {
              extractedData = null;
            }
          }
          return {
            ...inv,
            extracted_data: extractedData,
          };
        });
        setInvoices(parsedInvoices);
        console.log(`Loaded ${parsedInvoices.length} invoices`);
      } else {
        console.error('Failed to load invoices:', response.status, await response.text().catch(() => ''));
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      console.log('handlePickImage called');
      const result = await launchCamera({
        mediaType: 'photo',
        includeBase64: true,
      });
      console.log('Image picker result:', result);
      if (result.didCancel) {
        console.log('User cancelled image picker');
        return;
      }
      
      const asset = result.assets?.[0];
      console.log('Selected asset:', asset);
      if (!asset?.uri) {
        console.error('No URI in selected asset');
        setTimeout(() => {
          Alert.alert('שגיאה', 'לא נבחר קובץ');
        }, 100);
        return;
      }
      
      const mime = asset.type || 'image/jpeg';
      let dataUri: string;
      
      // If base64 is available, use it
      if (asset.base64) {
        console.log('Using base64 from asset');
        dataUri = `data:${mime};base64,${asset.base64}`;
      } else {
        // If base64 is not available, use the URI
        // We'll need to handle this differently when sending to backend
        console.log('Base64 not available, using URI:', asset.uri);
        dataUri = asset.uri;
      }
      
      console.log('Setting selected image, dataUri type:', dataUri.startsWith('data:') ? 'base64' : 'uri');
      setSelectedImage(dataUri);
    } catch (err: any) {
      console.error('Error picking image:', err);
      setTimeout(() => {
        Alert.alert('שגיאה', err?.message || 'לא ניתן לבחור תמונה');
      }, 100);
    }
  };

  const handleProcessInvoice = async () => {
    if (!selectedImage) {
      setTimeout(() => {
        Alert.alert('שגיאה', 'יש לבחור תמונה תחילה');
      }, 100);
      return;
    }

    console.log('Processing invoice, image type:', selectedImage.startsWith('data:') ? 'base64' : 'uri');
    setProcessing(true);

    try {
      let response: Response;
      
      // If image is a data URI (base64), send as JSON
      if (selectedImage.startsWith('data:')) {
        console.log('Sending image as JSON (base64)');
        response = await fetch(`${API_BASE_URL}/api/invoices/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: selectedImage }),
        });
      } else {
        // If image is a URI, send as multipart form data
        console.log('Sending image as multipart form data (URI)');
        const formData = new FormData();
        formData.append('image', {
          uri: selectedImage,
          type: 'image/jpeg',
          name: 'invoice.jpg',
        } as any);
        
        response = await fetch(`${API_BASE_URL}/api/invoices/process`, {
          method: 'POST',
          // Don't set Content-Type header - let React Native set it with boundary
          body: formData,
        });
      }

      console.log('Invoice process response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Invoice process error:', errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Invoice process response data:', data);
      
      // Check if invoice was saved
      if (data.saved && data.id) {
        setSelectedImage(null);
        await loadInvoices();
        setTimeout(() => {
          Alert.alert('הצלחה', 'החשבונית נשמרה בהצלחה');
        }, 100);
      } else {
        // Invoice processed but not saved - might be table issue
        console.warn('Invoice processed but not saved to database:', data);
        setTimeout(() => {
          Alert.alert(
            'אזהרה', 
            'החשבונית עובדה אך לא נשמרה במסד הנתונים. ודא שהטבלה קיימת ב-Supabase.'
          );
        }, 100);
        setSelectedImage(null);
        await loadInvoices(); // Still try to reload in case it was saved
      }
    } catch (err: any) {
      console.error('Error processing invoice:', err);
      const errorMessage = err.message || 'שגיאה בעיבוד החשבונית';
      setTimeout(() => {
        Alert.alert('שגיאה', errorMessage);
      }, 100);
    } finally {
      setProcessing(false);
    }
  };

  const handleEditInvoice = (invoice: SavedInvoice) => {
    setEditingInvoice(invoice);
    setShowEditModal(true);
  };

  const handleSaveInvoice = async (updatedInvoice: SavedInvoice) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invoices/${updatedInvoice.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          total_price: updatedInvoice.total_price,
          currency: updatedInvoice.currency,
          vendor: updatedInvoice.vendor,
          date: updatedInvoice.date,
          invoice_number: updatedInvoice.invoice_number,
          extracted_data: updatedInvoice.extracted_data,
        }),
      });

      if (!response.ok) {
        throw new Error('לא ניתן לשמור את החשבונית');
      }

      setShowEditModal(false);
      setEditingInvoice(null);
      await loadInvoices();
      Alert.alert('הצלחה', 'החשבונית עודכנה בהצלחה');
    } catch (err: any) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשמור את החשבונית');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    Alert.alert(
      'מחיקת חשבונית',
      'האם אתה בטוח שברצונך למחוק את החשבונית?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                await loadInvoices();
                Alert.alert('הצלחה', 'החשבונית נמחקה בהצלחה');
              }
            } catch (err) {
              Alert.alert('שגיאה', 'לא ניתן למחוק את החשבונית');
            }
          },
        },
      ]
    );
  };

  const formatMoney = (amount: number | null | undefined, currency: string = 'ILS') => {
    if (amount === null || amount === undefined) {
      return '₪0.00';
    }
    const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
    return `${symbol}${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL');
    } catch {
      return dateString;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
        <Text style={styles.ordersPageTitle}>חשבוניות</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Upload Section */}
        <View style={styles.invoiceContainer}>
          <Text style={styles.invoiceTitle}>העלאת חשבונית</Text>
          <Text style={styles.invoiceSubtitle}>
            העלה תמונה של חשבונית והמערכת תזהה את הסכום הכולל ומחירי הפריטים
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>תמונת חשבונית</Text>
            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <ImageBackground
                  source={{ uri: selectedImage }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                >
                  <View style={styles.imagePreviewOverlay}>
                    <Pressable
                      onPress={handlePickImage}
                      style={styles.changeImageButton}
                    >
                      <Text style={styles.changeImageButtonText}>החלף תמונה</Text>
                    </Pressable>
                  </View>
                </ImageBackground>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  console.log('Upload button pressed');
                  handlePickImage();
                }}
                style={styles.uploadImageButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.uploadImageButtonText}>+ העלה תמונה</Text>
              </Pressable>
            )}
          </View>

          {selectedImage && (
            <Pressable
              onPress={handleProcessInvoice}
              disabled={processing}
              style={[
                styles.processButton,
                processing && styles.processButtonDisabled,
              ]}
            >
              <Text style={styles.processButtonText}>
                {processing ? 'מעבד...' : 'עבד חשבונית'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Invoices List */}
        <View style={styles.invoiceContainer}>
          <Text style={styles.invoiceTitle}>חשבוניות שמורות ({invoices.length})</Text>
          
          {loading ? (
            <Text style={styles.loadingText}>טוען...</Text>
          ) : invoices.length === 0 ? (
            <Text style={styles.emptyText}>אין חשבוניות שמורות</Text>
          ) : (
            <View style={styles.invoicesList}>
              {invoices.map((invoice) => {
                // Simple 2 field structure
                const extractedData = invoice.extracted_data || {};
                const totalPrice = invoice.total_price || extractedData.total_price;
                const productDescription = extractedData.product_description || 'ללא תיאור';
                
                return (
                  <Pressable
                    key={invoice.id}
                    onPress={() => handleEditInvoice(invoice)}
                    style={styles.invoiceCard}
                  >
                    <Image
                      source={{ uri: invoice.image_data }}
                      style={styles.invoiceThumbnail}
                    />
                    <View style={styles.invoiceCardContent}>
                      <Text style={styles.invoiceCardProduct}>
                        {productDescription}
                      </Text>
                      <Text style={styles.invoiceCardTotal}>
                        {formatMoney(totalPrice, invoice.currency || 'ILS')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteInvoice(invoice.id);
                      }}
                      style={styles.deleteInvoiceButton}
                    >
                      <Text style={styles.deleteInvoiceButtonText}>מחק</Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Invoice Modal */}
      {showEditModal && editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          onSave={handleSaveInvoice}
          onCancel={() => {
            setShowEditModal(false);
            setEditingInvoice(null);
          }}
          formatMoney={formatMoney}
        />
      )}
    </SafeAreaView>
  );
}

function OptionCard({
  title,
  icon,
  accent,
  details,
  cta,
  onPress,
}: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.optionCard,
        { borderColor: accent + '55', backgroundColor: 'rgba(255,255,255,0.9)' },
        pressed && { transform: [{ translateY: 1 }], opacity: 0.96 },
      ]}
    >
      <View style={[styles.optionIconWrap, { backgroundColor: accent + '22' }]}>
        <Text style={styles.optionIcon}>{icon}</Text>
      </View>
      <Text style={styles.optionTitle}>{title}</Text>
      <View style={styles.optionBullets}>
        {details.map(line => (
          <Text key={line} style={styles.optionBullet}>
            • {line}
          </Text>
        ))}
      </View>
      {cta ? (
        <View style={[styles.optionCta, { backgroundColor: accent + '22' }]}>
          <Text style={[styles.optionCtaText, { color: accent }]}>{cta}</Text>
        </View>
      ) : (
        <View style={styles.optionStatus}>
          <Text style={styles.optionStatusText}>בקרוב</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  fullBleed: {
    flex: 1,
    backgroundColor: '#0b1224',
  },
  hubContainer: {
    flex: 1,
    backgroundColor: '#f3f6fb',
  },
  hubScroll: {
    padding: 18,
    paddingBottom: 50,
  },
  hubTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bg: {
    flex: 1,
  },
  bgImage: {
    resizeMode: 'cover',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 12, 24, 0.45)',
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  heroScroll: {
    paddingHorizontal: 20,
    paddingBottom: 46,
    paddingTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  brandBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    gap: 8,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 8,
    backgroundColor: '#38bdf8',
  },
  brandText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  userChip: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  userChipText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  topChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  topChipText: {
    color: '#e0f2fe',
    fontWeight: '700',
    fontSize: 13,
  },
  heroCopy: {
    gap: 6,
    marginTop: 14,
  },
  kicker: {
    color: '#bae6fd',
    fontSize: 14,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  heroHeading: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'right',
    lineHeight: 34,
  },
  hubHeading: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'right',
    lineHeight: 32,
  },
  hubBody: {
    color: '#1f2937',
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'right',
    marginTop: 6,
  },
  heroBody: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
  },
  glassRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 16,
  },
  hubHero: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    gap: 6,
  },
  glassCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  glassTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  glassValue: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: 6,
  },
  glassSmall: {
    color: '#e2e8f0',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  ctaCard: {
    backgroundColor: 'rgba(8, 13, 28, 0.8)',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginTop: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  ctaText: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 21,
  },
  ctaButtons: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 6,
  },
  ctaPrimary: {
    flex: 1,
  },
  ctaOutline: {
    flex: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  testNotificationButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
  },
  testNotificationButtonText: {
    color: '#e0f2fe',
    fontSize: 14,
    fontWeight: '600',
  },
  optionGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  optionCard: {
    width: '48%',
    minWidth: 160,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  optionIconWrap: {
    alignSelf: 'flex-start',
    padding: 10,
    borderRadius: 12,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
  },
  optionBullets: {
    gap: 4,
    marginTop: 2,
  },
  optionBullet: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 19,
  },
  optionCta: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  optionCtaText: {
    fontWeight: '800',
    fontSize: 14,
  },
  optionStatus: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionStatusText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 13,
  },
  ordersHeader: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 20,
  },
  statCard: {
    width: '32%',
    minWidth: 100,
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  welcomeSection: {
    marginTop: 24,
  },
  welcomeCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#667eea',
  },
  welcomeAvatar: {
    flexShrink: 0,
  },
  welcomeAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  welcomeAvatarIcon: {
    fontSize: 40,
  },
  welcomeContent: {
    flex: 1,
    gap: 6,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'right',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'right',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 12,
  },
  progressSection: {
    marginTop: 24,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  progressInfo: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  progressBarLarge: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFillLarge: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  progressNote: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  reportUnitKpiGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  reportUnitKpiItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  reportUnitKpiLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    fontWeight: '700',
  },
  reportUnitKpiValue: {
    marginTop: 4,
    fontSize: 15,
    color: '#0f172a',
    textAlign: 'right',
    fontWeight: '800',
  },
  reportChipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  reportChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  reportChipText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  reportOrderMiniCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginTop: 10,
  },
  reportOrderMiniHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportOrderId: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'right',
  },
  reportStatusPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  reportStatusPillInner: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  reportStatusPillText: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  reportOrderLine: {
    fontSize: 12.5,
    color: '#334155',
    textAlign: 'right',
    lineHeight: 18,
    marginTop: 3,
  },
  quickActions: {
    marginTop: 24,
  },
  quickActionsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  quickActionBtn: {
    width: '48%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 95,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 6,
    textAlign: 'center',
  },
  quickActionText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  chatSection: {
    marginTop: 24,
    paddingBottom: 20,
  },
  chatButton: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 95,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  chatButtonIcon: {
    fontSize: 28,
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 16,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tagText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  heroHeader: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    textAlign: 'right',
    color: '#334155',
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
    color: '#fff',
  },
  heroText: {
    fontSize: 15,
    marginTop: 10,
    textAlign: 'right',
    color: '#e2e8f0',
    lineHeight: 22,
  },
  heroButtons: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#22d3ee',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 12,
  },
  field: {
    marginTop: 14,
  },
  label: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  select: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectValue: {
    color: '#0f172a',
    fontSize: 14,
  },
  selectCaret: {
    color: '#64748b',
    fontSize: 16,
  },
  selectList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    maxHeight: 400,
  },
  selectCategory: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  selectCategoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'right',
  },
  selectItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectItemActive: {
    backgroundColor: '#e0f2fe',
  },
  selectItemText: {
    fontSize: 14,
    color: '#0f172a',
    textAlign: 'right',
  },
  selectItemTextActive: {
    fontWeight: '700',
    color: '#0f172a',
  },
  pickerContainer: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 6,
  },
  pickerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  pickerButtonSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  pickerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  pickerButtonTextSelected: {
    color: '#2563eb',
    fontWeight: '700',
  },
  imageUploadButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    marginTop: 6,
  },
  imageUploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: '#b91c1c',
    marginTop: 8,
    textAlign: 'right',
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  outlineButton: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  outlineButtonText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 15,
  },
  summaryCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    color: '#0f172a',
  },
  summaryText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
    color: '#0f172a',
  },
  summaryNote: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
    color: '#0f172a',
  },
  // Enhanced Summary Card Styles
  summaryCardEnhanced: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 8,
  },
  summaryCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  summaryTitleEnhanced: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
    color: '#0f172a',
  },
  summaryStatsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#e2e8f0',
  },
  summaryNoteContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  summaryNoteEnhanced: {
    fontSize: 12,
    textAlign: 'right',
    color: '#64748b',
    fontStyle: 'italic',
  },
  // Orders Page Header
  ordersPageHeader: {
    marginBottom: 8,
  },
  ordersPageTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'right',
    color: '#0f172a',
    marginBottom: 6,
  },
  ordersPageSubtitle: {
    fontSize: 16,
    textAlign: 'right',
    color: '#64748b',
    marginBottom: 4,
  },
  // Enhanced Order Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  orderCard: {
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
  },
  orderCardEnhanced: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 4,
  },
  orderCardHeaderEnhanced: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f1f5f9',
  },
  orderCardHeaderLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  unitIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  unitIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },
  orderCardTitleContainer: {
    flex: 1,
  },
  orderCardUnitTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
    color: '#0f172a',
    marginBottom: 4,
  },
  orderCardId: {
    fontSize: 13,
    textAlign: 'right',
    color: '#64748b',
    fontWeight: '600',
  },
  statusBadgeEnhanced: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  statusBadgeTextEnhanced: {
    fontSize: 14,
    fontWeight: '800',
  },
  orderInfoSection: {
    gap: 16,
  },
  orderInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  orderInfoIcon: {
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
  },
  orderInfoIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  orderInfoContent: {
    flex: 1,
  },
  orderInfoLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 4,
    fontWeight: '600',
  },
  orderInfoValue: {
    fontSize: 15,
    color: '#0f172a',
    textAlign: 'right',
    fontWeight: '700',
  },
  orderPaymentSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderPaymentRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    gap: 12,
  },
  orderPaymentItem: {
    flex: 1,
    alignItems: 'center',
  },
  orderPaymentLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '600',
  },
  orderPaymentTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderPaymentPaid: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  orderPaymentRemaining: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f59e0b',
  },
  orderSpecialSection: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  orderSpecialContent: {
    flex: 1,
  },
  orderSpecialLabel: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'right',
    marginBottom: 4,
    fontWeight: '700',
  },
  orderSpecialText: {
    fontSize: 14,
    color: '#78350f',
    textAlign: 'right',
    fontWeight: '600',
  },
  orderNotesSection: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  orderNotesContent: {
    flex: 1,
  },
  orderNotesLabel: {
    fontSize: 12,
    color: '#0c4a6e',
    textAlign: 'right',
    marginBottom: 4,
    fontWeight: '700',
  },
  orderNotesText: {
    fontSize: 14,
    color: '#075985',
    textAlign: 'right',
    fontWeight: '600',
  },
  progressWrapEnhanced: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#f1f5f9',
  },
  progressHeaderEnhanced: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabelEnhanced: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  progressValueEnhanced: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '800',
  },
  progressBarEnhanced: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFillEnhanced: {
    height: '100%',
    borderRadius: 999,
  },
  progressFooter: {
    alignItems: 'center',
  },
  progressFooterText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  editActionsEnhanced: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  editButtonEnhanced: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyOrdersState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyOrdersText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    color: '#0f172a',
  },
  cardLine: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
    color: '#334155',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  monthSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  monthSectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  hotelNameContainer: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  hotelNameText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'right',
    color: '#0f172a',
  },
  inspectionsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  statsBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  statsBadgeText: {
    color: '#0ea5e9',
    fontWeight: '700',
    fontSize: 14,
  },
  missionsList: {
    gap: 12,
  },
  inspectionCard: {
    borderColor: '#e0f2fe',
    backgroundColor: '#f0f9ff',
    marginTop: 12,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  inspectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  expandIcon: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 8,
  },
  inspectionDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  statusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  statusDisplayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDisplayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tasksList: {
    marginTop: 12,
    gap: 16,
  },
  taskCategory: {
    gap: 8,
  },
  taskCategoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563eb',
    textAlign: 'right',
    marginBottom: 4,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#e0f2fe',
  },
  taskItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  taskCheckmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  taskText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'right',
    flex: 1,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  saveSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  warehouseHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  alertBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  alertBadgeText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 12,
  },
  unitSelector: {
    marginBottom: 20,
  },
  unitScroll: {
    marginTop: 8,
  },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginLeft: 8,
  },
  unitChipActive: {
    backgroundColor: '#a78bfa',
    borderColor: '#8b5cf6',
  },
  unitChipText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  unitChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row-reverse',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tabText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  categoryFilter: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginLeft: 8,
  },
  categoryChipActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#a78bfa',
  },
  categoryChipText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  itemsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  inventoryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  inventoryCardLowStock: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  inventoryCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  inventoryItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  lowStockBadgeText: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '700',
  },
  inventoryCategory: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 10,
  },
  stockInfo: {
    gap: 6,
    marginBottom: 12,
  },
  stockRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  stockValueLow: {
    color: '#dc2626',
  },
  orderButton: {
    backgroundColor: '#a78bfa',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  ordersList: {
    gap: 12,
  },
  ordersHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addOrderButton: {
    backgroundColor: '#a78bfa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addOrderButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  orderCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 6,
  },
  orderDetails: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  orderStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  orderTypeText: {
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '600',
  },
  itemsTableSection: {
    marginBottom: 24,
  },
  itemsTable: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tableCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  tableCellSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    minWidth: 60,
  },
  tableOrderButton: {
    backgroundColor: '#a78bfa',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tableOrderButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  orderHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  selectedItemsSummary: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  selectedItemsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 8,
  },
  selectedItemText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'right',
    marginTop: 4,
  },
  orderActions: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 16,
  },
  saveOrderButton: {
    flex: 1,
    backgroundColor: '#a78bfa',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveOrderButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelOrderButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelOrderButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 15,
  },
  currentQuantityText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },
  selectedItemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  removeItemButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  removeItemButtonText: {
    color: '#dc2626',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  orderDetailsSection: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  unitsGrid: {
    gap: 16,
    marginTop: 16,
  },
  unitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  unitCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
  },
  unitIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  unitIconText: {
    fontSize: 28,
  },
  unitCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  unitCardType: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  unitStats: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  unitStatItem: {
    alignItems: 'center',
  },
  unitStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  unitStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  taskCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 8,
  },
  taskCardDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
    marginBottom: 8,
  },
  taskCardMeta: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 8,
  },
  taskCardMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  taskCardAssigned: {
    fontSize: 12,
    color: '#3b82f6',
    textAlign: 'right',
  },
  taskCardBadges: {
    alignItems: 'flex-end',
    gap: 8,
  },
  taskStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  taskStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskPriorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  taskPriorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskImageIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  taskImageIndicatorText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  editMediaButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editMediaButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeMediaButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeMediaButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addMediaButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addMediaButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  taskDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  taskDetailHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f1f5f9',
  },
  taskDetailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
  },
  taskDetailBadges: {
    alignItems: 'flex-end',
    gap: 8,
    marginRight: 12,
  },
  taskDetailSection: {
    marginBottom: 20,
  },
  taskDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 6,
  },
  taskDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  taskDetailDescription: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 22,
  },
  taskImageContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskDetailImage: {
    width: '100%',
    height: 300,
  },
  taskImagePreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  taskImagePreview: {
    width: '100%',
    height: '100%',
  },
  taskImagePlaceholder: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  taskImagePlaceholderText: {
    fontSize: 16,
    color: '#64748b',
  },
  changeImageButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    maxHeight: 40,
  },
  changeImageButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  uploadImageButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    minHeight: 36,
    maxHeight: 40,
  },
  uploadImageButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  closeModalButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  closeModalGridButton: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    maxHeight: 40,
  },
  taskActions: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  closeTaskButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    maxHeight: 40,
  },
  closeTaskButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  taskClosedIndicator: {
    marginTop: 12,
    backgroundColor: '#dbeafe',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  taskClosedIndicatorText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '700',
  },
  taskClosedButton: {
    backgroundColor: '#dbeafe',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  taskClosedButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '700',
  },
  closeTaskButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  closeModalImageContainer: {
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 20,
  },
  progressWrap: {
    marginTop: 16,
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  progressValue: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  editActions: {
    marginTop: 16,
    gap: 10,
  },
  deleteButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dc2626',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 15,
  },
  addPaymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  addPaymentTrigger: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  addPaymentText: {
    color: '#fff',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
    color: '#0f172a',
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#22c55e',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  modalButtonGhost: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  modalButtonGhostText: {
    color: '#0f172a',
    fontWeight: '800',
  },
  // Chat Screen Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chatMessagesList: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 16,
    gap: 12,
  },
  chatEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  chatEmptyText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  chatEmptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  chatMessageContainer: {
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  chatMessageOwn: {
    alignItems: 'flex-start',
  },
  chatMessageSender: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
    marginRight: 8,
  },
  chatMessageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderTopRightRadius: 4,
  },
  chatMessageBubbleOwn: {
    backgroundColor: '#0ea5e9',
    borderTopRightRadius: 16,
    borderTopLeftRadius: 4,
  },
  chatMessageBubbleOther: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chatMessageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  chatMessageTextOwn: {
    color: '#fff',
  },
  chatMessageTextOther: {
    color: '#0f172a',
  },
  chatMessageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  chatMessageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  chatMessageTimeOther: {
    color: '#94a3b8',
  },
  chatInputContainer: {
    flexDirection: 'row-reverse',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chatSendButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  chatSendButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  // Attendance Screen Styles
  attendanceScroll: {
    padding: 16,
    gap: 20,
  },
  attendanceHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  attendanceUserName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  attendanceSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  attendanceStatusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  attendanceStatusHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  attendanceStatusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceStatusIndicatorText: {
    color: '#fff',
    fontSize: 10,
  },
  attendanceStatusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  attendanceSessionInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  attendanceInfoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceInfoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  attendanceInfoValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
  },
  attendanceActions: {
    gap: 12,
  },
  attendanceButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  attendanceButtonStart: {
    backgroundColor: '#22c55e',
  },
  attendanceButtonStop: {
    backgroundColor: '#ef4444',
  },
  attendanceButtonRefresh: {
    backgroundColor: '#64748b',
  },
  attendanceButtonIcon: {
    fontSize: 20,
    color: '#fff',
  },
  attendanceButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  attendanceHistorySection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#f1f5f9',
  },
  attendanceHistoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 16,
  },
  attendanceHistoryList: {
    gap: 12,
  },
  attendanceHistoryItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  attendanceHistoryItemHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceHistoryItemDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  attendanceActiveBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attendanceActiveBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceHistoryItemDetails: {
    gap: 8,
  },
  attendanceHistoryDetailRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceHistoryDetailLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  attendanceHistoryDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  attendanceHistoryDuration: {
    color: '#3b82f6',
    fontSize: 16,
  },
  attendanceEmptyState: {
    padding: 24,
    alignItems: 'center',
  },
  attendanceEmptyStateText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  // Warehouse Menu Styles
  warehouseMenuOptions: {
    gap: 16,
    marginTop: 24,
  },
  warehouseMenuOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  warehouseMenuOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  warehouseMenuOptionIconText: {
    fontSize: 28,
  },
  warehouseMenuOptionContent: {
    flex: 1,
  },
  warehouseMenuOptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  warehouseMenuOptionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  warehouseMenuOptionArrow: {
    fontSize: 24,
    color: '#94a3b8',
    marginRight: 8,
  },
  // Warehouse Inventory Styles
  warehouseList: {
    gap: 12,
  },
  warehouseCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  warehouseCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  warehouseCardIconText: {
    fontSize: 24,
  },
  warehouseCardContent: {
    flex: 1,
  },
  warehouseCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  warehouseCardLocation: {
    fontSize: 14,
    color: '#64748b',
  },
  warehouseCardArrow: {
    fontSize: 24,
    color: '#94a3b8',
    marginRight: 8,
  },
  warehouseItemsList: {
    gap: 12,
  },
  warehouseItemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  warehouseItemInfo: {
    marginBottom: 12,
  },
  warehouseItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  warehouseItemUnit: {
    fontSize: 14,
    color: '#64748b',
  },
  warehouseItemActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warehouseItemQuantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  warehouseItemEditButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warehouseItemEditButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  warehouseItemEdit: {
    flexDirection: 'row-reverse',
    gap: 8,
    alignItems: 'center',
  },
  warehouseItemQuantityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  warehouseItemSaveButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warehouseItemSaveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  warehouseItemCancelButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warehouseItemCancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  formSection: {
    gap: 16,
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  formHint: {
    fontSize: 14,
    color: '#64748b',
    marginTop: -8,
  },
  formSelect: {
    gap: 8,
  },
  formSelectOption: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  formSelectOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  formSelectOptionText: {
    fontSize: 16,
    color: '#0f172a',
  },
  formSelectOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  formActions: {
    gap: 12,
  },
  formButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  formButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  formButtonPrimaryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  formButtonSecondary: {
    backgroundColor: '#f1f5f9',
  },
  formButtonSecondaryText: {
    color: '#64748b',
    fontSize: 18,
    fontWeight: '600',
  },
  // Invoice Styles
  invoiceContainer: {
    padding: 20,
    gap: 20,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  invoiceSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'right',
    lineHeight: 24,
  },
  imagePreviewContainer: {
    marginTop: 12,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  imagePreviewOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  processButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  processButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'right',
  },
  extractedDataContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  extractedDataTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 16,
  },
  extractedDataRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  extractedDataLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  extractedDataValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  extractedDataSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  extractedDataSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 12,
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
  },
  itemTotalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
  },
  noItemsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    fontStyle: 'italic',
  },
  selectedImagesContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  selectedImageItem: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  selectedImageThumb: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  invoicesList: {
    gap: 12,
    marginTop: 16,
  },
  invoiceCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  invoiceThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginLeft: 12,
  },
  invoiceCardContent: {
    flex: 1,
    gap: 4,
  },
  invoiceCardProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  invoiceCardVendor: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  invoiceCardDate: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
  },
  invoiceCardTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
    textAlign: 'right',
  },
  invoiceCardNumber: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
  },
  deleteInvoiceButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
  },
  deleteInvoiceButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  editInvoiceScroll: {
    maxHeight: 500,
  },
  editItemRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editItemButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  editItemButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeItemButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    marginRight: 8,
  },
  removeItemButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  saveItemButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  saveItemButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addItemSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  addItemButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  totalPriceContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#3b82f6',
  },
  totalPriceLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalPriceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
  },
  // Cleaning Schedule Styles
  scheduleContainer: {
    padding: 20,
    gap: 20,
  },
  weekNavigation: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weekNavButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  weekNavButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  scheduleGrid: {
    gap: 12,
  },
  scheduleDay: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  scheduleDayHeader: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  scheduleDayHeaderToday: {
    backgroundColor: '#dbeafe',
    borderBottomColor: '#3b82f6',
  },
  scheduleDayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  scheduleDayNameToday: {
    color: '#3b82f6',
  },
  scheduleDayDate: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  scheduleDayDateToday: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  scheduleDayContent: {
    maxHeight: 200,
    padding: 8,
  },
  scheduleEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  scheduleEntry: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scheduleEntryTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 4,
  },
  scheduleEntryCleaner: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'right',
  },
  addEntryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  addEntryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Hotel selector styles
  hotelSelectorContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  hotelSelectorLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 10,
  },
  hotelSelectorButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  hotelSelectorButtonText: {
    fontSize: 15,
    color: '#0f172a',
    textAlign: 'right',
  },
  hotelGroupTitle: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 12,
  },
  hotelGroupTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
  },
  // New Inventory Order Styles
  orderSearchSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  searchIcon: {
    fontSize: 18,
    marginLeft: 12,
  },
  selectedItemsCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#bae6fd',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  selectedItemsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedItemsTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  selectedItemsList: {
    maxHeight: 200,
  },
  selectedItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  selectedItemCategory: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 2,
  },
  selectedItemControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  quantityInputSelected: {
    width: 50,
    height: 32,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  selectedItemUnit: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 4,
  },
  removeItemButtonNew: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  removeItemButtonTextNew: {
    color: '#dc2626',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  itemsListSection: {
    marginBottom: 24,
  },
  itemCardNew: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  itemCardSelected: {
    borderColor: '#a78bfa',
    borderWidth: 2,
    backgroundColor: '#faf5ff',
  },
  itemCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right',
  },
  itemCardBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  itemCardBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  itemCardInfo: {
    marginBottom: 10,
  },
  itemCardStock: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'right',
    marginBottom: 2,
  },
  itemCardMinStock: {
    fontSize: 11,
    color: '#f59e0b',
    textAlign: 'right',
  },
  itemCardSelectedIndicator: {
    backgroundColor: '#ede9fe',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  itemCardSelectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7c3aed',
    textAlign: 'right',
  },
  itemQuantitySelector: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  quantityInputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  quantityInputSmall: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },
  quantityUnitText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 4,
  },
  addItemButton: {
    backgroundColor: '#a78bfa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addItemButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyStateNew: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTextNew: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
  },
  orderDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  saveOrderButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalOptionSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#a78bfa',
    borderWidth: 2,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'right',
  },
  modalOptionTextSelected: {
    color: '#7c3aed',
  },
  modalCancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  // Simple Order List Styles
  simpleOrderList: {
    marginBottom: 20,
  },
  simpleOrderItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  simpleOrderItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  simpleOrderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 4,
  },
  simpleOrderItemDetails: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'right',
  },
  simpleOrderItemControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  simpleQuantityInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },
  simpleOrderUnit: {
    fontSize: 13,
    color: '#64748b',
    minWidth: 30,
    textAlign: 'right',
  },
  orderItemCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  orderItemRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 8,
  },
  orderCardActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  changeStatusButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  changeStatusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusChangeButtons: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  statusOptionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusOptionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  statusOptionText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  cancelStatusButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelStatusButtonText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  productNameInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  addProductButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  addProductButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  removeProductButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  removeProductButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
    lineHeight: 20,
  },
  ordersUnitsGrid: {
    marginTop: 16,
    gap: 16,
  },
  ordersUnitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  ordersUnitCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
  },
  ordersUnitIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  ordersUnitIconText: {
    fontSize: 28,
  },
  ordersUnitCardContent: {
    flex: 1,
  },
  ordersUnitCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  ordersUnitCardType: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  ordersUnitStats: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  ordersUnitStatItem: {
    alignItems: 'center',
  },
  ordersUnitStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  ordersUnitStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});

export default App;
